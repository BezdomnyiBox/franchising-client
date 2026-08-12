import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { List } from 'lucide-react'
import { toast } from 'sonner'
import { fetchOrderElements } from '@/features/orders/api'
import type { OrderElement } from '@/entities/order/types'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'

function elementLine(el: OrderElement, index: number): string {
  const product = el.item?.product
  const brand = product?.brand?.name ?? ''
  const article = product?.articleSearch || product?.article || ''
  const name = el.description || product?.name || ''
  const qty = el.quantity ?? 0
  const price = (el.retailPrice ?? 0) / 100
  const status = el.statusDescription || el.status || ''
  return `${index + 1}. ${brand} ${article} ${name} ${qty} шт. ${price} руб. (${status})`.replace(
    /\s+/g,
    ' ',
  )
}

type OrderElementsPopoverProps = {
  orderId: number
}

export function OrderElementsPopover({ orderId }: OrderElementsPopoverProps) {
  const [open, setOpen] = useState(false)

  const query = useQuery({
    queryKey: ['order-elements', orderId],
    queryFn: () => fetchOrderElements(orderId),
    enabled: open,
  })

  useEffect(() => {
    if (open && query.isError) {
      toast.error((query.error as Error)?.message || 'Не удалось загрузить позиции')
    }
  }, [open, query.isError, query.error])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          title="Список запчастей"
          className="shrink-0 text-muted-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <List className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-80 w-96 overflow-y-auto p-3">
        {query.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ) : query.isError ? (
          <p className="text-sm text-destructive">Не удалось загрузить позиции</p>
        ) : !(query.data?.length) ? (
          <p className="text-sm text-muted-foreground">Позиций нет</p>
        ) : (
          <ul className="space-y-1.5 text-xs leading-snug">
            {query.data.map((el, index) => (
              <li key={el.id}>{elementLine(el, index)}</li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
