import { Link, useSearchParams } from 'react-router-dom'
import { SearchContainer } from '@/features/search/SearchContainer'
import { useAuth } from '@/features/auth/AuthContext'

export function SearchPage() {
  const [params] = useSearchParams()
  const { branchId, branchName } = useAuth()
  const orderNumber = params.get('orderNumber') ?? ''

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Поиск товаров</h1>
        <p className="text-sm text-muted-foreground">
          Поиск по артикулу для добавления в заказ
          {orderNumber ? (
            <>
              .{' '}
              <Link className="underline underline-offset-4" to={`/orders/${orderNumber}`}>
                Заказ #{orderNumber}
              </Link>
            </>
          ) : (
            '. Откройте поиск из карточки заказа или укажите № в URL.'
          )}
          {(branchName || branchId) && (
            <>
              {' '}
              ПВ:{' '}
              <span className="font-medium text-foreground">
                {branchName || `#${branchId}`}
              </span>
            </>
          )}
        </p>
      </div>
      <SearchContainer branchId={branchId} branchName={branchName} />
    </div>
  )
}
