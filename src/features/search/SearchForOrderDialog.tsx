import { MemoryRouter } from 'react-router-dom'
import { X } from 'lucide-react'
import { SearchContainer } from '@/features/search/SearchContainer'
import { useAuth } from '@/features/auth/AuthContext'
import { Button } from '@/components/ui/button'

export interface SearchForOrderDialogProps {
  open: boolean
  orderId: number
  orderNumber: number | string
  orderElementId: number
  initArticle?: string
  productId?: number | null
  userId?: number
  onClose: () => void
  onSuccess: () => void
}

function buildSearchEntry(article: string, orderNumber: number | string): string {
  const params = new URLSearchParams()
  if (article.trim()) params.set('article', article.trim())
  if (orderNumber != null && String(orderNumber).trim()) {
    params.set('orderNumber', String(orderNumber).trim())
  }
  const query = params.toString()
  return query ? `/?${query}` : '/'
}

export function SearchForOrderDialog({
  open,
  orderNumber,
  orderElementId,
  initArticle = '',
  onClose,
  onSuccess,
}: SearchForOrderDialogProps) {
  const { branchId, branchName } = useAuth()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-primary px-4 text-primary-foreground">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-primary-foreground hover:bg-primary/80"
          onClick={onClose}
        >
          <X className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">
            Поиск для заказа № {orderNumber}
          </div>
          <div className="truncate text-xs opacity-90">
            Позиция #{orderElementId}
            {initArticle ? ` · ОЕМ ${initArticle}` : ''}
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl flex-1 overflow-auto p-4">
        <MemoryRouter
          key={`${orderElementId}|${initArticle}|${orderNumber}`}
          initialEntries={[buildSearchEntry(initArticle, orderNumber)]}
        >
          <SearchContainer
            branchId={branchId}
            branchName={branchName}
            offerAction={{
              mode: 'set-to-element',
              target: {
                orderElementId,
                onPicked: () => {
                  onSuccess()
                  onClose()
                },
              },
            }}
          />
        </MemoryRouter>
      </div>
    </div>
  )
}
