// @ts-nocheck
import { OfferRow } from './OfferRow'

export function OffersTable({ good, offers, initialOrderNumber }) {
  if (!offers.length) {
    return <div className="empty-msg">Нет предложений</div>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Склад и поставщик</th>
          <th>Цена</th>
          <th>Готовность к выдаче</th>
          <th>Кол-во</th>
          <th>Гарантия</th>
          <th className="r">Действие</th>
        </tr>
      </thead>
      <tbody>
        {offers.map((offer) => (
          <OfferRow
            key={`${offer.supplierAlias}|${offer.warehouseVendorId}`}
            good={good}
            offer={offer}
            isBest={offer.bestId}
            isFast={offer.isFast}
            initialOrderNumber={initialOrderNumber}
          />
        ))}
      </tbody>
    </table>
  )
}
