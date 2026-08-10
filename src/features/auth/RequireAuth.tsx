import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { Skeleton } from '@/components/ui/skeleton'

export function RequireAuth() {
  const { isLoading, isAuthenticated, isFranchiseManager } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-3 px-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!isFranchiseManager) {
    return (
      <div className="mx-auto flex min-h-svh max-w-lg flex-col justify-center gap-3 px-4 text-center">
        <h1 className="text-xl font-semibold">Нет доступа к франшизе</h1>
        <p className="text-sm text-muted-foreground">
          Сессия есть, но у пользователя нет роли менеджера ПВ / franchising.
          Обратитесь к администратору.
        </p>
      </div>
    )
  }

  return <Outlet />
}
