// @ts-nocheck
import { useState } from 'react'
import { formatAssemblyTime, money } from '../lib/format'
import { getEtaSpeed, getOfferDays } from '../lib/offers'
import { AddToOrderModal } from './AddToOrderModal'

export function OfferRow({ good, offer, isBest, isFast, initialOrderNumber }) {
  const [viewModal, setViewModal] = useState(false)
  const supplierLabel = offer.warehousePublicName
    ? offer.warehousePublicName
    : (offer.supplierName || offer.warehousePublicName || '')
  const days = getOfferDays(offer)
  const speed = getEtaSpeed(days)
  const displayPrice = offer.offerPrice || offer.price

  return (
    <tr className={isBest ? 'best' : ''}>
      <td data-l="Склад и поставщик">
        <span className="cellwh">
          {isBest ? (
            <>
              <span className="badge-best">Рекомендуем</span>
              <br />
            </>
          ) : null}
          {supplierLabel}
          <small>
            {offer.warehousePublicNumber}
            {offer.rating ? ` ★ ${offer.rating}` : ''}
          </small>
        </span>
      </td>
      <td data-l="Цена">
        <span className="pr">
          {money(Number(displayPrice) || 0)}
          <small>за 1 шт.</small>
        </span>
      </td>
      <td data-l="Готовность к выдаче">
        <span className="eta">
          <span className={`d ${speed}`} />
          <b>{formatAssemblyTime(offer.assemblyTime)}</b>
          {isFast ? <small>· самый быстрый</small> : null}
        </span>
      </td>
      <td className="qty" data-l="Кол-во">
        <b>{offer.stock}</b> <small>шт.</small>
      </td>
      <td className="warr" data-l="Гарантия">{offer.warranty || '—'}</td>
      <td className="act" data-l="Действие">
        {viewModal ? (
          <AddToOrderModal
            good={good}
            offer={offer}
            initialOrderNumber={initialOrderNumber}
            onClose={() => setViewModal(false)}
          />
        ) : (
          <button type="button" className="add" onClick={() => setViewModal(true)}>
            <svg className="ic" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" />
            </svg>
            В заказ
          </button>
        )}
      </td>
    </tr>
  )
}
