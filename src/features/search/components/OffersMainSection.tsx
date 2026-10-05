// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from 'react'
import { Info } from 'lucide-react'
import {
  EMPTY_OFFER_FILTERS,
  OFFERS_TAB_AVAILABLE,
  OFFERS_TAB_ORDER,
  TAB_OFFERS_ALL,
} from '../lib/constants'
import { money } from '../lib/format'
import {
  applyOfferFilters,
  computeOfferStats,
  getOfferPrice,
  getOffersPriceRange,
  normalizeOffers,
} from '../lib/offers'
import { CitiesBlock } from './CitiesBlock'
import { OffersPointCard } from './OffersPointCard'
import { SupplierOffersPanel } from './SupplierOffersPanel'
import { SearchEmpty, SearchLoading } from './search-ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export function OffersMainSection({
  good,
  offers,
  offersLoading,
  supplierOfferGroups,
  onToggleSupplier,
  initialOrderNumber,
  cities = [],
  citiesLoading = false,
  currentTownId,
  offerAction = { mode: 'add-to-order' },
}) {
  const [offersTab, setOffersTab] = useState(OFFERS_TAB_AVAILABLE)
  const [pointCollapsed, setPointCollapsed] = useState(false)
  const [filters, setFilters] = useState(EMPTY_OFFER_FILTERS)
  const priceFilterTouchedRef = useRef(false)
  const offersGroups = normalizeOffers(offers)
  const stats = computeOfferStats(offersGroups)
  const availableLoading = Boolean(offersLoading.available)
  const orderLoading = Boolean(offersLoading.offer)
  const activeLoading = availableLoading || orderLoading
  const sourceOffers = useMemo(
    () => [
      ...(offersGroups.available || []),
      ...(offersGroups.offer || []),
      ...(supplierOfferGroups || []).flatMap((group) => group.offers || []),
    ],
    [offersGroups.available, offersGroups.offer, supplierOfferGroups],
  )
  const priceRange = useMemo(() => getOffersPriceRange(sourceOffers), [sourceOffers])
  const availableOffers = applyOfferFilters(offersGroups.available || [], filters)
  const filteredOrderOffers = applyOfferFilters(offersGroups.offer || [], filters)
  const showAvailable = offersTab === OFFERS_TAB_AVAILABLE || offersTab === TAB_OFFERS_ALL
  const showOrder = offersTab === OFFERS_TAB_ORDER || offersTab === TAB_OFFERS_ALL
  const orderMinPrice = useMemo(() => {
    const prices = filteredOrderOffers
      .map((item) => getOfferPrice(item))
      .filter((price) => price > 0)
    return prices.length ? Math.min(...prices) : null
  }, [filteredOrderOffers])

  const lastAutoOffersTabGoodRef = useRef('')

  const handleFilterChange = (field) => (event) => {
    if (field === 'priceFrom' || field === 'priceTo') {
      priceFilterTouchedRef.current = true
    }
    setFilters((previous) => ({
      ...previous,
      [field]: event.target.value,
    }))
  }

  const handleSortChange = (value) => {
    setFilters((previous) => ({ ...previous, sort: value }))
  }

  useEffect(() => {
    priceFilterTouchedRef.current = false
    setFilters(EMPTY_OFFER_FILTERS)
  }, [good.brand, good.article])

  useEffect(() => {
    if (priceFilterTouchedRef.current || (!priceRange.min && !priceRange.max)) return
    setFilters((previous) => ({
      ...previous,
      priceFrom: priceRange.min,
      priceTo: priceRange.max,
    }))
  }, [priceRange.min, priceRange.max])

  useEffect(() => {
    const goodKey = `${good.brand}|${good.article}`
    if (lastAutoOffersTabGoodRef.current === goodKey) return
    lastAutoOffersTabGoodRef.current = goodKey

    if (availableLoading || offersGroups.available.length) {
      setOffersTab(OFFERS_TAB_AVAILABLE)
      return
    }
    if (orderLoading || offersGroups.offer.length) {
      setOffersTab(OFFERS_TAB_ORDER)
    }
  }, [
    offersGroups.available.length,
    offersGroups.offer.length,
    availableLoading,
    orderLoading,
    good.brand,
    good.article,
  ])

  const tabButtons = [
    { id: OFFERS_TAB_AVAILABLE, label: 'В наличии', count: availableLoading ? '…' : stats.availableCount },
    { id: OFFERS_TAB_ORDER, label: 'Под заказ', count: orderLoading ? '…' : stats.offerCount },
    { id: TAB_OFFERS_ALL, label: 'Все', count: activeLoading ? '…' : stats.total },
  ]

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="flex flex-wrap gap-2 pt-6">
          {tabButtons.map((tab) => (
            <Button
              key={tab.id}
              type="button"
              size="sm"
              variant={offersTab === tab.id ? 'default' : 'outline'}
              className="gap-2"
              onClick={() => setOffersTab(tab.id)}
            >
              {tab.label}
              <Badge
                variant="secondary"
                className={cn(
                  'h-5 min-w-5 justify-center rounded-full px-1.5',
                  offersTab === tab.id
                    ? 'bg-background/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {tab.count}
              </Badge>
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="f-from">Цена от, ₽</Label>
            <Input
              id="f-from"
              type="number"
              min="0"
              placeholder="0"
              value={filters.priceFrom}
              onChange={handleFilterChange('priceFrom')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-to">Цена до, ₽</Label>
            <Input
              id="f-to"
              type="number"
              min="0"
              placeholder="—"
              value={filters.priceTo}
              onChange={handleFilterChange('priceTo')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-days">Срок доставки, дн.</Label>
            <Input
              id="f-days"
              type="number"
              min="0"
              step="1"
              placeholder="Все"
              value={filters.days}
              onChange={handleFilterChange('days')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-wh">Склад</Label>
            <Input
              id="f-wh"
              placeholder="ID или название"
              value={filters.warehouse}
              onChange={handleFilterChange('warehouse')}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <Label>Сортировка</Label>
            <Select value={filters.sort} onValueChange={handleSortChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eta">Срок, затем цена</SelectItem>
                <SelectItem value="price">Цена</SelectItem>
                <SelectItem value="days">Срок доставки</SelectItem>
                <SelectItem value="qty">Количество</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {offersTab === OFFERS_TAB_AVAILABLE && (stats.offerCount > 0 || orderLoading) ? (
        <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          <Info className="mt-0.5 size-4 shrink-0" />
          <div>
            {orderLoading ? (
              <>Идёт загрузка предложений под заказ у поставщиков…</>
            ) : (
              <>
                Под заказ доступно ещё <b>{stats.offerCount} предложений</b>
                {orderMinPrice ? <> — от {money(orderMinPrice)}</> : null}{' '}
                <button
                  type="button"
                  className="font-medium underline underline-offset-2"
                  onClick={() => setOffersTab(TAB_OFFERS_ALL)}
                >
                  Показать их вместе с наличием
                </button>
                , чтобы предложить клиенту выбор.
              </>
            )}
          </div>
        </div>
      ) : null}

      <div hidden={!showAvailable} className="space-y-3">
        {availableLoading ? (
          <Card>
            <CardContent className="pt-6">
              <SearchLoading label="Загрузка наличия…" />
            </CardContent>
          </Card>
        ) : availableOffers.length > 0 ? (
          <OffersPointCard
            good={good}
            offers={availableOffers}
            availableCount={availableOffers.length}
            orderCount={filteredOrderOffers.length}
            initialOrderNumber={initialOrderNumber}
            collapsed={pointCollapsed}
            onToggle={() => setPointCollapsed((value) => !value)}
            offerAction={offerAction}
          />
        ) : offersTab === OFFERS_TAB_AVAILABLE ? (
          <SearchEmpty>Нет предложений в наличии</SearchEmpty>
        ) : null}
      </div>

      <div hidden={!showOrder} className="space-y-3">
        {orderLoading && !supplierOfferGroups.length ? (
          <Card>
            <CardContent className="pt-6">
              <SearchLoading label="Загрузка предложений под заказ…" />
            </CardContent>
          </Card>
        ) : (
          <SupplierOffersPanel
            good={good}
            groups={supplierOfferGroups}
            initialOrderNumber={initialOrderNumber}
            onToggleSupplier={onToggleSupplier}
            filters={filters}
            offerAction={offerAction}
          />
        )}
      </div>

      <CitiesBlock
        cities={cities}
        loading={citiesLoading}
        article={good.article}
        currentTownId={currentTownId}
      />
    </div>
  )
}
