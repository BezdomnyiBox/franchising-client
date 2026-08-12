import { useEffect, useMemo, useState } from 'react'
import { addMinutes, format, isAfter, isBefore, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { addOrderComment, addOrderNotification } from '@/features/orders/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

function toDatetimeLocalValue(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm")
}

function toApiShowDate(localValue: string): string {
  const [datePart, timePart = '00:00'] = localValue.split('T')
  const time = timePart.length === 5 ? `${timePart}:00` : timePart.slice(0, 8)
  return `${datePart} ${time.length === 5 ? `${time}:00` : time}`
}

function parseLocal(value: string): Date | null {
  if (!value) return null
  try {
    return parseISO(value)
  } catch {
    return null
  }
}

type AddReminderDialogProps = {
  open: boolean
  orderId: number
  saving?: boolean
  onClose: () => void
  onSaved: () => void
}

export function AddReminderDialog({
  open,
  orderId,
  onClose,
  onSaved,
}: AddReminderDialogProps) {
  const [draftDate, setDraftDate] = useState(() => toDatetimeLocalValue(new Date()))
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setDraftDate(toDatetimeLocalValue(new Date()))
      setComment('')
      setSaving(false)
    }
  }, [open])

  const reminderDate = useMemo(() => parseLocal(draftDate), [draftDate])
  const longDelay = useMemo(() => {
    if (!reminderDate) return false
    return isAfter(reminderDate, addMinutes(new Date(), 30))
  }, [reminderDate])

  const maxDate = useMemo(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    return d
  }, [])

  const handleSave = async () => {
    const trimmed = comment.trim()
    if (!reminderDate) {
      toast.error('Укажите дату напоминания')
      return
    }
    if (isBefore(reminderDate, new Date())) {
      toast.error('Дата напоминания не может быть в прошлом')
      return
    }
    if (isAfter(reminderDate, maxDate)) {
      toast.error('Дата напоминания не позже чем через месяц')
      return
    }
    if (!trimmed) {
      toast.error('Укажите текст напоминания')
      return
    }

    setSaving(true)
    try {
      await addOrderNotification(orderId, {
        messageId: 1,
        showDate: toApiShowDate(draftDate),
        comment: trimmed,
      })
      if (longDelay) {
        await addOrderComment(orderId, trimmed, 'collective')
      }
      toast.success('Напоминание создано')
      onSaved()
      onClose()
    } catch (err) {
      toast.error((err as Error).message || 'Не удалось создать напоминание')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Напоминание по заказу</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="reminder-date">Дата и время</Label>
            <Input
              id="reminder-date"
              type="datetime-local"
              value={draftDate}
              min={toDatetimeLocalValue(new Date())}
              max={toDatetimeLocalValue(maxDate)}
              onChange={(e) => setDraftDate(e.target.value)}
            />
          </div>
          {longDelay ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950/40">
              <p className="font-medium">Напоминание позже чем через 30 минут</p>
              <p className="mt-1 text-muted-foreground">
                Укажите в комментарии причину, по которой выбрано время более чем через 30 минут.
                Текст также будет добавлен в общий комментарий.
              </p>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="reminder-comment">Текст напоминания</Label>
            <Textarea
              id="reminder-comment"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Комментарий к напоминанию"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Закрыть
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !comment.trim() || !draftDate}
          >
            {saving ? 'Сохранение…' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
