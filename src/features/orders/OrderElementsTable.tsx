import { useEffect, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Copy, Pencil, Plus, ShoppingCart, Zap, X } from 'lucide-react'
import { toast } from 'sonner'
import { SearchForOrderDialog } from '@/features/search/SearchForOrderDialog'
import { patchOrderElementOem } from '@/features/search/api'
import {
  addBlankOrderElement,
  cancelOrderElement,
  confirmOrderElementWeight,
  patchOrderElementDescription,
  patchOrderElementQuantity,
  patchOrderElementRetailPrice,
  patchOrderElementWeight,
} from '@/features/orders/api'
import {
  ElementFieldEditor,
  type ElementFieldKind,
} from '@/features/orders/ElementFieldEditor'
import type { OrderElement } from '@/entities/order/types'
import { formatRubles } from '@/features/orders/status'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

const FAST_ITEMS_ARTICLE = 'fastitems'
const FAST_ITEMS_PRODUCT_ID = 7025635

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

function canAddBlankRow(orderStatus?: string): boolean {
  return ['accepted', 'notified_customer', 'confirmed'].includes(orderStatus ?? '')
}

/** Как в CRM OrderElement: скрыто для issued/returned. */
function canCancelElement(orderStatus?: string, elementStatus?: string, confirmed?: boolean): boolean {
  if (elementStatus === 'issued' || elementStatus === 'returned' || elementStatus === 'canceled') {
    return false
  }
  if (['accepted', 'notified_customer'].includes(orderStatus ?? '')) return true
  if (orderStatus === 'confirmed') {
    return [null, undefined, '', 'missed'].includes(elementStatus as string | null | undefined)
  }
  if ([null, undefined, ''].includes(elementStatus as string | null | undefined) && !confirmed) {
    return true
  }
  return false
}

function canEditQuantity(orderStatus?: string, elementStatus?: string): boolean {
  if (!['accepted', 'notified_customer', 'confirmed'].includes(orderStatus ?? '')) return false
  return [null, undefined, '', 'base'].includes(elementStatus as string | null | undefined)
}

function canEditRetailPrice(elementStatus?: string): boolean {
  return [null, undefined, '', 'base'].includes(elementStatus as string | null | undefined)
}

function canEditWeight(orderStatus?: string, elementStatus?: string): boolean {
  if (
    !['accepted', 'notified_customer', 'confirmed', 'collected'].includes(orderStatus ?? '')
  ) {
    return false
  }
  return [null, undefined, '', 'ordered', 'base'].includes(
    elementStatus as string | null | undefined,
  )
}

function canEditDescription(orderStatus?: string, elementStatus?: string): boolean {
  if (orderStatus === 'canceled' || orderStatus === 'issued') return false
  if (elementStatus === 'canceled' || elementStatus === 'issued' || elementStatus === 'returned') {
    return false
  }
  return true
}

function canConfirmWeight(el: OrderElement): boolean {
  const weight = el.weight ?? el.item?.product?.weight ?? 0
  return weight > 0 && !el.isWeightConfirmed
}

