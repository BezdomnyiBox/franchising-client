// @ts-nocheck
import { API_BASE_URL } from '@/shared/config'

/** Единый бэкенд: back.public.lan через /crm_fr/api. */
export const BACK_HOST = API_BASE_URL
export const CRM_HOST = API_BASE_URL

export const TAB_OFFERS_ALL = 'all'
export const TAB_SEARCHED = 'searched'
export const TAB_ANALOGS = 'analogs'
export const OFFERS_TAB_AVAILABLE = 'available'
export const OFFERS_TAB_ORDER = 'offer'

export const EMPTY_OFFERS = {
  available: [],
  offer: [],
}

export const CITIES_PREVIEW_COUNT = 4
export const BRANDS_PREVIEW_COUNT = 8

export const EMPTY_OFFER_FILTERS = {
  priceFrom: '',
  priceTo: '',
  days: '',
  warehouse: '',
  sort: 'eta',
}
