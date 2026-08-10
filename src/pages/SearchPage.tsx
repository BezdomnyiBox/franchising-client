import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { addOrderElement } from '@/features/orders/api'
import { fetchProductOffers, fetchProductTips } from '@/features/search/api'
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
import type { ProductOffer } from '@/entities/product/types'

export function SearchPage() {
  const [params] = useSearchParams()
  const queryClient = useQueryClient()
  const orderNumber = params.get('orderNumber') ?? ''
  const orderId = orderNumber ? publicNumberToOrderId(orderNumber) : undefined

  const [query, setQuery] = useState(params.get('article') ?? '')
  const [debounced, setDebounced] = useState(query)
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    params.get('productId') ? Number(params.get('productId')) : null,
  )
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

  const offersQuery = useQuery({
    queryKey: ['product-offers', selectedProductId, orderId],
    queryFn: () =>
      fetchProductOffers({
        productId: selectedProductId!,
        orderId,
      }),
    enabled: selectedProductId != null,
  })

  const addMutation = useMutation({
    mutationFn: async (offer: ProductOffer) => {
      if (!orderId) throw new Error('NO_ORDER')
      return addOrderElement(orderId, {
        itemId: offer.id,
        quantity: 1,
        searchProductId: selectedProductId,
      })
    },
    onMutate: (offer) => setAddingItemId(offer.id),
    onSuccess: (result) => {
      if (result.result === 'failed' || (!result.orderElementId && result.message)) {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Поиск товаров</h1>
        <p className="text-sm text-muted-foreground">
          Поиск по артикулу для добавления в заказ
          {orderNumber ? (
            <>
              {' '}
              <Link className="underline underline-offset-4" to={`/orders/${orderNumber}`}>
                #{orderNumber}
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
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {tipsQuery.isFetching ? <Skeleton className="h-8 w-full" /> : null}

          {tipsQuery.data && tipsQuery.data.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tipsQuery.data.slice(0, 12).map((tip) => (
                <Button
                  key={tip.id}
                  size="sm"
                  variant={selectedProductId === tip.id ? 'default' : 'outline'}
                  onClick={() => setSelectedProductId(tip.id)}
                >
                  {[tip.brand, tip.article].filter(Boolean).join(' ')}
                </Button>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Предложения</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedProductId ? (
            <p className="text-sm text-muted-foreground">Выберите подсказку выше.</p>
          ) : offersQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : offersQuery.isError ? (
            <p className="text-sm text-destructive">Ошибка загрузки предложений.</p>
          ) : (offersQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет предложений.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Артикул</TableHead>
                  <TableHead>Бренд</TableHead>
                  <TableHead>Склад / срок</TableHead>
                  <TableHead>Наличие</TableHead>
                  <TableHead className="text-right">Цена</TableHead>
                  <TableHead className="text-right">Действие</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(offersQuery.data ?? []).map((offer) => (
                  <TableRow key={offer.id}>
                    <TableCell className="font-mono text-xs">{offer.article}</TableCell>
                    <TableCell>{offer.brand ?? '—'}</TableCell>
                    <TableCell>
                      {[
                        offer.warehouseName,
                        offer.deliveryDays != null ? `${offer.deliveryDays} дн.` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </TableCell>
                    <TableCell>{offer.quantity ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      {offer.price != null ? `${offer.price} ₽` : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        disabled={!orderId || addingItemId === offer.id || addMutation.isPending}
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
