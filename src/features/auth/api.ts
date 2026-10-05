import { http } from '@/shared/api/http'
import { clearFranchisingAuthCookie, normalizeLoginPhone } from '@/shared/authCookie'
import type { FranchiseUser } from '@/entities/user/types'

interface FranchisingLoginResponse {
  result?: string
  authVersion?: number
  cookieName?: string
  error?: string
}

/**
 * Текущий пользователь по cookie franchising_auth.
 * GET /franchising/auth/me
 */
export async function fetchCurrentUser(): Promise<FranchiseUser> {
  const { data } = await http.get<FranchiseUser>('/auth/me')
  return data
}

/**
 * Отдельный login франшизы (не /login_user сайта/CRM).
 * Set-Cookie: franchising_auth (HttpOnly) через Vite proxy.
 */
export async function loginWithPassword(phone: string, password: string): Promise<void> {
  const path = import.meta.env.VITE_LOGIN_PATH || '/auth/login'
  const { data, status } = await http.post<FranchisingLoginResponse>(
    path,
    {
      phone: normalizeLoginPhone(phone),
      password,
    },
    {
      headers: { 'Content-Type': 'application/json' },
      validateStatus: (s) => s < 500,
    },
  )

  if (status === 403) {
    throw new Error('NOT_FRANCHISING_MANAGER')
  }
  if (status >= 400 || data.result === 'failed') {
    throw new Error(data.error || 'LOGIN_FAILED')
  }
}

export async function logout(): Promise<void> {
  try {
    await http.post('/auth/logout', null, {
      validateStatus: (s) => s >= 200 && s < 500,
    })
  } catch {
    // ignore
  }
  clearFranchisingAuthCookie()
}
