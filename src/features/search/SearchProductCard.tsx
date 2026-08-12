import { useState } from 'react'
import { ImageOff, Info } from 'lucide-react'
import type { ProductSearchResult } from '@/entities/product/types'
import { resolveProductImageUrl } from '@/features/search/api'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function SearchProductCard({ product }: { product: ProductSearchResult }) {
  const [lightbox, setLightbox] = useState(false)
  const [showBrandInfo, setShowBrandInfo] = useState(false)

  const brand = typeof product.brand === 'object' ? product.brand : null
  const images = (product.images ?? []).map(resolveProductImageUrl).filter(Boolean)
  const mainImage = images[0]

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold leading-snug tracking-tight">
          {product.name || 'Товар'}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          {brand?.country ? (
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {brand.country}
            </span>
          ) : null}
          <span className="font-semibold">{brand?.name || '—'}</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-mono font-semibold">{product.article}</span>
          {brand?.description ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={() => setShowBrandInfo((v) => !v)}
            >
              <Info className="size-3.5" />
              О бренде
            </Button>
          ) : null}
        </div>
        {product.category?.nameSingularly ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Категория: {product.category.nameSingularly}
          </p>
        ) : null}
        {product.searchBranchName ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Наличие для ПВ: {product.searchBranchName}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        className={cn(
          'relative flex h-40 w-40 items-center justify-center overflow-hidden rounded-lg border bg-muted/30',
          mainImage && 'cursor-zoom-in',
        )}
        onClick={() => mainImage && setLightbox(true)}
        disabled={!mainImage}
      >
        {mainImage ? (
          <img
            src={mainImage}
            alt={product.name || product.article || 'Товар'}
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
            <ImageOff className="size-6" />
            Нет фото
          </span>
        )}
      </button>

      {images.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {images.slice(0, 6).map((src) => (
            <button
              key={src}
              type="button"
              className="size-12 overflow-hidden rounded border"
              onClick={() => setLightbox(true)}
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}

      {showBrandInfo && brand?.description ? (
        <div className="rounded-lg border bg-muted/20 p-3 text-sm">
          <div className="mb-1 font-medium">Описание бренда {brand.name}</div>
          <div
            className="prose prose-sm max-w-none text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: brand.description }}
          />
        </div>
      ) : null}

      {brand?.certificates && brand.certificates.length > 0 ? (
        <div className="text-xs text-muted-foreground">
          Сертификаты: {brand.certificates.join(', ')}
        </div>
      ) : null}

      {lightbox && mainImage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setLightbox(false)}
          onKeyDown={(e) => e.key === 'Escape' && setLightbox(false)}
          role="dialog"
          aria-modal="true"
        >
          <img
            src={mainImage}
            alt={product.name || ''}
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />
        </div>
      ) : null}
    </div>
  )
}
