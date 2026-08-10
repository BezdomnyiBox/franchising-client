export interface ProductTip {
  id: number
  article: string
  brand?: string
  name?: string
}

export interface ProductOffer {
  id: number
  article: string
  brand?: string
  name?: string
  price?: number
  quantity?: number
  deliveryDays?: number
  warehouseName?: string
  [key: string]: unknown
}

export interface SearchTipsParams {
  q: string
}

export interface SearchOffersParams {
  productId: number
  orderId?: number
}
