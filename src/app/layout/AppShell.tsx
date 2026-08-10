import { NavLink, Outlet } from 'react-router-dom'
import { ClipboardList, PackagePlus, Search, Store } from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { to: '/orders', label: 'Заказы', icon: ClipboardList },
  { to: '/orders/new', label: 'Новый заказ', icon: PackagePlus },
  { to: '/search', label: 'Поиск', icon: Search },
]

export function AppShell() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <Store className="size-5" />
            <span>Franchising</span>
          </div>
          <nav className="flex items-center gap-1">
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
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
