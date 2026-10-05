// @ts-nocheck
import { getGoodImageSrc, money } from '../lib/format'
import { computeOfferStats, normalizeOffers } from '../lib/offers'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

export function ProductSidebar({ good, offers, analogsCount, loading }) {
  if (!good) return null

  const imageSrc = getGoodImageSrc(good)
  const stats = computeOfferStats(normalizeOffers(offers))

  const rows = [
    { label: 'Предложений', value: loading ? '…' : stats.total },
    { label: 'Цена от', value: loading ? '…' : stats.minPrice ? money(stats.minPrice) : '—' },
    { label: 'Ближайшая выдача', value: loading ? '…' : stats.nearestEta || '—' },
    { label: 'Аналогов', value: analogsCount },
  ]

  return (
    <aside className="w-full shrink-0 lg:w-72 xl:w-80">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border bg-muted/30">
            {imageSrc ? (
              <img
                className="max-h-full max-w-full object-contain"
                src={imageSrc}
                alt={`${good.brand || ''} ${good.article || ''}`.trim() || 'Товар'}
              />
            ) : (
              <span className="text-xs text-muted-foreground">Нет фото</span>
            )}
          </div>
          <div className="space-y-2">
            <h2 className="text-base font-semibold leading-snug">{good.name || '—'}</h2>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{good.brand}</span>
              {' / '}
              <span className="font-mono text-xs">{good.article}</span>
            </p>
          </div>
          <Separator />
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {rows.map((row) => (
              <div key={row.label} className="contents">
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="text-right font-medium">
                  {loading && row.label !== 'Аналогов' ? (
                    <Skeleton className="ml-auto h-4 w-12" />
                  ) : (
                    row.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </aside>
  )
}
