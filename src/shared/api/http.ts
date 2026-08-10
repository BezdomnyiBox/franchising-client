import axios from 'axios'
import { API_BASE_URL } from '@/shared/config'

export const http = axios.create({
  baseURL: API_BASE_URL,
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
