import { useEffect, useMemo, useRef, useState } from 'react'
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

const SKIP_AUTO_SUPPLIERS = new Set(['autopiter', 'emex', 'berg'])
/** Свежесть как в CRM UpdateIndicator: 2 суток. */
const FRESH_PERIOD_MIN = 2880

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

function parseUpdateTime(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'string') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof value === 'object' && value && 'date' in value) {
    const d = new Date(String((value as { date: string }).date))
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

function minutesAgo(date: Date | null): number {
  if (!date) return FRESH_PERIOD_MIN
  return Math.max(0, Math.ceil((Date.now() - date.getTime()) / 60_000))
}

function freshnessColor(minutes: number): string {
  const left = Math.max(0, FRESH_PERIOD_MIN - minutes)
  const pct = (left / FRESH_PERIOD_MIN) * 100
  if (pct >= 99.9) return '#34CC00'
  if (pct >= 99) return '#88FF00'
  if (pct >= 70) return '#EEEA00'
  if (pct >= 50) return '#FFB000'
  if (pct >= 20) return '#FF6000'
  return '#EF0000'
}

function formatRelevance(minutes: number): string {
  if (!minutes) return 'менее минуты'
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60
  return [
    days > 0 ? `${days}д` : '',
    hours > 0 ? `${hours}ч` : '',
    mins > 0 ? `${mins}м` : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function shouldAutoUpdate(offer: ProductOffer): boolean {
  return Boolean(
    offer.updateable && !SKIP_AUTO_SUPPLIERS.has(String(offer.supplierAlias ?? '')),
  )
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
    <TableHead className={cn('sticky top-0 z-10 bg-background', align === 'right' && 'text-right')}>
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

function OfferUpdateControl({
  offer,
  updating,
  onRefresh,
}: {
  offer: ProductOffer
  updating: boolean
  onRefresh: () => void
}) {
  if (!offer.updateable) return null

  const updatedAt = parseUpdateTime(offer.updateTime)
  const mins = minutesAgo(updatedAt)
  const color = freshnessColor(mins)
  const title = updatedAt
    ? `${formatRelevance(mins)} · ${updatedAt.toLocaleString('ru-RU')}`
    : 'Обновить остаток у поставщика'

  return (
    <button
      type="button"
      title={title}
      disabled={updating}
      onClick={onRefresh}
      className={cn(
        'relative inline-flex size-7 items-center justify-center rounded-full border bg-background',
        updating ? 'cursor-wait opacity-70' : 'hover:bg-muted',
      )}
      style={{ borderColor: color }}
    >
      <span
        className="absolute inset-0 rounded-full opacity-30"
        style={{ boxShadow: `inset 0 0 0 2px ${color}` }}
      />
      <RefreshCw className={cn('size-3.5', updating && 'animate-spin')} style={{ color }} />
    </button>
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
  const [refreshingIds, setRefreshingIds] = useState<Set<number>>(() => new Set())
  const [pendingCount, setPendingCount] = useState(0)

  const autoTriedRef = useRef<Set<number>>(new Set())
  const queueRef = useRef<number[]>([])
  const runningRef = useRef(false)
  const cancelledRef = useRef(false)
  const offersByIdRef = useRef<Map<number, ProductOffer>>(new Map())
  const callbacksRef = useRef({ onOfferPatched, onNeedFullReload, orderId, branchId })

  callbacksRef.current = { onOfferPatched, onNeedFullReload, orderId, branchId }

  const sorted = useMemo(
    () => sortOffers(offers, sortField, sortDir),
    [offers, sortField, sortDir],
  )

  useEffect(() => {
    offersByIdRef.current = new Map(offers.map((o) => [o.id, o]))
  }, [offers])

  const syncPending = () => setPendingCount(queueRef.current.length)

  const setRefreshing = (id: number, active: boolean) => {
    setRefreshingIds((prev) => {
      const next = new Set(prev)
      if (active) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const runQueue = async () => {
    if (runningRef.current) return
    runningRef.current = true

    while (queueRef.current.length > 0 && !cancelledRef.current) {
      const itemId = queueRef.current.shift()!
      syncPending()
      const offer = offersByIdRef.current.get(itemId)
      if (!offer || !shouldAutoUpdate(offer)) continue

      setRefreshing(itemId, true)
      try {
        const { orderId: oid, branchId: bid, onOfferPatched: patch, onNeedFullReload: reload } =
          callbacksRef.current
        const updated = await updateProductItem(itemId, {
          orderId: oid,
          branchId: bid,
        })
        if (cancelledRef.current) break
        patch?.(updated)
        if (updated.needUpdate) {
          reload?.()
          queueRef.current = []
          syncPending()
          break
        }
      } catch {
        /* одна ошибка поставщика не останавливает очередь */
      } finally {
        setRefreshing(itemId, false)
      }
    }

    runningRef.current = false
    syncPending()
  }

  /** Как в CRM SearchProductItem: каждый updateable-оффер лениво бьёт update_item. */
  useEffect(() => {
    cancelledRef.current = false

    const candidates = offers.filter(shouldAutoUpdate)
    let added = false
    for (const offer of candidates) {
      if (autoTriedRef.current.has(offer.id)) continue
      autoTriedRef.current.add(offer.id)
      queueRef.current.push(offer.id)
      added = true
    }
    if (added) syncPending()

    void runQueue()

    return () => {
      cancelledRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- полный проход по новым id офферов
  }, [offers.map((o) => o.id).join(',')])

  /** Сброс «уже обновляли», если сменился набор поиска. */
  const offersSignature = offers.map((o) => o.id).join(',')
  const prevSignature = useRef(offersSignature)
  useEffect(() => {
    if (prevSignature.current === offersSignature) return
    const prevIds = new Set(
      prevSignature.current
        .split(',')
        .filter(Boolean)
        .map(Number),
    )
    const nextIds = offers.map((o) => o.id)
    const overlap = nextIds.filter((id) => prevIds.has(id)).length
    if (nextIds.length > 0 && overlap < nextIds.length * 0.5) {
      autoTriedRef.current = new Set()
      queueRef.current = []
      syncPending()
    }
    prevSignature.current = offersSignature
  }, [offersSignature, offers])

  const onSort = (field: OfferSortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortField(field)
    setSortDir('asc')
  }

  const refreshOffer = async (offer: ProductOffer) => {
    if (refreshingIds.has(offer.id)) return
    setRefreshing(offer.id, true)
    try {
      const updated = await updateProductItem(offer.id, { orderId, branchId })
      onOfferPatched?.(updated)
      if (updated.needUpdate) onNeedFullReload?.()
    } finally {
      setRefreshing(offer.id, false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
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
        {refreshingIds.size > 0 || pendingCount > 0 ? (
          <span className="text-xs text-muted-foreground">
            Обновление API-складов… (
            {refreshingIds.size} в работе
            {pendingCount > 0 ? `, в очереди ${pendingCount}` : ''})
          </span>
        ) : null}
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
        <div className="max-h-[min(60vh,560px)] overflow-auto rounded-md border">
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
                <TableHead className="sticky top-0 z-10 w-10 bg-background" />
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
                <TableHead className="sticky top-0 z-10 bg-background text-right">
                  Действие
                </TableHead>
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
                    <OfferUpdateControl
                      offer={offer}
                      updating={refreshingIds.has(offer.id)}
                      onRefresh={() => void refreshOffer(offer)}
                    />
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
        </div>
      )}
    </div>
  )
}
