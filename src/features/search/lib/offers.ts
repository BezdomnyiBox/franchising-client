// @ts-nocheck
import { EMPTY_OFFERS, OFFERS_TAB_AVAILABLE, OFFERS_TAB_ORDER } from './constants'
import { formatAssemblyTime, money } from './format'

export const normalizeOffers = (data) => {
  const source = data?.available || data?.offer ? data : data?.offers
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return { ...EMPTY_OFFERS }
  }
  return {
    available: Array.isArray(source.available) ? source.available : [],
    offer: Array.isArray(source.offer) ? source.offer : [],
  }
}

export const getOfferDays = (offer) => {
  if (!offer?.assemblyTime) return 1
  return Math.max(1, Math.ceil((new Date(offer.assemblyTime) - Date.now()) / 86400000))
}

export const getEtaSpeed = (days) => {
  if (days <= 1) return 'fast'
  if (days <= 2) return 'mid'
  return 'slow'
}

export const getOfferPrice = (offer) => Number(offer.offerPrice || offer.price) || 0

export const rankOffer = (offer) => getOfferDays(offer) * 100000 + getOfferPrice(offer)

export const computeOfferStats = (offersGroups) => {
  const available = offersGroups.available || []
  const order = offersGroups.offer || []
  const all = [...available, ...order]
  const prices = all
    .map((item) => Number(item.offerPrice || item.price))
    .filter((price) => !Number.isNaN(price) && price > 0)
  const minPrice = prices.length ? Math.min(...prices) : null
  let nearestEta = null
  let nearestDays = Infinity

  all.forEach((offer) => {
    const days = getOfferDays(offer)
    if (days < nearestDays) {
      nearestDays = days
      nearestEta = formatAssemblyTime(offer.assemblyTime)
    }
  })

  return {
    total: all.length,
    availableCount: available.length,
    offerCount: order.length,
    minPrice,
    nearestEta,
  }
}

export const getFilteredOffers = (offersGroups, tab) => {
  if (tab === OFFERS_TAB_AVAILABLE) return offersGroups.available || []
  if (tab === OFFERS_TAB_ORDER) return offersGroups.offer || []
  return [...(offersGroups.available || []), ...(offersGroups.offer || [])]
}

export const getOffersPriceRange = (offers) => {
  const prices = (offers || [])
    .map((offer) => getOfferPrice(offer))
    .filter((price) => price > 0)
  if (!prices.length) return { min: '', max: '' }
  return {
    min: String(Math.min(...prices)),
    max: String(Math.max(...prices)),
  }
}

export const computeOfferRanges = (offers) => {
  if (!offers.length) return null
  const prices = offers
    .map((offer) => Number(offer.offerPrice || offer.price))
    .filter((price) => !Number.isNaN(price) && price > 0)
  const days = offers.map((offer) => getOfferDays(offer))
  if (!prices.length) return null

  const priceMin = Math.min(...prices)
  const priceMax = Math.max(...prices)
  const dayMin = Math.min(...days)
  const dayMax = Math.max(...days)
  const priceLabel = priceMin === priceMax
    ? money(priceMin)
    : `${money(priceMin)} – ${money(priceMax)}`
  const deliveryLabel = dayMin === dayMax
    ? (dayMin <= 1 ? 'завтра' : `${dayMin} дн.`)
    : `${dayMin}–${dayMax} дн.`

  return { priceLabel, deliveryLabel }
}

const matchWarehouse = (offer, query) => {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return true
  return [
    offer.warehousePublicNumber,
    offer.warehousePublicName,
    offer.warehouseVendorId,
    offer.supplierName,
    offer.supplierAlias,
  ].some((value) => String(value || '').toLowerCase().includes(q))
}

export const filterOffers = (offers, filters) => {
  const from = filters.priceFrom === '' ? null : Number(filters.priceFrom)
  const to = filters.priceTo === '' ? null : Number(filters.priceTo)
  const maxDays = filters.days === '' ? null : Number(filters.days)

  return (offers || []).filter((offer) => {
    const price = getOfferPrice(offer)
    if (from != null && !Number.isNaN(from) && price < from) return false
    if (to != null && !Number.isNaN(to) && price > to) return false
    if (maxDays != null && !Number.isNaN(maxDays) && getOfferDays(offer) > maxDays) return false
    return matchWarehouse(offer, filters.warehouse)
  })
}

export const sortOffers = (offers, sort) => {
  const next = [...(offers || [])]
  next.sort((a, b) => {
    if (sort === 'price') return getOfferPrice(a) - getOfferPrice(b)
    if (sort === 'days') return getOfferDays(a) - getOfferDays(b)
    if (sort === 'qty') return Number(b.stock || 0) - Number(a.stock || 0)
    return rankOffer(a) - rankOffer(b)
  })
  return next
}

export const applyOfferFilters = (offers, filters) =>
  sortOffers(filterOffers(offers, filters), filters.sort)

export const parseOffersList = (data, offersType) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.[offersType])) return data[offersType]
  if (Array.isArray(data?.offers)) return data.offers
  return normalizeOffers(data)[offersType] || []
}

export const mergeBrandVariants = (previous, incoming) => {
  const byKey = new Map()
  ;[...previous, ...incoming].forEach((item) => {
    if (!item?.brand || !item?.article) return
    const key = `${item.brand}|${item.article}`
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, {
        brand: item.brand,
        article: item.article,
        name: item.name || 'Деталь',
        images: Array.isArray(item.images) ? item.images : [],
      })
      return
    }
    byKey.set(key, {
      ...existing,
      name: existing.name && existing.name !== 'Деталь' ? existing.name : (item.name || existing.name),
      images: existing.images.length
        ? existing.images
        : (Array.isArray(item.images) ? item.images : []),
    })
  })
  return [...byKey.values()]
}

export const dedupeSuppliersByAlias = (suppliers) => {
  const byAlias = new Map()
  ;(Array.isArray(suppliers) ? suppliers : []).forEach((supplier) => {
    const alias = supplier?.alias
    if (!alias || byAlias.has(alias)) return
    byAlias.set(alias, {
      alias,
      name: supplier.name || alias,
    })
  })
  return [...byAlias.values()]
}

export const normalizeSupplierOfferGroups = (groups) => {
  const byAlias = new Map()
  ;(Array.isArray(groups) ? groups : []).forEach((group) => {
    if (!group?.alias || byAlias.has(group.alias)) return
    byAlias.set(group.alias, group)
  })
  return [...byAlias.values()]
}

export const mergeSupplierOffers = (groups) => groups.flatMap((group) => group.offers || [])
