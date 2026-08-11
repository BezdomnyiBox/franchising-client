import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { addOrderElement } from '@/features/orders/api'
import { formatRubles } from '@/features/orders/status'
import {
  fetchProductSearch,
  fetchProductSearchCount,
  fetchProductTips,
  formatTipLabel,
} from '@/features/search/api'
import { useAuth } from '@/features/auth/AuthContext'
import type { ProductOffer, ProductTip } from '@/entities/product/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { publicNumberToOrderId } from '@/shared/config'
import { cn } from '@/lib/utils'

function offerPriceLabel(offer: ProductOffer): string {
  const price = offer.offerPrice ?? offer.price
  if (price == null) return '—'
  return formatRubles(price)
}

export function SearchPage() {
  const [params] = useSearchParams()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const orderNumber = params.get('orderNumber') ?? ''
  const orderId = orderNumber ? publicNumberToOrderId(orderNumber) : undefined
  const initialArticle = params.get('article') ?? ''
  const initialProductId = params.get('productId') ? Number(params.get('productId')) : null

  const [query, setQuery] = useState(initialArticle)
  const [debounced, setDebounced] = useState(initialArticle.trim())
  const [selectedTip, setSelectedTip] = useState<ProductTip | null>(null)
  const [addingItemId, setAddingItemId] = useState<number | null>(null)

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query.trim()), 300)
    return () => window.clearTimeout(id)
  }, [query])

  const tipsQuery = useQuery({
    queryKey: ['product-tips', debounced],
    queryFn: () => fetchProductTips({ q: debounced }),
    enabled: debounced.length >= 2,
  })

  useEffect(() => {
    if (!tipsQuery.data?.length) return
    if (selectedTip) return

    const preferred =
      (initialProductId
        ? tipsQuery.data.find((t) => t.id === initialProductId)
        : null) ??
      tipsQuery.data.reduce<ProductTip | null>((best, tip) => {
        if (!best) return tip
        return (tip.itemsCount ?? 0) > (best.itemsCount ?? 0) ? tip : best
      }, null)

    if (preferred) setSelectedTip(preferred)
  }, [tipsQuery.data, initialProductId, selectedTip])

  const countQuery = useQuery({
    queryKey: ['product-search-count', selectedTip?.id, orderId],
    queryFn: () => fetchProductSearchCount(selectedTip!.id, orderId),
    enabled: selectedTip != null,
  })

  const offersQuery = useQuery({
    queryKey: ['product-search', selectedTip?.id, orderId, user?.id],
    queryFn: () =>
      fetchProductSearch({
        productId: selectedTip!.id,
        orderId,
        userId: user?.id,
      }),
    enabled: selectedTip != null,
  })

  const addMutation = useMutation({
    mutationFn: async (offer: ProductOffer) => {
      if (!orderId) throw new Error('NO_ORDER')
      return addOrderElement(orderId, {
        itemId: offer.id,
        quantity: 1,
        searchProductId: selectedTip?.id ?? null,
        our_products_in_search_result: countQuery.data?.ourProductsInSearchResult ?? [],
        is_margin: Boolean(offer.isMargin),
        lineNumber: Number(offer.lineNumber ?? 0),
      })
    },
    onMutate: (offer) => setAddingItemId(offer.id),
    onSuccess: (result) => {
      if (result.result === 'failed' || result.error) {
        toast.error(result.message || result.error || 'Не удалось добавить позицию')
        return
      }
      toast.success(`Добавлено в заказ #${orderNumber}`)
      void queryClient.invalidateQueries({ queryKey: ['order-elements', orderId] })
      void queryClient.invalidateQueries({ queryKey: ['order', orderId] })
    },
    onError: (error) => {
      if (error instanceof Error && error.message === 'NO_ORDER') {
        toast.error('Сначала откройте поиск из карточки заказа')
        return
      }
      toast.error('Ошибка при добавлении в заказ')
    },
    onSettled: () => setAddingItemId(null),
  })

  const offers = offersQuery.data?.items ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Поиск товаров</h1>
        <p className="text-sm text-muted-foreground">
          Поиск по артикулу для добавления в заказ
          {orderNumber ? (
            <>
              .{' '}
              <Link className="underline underline-offset-4" to={`/orders/${orderNumber}`}>
                Заказ #{orderNumber}
              </Link>
            </>
          ) : (
            '. Откройте поиск из карточки заказа, чтобы добавить позиции.'
          )}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Артикул / OEM</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="q">Запрос</Label>
            <Input
              id="q"
              autoFocus
              placeholder="Например, 90915YZZD4"
              value={query}
              onChange={(e) => {
                setSelectedTip(null)
                setQuery(e.target.value)
              }}
            />
          </div>

          {tipsQuery.isFetching ? <Skeleton className="h-8 w-full" /> : null}

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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Предложения</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedTip ? (
            <p className="text-sm text-muted-foreground">Выберите подсказку выше.</p>
          ) : offersQuery.isLoading ? (
            <div className="space-y-2">
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
                  <TableHead>Склад / срок</TableHead>
                  <TableHead>Наличие</TableHead>
                  <TableHead className="text-right">Цена</TableHead>
                  <TableHead className="text-right">Действие</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.map((offer) => (
                  <TableRow
                    key={offer.id}
                    className={cn(addingItemId === offer.id && 'bg-muted/50')}
                  >
                    <TableCell className="font-medium">{offer.brand}</TableCell>
                    <TableCell className="font-mono text-xs">{offer.article}</TableCell>
                    <TableCell className="max-w-[14rem] truncate" title={offer.name}>
                      {offer.name}
                    </TableCell>
                    <TableCell>
                      {[
                        offer.warehouseName,
                        offer.deliveryDays == null
                          ? null
                          : offer.deliveryDays === 0
                            ? 'на складе'
                            : `${offer.deliveryDays} дн.`,
                      ]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </TableCell>
                    <TableCell>{offer.quantity ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {offerPriceLabel(offer)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        disabled={!orderId || addingItemId === offer.id || addMutation.isPending}
                        title={
                          orderId
                            ? 'Добавить позицию в заказ'
                            : 'Откройте поиск из карточки заказа'
                        }
                        onClick={() => addMutation.mutate(offer)}
                      >
                        {addingItemId === offer.id ? '…' : 'В заказ'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
