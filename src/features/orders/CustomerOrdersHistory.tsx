import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { Link } from 'react-router-dom'
import { Receipt } from 'lucide-react'
import { fetchCustomerOrdersHistory } from '@/features/orders/api'
import type { CustomerOrdersHistoryType } from '@/entities/order/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { APP_BASE_PATH, orderIdToPublicNumber } from '@/shared/config'

function formatHistoryDate(value?: string): string {
  if (!value) return ''
  try {
    return format(parseISO(value.replace(' ', 'T')), 'HH:mm dd.MM.yy')
  } catch {
    return value
  }
}

type CustomerOrdersHistoryDialogProps = {
  open: boolean
  orderId: number
  type: CustomerOrdersHistoryType | null
  onClose: () => void
}

export function CustomerOrdersHistoryDialog({
  open,
  orderId,
  type,
  onClose,
}: CustomerOrdersHistoryDialogProps) {
  const query = useQuery({
    queryKey: ['customer-orders-history', orderId, type],
    queryFn: () => fetchCustomerOrdersHistory(orderId, type!),
    enabled: open && !!type,
  })

  const title =
    type === 'vin' ? 'История заказов по VIN' : 'История заказов по номеру телефона'

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {query.isLoading ? (
          <div className="space-y-2 py-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : query.isError ? (
          <p className="text-sm text-destructive">
            {(query.error as Error)?.message || 'Не удалось загрузить историю'}
          </p>
        ) : !(query.data?.length) ? (
          <p className="text-sm text-muted-foreground">Данные отсутствуют</p>
        ) : (
          <ul className="space-y-4 py-1">
            {query.data.map((item) => {
              const publicNumber = item.number ?? orderIdToPublicNumber(item.id)
              return (
                <li key={item.id} className="border-b pb-3 last:border-b-0">
                  <div className="mb-2">
                    <Link
                      to={`${APP_BASE_PATH}/orders/${publicNumber}`}
                      className="text-base font-semibold text-blue-600 hover:underline"
                      onClick={onClose}
                    >
                      {publicNumber}
                    </Link>
                    {item.acceptedDate ? (
                      <div className="text-sm font-medium">
                        принят {formatHistoryDate(item.acceptedDate)}
                      </div>
                    ) : null}
                    {item.issueDate ? (
                      <div className="text-sm font-medium">
                        выдан {formatHistoryDate(item.issueDate)}
                      </div>
                    ) : null}
                  </div>
                  <ul className="space-y-0.5 text-xs text-muted-foreground">
                    {(item.elements ?? []).map((el) => (
                      <li key={el.id}>
                        {el.offerBrand || '—'} / {el.offerArt || '—'} {el.name || ''}{' '}
                        {el.quantity ?? 0} шт. ({el.status || '—'})
                      </li>
                    ))}
                  </ul>
                </li>
              )
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}

type CustomerOrdersHistoryButtonsProps = {
  onOpen: (type: CustomerOrdersHistoryType) => void
}

export function CustomerOrdersHistoryButtons({ onOpen }: CustomerOrdersHistoryButtonsProps) {
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => onOpen('vin')}>
        <Receipt className="size-3.5" />
        История по VIN
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => onOpen('phone')}>
        <Receipt className="size-3.5" />
        История по телефону
      </Button>
    </div>
  )
}
