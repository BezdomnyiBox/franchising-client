import { http } from '@/shared/api/http'
import type {
  ProductOffer,
  ProductSearchCount,
  ProductSearchResult,
  ProductTip,
  SearchOffersParams,
  SearchTipsParams,
} from '@/entities/product/types'

function tipBrandName(tip: ProductTip): string {
  if (!tip.brand) return ''
  if (typeof tip.brand === 'string') return tip.brand
  return tip.brand.name ?? ''
}

export function formatTipLabel(tip: ProductTip): string {
  return [tipBrandName(tip), tip.article].filter(Boolean).join(' ')
}

export function mapSearchOffer(raw: ProductOffer, index: number): ProductOffer {
  const article = raw.product?.article || raw.article || '—'
  const brand =
    (typeof raw.product?.brand === 'object' ? raw.product?.brand?.name : undefined) ||
    (typeof raw.brand === 'string' ? raw.brand : undefined) ||
    '—'
  const name = raw.product?.name || raw.name || '—'

  let deliveryDays: number | null = null
  if (raw.legacyWarehouse === 0 && raw.accessAddToOrder) {
    deliveryDays = 0
  } else if (raw.assemblyTime) {
    const diffMs = new Date(raw.assemblyTime).getTime() - Date.now()
    deliveryDays = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)))
  }

  return {
    ...raw,
    article,
    brand,
    name,
    quantity: raw.stock,
    deliveryDays,
    /** lineNumber в CRM = index + 1 */
    lineNumber: index + 1,
    isMargin: index < 10,
  }
}

export async function fetchProductTips(params: SearchTipsParams): Promise<ProductTip[]> {
  const { data } = await http.get<ProductTip[] | { tips?: ProductTip[] }>('/product/tips', {
    params: { q: params.q },
  })
  if (Array.isArray(data)) return data
  return data.tips ?? []
}

export async function fetchProductSearch(
  params: SearchOffersParams,
): Promise<ProductSearchResult> {
  const { data } = await http.get<ProductSearchResult | ProductOffer[]>(
    `/product/search/${params.productId}`,
    {
      params: {
        orderId: params.orderId,
        userId: params.userId,
      },
    },
  )

  if (Array.isArray(data)) {
    return {
      id: params.productId,
      items: data.map(mapSearchOffer).filter((o) => (o.stock ?? 0) > 0),
    }
  }

  const items = (data.items ?? [])
    .map(mapSearchOffer)
    .filter((o) => (o.stock ?? 0) > 0 && o.accessAddToOrder !== false)

  return { ...data, items }
}

/** @deprecated — используйте fetchProductSearch; оставлено для SearchPage. */
export async function fetchProductOffers(params: SearchOffersParams): Promise<ProductOffer[]> {
  const result = await fetchProductSearch(params)
  return result.items
}

export async function fetchProductSearchCount(
  productId: number,
  orderId?: number,
): Promise<ProductSearchCount> {
  const { data } = await http.get<ProductSearchCount>(`/product/search/${productId}/count`, {
    params: { orderId },
  })
  return data ?? {}
}

export interface SetOrderElementItemPayload {
  searchProductId: number | null
  our_products_in_search_result?: unknown[]
  is_margin?: boolean
  lineNumber?: number
}

export async function setOrderElementItem(
  orderElementId: number,
  itemId: number,
  payload: SetOrderElementItemPayload,
): Promise<{ result?: string; error?: string }> {
  const { data } = await http.post<{ result?: string; error?: string }>(
    `/order_element/${orderElementId}/set_item/${itemId}`,
    {
      searchProductId: payload.searchProductId,
      our_products_in_search_result: payload.our_products_in_search_result ?? [],
      is_margin: payload.is_margin ?? false,
      lineNumber: payload.lineNumber ?? 0,
    },
  )
  return data ?? { result: 'success' }
}

export async function addAccompanyingItem(orderElementId: number): Promise<void> {
  await http.post(`/order_element/${orderElementId}/add_accompanying_item`)
}

export async function patchOrderElementOem(
  orderElementId: number,
  value: string,
): Promise<void> {
  await http.patch(`/order_element/${orderElementId}/oem`, { value })
}
