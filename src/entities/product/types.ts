export interface ProductBrand {
  id?: number
  name?: string
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
  items: ProductOffer[]
  itemsCount?: number
  needAbyssUpdate?: boolean
}

export interface ProductSearchCount {
  ourProductsInSearchResult?: number[]
  [key: string]: unknown
}

export interface SearchTipsParams {
  q: string
}

export interface SearchOffersParams {
  productId: number
  orderId?: number
  userId?: number
}
