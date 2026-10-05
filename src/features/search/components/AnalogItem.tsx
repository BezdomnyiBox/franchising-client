// @ts-nocheck
import { useCallback, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
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
import { SearchPill } from './search-ui'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

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
    <Card className={cn(expanded && 'ring-1 ring-border')}>
      <Button
        type="button"
        variant="ghost"
        className="h-auto w-full flex-col items-stretch gap-3 px-4 py-3 hover:bg-muted/50 sm:flex-row sm:items-center"
        aria-expanded={expanded}
        onClick={toggleExpanded}
      >
        <div className="min-w-0 flex-1 space-y-0.5 text-left">
          <div className="font-medium">
            {item.brand} <span className="text-muted-foreground">/</span>{' '}
            <span className="font-mono text-sm">{item.article}</span>
          </div>
          {item.name ? <div className="truncate text-sm text-muted-foreground">{item.name}</div> : null}
        </div>
        <div className="flex flex-wrap gap-1.5 sm:justify-end">
          {stats.availableCount > 0 ? (
            <SearchPill variant="available">
              {availableLoading ? '…' : `${stats.availableCount} в наличии`}
            </SearchPill>
          ) : null}
          {stats.offerCount > 0 ? (
            <SearchPill variant="order">
              {offerLoading ? '…' : `${stats.offerCount} под заказ`}
            </SearchPill>
          ) : null}
          {!stats.availableCount &&
          !stats.offerCount &&
          !availableLoading &&
          !offerLoading &&
          expanded ? (
            <SearchPill variant="muted">Нет предложений</SearchPill>
          ) : null}
        </div>
        <div className="hidden text-right text-sm sm:block sm:w-28">
          <div className="font-medium">{etaLabel}</div>
          <div className="text-xs text-muted-foreground">ближайшая выдача</div>
        </div>
        <div className="hidden font-semibold sm:block sm:w-24 sm:text-right">
          {minPrice ? money(minPrice) : '—'}
        </div>
        <div className="flex items-center gap-1 text-sm text-primary sm:w-32 sm:justify-end">
          Предложения
          <ChevronDown className={cn('size-4 transition-transform', expanded && 'rotate-180')} />
        </div>
      </Button>
      {expanded ? (
        <CardContent className="border-t pt-4">
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
        </CardContent>
      ) : null}
    </Card>
  )
}
