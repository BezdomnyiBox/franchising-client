import { http } from '@/shared/api/http'
import type {
  CreateFranchisingOrderPayload,
  Order,
  OrderCustomerFieldData,
  OrderElement,
  OrderListItem,
  OrderPaymentsFieldData,
  OrdersListFilters,
  OrdersListGroup,
  OrderStatusFieldData,
} from '@/entities/order/types'

function assertOrderPayload(data: unknown, orderId: number): Order {
  if (Array.isArray(data) || !data || typeof data !== 'object') {
    throw new Error(
      `Заказ #${orderId} недоступен (пустой ответ API — часто Referer / checkResponseUrl).`,
    )
  }
  const order = data as Order
  if (order.denied_show) {
    throw new Error('Нет доступа к чужому заказу.')
  }
  if (!order.id) {
    throw new Error(`Заказ #${orderId} не найден.`)
  }
  return order
}

/** Ответ GET /order/list: объект, ключи — числовой порядок стадий (1…7). */
type LegacyOrdersListResponse = Record<
  string,
  {
    status: string
    description: string
    orders: OrderListItem[]
    lostMoney?: number
    takeMoney?: number
    amount?: number
    marginAmount?: number
  }
>

export interface AddOrderElementPayload {
  itemId: number
  quantity?: number
  searchProductId?: number | null
  our_products_in_search_result?: unknown[]
  is_margin?: boolean
  lineNumber?: number
}

export interface AddOrderElementResult {
  orderElementId?: number
  result?: string
  message?: string
  error?: string
}

/**
 * Сохраняет группировку бэкенда (OrderObject::getOrdersList + ksort).
 * Порядок групп — по числовым ключам ответа.
 */
function parseOrdersListGroups(
  payload: LegacyOrdersListResponse | OrderListItem[],
): OrdersListGroup[] {
  if (Array.isArray(payload)) {
    if (payload.length === 0) return []
    return [
      {
        key: 'all',
        status: '',
        description: 'Заказы',
        orders: payload,
        amount: 0,
        takeMoney: 0,
        lostMoney: 0,
        marginAmount: 0,
      },
    ]
  }

  return Object.keys(payload)
    .sort((a, b) => Number(a) - Number(b))
    .map((key) => {
      const block = payload[key]
      return {
        key,
        status: block.status ?? '',
        description: block.description || block.status || `Стадия ${key}`,
        orders: block.orders ?? [],
        amount: block.amount ?? 0,
        takeMoney: block.takeMoney ?? 0,
        lostMoney: block.lostMoney ?? 0,
        marginAmount: block.marginAmount ?? 0,
      }
    })
    .filter((group) => group.orders.length > 0)
}

export async function fetchOrdersList(
  filters: OrdersListFilters = {},
): Promise<OrdersListGroup[]> {
  const { data } = await http.get<LegacyOrdersListResponse | OrderListItem[]>('/order/list', {
    params: {
      withoutInnerOrders: 1,
      ...filters,
    },
  })
  return parseOrdersListGroups(data)
}

export async function fetchOrder(orderId: number): Promise<Order> {
  const { data } = await http.get<unknown>(`/order/${orderId}`)
  return assertOrderPayload(data, orderId)
}

export async function fetchOrderCustomer(orderId: number): Promise<OrderCustomerFieldData> {
  const { data } = await http.get<OrderCustomerFieldData | unknown[]>(
    `/order/${orderId}/field_data/customer`,
  )
  if (Array.isArray(data) || !data) return {}
  return data
}

export async function fetchOrderStatus(orderId: number): Promise<OrderStatusFieldData | null> {
  const { data } = await http.get<OrderStatusFieldData | unknown[]>(
    `/order/${orderId}/field_data/status`,
  )
  if (Array.isArray(data) || !data || typeof data !== 'object') return null
  return data as OrderStatusFieldData
}

export async function fetchOrderPayments(orderId: number): Promise<OrderPaymentsFieldData | null> {
  const { data } = await http.get<OrderPaymentsFieldData | unknown[]>(
    `/order/${orderId}/field_data/payments`,
  )
  if (Array.isArray(data) || !data || typeof data !== 'object') return null
  return data as OrderPaymentsFieldData
}

export async function fetchOrderElements(orderId: number): Promise<OrderElement[]> {
  const { data } = await http.get<{ elements?: OrderElement[] } | unknown[]>(
    `/order/${orderId}/elements_for_manager_order_interface`,
  )
  if (Array.isArray(data) || !data) return []
  return data.elements ?? []
}

export async function createFranchisingOrder(
  payload: CreateFranchisingOrderPayload,
): Promise<{ id: number; orderId: number }> {
  const body = new URLSearchParams()
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      body.set(key, String(value))
    }
  })

  const { data } = await http.post<{ id?: number; orderId?: number; result?: string; message?: string }>(
    '/order/create_by_franchising',
    body,
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  )

  if (!data?.orderId) {
    throw new Error(data?.message || 'Не удалось создать заказ')
  }

  return { id: data.id ?? 0, orderId: data.orderId }
}

export async function addOrderElement(
  orderId: number,
  payload: AddOrderElementPayload,
): Promise<AddOrderElementResult> {
  const { data } = await http.post<AddOrderElementResult>(`/order/${orderId}/add_element`, {
    itemId: payload.itemId,
    quantity: payload.quantity ?? 1,
    searchProductId: payload.searchProductId ?? null,
    our_products_in_search_result: payload.our_products_in_search_result ?? [],
    is_margin: payload.is_margin ?? false,
    lineNumber: payload.lineNumber ?? 0,
  })
  return data
}

export async function confirmOrder(orderId: number): Promise<void> {
  await http.post(`/order/${orderId}/confirm`)
}

export async function copyOrder(orderId: number): Promise<{ orderId?: number }> {
  const { data } = await http.post<{ orderId?: number }>(`/order/copy/${orderId}`)
  return data
}
