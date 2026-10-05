// @ts-nocheck
import { computeOfferRanges } from '../lib/offers'
import { OffersTable } from './OffersTable'

export function SupplierOfferAccordion({ good, group, initialOrderNumber, onToggle }) {
  const ranges = computeOfferRanges(group.offers)
  const canExpand = !group.loading && group.offers.length > 0

  return (
    <div
      className={`card pp supplier-offer${!group.expanded ? ' cl' : ''}${canExpand ? ' supplier-offer--expandable' : ''}`}
    >
      <button
        type="button"
        className="pp-h"
        onClick={() => {
          if (canExpand) onToggle(group.alias)
        }}
        aria-expanded={group.expanded}
      >
        <span className="chev">
          <svg className="ic" viewBox="0 0 24 24">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
        <span className="pp-t">
          <span className="n">{group.name}</span>
          {group.loading ? (
            <span className="a supplier-offer__status">Загрузка предложений...</span>
          ) : ranges ? (
            <span className="a">
              {ranges.priceLabel} · {ranges.deliveryLabel}
            </span>
          ) : (
            <span className="a supplier-offer__status">Нет предложений</span>
          )}
        </span>
        <span className="pp-sum">
          {group.loading ? (
            <span className="supplier-offer__spinner" aria-label="Загрузка" />
          ) : group.offers.length > 0 ? (
            <span className="pill ord">
              <span className="dot" />
              {group.offers.length} под заказ
            </span>
          ) : (
            <span className="pill no">
              <span className="dot" />
              Пусто
            </span>
          )}
        </span>
      </button>
      {group.expanded && group.offers.length > 0 ? (
        <div className="pp-body">
          <OffersTable
            good={good}
            offers={group.offers}
            initialOrderNumber={initialOrderNumber}
          />
        </div>
      ) : null}
    </div>
  )
}
