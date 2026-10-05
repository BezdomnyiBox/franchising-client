// @ts-nocheck
import { OffersTable } from './OffersTable'

export function OffersPointCard({
  good,
  offers,
  availableCount,
  orderCount,
  initialOrderNumber,
  collapsed,
  onToggle,
}) {
  return (
    <div className={`card pp${collapsed ? ' cl' : ''}`}>
      <button type="button" className="pp-h" onClick={onToggle}>
        <span className="chev">
          <svg className="ic" viewBox="0 0 24 24">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
        <span className="pp-t">
          <span className="n">Предложения по товару</span>
          <span className="a">
            {good.brand} / {good.article}
            {good.name ? ` · ${good.name}` : ''}
          </span>
        </span>
        <span className="pp-sum">
          {availableCount > 0 ? (
            <span className="pill ok">
              <span className="dot" />
              {availableCount} в наличии
            </span>
          ) : null}
          {orderCount > 0 ? (
            <span className="pill ord">
              <span className="dot" />
              {orderCount} под заказ
            </span>
          ) : null}
        </span>
      </button>
      <div className="pp-body">
        <OffersTable
          good={good}
          offers={offers}
          initialOrderNumber={initialOrderNumber}
        />
      </div>
    </div>
  )
}
