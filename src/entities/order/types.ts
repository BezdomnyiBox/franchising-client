export type OrderStatus =
  | 'accepted'
  | 'collected'
  | 'packed'
  | 'confirmed'
  | 'notified_customer'
  | 'issued'
  | 'canceled'
  | string

/** История статусов в строке списка (GET /order/list → statusesHistory). */
export interface OrderListStatusHistoryItem {
  description: string
  date: string
  color?: string
}

/** Комментарий в строке списка (GET /order/list → comments). */
export interface OrderListComment {
  date?: string
  text?: string
}

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
  statusesHistory?: OrderListStatusHistoryItem[]
  comments?: OrderListComment[]
  refusingReason?: string | null
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

/** Комментарий из GET /order/{id} → personalComments / collectiveComments. */
export interface OrderComment {
  manager?: string
  date?: string
  comment?: string
}

/** Элемент списка ТК из GET /order/{id}/field_data/transport_company. */
export interface TransportCompanyOption {
  id: number
  alias: string
  name: string
  price?: number
  [key: string]: unknown
}

/** Ответ GET /order/{id} — OrderObject::getForManagerOrder. */
export interface Order {
  id: number
  number: number
  status: OrderStatus
  statusDescription?: string
  createdDate?: string
  assemblyTime?: string | null
  workManager?: string
  workManagerId?: number | null
  clientSource?: string
  clientSourceDescription?: string
  customerPhone?: string
  customerAdditionalPhone?: string
  customerEmail?: string
  customerType?: string
  customerLegalName?: string
  carBrand?: string
  carModel?: string
  carVin?: string
  branchId?: number | null
  branchTownName?: string
  branchAddress?: string
  mobileHash?: string
  printHash?: string | null
  partsPrice?: number
  transportCompanyAlias?: string
  transportCompanyPrice?: number
  paymentAmount?: number
  paymentsCount?: number
  issetPayments?: number
  personalComments?: OrderComment[]
  collectiveComments?: OrderComment[]
  denied_show?: boolean
  [key: string]: unknown
}

export interface OrderCustomerFieldData {
  id?: number | null
  fullName?: string
  firstname?: string
  lastname?: string
  fathername?: string
  phone?: string
  email?: string
  type?: string
  typeDescription?: string
  isInBlackList?: boolean
}

export interface OrderStatusFieldData {
  status: OrderStatus
  statusDescription: string
  history: Array<{
    status: string
    description: string
    date: string
    color?: string
  }>
  refusingReason?: string | null
  refusingReasonComment?: string | null
}

export interface OrderPaymentsFieldData {
  payments: Array<{
    id: number
    description?: string
    price?: number
    date?: string
  }>
  paymentAmount: number
  isSuccessBankPayment?: boolean
}

export interface OrderElementProduct {
  id?: number
  article?: string
  articleSearch?: string
  name?: string
  brand?: { id?: number; name?: string }
  weight?: number
}

export interface OrderElementItem {
  id?: number
  warehouseName?: string
  supplierAlias?: string
  product?: OrderElementProduct
}

/** Элемент из elements_for_manager_order_interface. */
export interface OrderElement {
  id: number
  quantity?: number
  status?: string
  statusDescription?: string
  description?: string
  oem?: string
  retailPrice?: number
  offerPrice?: number
  weight?: number
  itemId?: number | null
  item?: OrderElementItem | null
  /** Флаг подтверждения позиции (влияет на отмену в статусе confirmed). */
  confirmed?: boolean
  isWeightConfirmed?: boolean
  /** Срок под заказ (дней) — для текста копирования клиенту. */
  diffOfferTimeDays?: number
  [key: string]: unknown
}

/** Элемент истории заказов клиента (GET /order/{id}/customers_orders). */
export interface CustomerOrderHistoryElement {
  id: number
  offerBrand?: string
  offerArt?: string
  name?: string
  quantity?: number
  status?: string
}

export interface CustomerOrderHistoryItem {
  id: number
  number?: number | string
  acceptedDate?: string
  issueDate?: string
  elements?: CustomerOrderHistoryElement[]
}

export type CustomerOrdersHistoryType = 'vin' | 'phone'

export interface CheckElementsByApiResult {
  emptyOrderElementItem?: string[]
  canceledOrderElementItem?: string[]
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
