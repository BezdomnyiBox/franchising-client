import { http } from '@/shared/api/http'
import type { FranchiseUser } from '@/entities/user/types'

/** Текущий пользователь CRM / franchising (cookie-сессия). */
export async function fetchCurrentUser(): Promise<FranchiseUser> {
  const { data } = await http.get<FranchiseUser>('/user/crm_info')
  return data
}

/**
 * Symfony-style form login через прокси.
 * Путь можно переопределить VITE_LOGIN_PATH (по умолчанию /login_check).
 */
export async function loginWithPassword(username: string, password: string): Promise<void> {
  const path = import.meta.env.VITE_LOGIN_PATH || '/login_check'
  const body = new URLSearchParams()
  body.set('_username', username)
  body.set('_password', password)

  await http.post(path, body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    // Symfony часто отвечает редиректом/HTML — нас интересует Set-Cookie
    maxRedirects: 0,
    validateStatus: (status) => status >= 200 && status < 400,
  })
}

export async function logout(): Promise<void> {
  const path = import.meta.env.VITE_LOGOUT_PATH || '/logout'
  try {
    await http.get(path, {
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
    })
  } catch {
    // ignore — сессию сбросим локально в любом случае
  }
}
