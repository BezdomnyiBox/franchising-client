// @ts-nocheck
import { applyOfferFilters } from '../lib/offers'
import { SupplierOfferAccordion } from './SupplierOfferAccordion'

export function SupplierOffersPanel({
  good,
  groups,
  initialOrderNumber,
  onToggleSupplier,
  filters,
}) {
  if (!groups.length) {
    return <div className="empty-msg">Нет поставщиков для API-поиска</div>
  }

  const visibleGroups = groups
    .map((group) => ({
      ...group,
      offers: applyOfferFilters(group.offers, filters),
    }))
    .filter((group) => group.loading || group.offers.length > 0)

  if (!visibleGroups.length) {
    return <div className="empty-msg">Нет предложений под заказ</div>
  }

  return (
    <div className="supplier-offers-list">
      {visibleGroups.map((group) => (
        <SupplierOfferAccordion
          key={group.alias}
          good={good}
          group={group}
          initialOrderNumber={initialOrderNumber}
          onToggle={onToggleSupplier}
        />
      ))}
    </div>
  )
}
