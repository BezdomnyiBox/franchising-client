// @ts-nocheck
import { TAB_ANALOGS, TAB_SEARCHED } from '../lib/constants'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function SearchTabs({ activeTab, onChange, analogsCount, searchedCount }) {
  const tabs = [
    { id: TAB_SEARCHED, label: 'Искомая запчасть', count: searchedCount },
    { id: TAB_ANALOGS, label: 'Аналоги', count: analogsCount },
  ]

  return (
    <div className="flex flex-wrap gap-2 border-t pt-3">
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          type="button"
          size="sm"
          variant={activeTab === tab.id ? 'default' : 'outline'}
          className="gap-2"
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          {tab.count > 0 ? (
            <Badge
              variant="secondary"
              className={cn(
                'h-5 min-w-5 justify-center rounded-full px-1.5',
                activeTab === tab.id
                  ? 'bg-background/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {tab.count}
            </Badge>
          ) : null}
        </Button>
      ))}
    </div>
  )
}
