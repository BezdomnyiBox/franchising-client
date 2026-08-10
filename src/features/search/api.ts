import { http } from '@/shared/api/http'
import type { ProductOffer, ProductTip, SearchOffersParams, SearchTipsParams } from '@/entities/product/types'

export async function fetchProductTips(params: SearchTipsParams): Promise<ProductTip[]> {
  const { data } = await http.get<ProductTip[] | { tips?: ProductTip[] }>('/product/tips', {
    params: { q: params.q },
  })
  if (Array.isArray(data)) return data
  return data.tips ?? []
}

export async function fetchProductOffers(params: SearchOffersParams): Promise<ProductOffer[]> {
  const { data } = await http.get<ProductOffer[] | { items?: ProductOffer[] }>(
    `/product/search/${params.productId}`,
    {
      params: {
        orderId: params.orderId,
      },
    },
  )
  if (Array.isArray(data)) return data
  return data.items ?? []
}
