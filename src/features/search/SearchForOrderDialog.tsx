import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import {
  fetchProductSearch,
  fetchProductSearchCount,
  fetchProductTips,
  formatTipLabel,
  setOrderElementItem,
  addAccompanyingItem,
} from '@/features/search/api'
import type { ProductOffer, ProductTip } from '@/entities/product/types'
import { formatRubles } from '@/features/orders/status'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

export interface SearchForOrderDialogProps {
  open: boolean
  orderId: number
  orderNumber: number | string
  orderElementId: number
  initArticle?: string
  productId?: number | null
  userId?: number
  onClose: () => void
  onSuccess: () => void
}

function offerPriceLabel(offer: ProductOffer): string {
  const price = offer.offerPrice ?? offer.price
  if (price == null) return '—'
  return formatRubles(price)
}

export function SearchForOrderDialog({
  open,
  orderId,
  orderNumber,
  orderElementId,
  initArticle = '',
  productId = null,
  userId,
  onClose,
  onSuccess,
}: SearchForOrderDialogProps) {
  const [query, setQuery] = useState(initArticle)
  const [debounced, setDebounced] = useState(initArticle.trim())
  const [selectedTip, setSelectedTip] = useState<ProductTip | null>(null)
  const [pickingId, setPickingId] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    setQuery(initArticle)
    setDebounced(initArticle.trim())
    setSelectedTip(null)
  }, [open, initArticle, orderElementId])

  useEffect(() => {
    if (!open) return
    const id = window.setTimeout(() => setDebounced(query.trim()), 300)
    return () => window.clearTimeout(id)
  }, [query, open])

  const tipsQuery = useQuery({
    queryKey: ['product-tips', debounced],
    queryFn: () => fetchProductTips({ q: debounced }),
    enabled: open && debounced.length >= 2,
  })

  useEffect(() => {
    if (!open || !tipsQuery.data?.length) return
    if (selectedTip) return

    const preferred =
      (productId
        ? tipsQuery.data.find((t) => t.id === productId)
        : null) ??
      tipsQuery.data.reduce<ProductTip | null>((best, tip) => {
        if (!best) return tip
        return (tip.itemsCount ?? 0) > (best.itemsCount ?? 0) ? tip : best
      }, null)

    if (preferred) setSelectedTip(preferred)
  }, [tipsQuery.data, open, productId, selectedTip])

  const countQuery = useQuery({
    queryKey: ['product-search-count', selectedTip?.id, orderId],
    queryFn: () => fetchProductSearchCount(selectedTip!.id, orderId),
    enabled: open && selectedTip != null,
  })

  const offersQuery = useQuery({
    queryKey: ['product-search', selectedTip?.id, orderId, userId],
    queryFn: () =>
      fetchProductSearch({
        productId: selectedTip!.id,
        orderId,
        userId,
      }),
    enabled: open && selectedTip != null,
  })

  const pickMutation = useMutation({
    mutationFn: async (offer: ProductOffer) => {
      const lineNumber = Number(offer.lineNumber ?? 1)
      const isMargin = Boolean(offer.isMargin)
      const result = await setOrderElementItem(orderElementId, offer.id, {
        searchProductId: selectedTip?.id ?? null,
        our_products_in_search_result: countQuery.data?.ourProductsInSearchResult ?? [],
        is_margin: isMargin,
        lineNumber,
      })
      if (result.result === 'failed') {
        throw new Error(result.error || 'Не удалось подставить товар')
      }
      await addAccompanyingItem(orderElementId)
    },
    onMutate: (offer) => setPickingId(offer.id),
    onSuccess: () => {
      toast.success('Товар подставлен в позицию')
      onSuccess()
      onClose()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Ошибка set_item')
    },
    onSettled: () => setPickingId(null),
  })

  if (!open) return null

  const offers = offersQuery.data?.items ?? []

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-primary px-4 text-primary-foreground">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-primary-foreground hover:bg-primary/80"
          onClick={onClose}
        >
          <X className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">
            Поиск для заказа № {orderNumber}
          </div>
          <div className="truncate text-xs opacity-90">
            Позиция #{orderElementId}
            {initArticle ? ` · ОЕМ ${initArticle}` : ''}
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 overflow-auto p-4">
        <div className="space-y-2">
          <Label htmlFor="search-article">Артикул / OEM</Label>
          <Input
            id="search-article"
            autoFocus
            placeholder="Например, 90915YZZD4"
            value={query}
            onChange={(e) => {
              setSelectedTip(null)
              setQuery(e.target.value)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose()
            }}
          />
        </div>

        {tipsQuery.isFetching ? <Skeleton className="h-9 w-full" /> : null}

        {tipsQuery.data && tipsQuery.data.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tipsQuery.data.slice(0, 16).map((tip) => (
              <Button
                key={tip.id}
                size="sm"
                variant={selectedTip?.id === tip.id ? 'default' : 'outline'}
                onClick={() => setSelectedTip(tip)}
              >
                {formatTipLabel(tip)}
                {tip.itemsCount != null ? (
                  <span className="ml-1 opacity-70">({tip.itemsCount})</span>
                ) : null}
              </Button>
            ))}
          </div>
        ) : debounced.length >= 2 && !tipsQuery.isFetching ? (
          <p className="text-sm text-muted-foreground">
            Товар с таким артикулом не найден в базе.
          </p>
        ) : null}

        <div className="min-h-0 flex-1">
          {!selectedTip ? (
            <p className="text-sm text-muted-foreground">Выберите подсказку выше.</p>
          ) : offersQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : offersQuery.isError ? (
            <p className="text-sm text-destructive">Ошибка загрузки предложений.</p>
          ) : offers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет доступных предложений.</p>
          ) : (
            <Table className="min-w-[860px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Бренд</TableHead>
                  <TableHead>Артикул</TableHead>
                  <TableHead>Наименование</TableHead>
                  <TableHead>Склад</TableHead>
                  <TableHead>Срок</TableHead>
                  <TableHead>Наличие</TableHead>
                  <TableHead className="text-right">Цена</TableHead>
                  <TableHead className="text-right">Выбрать</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.map((offer) => (
                  <TableRow
                    key={offer.id}
                    className={cn(pickingId === offer.id && 'bg-muted/50')}
                  >
                    <TableCell className="font-medium">{offer.brand}</TableCell>
                    <TableCell className="font-mono text-xs">{offer.article}</TableCell>
                    <TableCell className="max-w-[14rem] truncate" title={offer.name}>
                      {offer.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {offer.warehouseName || '—'}
                    </TableCell>
                    <TableCell>
                      {offer.deliveryDays == null
                        ? '—'
                        : offer.deliveryDays === 0
                          ? 'на складе'
                          : `${offer.deliveryDays} дн.`}
                    </TableCell>
                    <TableCell>{offer.quantity ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {offerPriceLabel(offer)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        disabled={pickMutation.isPending}
                        onClick={() => pickMutation.mutate(offer)}
                      >
                        {pickingId === offer.id ? '…' : 'В позицию'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  )
}
