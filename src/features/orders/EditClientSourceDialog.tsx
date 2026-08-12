import { useEffect, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { changeOrderClientSource } from '@/features/orders/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type ClientSourceOption = {
  alias: string
  description: string
}

type EditClientSourceDialogProps = {
  open: boolean
  orderId: number
  currentSource?: string | null
  sources: ClientSourceOption[]
  onClose: () => void
  onSaved: () => void
}

export function EditClientSourceDialog({
  open,
  orderId,
  currentSource,
  sources,
  onClose,
  onSaved,
}: EditClientSourceDialogProps) {
  const options = useMemo(
    () => sources.filter((s) => s.alias !== 'farpost_secure_deal'),
    [sources],
  )
  const [draft, setDraft] = useState(currentSource || '')

  useEffect(() => {
    if (open) setDraft(currentSource || '')
  }, [open, currentSource])

  const mutation = useMutation({
    mutationFn: (clientSource: string) => changeOrderClientSource(orderId, clientSource),
    onSuccess: () => {
      toast.success('Источник обращения сохранён')
      onSaved()
      onClose()
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Не удалось сохранить источник')
    },
  })

  const handleSave = () => {
    if (!draft.trim()) {
      toast.error('Выберите источник обращения')
      return
    }
    mutation.mutate(draft)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Источник обращения</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="client-source">Источник</Label>
          {options.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Нет доступных источников (accessibleClientSources).
            </p>
          ) : (
            <Select value={draft || undefined} onValueChange={setDraft}>
              <SelectTrigger id="client-source" className="w-full">
                <SelectValue placeholder="Выберите источник" />
              </SelectTrigger>
              <SelectContent>
                {options.map((source) => (
                  <SelectItem key={source.alias} value={source.alias}>
                    {source.description || source.alias}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Закрыть
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={mutation.isPending || options.length === 0}
          >
            {mutation.isPending ? 'Сохранение…' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
