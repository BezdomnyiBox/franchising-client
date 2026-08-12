import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, RefreshCw } from 'lucide-react'
import type {
  AvailabilityFilter,
  OfferSortField,
  ProductOffer,
  SortDirection,
} from '@/entities/product/types'
import { sortOffers, updateProductItem } from '@/features/search/api'
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

function SortHead({
  label,
  field,
  active,
  direction,
  align = 'left',
  onSort,
}: {
  label: string
  field: OfferSortField
  active: OfferSortField
  direction: SortDirection
  align?: 'left' | 'right'
  onSort: (field: OfferSortField) => void
}) {
  const Icon =
    active !== field ? ArrowUpDown : direction === 'asc' ? ArrowUp : ArrowDown
  return (
    <TableHead className={align === 'right' ? 'text-right' : undefined}>
      <button
        type="button"
        className={cn(
          'inline-flex items-center gap-1 font-medium hover:text-foreground',
          align === 'right' && 'flex-row-reverse',
          active === field ? 'text-foreground' : 'text-muted-foreground',
        )}
        onClick={() => onSort(field)}
      >
        {label}
        <Icon className="size-3.5" />
      </button>
    </TableHead>
  )
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
  orderId?: number
  branchId?: number
  onAvailabilityChange: (value: AvailabilityFilter) => void
  onAdd: (offer: ProductOffer) => void
  onOfferPatched?: (offer: ProductOffer) => void
  onNeedFullReload?: () => void
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
  orderId,
  branchId,
  onAvailabilityChange,
  onAdd,
  onOfferPatched,
  onNeedFullReload,
}: SearchOffersTableProps) {
  const [sortField, setSortField] = useState<OfferSortField>('price')
  const [sortDir, setSortDir] = useState<SortDirection>('asc')
  const [refreshingId, setRefreshingId] = useState<number | null>(null)
  const [autoTried, setAutoTried] = useState<Set<number>>(() => new Set())

  const sorted = useMemo(
    () => sortOffers(offers, sortField, sortDir),
    [offers, sortField, sortDir],
  )

  const onSort = (field: OfferSortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortField(field)
    setSortDir(field === 'warehouse' ? 'asc' : 'asc')
  }

  const refreshOffer = async (offer: ProductOffer) => {
    if (refreshingId === offer.id) return
    setRefreshingId(offer.id)
    try {
      const updated = await updateProductItem(offer.id, { orderId, branchId })
      onOfferPatched?.(updated)
      if (updated.needUpdate) onNeedFullReload?.()
    } finally {
      setRefreshingId(null)
    }
  }

  /** Ленивое автообновление API-складов (как UpdateIndicator в CRM). */
  useEffect(() => {
    const candidates = offers.filter(
      (o) =>
        o.updateable &&
        !['autopiter', 'emex', 'berg'].includes(String(o.supplierAlias ?? '')) &&
        !autoTried.has(o.id),
    )
    if (!candidates.length) return

    const next = candidates.slice(0, 3)
    setAutoTried((prev) => {
      const copy = new Set(prev)
      next.forEach((o) => copy.add(o.id))
      return copy
    })

    void (async () => {
      for (const offer of next) {
        try {
          const updated = await updateProductItem(offer.id, { orderId, branchId })
          onOfferPatched?.(updated)
          if (updated.needUpdate) {
            onNeedFullReload?.()
            break
          }
        } catch {
          /* ignore single refresh errors */
        }
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- auto once per new offer ids
  }, [offers.map((o) => o.id).join(',')])

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
      ) : sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <SortHead
                label="Склад"
                field="warehouse"
                active={sortField}
                direction={sortDir}
                onSort={onSort}
              />
              <SortHead
                label="Цена"
                field="price"
                active={sortField}
                direction={sortDir}
                align="right"
                onSort={onSort}
              />
              <TableHead className="w-10" />
              <SortHead
                label="Срок доставки"
                field="delivery"
                active={sortField}
                direction={sortDir}
                onSort={onSort}
              />
              <SortHead
                label="Кол-во"
                field="quantity"
                active={sortField}
                direction={sortDir}
                align="right"
                onSort={onSort}
              />
              <TableHead className="text-right">Действие</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((offer) => (
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
                  {offer.multiplicity && offer.multiplicity > 1 ? (
                    <div className="text-xs text-amber-600">×{offer.multiplicity}</div>
                  ) : null}
                </TableCell>
                <TableCell>
                  {offer.updateable ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      title="Обновить остаток у поставщика"
                      disabled={refreshingId === offer.id}
                      onClick={() => void refreshOffer(offer)}
                    >
                      <RefreshCw
                        className={cn(
                          'size-3.5',
                          refreshingId === offer.id && 'animate-spin',
                        )}
                      />
                    </Button>
                  ) : null}
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
