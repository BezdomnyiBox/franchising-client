// @ts-nocheck
import { useState } from 'react'
import { X } from 'lucide-react'
import { BRANDS_PREVIEW_COUNT } from '../lib/constants'
import { formatBrandsMoreCount } from '../lib/format'
import { Button } from '@/components/ui/button'

export function BrandSelector({ brands, selectedBrand, onSelect }) {
  const [expanded, setExpanded] = useState(false)

  if (!brands.length) return null

  const visibleBrands = expanded ? brands : brands.slice(0, BRANDS_PREVIEW_COUNT)
  const hiddenCount = brands.length - visibleBrands.length

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Бренд:</span>
      {visibleBrands.map((brand) => {
        const active = selectedBrand === brand
        return (
          <Button
            key={brand}
            type="button"
            size="sm"
            variant={active ? 'default' : 'outline'}
            className="gap-1.5"
            onClick={() => onSelect(brand)}
          >
            {brand}
            {active ? <X className="size-3" /> : null}
          </Button>
        )
      })}
      {hiddenCount > 0 ? (
        <Button type="button" size="sm" variant="ghost" onClick={() => setExpanded(true)}>
          {formatBrandsMoreCount(hiddenCount)}
        </Button>
      ) : null}
    </div>
  )
}
