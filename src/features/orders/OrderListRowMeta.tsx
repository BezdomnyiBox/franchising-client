import { Clock, MessageSquare, Bell } from 'lucide-react'
import type {
  OrderListComment,
  OrderListStatusHistoryItem,
} from '@/entities/order/types'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'

type OrderListRowMetaProps = {
  statusesHistory?: OrderListStatusHistoryItem[]
  comments?: OrderListComment[]
  refusingReason?: string | null
  /** Где показывать иконки: у номера или у менеджера. */
  variant: 'number' | 'manager'
}

export function OrderListRowMeta({
  statusesHistory,
  comments,
  refusingReason,
  variant,
}: OrderListRowMetaProps) {
  const history = statusesHistory ?? []
  const listComments = comments ?? []
  const refuse = refusingReason?.trim() || ''

  if (variant === 'number') {
    if (!history.length) return null
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title="История заказа"
            className="shrink-0 text-muted-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <Clock className="size-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="max-h-72 w-72 overflow-y-auto p-3">
          <PopoverHeader>
            <PopoverTitle>История статусов</PopoverTitle>
          </PopoverHeader>
          <ul className="mt-1 space-y-1 text-xs">
            {history.map((item, idx) => (
              <li key={`${item.date}-${idx}`} style={{ color: item.color || undefined }}>
                {item.description} {item.date}
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    )
  }

  if (!refuse && !listComments.length) return null

  return (
    <div className="inline-flex shrink-0 items-center gap-0.5">
      {refuse ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              title="Причина отказа"
              className="text-muted-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <Bell className="size-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-3">
            <PopoverHeader>
              <PopoverTitle>Причина отказа</PopoverTitle>
              <PopoverDescription className="text-foreground">{refuse}</PopoverDescription>
            </PopoverHeader>
          </PopoverContent>
        </Popover>
      ) : null}
      {listComments.length ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              title="Комментарии"
              className="text-muted-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <MessageSquare className="size-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="max-h-72 w-80 overflow-y-auto p-3">
            <PopoverHeader>
              <PopoverTitle>Комментарии</PopoverTitle>
            </PopoverHeader>
            <ul className="mt-1 space-y-2 text-xs">
              {listComments.map((comment, idx) => (
                <li key={`${comment.date}-${idx}`}>
                  {comment.date ? (
                    <strong className="mb-0.5 block">{comment.date}</strong>
                  ) : null}
                  <span>{comment.text || '—'}</span>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  )
}
