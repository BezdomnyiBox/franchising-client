// @ts-nocheck
import { useEffect, useState } from 'react'
import { BACK_HOST } from '../lib/constants'
import { formatAssemblyTime } from '../lib/format'

export function AddToOrderModal({ good, offer, initialOrderNumber = '', onClose }) {
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber || '')

  const handleAddToOrder = () => {
    if (!orderNumber) return

    fetch(`${BACK_HOST}/order/add_offer_product`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNumber,
        brand: good.brand,
        article: good.article,
        name: good.name,
        price: offer.price,
        offerPrice: offer.offerPrice,
        quantity: offer.stock,
        warehouseVendorId: offer.warehouseVendorId,
        supplierAlias: offer.supplierAlias,
        deliveryDuration: offer.deliveryDuration,
        multiplicity: offer.multiplicity,
      }),
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.result === 'success') window.alert('Товар добавлен в заказ')
        else window.alert(result.message)
      })
      .then(() => onClose())
      .catch((error) => {
        window.alert(error.message)
        onClose()
      })
  }

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="search-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="search-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-to-order-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="search-modal__title">
          <h2 id="add-to-order-title" className="search-modal__heading">
            Добавить товар в заказ
          </h2>
          <p className="search-modal__line">
            {good.brand} / {good.article}
          </p>
          <p className="search-modal__line">{good.name}</p>
          <p className="search-modal__line">Цена: {offer.offerPrice} руб.</p>
          <p className="search-modal__line">
            Срок поставки: {formatAssemblyTime(offer.assemblyTime)}
          </p>
          <p className="search-modal__line">
            Склад: {offer.warehousePublicName} ({offer.warehousePublicNumber})
          </p>
          <label className="search-modal__label" htmlFor="order-number-input">
            Номер заказа
          </label>
          <input
            id="order-number-input"
            className="search-modal__field"
            value={orderNumber}
            onChange={(event) => setOrderNumber(event.target.value)}
          />
        </div>
        <div className="search-modal__actions">
          <button
            type="button"
            className="search-btn search-btn--outlined-secondary"
            onClick={onClose}
          >
            Отменить
          </button>
          <button
            type="button"
            className="search-btn search-btn--contained-primary"
            onClick={handleAddToOrder}
          >
            Добавить
          </button>
        </div>
      </div>
    </div>
  )
}
