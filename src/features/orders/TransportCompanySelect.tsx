import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  changeTransportCompany,
  fetchTransportCompanies,
} from '@/features/orders/api'
import { formatRubles } from '@/features/orders/status'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

const DISABLED_STATUSES = ['collected', 'issued', 'canceled', 'packed']

type TransportCompanySelectProps = {
  orderId: number
  status?: string
  currentAlias?: string | null
  currentPrice?: number | null
}

export function TransportCompanySelect({
  orderId,
  status,
  currentAlias,
  currentPrice,
}: TransportCompanySelectProps) {
  const queryClient = useQueryClient()
  const disabled = DISABLED_STATUSES.includes(status ?? '')

  const listQuery = useQuery({
    queryKey: ['order-transport-companies', orderId],
    queryFn: () => fetchTransportCompanies(orderId),
  })

  const mutation = useMutation({
    mutationFn: (alias: string) => changeTransportCompany(orderId, alias),
    onSuccess: async () => {
      toast.success('Транспортная компания сохранена')
      await queryClient.invalidateQueries({ queryKey: ['order', orderId] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Не удалось сменить ТК')
    },
  })

  if (listQuery.isLoading) {
    return <Skeleton className="h-9 w-full" />
  }

  if (listQuery.isError) {
    return (
      <p className="text-sm text-destructive">
        {(listQuery.error as Error)?.message || 'Не удалось загрузить список ТК'}
      </p>
    )
  }

  const companies = listQuery.data ?? []
  const value = currentAlias || undefined

  return (
    <div className="space-y-1.5">
      <Select
        value={value}
        disabled={disabled || mutation.isPending}
        onValueChange={(alias) => {
          if (!alias || alias === currentAlias) return
          mutation.mutate(alias)
        }}
      >
        <SelectTrigger className="w-full" size="sm">
          <SelectValue placeholder="Самовывоз / не указана" />
        </SelectTrigger>
        <SelectContent>
          {companies.map((company) => (
            <SelectItem key={company.id} value={company.alias}>
              {company.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {currentPrice ? (
        <p className="text-xs text-muted-foreground">{formatRubles(currentPrice)}</p>
      ) : null}
    </div>
  )
}
