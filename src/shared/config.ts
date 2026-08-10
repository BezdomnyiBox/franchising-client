export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

/** Смещение публичного номера заказа → internal id (как в CRM). */
export const ORDER_NUMBER_OFFSET = 40777

export function publicNumberToOrderId(publicNumber: string | number): number {
  return Number(publicNumber) + ORDER_NUMBER_OFFSET
}

export function orderIdToPublicNumber(orderId: string | number): number {
  return Number(orderId) - ORDER_NUMBER_OFFSET
}
