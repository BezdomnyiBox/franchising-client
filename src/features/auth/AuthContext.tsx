import {
  createContext,
  useCallback,
  useContext,
  useMemo,
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

  const userQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 60_000,
  })

  const user = userQuery.data ?? null
  const authenticated = hasCrmSession(user)
  const franchise = isFranchiseManager(user)

  const refresh = useCallback(async () => {
    const result = await userQuery.refetch()
    return result.data ?? null
  }, [userQuery])

  const logout = useCallback(async () => {
    await apiLogout()
    queryClient.setQueryData(['auth', 'me'], null)
    await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
  }, [queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading: userQuery.isLoading,
      isAuthenticated: authenticated,
      isFranchiseManager: franchise,
      branchId: user?.manager?.branchId,
      branchName: user?.manager?.branchName,
      refresh,
      logout,
    }),
    [user, userQuery.isLoading, authenticated, franchise, refresh, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
