// @ts-nocheck
import { TAB_SEARCHED } from '../lib/constants'
import { money } from '../lib/format'
import { AnalogItem } from './AnalogItem'

export function AnalogsPanel({
  currentGood,
  offerStats,
  onBackToOffers,
  analogsLoading,
  analogs,
  branchId,
  initialOrderNumber,
  articleParam,
  brandParam,
}) {
  return (
    <div className="card">
      {currentGood ? (
        <div className="orig">
          <span className="tag">Искомая запчасть</span>
          <span style={{ fontWeight: 700 }}>
            {currentGood.brand} / <span className="mono">{currentGood.article}</span>
          </span>
          <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>
            {currentGood.name || '—'}
            {offerStats.minPrice ? ` · от ${money(offerStats.minPrice)}` : ''}
            {offerStats.nearestEta ? ` · ${offerStats.nearestEta}` : ''}
          </span>
          <span className="sp" />
          <button type="button" className="an-open" onClick={() => onBackToOffers(TAB_SEARCHED)}>
            К предложениям
            <svg className="ic" viewBox="0 0 24 24">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      ) : null}
      <div id="anlist">
        {analogsLoading ? (
          <div className="loading-card">
            <span className="loading-card__spinner" aria-label="Загрузка" />
            <span>Загрузка аналогов...</span>
          </div>
        ) : analogs.length ? (
          analogs.map((item) => (
            <AnalogItem
              key={`${item.brand}-${item.article}`}
              item={item}
              branchId={branchId}
              orderNumber={initialOrderNumber}
            />
          ))
        ) : (
          <div className="empty-msg">
            {articleParam && brandParam
              ? 'Аналоги не найдены'
              : 'Введите артикул и выберите бренд'}
          </div>
        )}
      </div>
    </div>
  )
}
