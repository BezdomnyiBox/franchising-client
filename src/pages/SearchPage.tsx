import { Link, useSearchParams } from 'react-router-dom'
import { SearchContainer } from '@/features/search/SearchContainer'
import { useAuth } from '@/features/auth/AuthContext'

export function SearchPage() {
  const [params] = useSearchParams()
  const { branchId, branchName } = useAuth()
  const orderNumber = params.get('orderNumber') ?? ''

  return (
    <div className="search-page">
      {orderNumber ? (
        <div className="mb-3 px-1 text-sm text-muted-foreground">
          Поиск для заказа{' '}
          <Link className="underline underline-offset-4" to={`/orders/${orderNumber}`}>
            #{orderNumber}
          </Link>
        </div>
      ) : null}
      <SearchContainer branchId={branchId} branchName={branchName} />
    </div>
  )
}
