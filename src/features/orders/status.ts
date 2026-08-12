import type { OrderStatus } from '@/entities/order/types'

/** Короткие подписи (OrderStatusType::$choices). */
const LABELS: Record<string, string> = {
  accepted: 'Принят',
  confirmed: 'Подтвержден',
  notified_customer: 'Клиент оповещен',
  collected: 'Собран',
  packed: 'Упакован',
  issued: 'Выдан',
  canceled: 'Отменен',
}

/** Опции фильтра статуса списка (как CRM StatusSelect). */
export const ORDER_STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'accepted', label: LABELS.accepted },
  { value: 'confirmed', label: LABELS.confirmed },
  { value: 'notified_customer', label: LABELS.notified_customer },
  { value: 'canceled', label: LABELS.canceled },
  { value: 'collected', label: LABELS.collected },
  { value: 'issued', label: LABELS.issued },
  { value: 'packed', label: LABELS.packed },
]

/**
 * Подписи стадий списка (Order::ORDERS_LIST_DESCRIPTIONS).
 * Порядок стадий на бэке: accepted → notified_customer → confirmed → collected → packed → issued → canceled.
 */
export const ORDERS_LIST_STAGE_LABELS: Record<string, string> = {
  accepted: 'Новое обращение',
  notified_customer: 'Выставлен счёт',
  confirmed: 'Заказ подтвержден',
  collected: 'Заказ собран',
  packed: 'Заказ собран и ожидает отправку',
  issued: 'Выдан',
  canceled: 'Отменен',
}

export function orderStatusLabel(status: OrderStatus): string {
  return LABELS[status] ?? status
}

export function orderListStageLabel(status: OrderStatus, fallback?: string): string {
  return ORDERS_LIST_STAGE_LABELS[status] ?? fallback ?? orderStatusLabel(status)
}

export function orderStatusVariant(
  status: OrderStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'canceled') return 'destructive'
  if (status === 'issued') return 'secondary'
  if (status === 'confirmed' || status === 'notified_customer') return 'default'
  return 'outline'
}

/** Сумма заказа из списка: бэкенд отдаёт price в копейках. */
export function formatOrderListPrice(priceKopecks?: number | null): string {
  if (priceKopecks == null || Number.isNaN(Number(priceKopecks))) return '—'
  const rubles = Number(priceKopecks) / 100
  return `${new Intl.NumberFormat('ru-RU').format(rubles)} ₽`
}

export function formatRubles(amount?: number | null): string {
  if (amount == null || Number.isNaN(Number(amount))) return '—'
  return `${new Intl.NumberFormat('ru-RU').format(amount)} ₽`
}
