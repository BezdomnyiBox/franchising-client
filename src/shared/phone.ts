/** Нормализация российского номера до цифр (для tel: и сортировки). */
export function digitsOnlyPhone(phone?: string | null): string {
  return String(phone ?? '').replace(/\D/g, '')
}

/**
 * Локальный номер для API CRM (10 цифр без кода страны),
 * как в OrderCustomerPhone.jsx.
 */
export function phoneToApiLocal(phone?: string | null): string {
  let digits = digitsOnlyPhone(phone)
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    digits = digits.slice(1)
  }
  return digits
}

/**
 * E.164 для tel: — Mango / системный диалер.
 * Бэкенд списка часто отдаёт 10 цифр без кода страны.
 */
export function toTelHref(phone?: string | null): string | null {
  let digits = digitsOnlyPhone(phone)
  if (!digits) return null

  if (digits.length === 11 && digits.startsWith('8')) {
    digits = `7${digits.slice(1)}`
  } else if (digits.length === 10) {
    digits = `7${digits}`
  }

  if (digits.length === 11 && digits.startsWith('7')) {
    return `tel:+${digits}`
  }

  return `tel:+${digits}`
}

/** Отображение: +7 913 402-18-06 */
export function formatPhoneRu(phone?: string | null): string {
  let digits = digitsOnlyPhone(phone)
  if (!digits) return ''

  if (digits.length === 11 && digits.startsWith('8')) {
    digits = `7${digits.slice(1)}`
  } else if (digits.length === 10) {
    digits = `7${digits}`
  }

  if (digits.length === 11 && digits.startsWith('7')) {
    return `+7 ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`
  }

  return String(phone ?? '')
}
