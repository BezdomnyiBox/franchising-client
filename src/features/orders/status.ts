import type { OrderStatus } from '@/entities/order/types'

const LABELS: Record<string, string> = {
  accepted: 'Принят',
  collected: 'Собран',
  packed: 'Упакован',
  confirmed: 'Подтверждён',
  notified_customer: 'Клиент уведомлён',
  issued: 'Выдан',
  canceled: 'Отменён',
}

export function orderStatusLabel(status: OrderStatus): string {
  return LABELS[status] ?? status
}

export function orderStatusVariant(
  status: OrderStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'canceled') return 'destructive'
  if (status === 'issued') return 'secondary'
  if (status === 'confirmed' || status === 'notified_customer') return 'default'
  return 'outline'
}
