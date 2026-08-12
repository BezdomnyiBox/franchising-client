import { http } from '@/shared/api/http'
import { API_BASE_URL } from '@/shared/config'
import type {
  AbyssSupplier,
  AnalogProduct,
  AnalogsListResult,
  AvailabilityFilter,
  OfferSortField,
  ProductOffer,
  ProductSearchCount,
  ProductSearchResult,
  ProductTip,
  SearchOffersParams,
  SearchTipsParams,
  SortDirection,
} from '@/entities/product/types'

function asArray<T>(value: T[] | Record<string, T> | null | undefined): T[] {
  if (!value) return []
  return Array.isArray(value) ? value : Object.values(value)
}

function tipBrandName(tip: ProductTip): string {
  if (!tip.brand) return ''
  if (typeof tip.brand === 'string') return tip.brand
  return tip.brand.name ?? ''
}

export function formatTipLabel(tip: ProductTip): string {
  return [tipBrandName(tip), tip.article].filter(Boolean).join(' ')
}

/** `/image/{id}.jpg` → через API gateway `/crm_fr/api/product/image/{id}.jpg` */
export function resolveProductImageUrl(url: string): string {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('/image/')) {
    return `${API_BASE_URL}/product${url}`
  }
  if (url.startsWith('/')) {
    return `${API_BASE_URL}${url}`
  }
  return url
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

/** Как в CRM ProductBlock: «В наличии» / «Под заказ» по warehouseType, не по stock. */
export function isOrderWarehouseOffer(offer: ProductOffer): boolean {
  return String(offer.warehouseType ?? '').toLowerCase() === 'order'
}

export function filterOffersByAvailability(
  items: ProductOffer[],
  filter: AvailabilityFilter,
): ProductOffer[] {
  switch (filter) {
    case 'available':
      return items.filter((item) => !isOrderWarehouseOffer(item))
    case 'order':
      return items.filter((item) => isOrderWarehouseOffer(item))
    default:
      return items
  }
}

export function sortOffers(
  items: ProductOffer[],
  field: OfferSortField,
  direction: SortDirection,
): ProductOffer[] {
  const mul = direction === 'asc' ? 1 : -1
  return [...items].sort((a, b) => {
    let cmp = 0
    switch (field) {
      case 'warehouse':
        cmp = String(a.warehouseName ?? '').localeCompare(String(b.warehouseName ?? ''), 'ru')
        break
      case 'price':
        cmp = (a.offerPrice ?? a.price ?? 0) - (b.offerPrice ?? b.price ?? 0)
        break
      case 'delivery': {
        const da = a.deliveryDays ?? Number.POSITIVE_INFINITY
        const db = b.deliveryDays ?? Number.POSITIVE_INFINITY
        cmp = da - db
        break
      }
      case 'quantity':
        cmp = (a.stock ?? 0) - (b.stock ?? 0)
        break
    }
    return cmp * mul
  })
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

  const availableOnly = params.availableOnly === true

  if (Array.isArray(data)) {
    const items = data
      .map(mapSearchOffer)
      .filter((o) => (availableOnly ? (o.stock ?? 0) > 0 : true))
    return { id: params.productId, items }
  }

  const items = (data.items ?? [])
    .map(mapSearchOffer)
    .filter((o) => {
      if (o.accessAddToOrder === false) return false
      if (availableOnly) return (o.stock ?? 0) > 0
      return true
    })

  return { ...data, items }
}

export async function fetchAnalogsList(
  productId: number,
  componentType: 'full' | 'part',
  params?: { orderId?: number; userId?: number },
): Promise<AnalogProduct[]> {
  const { data } = await http.get<AnalogsListResult | AnalogProduct[]>(
    `/product/${productId}/analogs_list`,
    {
      params: {
        componentType,
        isFast: 1,
        orderId: params?.orderId,
        userId: params?.userId,
      },
    },
  )

  if (Array.isArray(data)) return data

  return asArray(data.offerItems).map((item) => ({
    ...item,
    ourItemsCount: item.ourItemsCount ?? item.ourItems?.length ?? 0,
  }))
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

export async function updateProductItem(
  itemId: number,
  params?: { orderId?: number; branchId?: number },
): Promise<ProductOffer> {
  const { data } = await http.post<ProductOffer>(`/product/update_item/${itemId}`, null, {
    params: {
      orderId: params?.orderId,
      branch: params?.branchId,
    },
  })
  return mapSearchOffer(data ?? { id: itemId }, 0)
}

export async function fetchAbyssSuppliers(orderId?: number): Promise<AbyssSupplier[]> {
  const { data } = await http.get<AbyssSupplier[]>('/product/abyss_suppliers', {
    params: { orderId },
  })
  return Array.isArray(data) ? data : []
}

export async function updateProductByApi(
  productId: number,
  apiParamId: number,
  orderId?: number,
): Promise<void> {
  await http.post(`/product/${productId}/update_by_api/${apiParamId}`, { orderId })
}

export async function abyssUpdateProduct(
  productId: number,
  orderId?: number,
): Promise<void> {
  await http.post(`/product/abyss_update/${productId}`, { orderId })
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
