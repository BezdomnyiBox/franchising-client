import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/app/layout/AppShell'
import { CreateOrderPage } from '@/pages/CreateOrderPage'
import { OrderDetailPage } from '@/pages/OrderDetailPage'
import { OrdersListPage } from '@/pages/OrdersListPage'
import { SearchPage } from '@/pages/SearchPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/orders" replace />} />
          <Route path="orders" element={<OrdersListPage />} />
          <Route path="orders/new" element={<CreateOrderPage />} />
          <Route path="orders/:publicNumber" element={<OrderDetailPage />} />
          <Route path="search" element={<SearchPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/orders" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
