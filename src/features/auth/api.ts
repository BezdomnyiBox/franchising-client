import { http } from '@/shared/api/http'
import { clearFranchisingAuthCookie, normalizeLoginPhone } from '@/shared/authCookie'
import type { FranchiseUser } from '@/entities/user/types'

interface FranchisingLoginResponse {
  result?: string
  authVersion?: number
  cookieName?: string
  error?: string
}

/** Текущий пользователь: отдельный me, fallback на crm_info. */
export async function fetchCurrentUser(): Promise<FranchiseUser> {
  try {
    const { data } = await http.get<FranchiseUser>('/franchising/auth/me')
    return data
  } catch {
    const { data } = await http.get<FranchiseUser>('/user/crm_info')
    return data
  }
}

/**
 * Отдельный login франшизы (не /login_user сайта/CRM).
 * Set-Cookie: franchising_auth (HttpOnly) через Vite proxy.
 */
export async function loginWithPassword(phone: string, password: string): Promise<void> {
  const path = import.meta.env.VITE_LOGIN_PATH || '/franchising/auth/login'
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
    await http.post('/franchising/auth/logout', null, {
      validateStatus: (s) => s >= 200 && s < 500,
    })
  } catch {
    // ignore
  }
  clearFranchisingAuthCookie()
}
