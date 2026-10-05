// @ts-nocheck
import { MapPin, Search, X } from 'lucide-react'
import { BrandSelector } from './BrandSelector'
import { SearchTabs } from './SearchTabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export function SearchHeader({
  cityLabel,
  searchArticle,
  onArticleChange,
  onSearch,
  onClear,
  brands,
  articleParam,
  activeBrand,
  onBrandSelect,
  activeTab,
  onTabChange,
  analogsCount,
  searchedCount,
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Поиск по артикулу</CardTitle>
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0" />
          Наличие и стоимость для города{' '}
          <span className="font-medium text-foreground">{cityLabel}</span>
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 pr-9"
              placeholder="Артикул"
              value={searchArticle}
              onChange={(event) => onArticleChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onSearch(event.target.value)
              }}
            />
            {searchArticle ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                title="Очистить"
                onClick={onClear}
              >
                <X className="size-4" />
              </Button>
            ) : null}
          </div>
          <Button
            type="button"
            className="shrink-0 sm:w-auto"
            disabled={!searchArticle?.trim()}
            onClick={() => onSearch(searchArticle)}
          >
            <Search className="size-4" />
            Искать
          </Button>
        </div>

        <BrandSelector
          key={articleParam}
          brands={brands}
          selectedBrand={activeBrand}
          onSelect={onBrandSelect}
        />
        <SearchTabs
          activeTab={activeTab}
          onChange={onTabChange}
          analogsCount={analogsCount}
          searchedCount={searchedCount}
        />
      </CardContent>
    </Card>
  )
}
