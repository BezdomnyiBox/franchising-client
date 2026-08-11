import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchCurrentUser, logout as apiLogout } from '@/features/auth/api'
import {
  hasCrmSession,
  isFranchiseManager,
  type FranchiseUser,
} from '@/entities/user/types'

interface AuthContextValue {
  user: FranchiseUser | null
  isLoading: boolean
  isAuthenticated: boolean
  isFranchiseManager: boolean
  branchId?: number
  branchName?: string
  refresh: () => Promise<FranchiseUser | null>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  /**
   * После logout отключаем /me: на public.lan бэкенд может отвечать
   * по cookie сайта (user), и refetch снова «впускает» в приложение.
   * Включаем снова только после явного login → refresh().
   */
  const [sessionEnabled, setSessionEnabled] = useState(true)

  const userQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchCurrentUser,
    enabled: sessionEnabled,
    retry: false,
    staleTime: 60_000,
  })

  const user = sessionEnabled ? (userQuery.data ?? null) : null
  const authenticated = hasCrmSession(user)
  const franchise = isFranchiseManager(user)

  const refresh = useCallback(async () => {
    setSessionEnabled(true)
    try {
      const data = await queryClient.fetchQuery({
        queryKey: ['auth', 'me'],
        queryFn: fetchCurrentUser,
      })
      return data ?? null
    } catch {
      queryClient.setQueryData(['auth', 'me'], null)
      return null
    }
  }, [queryClient])

  const logout = useCallback(async () => {
    await apiLogout()
    setSessionEnabled(false)
    queryClient.setQueryData(['auth', 'me'], null)
    queryClient.removeQueries({ queryKey: ['auth', 'me'] })
  }, [queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading: sessionEnabled && userQuery.isLoading,
      isAuthenticated: authenticated,
      isFranchiseManager: franchise,
      branchId: user?.manager?.branchId,
      branchName: user?.manager?.branchName,
      refresh,
      logout,
    }),
    [user, sessionEnabled, userQuery.isLoading, authenticated, franchise, refresh, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
