export type OrderStatus =
  | 'accepted'
  | 'collected'
  | 'packed'
  | 'confirmed'
  | 'notified_customer'
  | 'issued'
  | 'canceled'
  | string

/** Элемент из GET /order/list (поля как в OrderObject::getOrdersList). */
export interface OrderListItem {
  id: number
  number?: number | string
  status: OrderStatus
  statusDescription?: string
  createdAt?: string
  createdDate?: string
  /** ФИО клиента (бэкенд: customerFullName). */
  customerFullName?: string
  phone?: string
  /** Автомобиль (бэкенд: fullCar). */
  fullCar?: string
  /** Сумма в копейках (бэкенд: price = getPriceAmount()). */
  price?: number
  remainingPaymentAmount?: number
  workManagerName?: string
  address?: string
  branchId?: number
}

/**
 * Группа списка заказов.
 * Бэкенд отдаёт Record<"1"|"2"|…, OrdersListGroup>, ключи = порядок стадий (ksort).
 */
export interface OrdersListGroup {
  key: string
  status: OrderStatus
  description: string
  orders: OrderListItem[]
  /** Сумма группы в рублях. */
  amount: number
  takeMoney: number
  lostMoney: number
  marginAmount: number
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
