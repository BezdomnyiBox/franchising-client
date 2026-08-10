const FRANCHISING_COOKIE = 'franchising_auth'

/** Fallback clear host-only cookie на localhost (основной clear — /franchising/auth/logout). */
export function clearFranchisingAuthCookie() {
  document.cookie = `${FRANCHISING_COOKIE}=; path=/; max-age=0; SameSite=Lax`
}

/** Телефон как на сайте: 10 цифр без ведущей 7/8. */
export function normalizeLoginPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return digits.slice(1)
  }
  return digits
}
