import { NavLink, Outlet } from 'react-router-dom'
import { ClipboardList, LogOut, PackagePlus, Search, Store } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth/AuthContext'
import { Button } from '@/components/ui/button'

const nav = [
  { to: '/orders', label: 'Заказы', icon: ClipboardList },
  { to: '/orders/new', label: 'Новый заказ', icon: PackagePlus },
  { to: '/search', label: 'Поиск', icon: Search },
]

export function AppShell() {
  const { user, branchId, branchName, logout } = useAuth()

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Store className="size-4" />
            </span>
            <div className="leading-tight">
              <div className="text-sm">Подзамену</div>
              <div className="text-[11px] font-medium text-muted-foreground">Franchising · ПВ</div>
            </div>
          </div>
          <nav className="flex flex-1 items-center gap-1">
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )
                }
              >
                <Icon className="size-4" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <div className="hidden text-right sm:block">
              <div className="font-medium leading-none">{user?.name || `User #${user?.id}`}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                ПВ {branchName || branchId || '—'}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => void logout()}>
              <LogOut className="size-4" />
              Выйти
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
