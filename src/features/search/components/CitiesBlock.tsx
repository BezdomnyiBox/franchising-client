// @ts-nocheck
import { useState } from 'react'
import { CITIES_PREVIEW_COUNT } from '../lib/constants'
import { formatCitiesMoreCount, formatWarehouseCount } from '../lib/format'

export function CitiesBlock({ cities, loading, article, currentTownId }) {
  const [expanded, setExpanded] = useState(false)
  const otherCities = (Array.isArray(cities) ? cities : []).filter(
    (city) => currentTownId == null || Number(city.id) !== Number(currentTownId),
  )

  if (!loading && !otherCities.length) return null

  const visibleCities = expanded ? otherCities : otherCities.slice(0, CITIES_PREVIEW_COUNT)
  const hiddenCount = otherCities.length - visibleCities.length

  return (
    <div className="card" id="cities">
      <div className="c-h">
        <span className="i">
          <svg className="ic ic-l" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z" />
          </svg>
        </span>
        <div className="t">
          <b>Наличие в других городах</b>
          <div>Доставка транспортной компанией · только наличие</div>
        </div>
        {article ? (
          <span className="pill no">
            <span className="dot" />
            {article}
          </span>
        ) : null}
      </div>
      {loading && !otherCities.length ? (
        <div className="empty-msg">Загрузка городов...</div>
      ) : (
        visibleCities.map((city) => {
          const available = Number(city.available) || 0
          const api = Number(city.api) || 0

          return (
            <div className="crow" key={city.id}>
              <div className="cn">
                <b>{city.name}</b>
              </div>
              {available > 0 ? (
                <span className="pill ok">
                  <span className="dot" />
                  В наличии · {formatWarehouseCount(available)}
                </span>
              ) : null}
              {api > 0 ? (
                <span className="pill ord">
                  <span className="dot" />
                  Под заказ · {formatWarehouseCount(api)}
                </span>
              ) : null}
              {available === 0 && api === 0 ? (
                <span className="pill no">
                  <span className="dot" />
                  Нет наличия
                </span>
              ) : null}
              <button type="button" className="an-open go" data-city={city.name}>
                Открыть поиск
                <svg className="ic" viewBox="0 0 24 24">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
          )
        })
      )}
      {hiddenCount > 0 ? (
        <button type="button" className="c-more" onClick={() => setExpanded(true)}>
          {formatCitiesMoreCount(hiddenCount)}
        </button>
      ) : null}
    </div>
  )
}
