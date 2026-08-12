import type { AvailabilityFilter, ProductOffer } from '@/entities/product/types'
import { formatRubles } from '@/features/orders/status'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

function offerPriceLabel(offer: ProductOffer): string {
  const price = offer.offerPrice ?? offer.price
  if (price == null) return '—'
  return formatRubles(price)
}

function deliveryLabel(offer: ProductOffer): string {
  if (offer.deliveryDays == null) return '—'
  if (offer.deliveryDays === 0) return 'на складе'
  return `${offer.deliveryDays} дн.`
}

export interface SearchOffersTableProps {
  offers: ProductOffer[]
  loading?: boolean
  error?: boolean
  emptyText?: string
  canAdd: boolean
  addingItemId: number | null
  availabilityFilter: AvailabilityFilter
  availableCount: number
  orderCount: number
  onAvailabilityChange: (value: AvailabilityFilter) => void
  onAdd: (offer: ProductOffer) => void
}

export function SearchOffersTable({
  offers,
  loading,
  error,
  emptyText = 'Нет доступных предложений.',
  canAdd,
  addingItemId,
  availabilityFilter,
  availableCount,
  orderCount,
  onAvailabilityChange,
  onAdd,
}: SearchOffersTableProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'available', label: `В наличии (${availableCount})` },
            { id: 'order', label: `Под заказ (${orderCount})` },
            { id: 'all', label: 'Все' },
          ] as const
        ).map((opt) => (
          <Button
            key={opt.id}
            size="sm"
            variant={availabilityFilter === opt.id ? 'default' : 'outline'}
            onClick={() => onAvailabilityChange(opt.id)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">Ошибка загрузки предложений.</p>
      ) : offers.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              <TableHead>Склад</TableHead>
              <TableHead className="text-right">Цена</TableHead>
              <TableHead>Срок доставки</TableHead>
              <TableHead className="text-right">Кол-во</TableHead>
              <TableHead className="text-right">Действие</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {offers.map((offer) => (
              <TableRow
                key={offer.id}
                className={cn(addingItemId === offer.id && 'bg-muted/50')}
              >
                <TableCell>
                  <div className="font-medium">{offer.warehouseName || '—'}</div>
                  {offer.supplierAlias ? (
                    <div className="text-xs text-muted-foreground">{offer.supplierAlias}</div>
                  ) : null}
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {offerPriceLabel(offer)}
                </TableCell>
                <TableCell>{deliveryLabel(offer)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {offer.quantity ?? offer.stock ?? '—'}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    disabled={!canAdd || addingItemId === offer.id}
                    title={
                      canAdd
                        ? 'Добавить позицию в заказ'
                        : 'Укажите № заказа или откройте поиск из карточки'
                    }
                    onClick={() => onAdd(offer)}
                  >
                    {addingItemId === offer.id ? '…' : 'В заказ'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
