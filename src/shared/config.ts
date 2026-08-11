/** Публичный base path SPA (prod: podzamenu.ru/crm_fr, LAN: public.lan/crm_fr) */
export const APP_BASE_PATH = (
  import.meta.env.VITE_APP_BASE_PATH || '/crm_fr'
).replace(/\/$/, '')

/** Same-origin gateway: /crm_fr/api → бэкенд (Vite/Apache/Nginx proxy). */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? `${APP_BASE_PATH}/api`

/** Смещение публичного номера заказа → internal id (как в CRM). */
export const ORDER_NUMBER_OFFSET = 40777

export function publicNumberToOrderId(publicNumber: string | number): number {
  return Number(publicNumber) + ORDER_NUMBER_OFFSET
}

export function orderIdToPublicNumber(orderId: string | number): number {
  return Number(orderId) - ORDER_NUMBER_OFFSET
}