function buildCopyTextForClient(elements: OrderElement[], orderNumber: number | string): string {
  const lines = elements
    .filter(
      (el) =>
        (el.retailPrice ?? 0) !== 0 &&
        !['missed', 'returned', 'canceled'].includes(el.status ?? ''),
    )
    .map((el) => {
      const name = el.description || el.item?.product?.name || ''
      const brand = el.item?.product?.brand?.name || ''
      const price = (el.retailPrice ?? 0) / 100
      const qty = el.quantity ?? 0
      const sum = price * qty
      const days =
        typeof el.diffOfferTimeDays === 'number' && el.diffOfferTimeDays > 0
          ? `под заказ ${el.diffOfferTimeDays} дней`
          : ''
      return `${name} ${brand} ${price} x ${qty} = ${sum} руб. ${days}`.trim()
    })

  return [
    'Добрый день! Интересующие запчасти есть в наличии:',
    ...lines,
    '',
    `По Вашему обращению оформлен предварительный заказ № ${orderNumber}. Вы можете позвонить по номеру 8 800 775 95 07 (звонок бесплатный), внести корректировки или подтвердить заказ. Либо напишите номер телефона, я вам перезвоню.`,
  ].join('\n')
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
  const canceledCount = useMemo(
    () => elements.filter((el) => el.status === 'canceled').length,
    [elements],
  )
  const allCanceled = elements.length > 0 && canceledCount === elements.length

  const [showCanceled, setShowCanceled] = useState(allCanceled)
  const [oemDrafts, setOemDrafts] = useState<Record<number, string>>({})
  const [searchTarget, setSearchTarget] = useState<{
    elementId: number
    article: string
    productId?: number | null
  } | null>(null)
  const [savingOemId, setSavingOemId] = useState<number | null>(null)
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null)
  const [confirmWeightId, setConfirmWeightId] = useState<number | null>(null)
  const [copyTextOpen, setCopyTextOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<{
    element: OrderElement
    kind: ElementFieldKind
  } | null>(null)

  useEffect(() => {
    if (allCanceled) setShowCanceled(true)
  }, [allCanceled])

  const rows = useMemo(
    () => (showCanceled ? elements : elements.filter((el) => el.status !== 'canceled')),
    [elements, showCanceled],
  )

  const activeRows = useMemo(
    () => elements.filter((el) => el.status !== 'canceled'),
    [elements],
  )

  const totals = useMemo(() => {
    return activeRows.reduce(
      (acc, el) => {
        const qty = el.quantity ?? 0
        const price = el.retailPrice ?? 0
        acc.qty += qty
        acc.sum += (price * qty) / 100
        return acc
      },
      { qty: 0, sum: 0 },
    )
  }, [activeRows])

  const copyText = useMemo(
    () => buildCopyTextForClient(elements, orderNumber),
    [elements, orderNumber],
  )

  const oemValue = (el: OrderElement) =>
    oemDrafts[el.id] !== undefined ? oemDrafts[el.id] : (el.oem ?? '')

  const openSearch = async (
    el: OrderElement,
    saveOemFirst: boolean,
    overrides?: { article?: string; productId?: number | null },
  ) => {
    if (!canOpenSearch(orderStatus, el.status)) {
      toast.error('Поиск недоступен для этого статуса')
      return
    }

    const article = overrides?.article ?? oemValue(el).trim()

    if (saveOemFirst && !overrides) {
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
      productId:
        overrides?.productId !== undefined
          ? overrides.productId
          : (el.item?.product?.id ?? null),
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

  const addBlankMutation = useMutation({
    mutationFn: () => addBlankOrderElement(orderId),
    onSuccess: () => {
      toast.success('Строка добавлена')
      onRefresh()
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Не удалось добавить строку')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (elementId: number) => cancelOrderElement(elementId),
    onSuccess: () => {
      toast.success('Позиция отменена')
      setCancelTargetId(null)
      onRefresh()
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Не удалось отменить позицию')
    },
  })

  const confirmWeightMutation = useMutation({
    mutationFn: (elementId: number) => confirmOrderElementWeight(elementId),
    onSuccess: () => {
      toast.success('Вес подтверждён')
      setConfirmWeightId(null)
      onRefresh()
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Не удалось подтвердить вес')
      setConfirmWeightId(null)
    },
  })

  const editMutation = useMutation({
    mutationFn: async ({
      elementId,
      kind,
      value,
    }: {
      elementId: number
      kind: ElementFieldKind
      value: string | number
    }) => {
      switch (kind) {
        case 'quantity':
          await patchOrderElementQuantity(elementId, Number(value))
          break
        case 'retailPrice':
          await patchOrderElementRetailPrice(elementId, Number(value))
          break
        case 'description':
          await patchOrderElementDescription(elementId, String(value))
          break
        case 'weight':
          await patchOrderElementWeight(elementId, Number(value))
          break
      }
    },
    onSuccess: () => {
      toast.success('Сохранено')
      setEditTarget(null)
      onRefresh()
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Не удалось сохранить')
    },
  })

  const editInitialValue = (() => {
    if (!editTarget) return ''
    const { element, kind } = editTarget
    if (kind === 'quantity') return element.quantity ?? 1
    if (kind === 'retailPrice') return (element.retailPrice ?? 0) / 100
    if (kind === 'weight') return element.weight ?? element.item?.product?.weight ?? 0
    return element.description || element.item?.product?.name || ''
  })()

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(copyText)
      toast.success('Текст скопирован')
    } catch {
      toast.error('Не удалось скопировать в буфер')
    }
  }

  const addBlankButton = (
    <Button
      type="button"
      variant="outline"
      disabled={!canAddBlankRow(orderStatus) || addBlankMutation.isPending}
      onClick={() => addBlankMutation.mutate()}
    >
      <Plus className="size-4" />
      {addBlankMutation.isPending ? 'Добавление…' : 'Добавить строку'}
    </Button>
  )

  const canceledToggle =
    canceledCount > 0 ? (
      <div className="flex items-center gap-2">
        <Switch
          id="show-canceled"
          checked={showCanceled}
          onCheckedChange={setShowCanceled}
          size="sm"
        />
        <Label htmlFor="show-canceled" className="text-sm font-normal">
          Показать отмененные товары
        </Label>
      </div>
    ) : null

  if (rows.length === 0) {
    return (
      <div className="space-y-4">
        {canceledToggle}
        <p className="text-sm text-muted-foreground">
          Позиций пока нет. Добавьте пустую строку или подберите товар через поиск.
        </p>
        {addBlankButton}
      </div>
    )
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-4 text-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <span className="text-muted-foreground">Кол-во: </span>
            <span className="font-medium">{totals.qty}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Сумма: </span>
            <span className="font-medium">{formatRubles(totals.sum)}</span>
          </div>
          {canceledToggle}
        </div>
        {addBlankButton}
      </div>

      <Table className="min-w-[1100px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>ОЕМ</TableHead>
            <TableHead>Бренд</TableHead>
            <TableHead>Артикул</TableHead>
            <TableHead>Наименование</TableHead>
            <TableHead>Склад</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead className="text-right">Вес</TableHead>
            <TableHead className="text-right">Кол-во</TableHead>
            <TableHead className="text-right">Цена</TableHead>
            <TableHead className="text-right">Сумма</TableHead>
            <TableHead className="w-36" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((el, index) => {
            const qty = el.quantity ?? 0
            const price = el.retailPrice ?? 0
            const selected = hasSelectedItem(el)
            const isCanceled = el.status === 'canceled'
            const searchable = !isCanceled && canOpenSearch(orderStatus, el.status)
            const cancelable =
              !isCanceled &&
              canCancelElement(orderStatus, el.status, Boolean(el.confirmed))
            const weightEditable = !isCanceled && canEditWeight(orderStatus, el.status)
            const qtyEditable = !isCanceled && canEditQuantity(orderStatus, el.status)
            const priceEditable = !isCanceled && canEditRetailPrice(el.status)
            const descEditable = !isCanceled && canEditDescription(orderStatus, el.status)
            const showWeightConfirm = !isCanceled && canConfirmWeight(el)
            const weightConfirmed = Boolean(el.isWeightConfirmed)

            return (
              <TableRow
                key={el.id}
                className={cn(isCanceled && 'bg-muted/40 text-muted-foreground')}
              >
                <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                <TableCell>
                  {selected || isCanceled ? (
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
                <TableCell className="max-w-[16rem]">
                  <button
                    type="button"
                    className={cn(
                      'truncate text-left hover:underline',
                      descEditable ? 'cursor-pointer' : 'cursor-default',
                    )}
                    title={elementName(el)}
                    disabled={!descEditable}
                    onClick={() =>
                      descEditable && setEditTarget({ element: el, kind: 'description' })
                    }
                  >
                    {elementName(el)}
                  </button>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {el.item?.warehouseName || '—'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{el.statusDescription || el.status || '—'}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      className={cn(
                        'inline-flex items-center gap-1 tabular-nums',
                        weightEditable && 'hover:underline',
                        !el.weight && 'text-destructive',
                      )}
                      disabled={!weightEditable}
                      onClick={() =>
                        weightEditable && setEditTarget({ element: el, kind: 'weight' })
                      }
                    >
                      {el.weight != null ? el.weight : '0'}
                      {weightEditable ? <Pencil className="size-3 opacity-50" /> : null}
                    </button>
                    {showWeightConfirm || weightConfirmed ? (
                      <Checkbox
                        checked={weightConfirmed}
                        disabled={weightConfirmed || confirmWeightMutation.isPending}
                        title={
                          weightConfirmed ? 'Вес подтверждён' : 'Подтвердить вес'
                        }
                        onCheckedChange={(checked) => {
                          if (!checked || weightConfirmed) return
                          setConfirmWeightId(el.id)
                          confirmWeightMutation.mutate(el.id)
                        }}
                        className={cn(
                          confirmWeightId === el.id && confirmWeightMutation.isPending &&
                            'opacity-50',
                        )}
                      />
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <button
                    type="button"
                    className={cn(
                      'inline-flex items-center gap-1 tabular-nums font-medium',
                      qtyEditable && 'hover:underline',
                    )}
                    disabled={!qtyEditable}
                    onClick={() =>
                      qtyEditable && setEditTarget({ element: el, kind: 'quantity' })
                    }
                  >
                    {qty || '—'}
                    {qtyEditable ? <Pencil className="size-3 opacity-50" /> : null}
                  </button>
                </TableCell>
                <TableCell className="text-right">
                  <button
                    type="button"
                    className={cn(
                      'inline-flex items-center gap-1 tabular-nums',
                      priceEditable && 'hover:underline',
                    )}
                    disabled={!priceEditable}
                    onClick={() =>
                      priceEditable && setEditTarget({ element: el, kind: 'retailPrice' })
                    }
                  >
                    {formatKopecks(price)}
                    {priceEditable ? <Pencil className="size-3 opacity-50" /> : null}
                  </button>
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {formatRubles((price * qty) / 100)}
                </TableCell>
                <TableCell>
                  {!isCanceled ? (
                    <div className="flex items-center justify-end gap-1">
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
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className={cn('px-2', !searchable && 'opacity-40')}
                        title="Быстрый подбор (fastitems)"
                        disabled={!searchable || savingOemId === el.id}
                        onClick={() =>
                          void openSearch(el, false, {
                            article: FAST_ITEMS_ARTICLE,
                            productId: FAST_ITEMS_PRODUCT_ID,
                          })
                        }
                      >
                        <Zap className="size-4" />
                      </Button>
                      {cancelable ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="px-2 text-destructive"
                          title="Отменить позицию"
                          disabled={cancelMutation.isPending && cancelTargetId === el.id}
                          onClick={() => {
                            if (!window.confirm('Отменить эту позицию?')) return
                            setCancelTargetId(el.id)
                            cancelMutation.mutate(el.id)
                          }}
                        >
                          <X className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <div className="mt-4 space-y-3">
        {addBlankButton}

        <div className="rounded-lg border">
          <button
            type="button"
            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm underline-offset-2 hover:underline"
            onClick={() => setCopyTextOpen((prev) => !prev)}
          >
            Текст для копирования
            <span className="text-xs text-muted-foreground">
              {copyTextOpen ? 'скрыть' : 'показать'}
            </span>
          </button>
          {copyTextOpen ? (
            <div className="space-y-3 border-t px-3 py-3">
              <pre className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                {copyText}
              </pre>
              <Button type="button" variant="outline" size="sm" onClick={() => void copyToClipboard()}>
                <Copy className="size-3.5" />
                Копировать
              </Button>
            </div>
          ) : null}
        </div>
      </div>

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

      <ElementFieldEditor
        open={editTarget != null}
        kind={editTarget?.kind ?? null}
        initialValue={editInitialValue}
        saving={editMutation.isPending}
        onClose={() => setEditTarget(null)}
        onSave={async (value) => {
          if (!editTarget) return
          await editMutation.mutateAsync({
            elementId: editTarget.element.id,
            kind: editTarget.kind,
            value,
          })
        }}
      />
    </>
  )
}
