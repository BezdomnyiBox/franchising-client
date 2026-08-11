import { useEffect, useMemo, useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import { SearchForOrderDialog } from '@/features/search/SearchForOrderDialog'
import { patchOrderElementOem } from '@/features/search/api'
import type { OrderElement } from '@/entities/order/types'
import { formatRubles } from '@/features/orders/status'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

function elementBrand(el: OrderElement): string {
  return el.item?.product?.brand?.name || '—'
}

function elementArticle(el: OrderElement): string {
  return el.item?.product?.articleSearch || el.item?.product?.article || '—'
}

function elementName(el: OrderElement): string {
  return el.description || el.item?.product?.name || '—'
}

function hasSelectedItem(el: OrderElement): boolean {
  return Boolean(el.itemId || el.item?.id)
}

function formatKopecks(value?: number | null): string {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return formatRubles(Number(value) / 100)
}

function canOpenSearch(orderStatus?: string, elementStatus?: string): boolean {
  if (orderStatus === 'canceled' || orderStatus === 'issued') return false
  if (elementStatus === 'canceled' || elementStatus === 'issued' || elementStatus === 'returned') {
    return false
  }
  return true
}

export interface OrderElementsTableProps {
  orderId: number
  orderNumber: number | string
  orderStatus?: string
  userId?: number
  elements: OrderElement[]
  onRefresh: () => void
  /** Инкремент — открыть поиск для первой позиции без товара / первой доступной. */
  openSearchToken?: number
}

export function OrderElementsTable({
  orderId,
  orderNumber,
  orderStatus,
  userId,
  elements,
  onRefresh,
  openSearchToken = 0,
}: OrderElementsTableProps) {
  const [oemDrafts, setOemDrafts] = useState<Record<number, string>>({})
  const [searchTarget, setSearchTarget] = useState<{
    elementId: number
    article: string
    productId?: number | null
  } | null>(null)
  const [savingOemId, setSavingOemId] = useState<number | null>(null)

  const rows = useMemo(
    () => elements.filter((el) => el.status !== 'canceled'),
    [elements],
  )

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, el) => {
        const qty = el.quantity ?? 0
        const price = el.retailPrice ?? 0
        acc.qty += qty
        acc.sum += (price * qty) / 100
        return acc
      },
      { qty: 0, sum: 0 },
    )
  }, [rows])

  const oemValue = (el: OrderElement) =>
    oemDrafts[el.id] !== undefined ? oemDrafts[el.id] : (el.oem ?? '')

  const openSearch = async (el: OrderElement, saveOemFirst: boolean) => {
    if (!canOpenSearch(orderStatus, el.status)) {
      toast.error('Поиск недоступен для этого статуса')
      return
    }

    const article = oemValue(el).trim()

    if (saveOemFirst) {
      setSavingOemId(el.id)
      try {
        await patchOrderElementOem(el.id, article || el.oem || '')
      } catch {
        toast.error('Не удалось сохранить ОЕМ')
        setSavingOemId(null)
        return
      }
      setSavingOemId(null)
    }

    setSearchTarget({
      elementId: el.id,
      article,
      productId: el.item?.product?.id ?? null,
    })
  }

  useEffect(() => {
    if (!openSearchToken) return
    const target =
      rows.find((el) => canOpenSearch(orderStatus, el.status) && !hasSelectedItem(el)) ??
      rows.find((el) => canOpenSearch(orderStatus, el.status))
    if (!target) {
      toast.error('Нет позиции для подбора товара')
      return
    }
    void openSearch(target, false)
  }, [openSearchToken])

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Позиций пока нет. После создания заказа появится заглушка «Деталь» — подставьте товар через
        ОЕМ / корзину.
      </p>
    )
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Кол-во: </span>
          <span className="font-medium">{totals.qty}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Сумма: </span>
          <span className="font-medium">{formatRubles(totals.sum)}</span>
        </div>
      </div>

      <Table className="min-w-[980px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>ОЕМ</TableHead>
            <TableHead>Бренд</TableHead>
            <TableHead>Артикул</TableHead>
            <TableHead>Наименование</TableHead>
            <TableHead>Склад</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead className="text-right">Кол-во</TableHead>
            <TableHead className="text-right">Цена</TableHead>
            <TableHead className="text-right">Сумма</TableHead>
            <TableHead className="w-14" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((el, index) => {
            const qty = el.quantity ?? 0
            const price = el.retailPrice ?? 0
            const selected = hasSelectedItem(el)
            const searchable = canOpenSearch(orderStatus, el.status)

            return (
              <TableRow key={el.id}>
                <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                <TableCell>
                  {selected ? (
                    <span className="font-mono text-xs text-muted-foreground">
                      {el.oem || '—'}
                    </span>
                  ) : (
                    <Input
                      className="h-8 w-28 font-mono text-xs"
                      placeholder="ОЕМ"
                      value={oemValue(el)}
                      disabled={!searchable}
                      onChange={(e) =>
                        setOemDrafts((prev) => ({ ...prev, [el.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void openSearch(el, false)
                        }
                      }}
                    />
                  )}
                </TableCell>
                <TableCell className="font-medium">{elementBrand(el)}</TableCell>
                <TableCell className="font-mono text-xs">{elementArticle(el)}</TableCell>
                <TableCell className="max-w-[16rem] truncate" title={elementName(el)}>
                  {elementName(el)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {el.item?.warehouseName || '—'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{el.statusDescription || el.status || '—'}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{qty || '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{formatKopecks(price)}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {formatRubles((price * qty) / 100)}
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={cn('px-2', !searchable && 'opacity-40')}
                    title={selected ? 'Заменить товар' : 'Подобрать товар'}
                    disabled={!searchable || savingOemId === el.id}
                    onClick={() => void openSearch(el, true)}
                  >
                    <ShoppingCart className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <SearchForOrderDialog
        open={searchTarget != null}
        orderId={orderId}
        orderNumber={orderNumber}
        orderElementId={searchTarget?.elementId ?? 0}
        initArticle={searchTarget?.article}
        productId={searchTarget?.productId}
        userId={userId}
        onClose={() => setSearchTarget(null)}
        onSuccess={onRefresh}
      />
    </>
  )
}
