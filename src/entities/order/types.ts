export type OrderStatus =
  | 'accepted'
  | 'collected'
  | 'packed'
  | 'confirmed'
  | 'notified_customer'
  | 'issued'
  | 'canceled'
  | string

export interface OrderListItem {
  id: number
  number?: number | string
  status: OrderStatus
  createdAt?: string
  customerName?: string
  phone?: string
  car?: string
  totalPrice?: number
  branchId?: number
}

export interface Order {
  id: number
  number?: number | string
  status: OrderStatus
  createdAt?: string
  phone?: string
  email?: string
  firstName?: string
  lastName?: string
  fatherName?: string
  carBrand?: string
  carModel?: string
  carVin?: string
  branchId?: number
  totalPrice?: number
  comment?: string
  [key: string]: unknown
}

export interface OrderElement {
  id: number
  article?: string
  brand?: string
  name?: string
  quantity?: number
  price?: number
  status?: string
  weight?: number
  description?: string
  [key: string]: unknown
}

export interface CreateFranchisingOrderPayload {
  firstName: string
  lastName?: string
  fatherName?: string
  phone: string
  email?: string
  carBrand?: string
  carModel?: string
  carVin?: string
  /** Склад назначения (Владивосток / ответхранение) — на стороне API. */
  warehouseId?: string
}

export interface OrdersListFilters {
  from?: string
  to?: string
  phone?: string
  customer?: string
  article?: string
  car?: string
  status?: string
  priceFrom?: string
  priceTo?: string
}
