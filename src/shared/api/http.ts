import axios from 'axios'
import { API_BASE_URL } from '@/shared/config'

export const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Точка расширения: редирект на /login
      console.warn('[api] unauthorized')
    }
    return Promise.reject(error)
  },
)
