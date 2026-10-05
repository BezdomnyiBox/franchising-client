// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from 'react'
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

  return (
    <>
      <div className="card fbar">
        <div className="seg">
          <button
            type="button"
            className={offersTab === OFFERS_TAB_AVAILABLE ? 'on' : ''}
            onClick={() => setOffersTab(OFFERS_TAB_AVAILABLE)}
          >
            В наличии
            <span className="n">{availableLoading ? '…' : stats.availableCount}</span>
          </button>
          <button
            type="button"
            className={offersTab === OFFERS_TAB_ORDER ? 'on' : ''}
            onClick={() => setOffersTab(OFFERS_TAB_ORDER)}
          >
            Под заказ
            <span className="n">{orderLoading ? '…' : stats.offerCount}</span>
          </button>
          <button
            type="button"
            className={offersTab === TAB_OFFERS_ALL ? 'on' : ''}
            onClick={() => setOffersTab(TAB_OFFERS_ALL)}
          >
            Все
            <span className="n">{activeLoading ? '…' : stats.total}</span>
          </button>
        </div>
      </div>

      <div className="card fbar" style={{ marginTop: 10 }}>
        <div className="fld">
          <label htmlFor="f-from">Цена от:</label>
          <span className="inp num">
            <input
              id="f-from"
              type="number"
              min="0"
              placeholder="0"
              value={filters.priceFrom}
              onChange={handleFilterChange('priceFrom')}
            />
            <i>₽</i>
          </span>
          <label htmlFor="f-to">до:</label>
          <span className="inp num">
            <input
              id="f-to"
              type="number"
              min="0"
              placeholder="—"
              value={filters.priceTo}
              onChange={handleFilterChange('priceTo')}
            />
            <i>₽</i>
          </span>
        </div>
        <div className="fld">
          <label htmlFor="f-days">Срок доставки, дн.:</label>
          <span className="inp num">
            <input
              id="f-days"
              type="number"
              min="0"
              step="1"
              placeholder="Все"
              value={filters.days}
              onChange={handleFilterChange('days')}
            />
          </span>
        </div>
        <div className="fld">
          <label htmlFor="f-wh">Склад:</label>
          <span className="inp">
            <input
              id="f-wh"
              placeholder="ID или название"
              value={filters.warehouse}
              onChange={handleFilterChange('warehouse')}
              style={{ width: '130px' }}
            />
          </span>
        </div>
        <div className="sp">
          <div className="sortsel">
            Сортировка
            <select value={filters.sort} onChange={handleFilterChange('sort')}>
              <option value="eta">Срок, затем цена</option>
              <option value="price">Цена</option>
              <option value="days">Срок доставки</option>
              <option value="qty">Количество</option>
            </select>
          </div>
        </div>
      </div>

      {offersTab === OFFERS_TAB_AVAILABLE && (stats.offerCount > 0 || orderLoading) ? (
        <div className="hint">
          <svg className="ic" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8h.01M11 12h1v4h1" />
          </svg>
          <div>
            {orderLoading ? (
              <>Идёт загрузка предложений под заказ у поставщиков...</>
            ) : (
              <>
                Под заказ доступно ещё <b>{stats.offerCount} предложений</b>
                {orderMinPrice ? <> — от {money(orderMinPrice)}</> : null}.{' '}
                <button
                  type="button"
                  className="hint-link"
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

      <div hidden={!showAvailable}>
        {availableLoading ? (
          <div className="card loading-card">
            <span className="loading-card__spinner" aria-label="Загрузка" />
            <span>Загрузка наличия...</span>
          </div>
        ) : availableOffers.length > 0 ? (
          <OffersPointCard
            good={good}
            offers={availableOffers}
            availableCount={availableOffers.length}
            orderCount={filteredOrderOffers.length}
            initialOrderNumber={initialOrderNumber}
            collapsed={pointCollapsed}
            onToggle={() => setPointCollapsed((value) => !value)}
          />
        ) : offersTab === OFFERS_TAB_AVAILABLE ? (
          <div className="empty-msg">Нет предложений в наличии</div>
        ) : null}
      </div>

      <div hidden={!showOrder}>
        {orderLoading && !supplierOfferGroups.length ? (
          <div className="card loading-card">
            <span className="loading-card__spinner" aria-label="Загрузка" />
            <span>Загрузка предложений под заказ...</span>
          </div>
        ) : (
          <SupplierOffersPanel
            good={good}
            groups={supplierOfferGroups}
            initialOrderNumber={initialOrderNumber}
            onToggleSupplier={onToggleSupplier}
            filters={filters}
          />
        )}
      </div>

      <CitiesBlock
        cities={cities}
        loading={citiesLoading}
        article={good.article}
        currentTownId={currentTownId}
      />
    </>
  )
}
