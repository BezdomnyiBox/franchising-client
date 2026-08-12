import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Copy, Library } from 'lucide-react'
import { toast } from 'sonner'
import { copyOrder } from '@/features/orders/api'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type CopyOrderActionsProps = {
  orderId: number
  /** icon — компактные кнопки в строке списка; button — подписи на карточке */
  variant?: 'icon' | 'button'
  className?: string
}

export function CopyOrderActions({
  orderId,
  variant = 'icon',
  className,
}: CopyOrderActionsProps) {
  const navigate = useNavigate()

  const mutation = useMutation({
    mutationFn: (withElements: boolean) => copyOrder(orderId, { withElements }),
    onSuccess: (data) => {
      navigate(`/orders/${data.orderId}`)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Не удалось скопировать заказ')
    },
  })

  const runCopy = (withElements: boolean) => {
    const message = withElements
      ? 'Скопировать заказ с товарами?'
      : 'Скопировать заказ?'
    if (!window.confirm(message)) return
    mutation.mutate(withElements)
  }

  const pending = mutation.isPending

  if (variant === 'button') {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => runCopy(false)}
        >
          <Copy className="size-4" />
          Копировать
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => runCopy(true)}
        >
          <Library className="size-4" />
          Копировать с товарами
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center justify-end gap-1', className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        title="Копировать без товаров"
        disabled={pending}
        onClick={() => runCopy(false)}
      >
        <Copy className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        title="Копировать с товарами"
        disabled={pending}
        onClick={() => runCopy(true)}
      >
        <Library className="size-3.5" />
      </Button>
    </div>
  )
}
