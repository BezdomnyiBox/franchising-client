import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquarePlus } from 'lucide-react'
import { toast } from 'sonner'
import { addOrderComment, type OrderCommentType } from '@/features/orders/api'
import type { OrderComment } from '@/entities/order/types'
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
        <h3 className="text-sm font-medium">{title}</h3>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <MessageSquarePlus className="size-3.5" />
          Добавить
        </Button>
      </div>
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((item, idx) => (
            <li
              key={`${item.date ?? 'c'}-${idx}`}
              className="rounded-md border bg-muted/30 px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                {item.manager ? <span className="font-medium text-foreground">{item.manager}</span> : null}
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
  const [dialogType, setDialogType] = useState<OrderCommentType | null>(null)
  const [draft, setDraft] = useState('')

  const mutation = useMutation({
    mutationFn: ({ comment, type }: { comment: string; type: OrderCommentType }) =>
      addOrderComment(orderId, comment, type),
    onSuccess: async () => {
      toast.success('Комментарий добавлен')
      setDialogType(null)
      setDraft('')
      await queryClient.invalidateQueries({ queryKey: ['order', orderId] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Не удалось добавить комментарий')
    },
  })

  const openDialog = (type: OrderCommentType) => {
    setDraft('')
    setDialogType(type)
  }

  const handleSave = () => {
    const comment = draft.trim()
    if (!comment || !dialogType) {
      toast.error('Введите текст комментария')
      return
    }
    mutation.mutate({ comment, type: dialogType })
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <CommentsList
          title="Личные комментарии"
          comments={personalComments}
          emptyLabel="Нет личных комментариев"
          onAdd={() => openDialog('personal')}
        />
        <CommentsList
          title="Общие комментарии"
          comments={collectiveComments}
          emptyLabel="Нет общих комментариев"
          onAdd={() => openDialog('collective')}
        />
      </div>

      <Dialog
        open={dialogType !== null}
        onOpenChange={(next) => {
          if (!next) {
            setDialogType(null)
            setDraft('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'collective' ? 'Общий комментарий' : 'Личный комментарий'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="order-comment">Комментарий</Label>
            <Textarea
              id="order-comment"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              placeholder="Текст комментария"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDialogType(null)
                setDraft('')
              }}
              disabled={mutation.isPending}
            >
              Закрыть
            </Button>
            <Button
              type="button"
              disabled={mutation.isPending || !draft.trim()}
              onClick={handleSave}
            >
              {mutation.isPending ? 'Сохранение…' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
