// @ts-nocheck
import { useState } from 'react'
import { BRANDS_PREVIEW_COUNT } from '../lib/constants'
import { formatBrandsMoreCount } from '../lib/format'

export function BrandSelector({ brands, selectedBrand, onSelect }) {
  const [expanded, setExpanded] = useState(false)

  if (!brands.length) return null

  const visibleBrands = expanded ? brands : brands.slice(0, BRANDS_PREVIEW_COUNT)
  const hiddenCount = brands.length - visibleBrands.length

  return (
    <div className="brandline">
      <span>Бренд:</span>
      {visibleBrands.map((brand) => (
        <button
          key={brand}
          type="button"
          className={`bchip${selectedBrand === brand ? ' on' : ''}`}
          onClick={() => onSelect(brand)}
        >
          {brand}
          {selectedBrand === brand ? (
            <svg className="ic" viewBox="0 0 24 24" style={{ width: 12, height: 12 }}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : null}
        </button>
      ))}
      {hiddenCount > 0 ? (
        <button type="button" className="bmore" onClick={() => setExpanded(true)}>
          {formatBrandsMoreCount(hiddenCount)}
        </button>
      ) : null}
    </div>
  )
}
