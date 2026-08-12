import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import {
  abyssUpdateProduct,
  fetchAbyssSuppliers,
  updateProductByApi,
} from '@/features/search/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function AbyssSuppliersPanel({
  productId,
  orderId,
}: {
  productId: number
  orderId?: number
}) {
  const queryClient = useQueryClient()
  const [loadingId, setLoadingId] = useState<number | null>(null)

  const suppliersQuery = useQuery({
    queryKey: ['abyss-suppliers', orderId],
    queryFn: () => fetchAbyssSuppliers(orderId),
  })

  const invalidateSearch = () => {
    void queryClient.invalidateQueries({ queryKey: ['product-search', productId] })
    void queryClient.invalidateQueries({ queryKey: ['product-search-count', productId] })
  }

  const allMutation = useMutation({
    mutationFn: () => abyssUpdateProduct(productId, orderId),
    onSuccess: () => {
      toast.success('Загрузка предложений запущена')
      invalidateSearch()
    },
    onError: () => toast.error('Не удалось загрузить предложения'),
  })

  const loadSupplier = async (apiParamId: number) => {
    setLoadingId(apiParamId)
    try {
      await updateProductByApi(productId, apiParamId, orderId)
      toast.success('Предложения поставщика обновлены')
      invalidateSearch()
    } catch {
      toast.error('Ошибка обновления у поставщика')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-3 border-t pt-4">
      <Button
        type="button"
        variant="secondary"
        className="w-full justify-start"
        disabled={allMutation.isPending}
        onClick={() => allMutation.mutate()}
      >
        <RefreshCw className={cnSpin(allMutation.isPending)} />
        По всем поставщикам
      </Button>

      <div>
        <div className="mb-2 text-sm font-medium">
          Обновить предложения по конкретному поставщику
        </div>
        {suppliersQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : suppliersQuery.isError ? (
          <p className="text-xs text-destructive">Не удалось загрузить список поставщиков.</p>
        ) : !suppliersQuery.data?.length ? (
          <p className="text-xs text-muted-foreground">Нет доступных API-поставщиков для этого ПВ.</p>
        ) : (
          <ul className="space-y-1">
            {suppliersQuery.data.map((supplier) => (
              <li key={supplier.id}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-full justify-start gap-2 px-2"
                  disabled={loadingId === supplier.id}
                  onClick={() => void loadSupplier(supplier.id)}
                >
                  <RefreshCw className={cnSpin(loadingId === supplier.id)} />
                  {supplier.supplierName}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function cnSpin(active: boolean) {
  return active ? 'size-3.5 animate-spin' : 'size-3.5'
}
