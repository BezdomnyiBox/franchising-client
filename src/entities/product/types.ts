export interface ProductBrand {
  id?: number
  name?: string
  country?: string
  countryFlagAlias?: string
  description?: string
  slug?: string
  certificates?: string[]
  carManufacturer?: boolean
}

/** Подсказка GET /product/tips */
export interface ProductTip {
  id: number
  article: string
  article_search?: string
  name?: string
  brand?: ProductBrand | string
  itemsCount?: number
}

/** Оффер из product.search.*.items */
export interface ProductOffer {
  id: number
  productId?: number
  stock?: number
  price?: number
  offerPrice?: number
  margin?: number
  assemblyTime?: string
  deliveryDuration?: number
  warehouseName?: string
  warehouseType?: string
  legacyWarehouse?: number
  supplierAlias?: string
  accessAddToOrder?: boolean
  updateable?: boolean
  updateTime?: string
  needUpdate?: boolean
  warrantyPeriod?: number
  multiplicity?: number
  product?: {
    id?: number
    article?: string
    name?: string
    brand?: ProductBrand
  }
  /** Нормализованные поля для UI (после mapOffer). */
  article?: string
  brand?: string
  name?: string
  quantity?: number
  deliveryDays?: number | null
  [key: string]: unknown
}

export interface ProductSearchResult {
  id: number
  article?: string
  name?: string
  brand?: ProductBrand
  images?: string[]
  category?: {
    id?: number
    nameSingularly?: string
    namePlural?: string
  } | null
  items: ProductOffer[]
  itemsCount?: number
  needAbyssUpdate?: boolean
  searchBranchId?: number
  searchBranchName?: string
}

export interface ProductSearchCount {
  search_product_items_count?: number
  search_analogs_items_count?: number
  search_our_analogs_items_count?: number
  search_analogs_parts_items_count?: number
  search_our_analogs_parts_items_count?: number
  ourProductsInSearchResult?: number[]
  [key: string]: unknown
}

/** Элемент GET /product/{id}/analogs_list */
export interface AnalogProduct {
  id: number
  productId: number
  brandId?: number
  brandName?: string
  article?: string
  productName?: string
  componentType?: string
  offerPrice?: number
  margin?: number
  count?: number
  availableCount?: number
  orderCount?: number
  ourItems?: number[]
  ourItemsCount?: number
  reliable?: boolean | null
}

export interface AnalogsListResult {
  offerItems: AnalogProduct[]
  emptyItems?: AnalogProduct[]
}

export interface AbyssSupplier {
  id: number
  supplierName: string
  supplierAlias?: string
}

export type AvailabilityFilter = 'available' | 'order' | 'all'

export type OfferSortField = 'warehouse' | 'price' | 'delivery' | 'quantity'
export type SortDirection = 'asc' | 'desc'

export interface SearchTipsParams {
  q: string
}

export interface SearchOffersParams {
  productId: number
  orderId?: number
  userId?: number
  /** Если true — только stock > 0 (как в диалоге на позиции). По умолчанию false. */
  availableOnly?: boolean
}
