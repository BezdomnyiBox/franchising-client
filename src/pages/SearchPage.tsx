import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import { toast } from 'sonner'
import { addOrderElement } from '@/features/orders/api'
import { formatRubles } from '@/features/orders/status'
import {
  addAccompanyingItem,
  fetchAnalogsList,
  fetchProductSearch,
  fetchProductSearchCount,
  fetchProductTips,
  filterOffersByAvailability,
  formatTipLabel,
} from '@/features/search/api'
import { SearchOffersTable } from '@/features/search/SearchOffersTable'
import { useAuth } from '@/features/auth/AuthContext'
import type {
  AnalogProduct,
  AvailabilityFilter,
  ProductOffer,
  ProductTip,
} from '@/entities/product/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { publicNumberToOrderId } from '@/shared/config'
import { cn } from '@/lib/utils'

type ResultTab = 'product' | 'analogs' | 'parts'

function tipBrandName(tip: ProductTip): string {
  if (!tip.brand) return formatTipLabel(tip)
  if (typeof tip.brand === 'string') return tip.brand
  return tip.brand.name || formatTipLabel(tip)
}

function AnalogRow({
  analog,
  expanded,
  onToggle,
  orderId,
  userId,
  canAdd,
  addingItemId,
  searchProductId,
  onAdd,
}: {
  analog: AnalogProduct
  expanded: boolean
  onToggle: () => void
  orderId?: number
  userId?: number
  canAdd: boolean
  addingItemId: number | null
  searchProductId: number
  onAdd: (offer: ProductOffer, searchProductId: number) => void
}) {
  const [availabilityFilter, setAvailabilityFilter] =
    useState<AvailabilityFilter>('available')

  const offersQuery = useQuery({
    queryKey: ['product-search', analog.productId, orderId, userId, 'analog'],
    queryFn: () =>
      fetchProductSearch({
        productId: analog.productId,
        orderId,
        userId,
      }),
    enabled: expanded,
  })

  const allOffers = offersQuery.data?.items ?? []
  const offers = filterOffersByAvailability(allOffers, availabilityFilter)

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        className="flex w-full items-start gap-3 px-3 py-3 text-left hover:bg-muted/40"
        onClick={onToggle}
      >
        <span className="mt-0.5 text-muted-foreground">
          {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm">
            <span className="font-semibold">{analog.brandName}</span>
            {' / '}
            <span className="font-mono font-semibold">{analog.article}</span>{' '}
            <span className="text-muted-foreground">{analog.productName}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="text-sm font-medium text-foreground">
              {analog.offerPrice != null ? formatRubles(analog.offerPrice) : '—'}
            </span>
            <span>
              В наличии{' '}
              <span className="font-semibold text-sky-600">{analog.availableCount ?? 0}</span>
              , под заказ {analog.orderCount ?? 0}
            </span>
            {(analog.ourItemsCount ?? 0) > 0 ? (
              <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                наши {analog.ourItemsCount}
              </Badge>
            ) : null}
          </div>
        </div>
      </button>
      {expanded ? (
        <div className="border-t px-3 py-3">
          <SearchOffersTable
            offers={offers}
            loading={offersQuery.isLoading}
            error={offersQuery.isError}
            canAdd={canAdd}
            addingItemId={addingItemId}
            availabilityFilter={availabilityFilter}
            availableCount={filterOffersByAvailability(allOffers, 'available').length}
            orderCount={filterOffersByAvailability(allOffers, 'order').length}
            onAvailabilityChange={setAvailabilityFilter}
            onAdd={(offer) => onAdd(offer, searchProductId)}
          />
        </div>
      ) : null}
    </div>
  )
}

