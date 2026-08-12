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
import axios from 'axios'

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

/** Пустая строка позиции — POST без itemId (как CRM ElementsList.addElement). */
export async function addBlankOrderElement(orderId: number): Promise<AddOrderElementResult> {
  return withApiError(async () => {
    const { data } = await http.post<AddOrderElementResult>(`/order/${orderId}/add_element`, {})
    await assertChangeSuccess(data)
    return data
  }, 'Не удалось добавить строку')
}

export async function cancelOrderElement(elementId: number): Promise<void> {
  return withApiError(async () => {
    const { data } = await http.post<{ result?: string; message?: string }>(
      `/order_element/${elementId}/cancel`,
    )
    await assertChangeSuccess(data)
  }, 'Не удалось отменить позицию')
}

export async function patchOrderElementQuantity(
  elementId: number,
  value: number,
): Promise<void> {
  return withApiError(async () => {
    const { data } = await http.patch<{ result?: string; message?: string }>(
      `/order_element/${elementId}/quantity`,
      { value },
    )
    await assertChangeSuccess(data)
  }, 'Не удалось изменить количество')
}

/** Цена в рублях (как CRM retail_price_by_admin). */
export async function patchOrderElementRetailPrice(
  elementId: number,
  value: number,
): Promise<void> {
  return withApiError(async () => {
    const { data } = await http.patch<{ result?: string; message?: string }>(
      `/order_element/${elementId}/retail_price_by_admin`,
      { value },
    )
    await assertChangeSuccess(data)
  }, 'Не удалось изменить цену')
}

export async function patchOrderElementDescription(
  elementId: number,
  value: string,
): Promise<void> {
  return withApiError(async () => {
    const { data } = await http.patch<{ result?: string; message?: string }>(
      `/order_element/${elementId}/description`,
      { value },
    )
    await assertChangeSuccess(data)
  }, 'Не удалось изменить наименование')
}

export async function patchOrderElementWeight(
  elementId: number,
  value: number,
): Promise<void> {
  return withApiError(async () => {
    const { data } = await http.patch<{ result?: string; message?: string }>(
      `/order_element/${elementId}/weight`,
      { value },
    )
    await assertChangeSuccess(data)
  }, 'Не удалось изменить вес')
}

export async function confirmOrder(orderId: number, assemblyTime: string): Promise<void> {
  return withApiError(async () => {
    const { data } = await http.post<{ result?: string; message?: string }>(
      `/order/${orderId}/confirm`,
      { assemblyTime },
    )
    await assertChangeSuccess(data)
  }, 'Не удалось подтвердить заказ')
}

export async function copyOrder(orderId: number): Promise<{ orderId?: number }> {
  const { data } = await http.post<{ orderId?: number }>(`/order/copy/${orderId}`)
  return data
}

async function assertChangeSuccess(data: { result?: string; message?: string } | unknown) {
  if (data && typeof data === 'object' && 'result' in data && data.result === 'error') {
    throw new Error(
      (data as { message?: string }).message || 'Не удалось сохранить изменения',
    )
  }
}

function rethrowApiError(err: unknown, fallback: string): never {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string; error?: string } | undefined
    throw new Error(data?.message || data?.error || err.message || fallback)
  }
  if (err instanceof Error) throw err
  throw new Error(fallback)
}

async function withApiError<T>(fn: () => Promise<T>, fallback: string): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    rethrowApiError(err, fallback)
  }
}

/** POST /order/change_customer/{orderId}/{field} — JSON body как в CRM. */
export async function changeOrderCustomerField(
  orderId: number,
  field: 'firstname' | 'lastname' | 'fathername' | 'phone' | 'email',
  body: Record<string, unknown>,
): Promise<void> {
  const { data } = await http.post<{ result?: string; message?: string }>(
    `/order/change_customer/${orderId}/${field}`,
    body,
  )
  await assertChangeSuccess(data)
}

export async function changeOrderCar(
  orderId: number,
  payload: {
    action?: string
    id?: number | null
    brand?: string
    model?: string
    vin?: string
    carNumber?: string
    carNumberRegion?: string
  },
): Promise<void> {
  const { data } = await http.post<{ result?: string; message?: string }>(
    `/order/${orderId}/change_car`,
    payload,
  )
  await assertChangeSuccess(data)
}
