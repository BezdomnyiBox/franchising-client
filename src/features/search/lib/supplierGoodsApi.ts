// @ts-nocheck
import { BACK_HOST, OFFERS_TAB_ORDER } from './constants'
import {
  dedupeSuppliersByAlias,
  parseOffersList,
} from './offers'

const inFlightOffersLoadKeys = new Set()
const completedOffersLoadKeys = new Set()
const inFlightFetchByUrl = new Map()

export const resetOffersLoadTracking = () => {
  inFlightOffersLoadKeys.clear()
  completedOffersLoadKeys.clear()
  inFlightFetchByUrl.clear()
}

export const getCompletedOffersLoadKeys = () => completedOffersLoadKeys
export const getInFlightOffersLoadKeys = () => inFlightOffersLoadKeys

export const fetchSupplierGoods = (url, init = {}) => {
  const existing = inFlightFetchByUrl.get(url)
  if (existing) return existing

  const request = fetch(url, init).finally(() => {
    if (inFlightFetchByUrl.get(url) === request) {
      inFlightFetchByUrl.delete(url)
    }
  })

  inFlightFetchByUrl.set(url, request)
  return request
}

export const buildGoodsParams = ({
  article,
  branchId,
  brand,
  orderNumber,
  offersType,
  source,
  supplierAlias,
}) => {
  const params = new URLSearchParams({ article })
  if (branchId) params.set('branchId', String(branchId))
  if (brand) params.set('brand', brand)
  if (orderNumber) params.set('orderNumber', orderNumber)
  if (offersType) params.set('offersType', offersType)
  if (source) params.set('source', source)
  if (supplierAlias) params.set('supplierAlias', supplierAlias)
  return params
}

export const fetchCities = ({ article, brand, branchId, requestId, requestIdRef }) => {
  const params = buildGoodsParams({ article, brand, branchId })

  return fetch(`${BACK_HOST}/supplier-goods/cities?${params}`, {
    method: 'GET',
    credentials: 'include',
  })
    .then((response) => response.json())
    .then((data) => {
      if (requestId !== requestIdRef.current) return null
      return Array.isArray(data) ? data : []
    })
    .catch(() => {
      if (requestId !== requestIdRef.current) return null
      return []
    })
}

export const fetchApiSuppliers = (branchId) => {
  const params = new URLSearchParams()
  if (branchId) params.set('branchId', String(branchId))
  return fetch(`${BACK_HOST}/supplier-goods/api-suppliers?${params}`, {
    method: 'GET',
    credentials: 'include',
  })
    .then((response) => response.json())
    .then((data) => dedupeSuppliersByAlias(data))
    .catch(() => [])
}

export const loadSupplierOffersParallel = ({
  baseParams,
  branchId,
  requestId,
  requestIdRef,
  onGroupsInit,
  onGroupUpdate,
  onAllComplete,
}) => fetchApiSuppliers(branchId).then((suppliers) => {
  if (requestId !== requestIdRef.current) return

  const groups = dedupeSuppliersByAlias(suppliers).map((supplier) => ({
    alias: supplier.alias,
    name: supplier.name || supplier.alias,
    loading: true,
    offers: [],
    expanded: false,
  }))

  onGroupsInit(groups)

  if (!groups.length) {
    onAllComplete()
    return
  }

  let pending = groups.length
  groups.forEach((group) => {
    const params = buildGoodsParams({
      ...baseParams,
      offersType: OFFERS_TAB_ORDER,
      supplierAlias: group.alias,
    })

    const requestUrl = `${BACK_HOST}/supplier-goods?${params}`

    fetchSupplierGoods(requestUrl, {
      method: 'GET',
      credentials: 'include',
    })
      .then((response) => response.json())
      .then((data) => {
        if (requestId !== requestIdRef.current) return
        onGroupUpdate(group.alias, {
          loading: false,
          offers: parseOffersList(data, OFFERS_TAB_ORDER),
        })
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) return
        onGroupUpdate(group.alias, {
          loading: false,
          offers: [],
        })
      })
      .finally(() => {
        pending -= 1
        if (requestId === requestIdRef.current && pending <= 0) {
          onAllComplete()
        }
      })
  })
})

export const fetchBrandVariantsGroup = ({
  baseParams,
  source,
  requestId,
  requestIdRef,
  onVariants,
  onError,
  onFinally,
}) => {
  const params = buildGoodsParams({ ...baseParams, source })

  return fetch(`${BACK_HOST}/supplier-goods/brands?${params}`, {
    method: 'GET',
    credentials: 'include',
  })
    .then((response) => response.json())
    .then((variantsList) => {
      if (requestId !== requestIdRef.current) return
      onVariants(Array.isArray(variantsList) ? variantsList : [])
    })
    .catch(() => {
      if (requestId !== requestIdRef.current) return
      onError()
    })
    .finally(() => {
      if (requestId === requestIdRef.current) onFinally()
    })
}

export const fetchOffersGroup = ({
  baseParams,
  offersType,
  requestId,
  requestIdRef,
  setOffers,
  setLoading,
}) => {
  const params = buildGoodsParams({ ...baseParams, offersType })
  const requestUrl = `${BACK_HOST}/supplier-goods?${params}`

  return fetchSupplierGoods(requestUrl, {
    method: 'GET',
    credentials: 'include',
  })
    .then((response) => response.json())
    .then((data) => {
      if (requestId !== requestIdRef.current) return
      setOffers((previous) => ({
        ...previous,
        [offersType]: parseOffersList(data, offersType),
      }))
    })
    .catch(() => {
      if (requestId !== requestIdRef.current) return
      setOffers((previous) => ({
        ...previous,
        [offersType]: [],
      }))
    })
    .finally(() => {
      if (requestId === requestIdRef.current) setLoading(false)
    })
}

export const fetchAnalogs = ({ article, brand, requestId, requestIdRef }) => {
  const params = buildGoodsParams({ article, brand })
  return fetch(`${BACK_HOST}/product-analogs?${params}`, {
    method: 'GET',
    credentials: 'include',
  })
    .then((response) => response.json())
    .then((analogsList) => {
      if (requestId !== requestIdRef.current) return null
      return Array.isArray(analogsList) ? analogsList : []
    })
    .catch(() => {
      if (requestId !== requestIdRef.current) return null
      return []
    })
}

/** Карточка ABCP: описание, свойства, кроссы. */
export const fetchAbcpProductInfo = ({ brand, article }) => {
  const params = buildGoodsParams({ article, brand })
  return fetch(`${BACK_HOST}/product-abcp-info?${params}`, {
    method: 'GET',
    credentials: 'include',
  }).then(async (response) => {
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(data?.error || 'Ошибка ABCP')
    }
    return data
  })
}
