import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
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

export function SearchPage() {
  const [params] = useSearchParams()
  const orderNumber = params.get('orderNumber') ?? ''
  const orderId = orderNumber ? publicNumberToOrderId(orderNumber) : undefined

  const [query, setQuery] = useState(params.get('article') ?? '')
  const [debounced, setDebounced] = useState(query)
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    params.get('productId') ? Number(params.get('productId')) : null,
  )

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
            '. Можно открыть из карточки заказа.'
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {(offersQuery.data ?? []).map((offer) => (
                  <TableRow key={offer.id}>
                    <TableCell className="font-mono text-xs">{offer.article}</TableCell>
                    <TableCell>{offer.brand ?? '—'}</TableCell>
                    <TableCell>
                      {[offer.warehouseName, offer.deliveryDays != null ? `${offer.deliveryDays} дн.` : null]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </TableCell>
                    <TableCell>{offer.quantity ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      {offer.price != null ? `${offer.price} ₽` : '—'}
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
