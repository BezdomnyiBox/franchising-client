// @ts-nocheck
import { applyOfferFilters } from '../lib/offers'
import { SupplierOfferAccordion } from './SupplierOfferAccordion'
import { SearchEmpty } from './search-ui'

export function SupplierOffersPanel({
  good,
  groups,
  initialOrderNumber,
  onToggleSupplier,
  filters,
}) {
  if (!groups.length) {
    return <SearchEmpty>Нет поставщиков для API-поиска</SearchEmpty>
  }

  const visibleGroups = groups
    .map((group) => ({
      ...group,
      offers: applyOfferFilters(group.offers, filters),
    }))
    .filter((group) => group.loading || group.offers.length > 0)

  if (!visibleGroups.length) {
    return <SearchEmpty>Нет предложений под заказ</SearchEmpty>
  }

  return (
    <div className="space-y-3">
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
