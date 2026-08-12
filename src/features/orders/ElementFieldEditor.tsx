import { useEffect, useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'

export type ElementFieldKind = 'quantity' | 'retailPrice' | 'description' | 'weight'

const FIELD_META: Record<
  ElementFieldKind,
  { title: string; label: string; inputType: 'number' | 'text' }
> = {
  quantity: { title: 'Количество', label: 'Количество', inputType: 'number' },
  retailPrice: { title: 'Цена', label: 'Цена, ₽', inputType: 'number' },
  description: { title: 'Наименование', label: 'Название', inputType: 'text' },
  weight: { title: 'Вес', label: 'Вес, кг', inputType: 'number' },
}

export interface ElementFieldEditorProps {
  open: boolean
  kind: ElementFieldKind | null
  initialValue: string | number
  saving?: boolean
  onClose: () => void
  onSave: (value: string | number) => Promise<void>
}

function validate(kind: ElementFieldKind, raw: string): string | number {
  if (kind === 'description') {
    const text = raw.trim()
    if (!text) throw new Error('Укажите наименование')
    return text
  }

  const num = Number(String(raw).replace(',', '.'))
  if (raw.trim() === '' || Number.isNaN(num)) {
    throw new Error('Укажите корректное значение')
  }
  if (num < 0) throw new Error('Значение не может быть отрицательным')
  if (kind === 'quantity' && (!Number.isInteger(num) || num < 1)) {
    throw new Error('Количество должно быть целым числом ≥ 1')
  }
  if (kind === 'retailPrice' && num < 0) {
    throw new Error('Цена не может быть отрицательной')
  }
  return num
}

export function ElementFieldEditor({
  open,
  kind,
  initialValue,
  saving = false,
  onClose,
  onSave,
}: ElementFieldEditorProps) {
  const [draft, setDraft] = useState(String(initialValue ?? ''))

  useEffect(() => {
    if (open) setDraft(String(initialValue ?? ''))
  }, [open, initialValue, kind])

  if (!kind) return null

  const meta = FIELD_META[kind]

  const handleSave = async () => {
    let value: string | number
    try {
      value = validate(kind, draft)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Некорректное значение')
      return
    }
    await onSave(value)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{meta.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor={`element-field-${kind}`}>{meta.label}</Label>
          {kind === 'description' ? (
            <Textarea
              id={`element-field-${kind}`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void handleSave()
                }
              }}
            />
          ) : (
            <Input
              id={`element-field-${kind}`}
              type="number"
              min={kind === 'quantity' ? 1 : 0}
              step={kind === 'weight' ? '0.001' : kind === 'retailPrice' ? '0.01' : '1'}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void handleSave()
                }
              }}
            />
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Закрыть
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Сохранение…' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
