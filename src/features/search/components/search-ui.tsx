import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function SearchEmpty({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>
}

export function SearchLoading({ label = 'Загрузка…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      {label}
    </div>
  )
}

type PillVariant = 'available' | 'order' | 'muted'

const pillClass: Record<PillVariant, string> = {
  available: 'bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600/10',
  order: 'bg-amber-600/10 text-amber-800 hover:bg-amber-600/10',
  muted: 'bg-muted text-muted-foreground hover:bg-muted',
}

export function SearchPill({
  variant,
  children,
  className,
}: {
  variant: PillVariant
  children: ReactNode
  className?: string
}) {
  return (
    <Badge variant="secondary" className={cn('font-normal', pillClass[variant], className)}>
      {children}
    </Badge>
  )
}

export function EtaDot({ speed }: { speed: 'fast' | 'mid' | 'slow' }) {
  const color =
    speed === 'fast' ? 'bg-emerald-500' : speed === 'mid' ? 'bg-amber-500' : 'bg-muted-foreground'
  return <span className={cn('inline-block size-2 shrink-0 rounded-full', color)} aria-hidden />
}