export function SearchPage() {
  const [params, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const article = params.get('article') ?? ''
  const productIdParam = params.get('productId')
  const productIdFromUrl = productIdParam ? Number(productIdParam) : null
  const orderNumber = params.get('orderNumber') ?? ''
  const orderId = orderNumber ? publicNumberToOrderId(orderNumber) : undefined

  const [draftArticle, setDraftArticle] = useState(article)
  const [draftOrderNumber, setDraftOrderNumber] = useState(orderNumber)
  const [selectedTip, setSelectedTip] = useState<ProductTip | null>(null)
  const [resultTab, setResultTab] = useState<ResultTab>('product')
  const [availabilityFilter, setAvailabilityFilter] =
    useState<AvailabilityFilter>('available')
  const [expandedAnalogId, setExpandedAnalogId] = useState<number | null>(null)
  const [addingItemId, setAddingItemId] = useState<number | null>(null)

  useEffect(() => {
    setDraftArticle(article)
  }, [article])

  useEffect(() => {
    setDraftOrderNumber(orderNumber)
  }, [orderNumber])

  const syncUrl = (next: {
    article?: string
    productId?: number | null
    orderNumber?: string
  }) => {
    const sp = new URLSearchParams()
    const nextArticle = next.article ?? article
    const nextOrder = next.orderNumber ?? orderNumber
    const nextProductId =
      next.productId === undefined ? productIdFromUrl : next.productId

    if (nextArticle) sp.set('article', nextArticle)
    if (nextProductId) sp.set('productId', String(nextProductId))
    sp.set('orderNumber', nextOrder)
    sp.set('tab', '0')
    setSearchParams(sp, { replace: true })
  }

  const runSearch = (value?: string) => {
    const q = (value ?? draftArticle).trim()
    setSelectedTip(null)
    setResultTab('product')
    setExpandedAnalogId(null)
    syncUrl({ article: q, productId: null, orderNumber: draftOrderNumber })
  }

  const tipsQuery = useQuery({
    queryKey: ['product-tips', article],
    queryFn: () => fetchProductTips({ q: article }),
    enabled: article.trim().length >= 2,
  })

  useEffect(() => {
    if (!tipsQuery.data?.length) {
      if (tipsQuery.isFetched && article.trim().length >= 2) setSelectedTip(null)
      return
    }

    const preferred =
      (productIdFromUrl
        ? tipsQuery.data.find((t) => t.id === productIdFromUrl)
        : null) ??
      tipsQuery.data.reduce<ProductTip | null>((best, tip) => {
        if (!best) return tip
        return (tip.itemsCount ?? 0) > (best.itemsCount ?? 0) ? tip : best
      }, null)

    if (!preferred) return
    if (selectedTip?.id === preferred.id) return
    setSelectedTip(preferred)
    if (preferred.id !== productIdFromUrl) {
      syncUrl({ productId: preferred.id })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync only when tips/url product change
  }, [tipsQuery.data, productIdFromUrl, article])

  const selectTip = (tip: ProductTip) => {
    setSelectedTip(tip)
    setResultTab('product')
    setExpandedAnalogId(null)
    syncUrl({ productId: tip.id })
  }

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
    enabled: selectedTip != null && resultTab === 'product',
  })

  const analogsQuery = useQuery({
    queryKey: ['analogs-list', selectedTip?.id, 'full', orderId, user?.id],
    queryFn: () =>
      fetchAnalogsList(selectedTip!.id, 'full', {
        orderId,
        userId: user?.id,
      }),
    enabled: selectedTip != null && resultTab === 'analogs',
  })

  const partsQuery = useQuery({
    queryKey: ['analogs-list', selectedTip?.id, 'part', orderId, user?.id],
    queryFn: () =>
      fetchAnalogsList(selectedTip!.id, 'part', {
        orderId,
        userId: user?.id,
      }),
    enabled: selectedTip != null && resultTab === 'parts',
  })

  const allOffers = offersQuery.data?.items ?? []
  const offers = filterOffersByAvailability(allOffers, availabilityFilter)
  const ourProducts = countQuery.data?.ourProductsInSearchResult ?? []

  const addMutation = useMutation({
    mutationFn: async ({
      offer,
      searchProductId,
    }: {
      offer: ProductOffer
      searchProductId: number
    }) => {
      if (!orderId) throw new Error('NO_ORDER')
      const result = await addOrderElement(orderId, {
        itemId: offer.id,
        quantity: 1,
        searchProductId,
        our_products_in_search_result: ourProducts,
        is_margin: Boolean(offer.isMargin),
        lineNumber: Number(offer.lineNumber ?? 0),
      })
      if (result.result === 'failed' || result.error) {
        throw new Error(result.message || result.error || 'Не удалось добавить позицию')
      }
      if (result.orderElementId) {
        await addAccompanyingItem(result.orderElementId)
      }
      return result
    },
    onMutate: ({ offer }) => setAddingItemId(offer.id),
    onSuccess: () => {
      toast.success(`Добавлено в заказ #${orderNumber}`)
      void queryClient.invalidateQueries({ queryKey: ['order-elements', orderId] })
      void queryClient.invalidateQueries({ queryKey: ['order', orderId] })
    },
    onError: (error) => {
      if (error instanceof Error && error.message === 'NO_ORDER') {
        toast.error('Укажите № заказа или откройте поиск из карточки заказа')
        return
      }
      toast.error(error instanceof Error ? error.message : 'Ошибка при добавлении в заказ')
    },
    onSettled: () => setAddingItemId(null),
  })

  const canAdd = Boolean(orderId)
  const productTitle = useMemo(() => {
    if (!selectedTip) return null
    const brand = tipBrandName(selectedTip)
    return {
      brand,
      article: selectedTip.article,
      name: selectedTip.name || offersQuery.data?.name || '',
    }
  }, [selectedTip, offersQuery.data?.name])

  const tabs: { id: ResultTab; label: string; count?: number; ourCount?: number }[] = [
    {
      id: 'product',
      label: 'Искомая запчасть',
      count:
        countQuery.data?.search_product_items_count ??
        (offersQuery.data ? allOffers.length : undefined),
    },
    {
      id: 'analogs',
      label: 'Аналоги',
      count: countQuery.data?.search_analogs_items_count,
      ourCount: countQuery.data?.search_our_analogs_items_count,
    },
    {
      id: 'parts',
      label: 'Составные части',
      count: countQuery.data?.search_analogs_parts_items_count,
      ourCount: countQuery.data?.search_our_analogs_parts_items_count,
    },
  ]

  const renderAnalogs = (
    list: AnalogProduct[] | undefined,
    loading: boolean,
    error: boolean,
    empty: string,
  ) => {
    if (loading) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      )
    }
    if (error) return <p className="text-sm text-destructive">Ошибка загрузки.</p>
    if (!list?.length) return <p className="text-sm text-muted-foreground">{empty}</p>
    return (
      <div className="space-y-2">
        {list.map((analog) => (
          <AnalogRow
            key={analog.id}
            analog={analog}
            expanded={expandedAnalogId === analog.id}
            onToggle={() =>
              setExpandedAnalogId((id) => (id === analog.id ? null : analog.id))
            }
            orderId={orderId}
            userId={user?.id}
            canAdd={canAdd}
            addingItemId={addingItemId}
            searchProductId={selectedTip!.id}
            onAdd={(offer, searchProductId) =>
              addMutation.mutate({ offer, searchProductId })
            }
          />
        ))}
      </div>
    )
  }

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
            '. Укажите № заказа или откройте поиск из карточки заказа.'
          )}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Поиск по артикулу</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_12rem]">
            <div className="space-y-1.5">
              <Label htmlFor="article">Артикул</Label>
              <Input
                id="article"
                autoFocus
                placeholder="Например, c110"
                value={draftArticle}
                onChange={(e) => setDraftArticle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') runSearch()
                }}
              />
            </div>
            <div className="flex items-end">
              <Button
                className="w-full sm:w-auto"
                disabled={!draftArticle.trim()}
                onClick={() => runSearch()}
              >
                <Search className="size-4" />
                Искать
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="orderNumber">№ заказа</Label>
              <Input
                id="orderNumber"
                placeholder="например 123456"
                value={draftOrderNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '')
                  setDraftOrderNumber(value)
                  if (value.length > 5) {
                    syncUrl({ orderNumber: value })
                  }
                }}
              />
            </div>
          </div>

          {tipsQuery.isFetching ? <Skeleton className="h-8 w-full" /> : null}

          {tipsQuery.data && tipsQuery.data.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tipsQuery.data.map((tip) => {
                const active = selectedTip?.id === tip.id
                return (
                  <Button
                    key={tip.id}
                    size="sm"
                    variant={active ? 'default' : 'outline'}
                    onClick={() => selectTip(tip)}
                  >
                    <b>{tipBrandName(tip)}</b>
                  </Button>
                )
              })}
            </div>
          ) : article.trim().length >= 2 && tipsQuery.isFetched && !tipsQuery.isFetching ? (
            <p className="text-sm text-muted-foreground">
              Товар с таким артикулом отсутствует в базе данных.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {selectedTip ? (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap gap-2 border-b pb-3">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  size="sm"
                  variant={resultTab === tab.id ? 'default' : 'outline'}
                  className="gap-2"
                  onClick={() => {
                    setResultTab(tab.id)
                    setExpandedAnalogId(null)
                  }}
                >
                  {tab.label}
                  {tab.count != null ? (
                    <Badge
                      variant="secondary"
                      className={cn(
                        'h-5 min-w-5 justify-center rounded-full px-1.5',
                        resultTab === tab.id
                          ? 'bg-background/20 text-primary-foreground'
                          : 'bg-destructive/15 text-destructive',
                      )}
                    >
                      {tab.count}
                    </Badge>
                  ) : null}
                  {tab.ourCount ? (
                    <Badge className="h-5 min-w-5 justify-center rounded-full bg-emerald-600 px-1.5 text-white hover:bg-emerald-600">
                      {tab.ourCount}
                    </Badge>
                  ) : null}
                </Button>
              ))}
            </div>
            {productTitle ? (
              <div className="pt-2 text-sm">
                <span className="font-semibold">{productTitle.brand}</span>
                {' · '}
                <span className="font-mono">{productTitle.article}</span>
                {productTitle.name ? (
                  <span className="text-muted-foreground"> — {productTitle.name}</span>
                ) : null}
              </div>
            ) : null}
          </CardHeader>
          <CardContent>
            {resultTab === 'product' ? (
              <SearchOffersTable
                offers={offers}
                loading={offersQuery.isLoading}
                error={offersQuery.isError}
                canAdd={canAdd}
                addingItemId={addingItemId}
                availabilityFilter={availabilityFilter}
                availableCount={filterOffersByAvailability(allOffers, 'available').length}
                orderCount={filterOffersByAvailability(allOffers, 'order').length}
                onAvailabilityChange={setAvailabilityFilter}
                onAdd={(offer) =>
                  addMutation.mutate({ offer, searchProductId: selectedTip.id })
                }
              />
            ) : null}

            {resultTab === 'analogs'
              ? renderAnalogs(
                  analogsQuery.data,
                  analogsQuery.isLoading,
                  analogsQuery.isError,
                  'Аналоги для выбранного товара не найдены.',
                )
              : null}

            {resultTab === 'parts'
              ? renderAnalogs(
                  partsQuery.data,
                  partsQuery.isLoading,
                  partsQuery.isError,
                  'Составные части для выбранного товара не найдены.',
                )
              : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
