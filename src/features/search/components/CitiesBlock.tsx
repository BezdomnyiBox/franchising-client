// @ts-nocheck
import { useState } from 'react'
import { ArrowRight, Globe } from 'lucide-react'
import { CITIES_PREVIEW_COUNT } from '../lib/constants'
import { formatCitiesMoreCount, formatWarehouseCount } from '../lib/format'
import { SearchEmpty, SearchLoading, SearchPill } from './search-ui'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function CitiesBlock({ cities, loading, article, currentTownId }) {
  const [expanded, setExpanded] = useState(false)
  const otherCities = (Array.isArray(cities) ? cities : []).filter(
    (city) => currentTownId == null || Number(city.id) !== Number(currentTownId),
  )

  if (!loading && !otherCities.length) return null

  const visibleCities = expanded ? otherCities : otherCities.slice(0, CITIES_PREVIEW_COUNT)
  const hiddenCount = otherCities.length - visibleCities.length

  return (
    <Card id="cities">
      <CardHeader className="flex-row flex-wrap items-start gap-3 space-y-0 pb-3">
        <Globe className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1 space-y-1">
          <CardTitle className="text-base">Наличие в других городах</CardTitle>
          <p className="text-sm text-muted-foreground">
            Доставка транспортной компанией · только наличие
          </p>
        </div>
        {article ? <SearchPill variant="muted">{article}</SearchPill> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && !otherCities.length ? (
          <SearchLoading label="Загрузка городов…" />
        ) : (
          visibleCities.map((city) => {
            const available = Number(city.available) || 0
            const api = Number(city.api) || 0

            return (
              <div
                key={city.id}
                className="flex flex-col gap-2 border-b pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="font-medium">{city.name}</div>
                <div className="flex flex-wrap items-center gap-2">
                  {available > 0 ? (
                    <SearchPill variant="available">
                      В наличии · {formatWarehouseCount(available)}
                    </SearchPill>
                  ) : null}
                  {api > 0 ? (
                    <SearchPill variant="order">
                      Под заказ · {formatWarehouseCount(api)}
                    </SearchPill>
                  ) : null}
                  {available === 0 && api === 0 ? (
                    <SearchPill variant="muted">Нет наличия</SearchPill>
                  ) : null}
                  <Button type="button" size="sm" variant="ghost" className="gap-1" data-city={city.name}>
                    Открыть поиск
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            )
          })
        )}
        {hiddenCount > 0 ? (
          <Button type="button" variant="link" className="h-auto p-0" onClick={() => setExpanded(true)}>
            {formatCitiesMoreCount(hiddenCount)}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
