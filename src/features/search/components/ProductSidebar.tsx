// @ts-nocheck
import { getGoodImageSrc, money } from '../lib/format'
import { computeOfferStats, normalizeOffers } from '../lib/offers'

export function ProductSidebar({ good, offers, analogsCount, loading }) {
  if (!good) return null

  const imageSrc = getGoodImageSrc(good)
  const stats = computeOfferStats(normalizeOffers(offers))

  return (
    <aside className="side">
      <div className="card pcard">
        <div className="pimg">
          {imageSrc ? (
            <img
              className="pimg__photo"
              src={imageSrc}
              alt={`${good.brand || ''} ${good.article || ''}`.trim() || 'Товар'}
            />
          ) : (
            <>
              <div className="ph" />
              <em>фото товара</em>
            </>
          )}
        </div>
        <div>
          <h1 className="ptitle">{good.name || '—'}</h1>
          <div className="pmeta">
            <b>{good.brand}</b> / <span className="mono">{good.article}</span>
          </div>
          <dl className="kv">
            <dt>Предложений</dt>
            <dd>{loading ? '…' : stats.total}</dd>
            <dt>Цена от</dt>
            <dd>{loading ? '…' : (stats.minPrice ? money(stats.minPrice) : '—')}</dd>
            <dt>Ближайшая выдача</dt>
            <dd>{loading ? '…' : (stats.nearestEta || '—')}</dd>
            <dt>Аналогов</dt>
            <dd>{analogsCount}</dd>
          </dl>
        </div>
      </div>
    </aside>
  )
}
