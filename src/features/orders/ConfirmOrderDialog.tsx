import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
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

function toDatetimeLocalValue(value?: string | null): string {
  const fallback = format(new Date(), "yyyy-MM-dd'T'HH:mm")
  if (!value) return fallback
  try {
    return format(parseISO(value.replace(' ', 'T')), "yyyy-MM-dd'T'HH:mm")
  } catch {
    return fallback
  }
}

function toApiAssemblyTime(localValue: string): string {
  const [datePart, timePart = '00:00'] = localValue.split('T')
  const time = timePart.length === 5 ? `${timePart}:00` : timePart
  return `${datePart} ${time}`
}

export interface ConfirmOrderDialogProps {
  open: boolean
  defaultAssemblyTime?: string | null
  saving?: boolean
  onClose: () => void
  onConfirm: (assemblyTime: string) => Promise<void>
}

export function ConfirmOrderDialog({
  open,
  defaultAssemblyTime,
  saving = false,
  onClose,
  onConfirm,
}: ConfirmOrderDialogProps) {
  const [draft, setDraft] = useState(() => toDatetimeLocalValue(defaultAssemblyTime))

  useEffect(() => {
    if (open) setDraft(toDatetimeLocalValue(defaultAssemblyTime))
  }, [open, defaultAssemblyTime])

  const handleConfirm = async () => {
    if (!draft.trim()) {
      toast.error('Укажите время сборки')
      return
    }
    await onConfirm(toApiAssemblyTime(draft))
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Подтверждение заказа</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="assembly-time">Время сборки / получения</Label>
          <Input
            id="assembly-time"
            type="datetime-local"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Закрыть
          </Button>
          <Button type="button" onClick={() => void handleConfirm()} disabled={saving}>
            {saving ? 'Подтверждение…' : 'Подтвердить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
