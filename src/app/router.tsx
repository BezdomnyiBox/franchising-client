import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/app/layout/AppShell'
import { AuthSessionBridge } from '@/features/auth/AuthSessionBridge'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { CreateOrderPage } from '@/pages/CreateOrderPage'
import { LoginPage } from '@/pages/LoginPage'
import { OrderDetailPage } from '@/pages/OrderDetailPage'
import { OrdersListPage } from '@/pages/OrdersListPage'
import { SearchPage } from '@/pages/SearchPage'
import { APP_BASE_PATH } from '@/shared/config'

export function AppRouter() {
  return (
    <BrowserRouter basename={APP_BASE_PATH}>
      <AuthSessionBridge />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/orders" replace />} />
            <Route path="orders" element={<OrdersListPage />} />
            <Route path="orders/new" element={<CreateOrderPage />} />
            <Route path="orders/:publicNumber" element={<OrderDetailPage />} />
            <Route path="search" element={<SearchPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/orders" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
