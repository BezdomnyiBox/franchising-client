import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, MessageSquarePlus } from 'lucide-react'
import { toast } from 'sonner'
import { addOrderComment, type OrderCommentType } from '@/features/orders/api'
import type { OrderComment } from '@/entities/order/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type OrderCommentsProps = {
  orderId: number
  personalComments?: OrderComment[]
  collectiveComments?: OrderComment[]
}

function CommentsList({
  title,
  comments,
  emptyLabel,
  onAdd,
}: {
  title: string
  comments: OrderComment[]
  emptyLabel: string
  onAdd: () => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          {title}
          {comments.length > 0 ? (
            <Badge variant="secondary" className="h-5 min-w-5 justify-center rounded-full px-1.5">
              {comments.length}
            </Badge>
          ) : null}
        </h3>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <MessageSquarePlus className="size-3.5" />
          Добавить
        </Button>
      </div>
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="max-h-56 space-y-3 overflow-y-auto">
          {comments.map((item, idx) => (
            <li
              key={`${item.date ?? 'c'}-${idx}`}
              className="rounded-md border bg-muted/30 px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                {item.manager ? (
                  <span className="font-medium text-foreground">{item.manager}</span>
                ) : null}
                {item.date ? <span>{item.date}</span> : null}
              </div>
              <p className="mt-1 whitespace-pre-wrap">{item.comment || '—'}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function OrderComments({
  orderId,
  personalComments = [],
  collectiveComments = [],
}: OrderCommentsProps) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [composeType, setComposeType] = useState<OrderCommentType | null>(null)
  const [draft, setDraft] = useState('')

  const totalCount = personalComments.length + collectiveComments.length

  const mutation = useMutation({
    mutationFn: ({ comment, type }: { comment: string; type: OrderCommentType }) =>
      addOrderComment(orderId, comment, type),
    onSuccess: async () => {
      toast.success('Комментарий добавлен')
      setComposeType(null)
      setDraft('')
      await queryClient.invalidateQueries({ queryKey: ['order', orderId] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Не удалось добавить комментарий')
    },
  })

  const openCompose = (type: OrderCommentType) => {
    setDraft('')
    setComposeType(type)
  }

  const handleSave = () => {
    const comment = draft.trim()
    if (!comment || !composeType) {
      toast.error('Введите текст комментария')
      return
    }
    mutation.mutate({ comment, type: composeType })
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn(totalCount > 0 && 'border-primary/40')}
        onClick={() => setOpen(true)}
      >
        <MessageSquare className="size-4" />
        Комментарии
        {totalCount > 0 ? (
          <Badge className="h-5 min-w-5 justify-center rounded-full px-1.5">{totalCount}</Badge>
        ) : null}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) {
            setComposeType(null)
            setDraft('')
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Комментарии к заказу</DialogTitle>
          </DialogHeader>

          {composeType ? (
            <div className="space-y-3 py-1">
              <Label htmlFor="order-comment">
                {composeType === 'collective' ? 'Общий комментарий' : 'Личный комментарий'}
              </Label>
              <Textarea
                id="order-comment"
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                placeholder="Текст комментария"
              />
              <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={mutation.isPending}
                  onClick={() => {
                    setComposeType(null)
                    setDraft('')
                  }}
                >
                  Назад
                </Button>
                <Button
                  type="button"
                  disabled={mutation.isPending || !draft.trim()}
                  onClick={handleSave}
                >
                  {mutation.isPending ? 'Сохранение…' : 'Сохранить'}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              <CommentsList
                title="Личные"
                comments={personalComments}
                emptyLabel="Нет личных комментариев"
                onAdd={() => openCompose('personal')}
              />
              <CommentsList
                title="Общие"
                comments={collectiveComments}
                emptyLabel="Нет общих комментариев"
                onAdd={() => openCompose('collective')}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
