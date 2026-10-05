// @ts-nocheck
import { ArrowRight } from 'lucide-react'
import { TAB_SEARCHED } from '../lib/constants'
import { money } from '../lib/format'
import { AnalogItem } from './AnalogItem'
import { SearchEmpty, SearchLoading } from './search-ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

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
    <Card>
      {currentGood ? (
        <CardHeader className="space-y-3 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Искомая запчасть</Badge>
            <span className="font-semibold">
              {currentGood.brand} / <span className="font-mono text-sm">{currentGood.article}</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {currentGood.name || '—'}
            {offerStats.minPrice ? ` · от ${money(offerStats.minPrice)}` : ''}
            {offerStats.nearestEta ? ` · ${offerStats.nearestEta}` : ''}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-fit gap-1"
            onClick={() => onBackToOffers(TAB_SEARCHED)}
          >
            К предложениям
            <ArrowRight className="size-4" />
          </Button>
        </CardHeader>
      ) : null}
      {currentGood ? <Separator /> : null}
      <CardContent className="space-y-2 pt-6">
        {analogsLoading ? (
          <SearchLoading label="Загрузка аналогов…" />
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
          <SearchEmpty>
            {articleParam && brandParam
              ? 'Аналоги не найдены'
              : 'Введите артикул и выберите бренд'}
          </SearchEmpty>
        )}
      </CardContent>
    </Card>
  )
}
