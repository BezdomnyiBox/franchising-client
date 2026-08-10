import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { setUnauthorizedHandler } from '@/shared/api/http'

/** Связывает 401 axios → сброс сессии и редирект на /login. */
export function AuthSessionBridge() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    setUnauthorizedHandler(() => {
      queryClient.setQueryData(['auth', 'me'], null)
      navigate('/login', { replace: true })
    })
    return () => setUnauthorizedHandler(null)
  }, [navigate, queryClient])

  return null
}
