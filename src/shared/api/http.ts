import axios from 'axios'
import { FRANCHISING_API_BASE } from '@/shared/config'

/** Все вызовы франшизы → /crm_fr/api/franchising/... */
export const http = axios.create({
  baseURL: FRANCHISING_API_BASE,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
})

type UnauthorizedHandler = () => void

let onUnauthorized: UnauthorizedHandler | null = null

/** Подписка на 401 (login-gate). */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler
}

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      onUnauthorized?.()
    }
    return Promise.reject(error)
  },
)
