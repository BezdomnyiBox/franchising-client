// @ts-nocheck
import { ChevronDown } from 'lucide-react'
import { OffersTable } from './OffersTable'
import { SearchPill } from './search-ui'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function OffersPointCard({
  good,
  offers,
  availableCount,
  orderCount,
  initialOrderNumber,
  collapsed,
  onToggle,
  offerAction = { mode: 'add-to-order' },
}) {
  return (
    <Card>
      <CardHeader className="pb-0">
        <Button
          type="button"
          variant="ghost"
          className="h-auto w-full justify-between gap-3 px-0 py-2 hover:bg-transparent"
          onClick={onToggle}
        >
          <div className="flex min-w-0 items-start gap-2 text-left">
            <ChevronDown
              className={cn(
                'mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform',
                collapsed && '-rotate-90',
              )}
            />
            <div className="min-w-0 space-y-0.5">
              <div className="font-medium">Предложения по товару</div>
              <div className="truncate text-xs text-muted-foreground">
                {good.brand} / {good.article}
                {good.name ? ` · ${good.name}` : ''}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
            {availableCount > 0 ? (
              <SearchPill variant="available">{availableCount} в наличии</SearchPill>
            ) : null}
            {orderCount > 0 ? (
              <SearchPill variant="order">{orderCount} под заказ</SearchPill>
            ) : null}
          </div>
        </Button>
      </CardHeader>
      {!collapsed ? (
        <CardContent className="pt-4">
          <OffersTable
            good={good}
            offers={offers}
            initialOrderNumber={initialOrderNumber}
            offerAction={offerAction}
          />
        </CardContent>
      ) : null}
    </Card>
  )
}
