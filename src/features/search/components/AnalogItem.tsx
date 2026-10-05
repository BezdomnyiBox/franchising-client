// @ts-nocheck
import { useCallback, useMemo, useRef, useState } from 'react'
import { EMPTY_OFFERS, OFFERS_TAB_AVAILABLE } from '../lib/constants'
import { formatAssemblyTime, money } from '../lib/format'
import {
  computeOfferStats,
  getOfferDays,
  mergeSupplierOffers,
  normalizeOffers,
  normalizeSupplierOfferGroups,
} from '../lib/offers'
import {
  fetchOffersGroup,
  loadSupplierOffersParallel,
} from '../lib/supplierGoodsApi'
import { OffersMainSection } from './OffersMainSection'

export function AnalogItem({ item, branchId, orderNumber }) {
  const [expanded, setExpanded] = useState(false)
  const [offers, setOffers] = useState(EMPTY_OFFERS)
  const [offersLoaded, setOffersLoaded] = useState(false)
  const [availableLoading, setAvailableLoading] = useState(false)
  const [offerLoading, setOfferLoading] = useState(false)
  const [supplierOfferGroups, setSupplierOfferGroups] = useState([])
  const offersGroups = normalizeOffers(offers)
  const stats = computeOfferStats(offersGroups)

  const minPrice = useMemo(() => {
    const prices = [...offersGroups.available, ...offersGroups.offer]
      .map((offer) => Number(offer.offerPrice || offer.price))
      .filter((price) => !Number.isNaN(price) && price > 0)
    return prices.length ? Math.min(...prices) : Number(item.price) || null
  }, [item.price, offersGroups.available, offersGroups.offer])

  const etaLabel = useMemo(() => {
    const all = [...offersGroups.available, ...offersGroups.offer]
    if (all.length) {
      const best = all.slice().sort((a, b) => getOfferDays(a) - getOfferDays(b))[0]
      return formatAssemblyTime(best?.assemblyTime)
    }
    if (item.assemblyTime) return formatAssemblyTime(item.assemblyTime)
    return '—'
  }, [item.assemblyTime, offersGroups.available, offersGroups.offer])

  const availableRequestIdRef = useRef(0)
  const offerRequestIdRef = useRef(0)

  const loadDetails = useCallback(() => {
    if (offersLoaded || availableLoading || offerLoading) return

    const availableRequestId = availableRequestIdRef.current + 1
    const offerRequestId = offerRequestIdRef.current + 1
    availableRequestIdRef.current = availableRequestId
    offerRequestIdRef.current = offerRequestId
    setOffers(EMPTY_OFFERS)
    setSupplierOfferGroups([])
    setAvailableLoading(true)
    setOfferLoading(true)
    setOffersLoaded(true)

    const baseParams = {
      article: item.article,
      branchId,
      brand: item.brand,
      orderNumber,
    }

    fetchOffersGroup({
      baseParams,
      offersType: OFFERS_TAB_AVAILABLE,
      requestId: availableRequestId,
      requestIdRef: availableRequestIdRef,
      setOffers,
      setLoading: setAvailableLoading,
    })

    loadSupplierOffersParallel({
      baseParams,
      branchId,
      requestId: offerRequestId,
      requestIdRef: offerRequestIdRef,
      onGroupsInit: (groups) => {
        setSupplierOfferGroups(normalizeSupplierOfferGroups(groups))
      },
      onGroupUpdate: (alias, patch) => {
        setSupplierOfferGroups((previous) => {
          const next = normalizeSupplierOfferGroups(
            previous.map((group) => (group.alias === alias ? { ...group, ...patch } : group)),
          )
          setOffers((current) => ({
            ...current,
            offer: mergeSupplierOffers(next),
          }))
          return next
        })
      },
      onAllComplete: () => {
        if (offerRequestId === offerRequestIdRef.current) {
          setOfferLoading(false)
        }
      },
    })
  }, [availableLoading, branchId, item, offerLoading, offersLoaded, orderNumber])

  const handleToggleSupplierOffer = useCallback((alias) => {
    setSupplierOfferGroups((previous) =>
      previous.map((group) =>
        group.alias === alias ? { ...group, expanded: !group.expanded } : group,
      ),
    )
  }, [])

  const toggleExpanded = () => {
    const nextExpanded = !expanded
    setExpanded(nextExpanded)
    if (nextExpanded) loadDetails()
  }

  const details = {
    ...item,
    images: item.images || [],
    offers,
  }

  return (
    <div className={`an${expanded ? ' op' : ''}`}>
      <button type="button" className="an-h" aria-expanded={expanded} onClick={toggleExpanded}>
        <span className="an-id">
          <span className="b">
            {item.brand} <span>/</span> <span className="mono">{item.article}</span>
          </span>
          {item.name ? <span className="nm">{item.name}</span> : null}
        </span>
        <span className="an-av">
          {stats.availableCount > 0 ? (
            <span className="pill ok">
              <span className="dot" />
              {availableLoading ? '…' : `${stats.availableCount} в наличии`}
            </span>
          ) : null}
          {stats.offerCount > 0 ? (
            <span className="pill ord">
              <span className="dot" />
              {offerLoading ? '…' : `${stats.offerCount} под заказ`}
            </span>
          ) : null}
          {!stats.availableCount &&
          !stats.offerCount &&
          !availableLoading &&
          !offerLoading &&
          expanded ? (
            <span className="pill no">
              <span className="dot" />
              Нет предложений
            </span>
          ) : null}
        </span>
        <span className="an-eta">
          {etaLabel}
          <small>ближайшая выдача</small>
        </span>
        <span className="an-pr">{minPrice ? money(minPrice) : '—'}</span>
        <span className="an-open">
          Предложения
          <svg className="ic" viewBox="0 0 24 24">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>
      {expanded ? (
        <div className="an-body">
          <OffersMainSection
            good={details}
            offers={offers}
            offersLoading={{
              available: availableLoading,
              offer: offerLoading,
            }}
            supplierOfferGroups={supplierOfferGroups}
            onToggleSupplier={handleToggleSupplierOffer}
            initialOrderNumber={orderNumber}
          />
        </div>
      ) : null}
    </div>
  )
}
