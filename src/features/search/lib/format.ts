// @ts-nocheck
import { FRANCHISING_API_BASE } from '@/shared/config'

export const money = (n) => n.toLocaleString('ru-RU') + ' ₽'

export const formatBrandsMoreCount = (count) => {
  const n = Number(count) || 0
  const n10 = n % 10
  const n100 = n % 100
  if (n10 === 1 && n100 !== 11) return `Ещё ${n} бренд ▾`
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return `Ещё ${n} бренда ▾`
  return `Ещё ${n} брендов ▾`
}

export const formatWarehouseCount = (count) => {
  const n = Number(count) || 0
  const n10 = n % 10
  const n100 = n % 100
  if (n10 === 1 && n100 !== 11) return `${n} поставщик`
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return `${n} поставщиков`
  return `${n} складов`
}

export const formatCitiesMoreCount = (count) => {
  const n = Number(count) || 0
  const n10 = n % 10
  const n100 = n % 100
  if (n10 === 1 && n100 !== 11) return `Ещё ${n} город`
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return `Ещё ${n} города`
  return `Ещё ${n} городов`
}

export const resolveImageSrc = (src) => {
  if (!src) return null
  if (/^https?:\/\//i.test(src)) return src
  if (src.startsWith('/image/')) {
    return `${FRANCHISING_API_BASE}/product${src}`
  }
  return `${FRANCHISING_API_BASE}${src.startsWith('/') ? src : `/${src}`}`
}

export const formatAssemblyTime = (assemblyTime) => {
  if (!assemblyTime) return '—'
  try {
    const date = new Date(assemblyTime)
    if (isNaN(date.getTime())) return assemblyTime
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${day}.${month}.${year} ${hours}:${minutes}`
  } catch {
    return assemblyTime
  }
}

export const getGoodImageSrc = (good) => {
  if (!good || !Array.isArray(good.images) || !good.images.length) return null
  return resolveImageSrc(good.images[0])
}
