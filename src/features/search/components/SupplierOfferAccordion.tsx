// @ts-nocheck
import { ChevronDown, Loader2 } from 'lucide-react'
import { computeOfferRanges } from '../lib/offers'
import { OffersTable } from './OffersTable'
import { SearchPill } from './search-ui'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function SupplierOfferAccordion({ good, group, initialOrderNumber, onToggle }) {
  const ranges = computeOfferRanges(group.offers)
  const canExpand = !group.loading && group.offers.length > 0

  return (
    <Card>
      <CardHeader className="pb-0">
        <Button
          type="button"
          variant="ghost"
          disabled={!canExpand && !group.loading}
          className="h-auto w-full justify-between gap-3 px-0 py-2 hover:bg-transparent disabled:opacity-100"
          aria-expanded={group.expanded}
          onClick={() => {
            if (canExpand) onToggle(group.alias)
          }}
        >
          <div className="flex min-w-0 items-start gap-2 text-left">
            <ChevronDown
              className={cn(
                'mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform',
                !group.expanded && canExpand && '-rotate-90',
                !canExpand && 'opacity-30',
              )}
            />
            <div className="min-w-0 space-y-0.5">
              <div className="font-medium">{group.name}</div>
              {group.loading ? (
                <div className="text-xs text-muted-foreground">Загрузка предложений…</div>
              ) : ranges ? (
                <div className="text-xs text-muted-foreground">
                  {ranges.priceLabel} · {ranges.deliveryLabel}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">Нет предложений</div>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {group.loading ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Загрузка" />
            ) : group.offers.length > 0 ? (
              <SearchPill variant="order">{group.offers.length} под заказ</SearchPill>
            ) : (
              <SearchPill variant="muted">Пусто</SearchPill>
            )}
          </div>
        </Button>
      </CardHeader>
      {group.expanded && group.offers.length > 0 ? (
        <CardContent className="pt-4">
          <OffersTable good={good} offers={group.offers} initialOrderNumber={initialOrderNumber} />
        </CardContent>
      ) : null}
    </Card>
  )
}
