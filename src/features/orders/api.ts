import { http } from '@/shared/api/http'
import type {
  CreateFranchisingOrderPayload,
  Order,
  OrderElement,
  OrderListItem,
  OrdersListFilters,
} from '@/entities/order/types'

type LegacyOrdersListResponse = Record<
  string,
  {
    orders: OrderListItem[]
  }
>

function flattenOrdersList(payload: LegacyOrdersListResponse | OrderListItem[]): OrderListItem[] {
  if (Array.isArray(payload)) return payload
  return Object.values(payload).flatMap((group) => group.orders ?? [])
}

export async function fetchOrdersList(filters: OrdersListFilters = {}): Promise<OrderListItem[]> {
  const { data } = await http.get<LegacyOrdersListResponse | OrderListItem[]>('/order/list', {
    params: {
      withoutInnerOrders: 1,
      ...filters,
    },
  })
  return flattenOrdersList(data)
}

export async function fetchOrder(orderId: number): Promise<Order> {
  const { data } = await http.get<Order>(`/order/${orderId}`)
  return data
}

export async function fetchOrderElements(orderId: number): Promise<OrderElement[]> {
  const { data } = await http.get<{ elements: OrderElement[] }>(
    `/order/${orderId}/elements_for_manager_order_interface`,
  )
  return data.elements ?? []
}

export async function createFranchisingOrder(
  payload: CreateFranchisingOrderPayload,
): Promise<{ orderId: number }> {
  const body = new URLSearchParams()
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      body.set(key, String(value))
    }
  })

  const { data } = await http.post<{ orderId: number }>('/order/create_by_franchising', body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return data
}

export async function addOrderElement(orderId: number, itemId: number): Promise<void> {
  await http.post(`/order/${orderId}/add_element`, { itemId })
}

export async function confirmOrder(orderId: number): Promise<void> {
  await http.post(`/order/${orderId}/confirm`)
}

export async function copyOrder(orderId: number): Promise<{ orderId?: number }> {
  const { data } = await http.post<{ orderId?: number }>(`/order/copy/${orderId}`)
  return data
}
