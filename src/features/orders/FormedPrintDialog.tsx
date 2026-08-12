import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { formedPrintOrder, sendPrintOrder } from '@/features/orders/api'
import { publicInvoiceUrl } from '@/shared/config'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

type FormedPrintDialogProps = {
  open: boolean
  orderId: number
  printHash?: string | null
  customerEmail?: string | null
  onClose: () => void
}

export function FormedPrintDialog({
  open,
  orderId,
  printHash,
  customerEmail,
  onClose,
}: FormedPrintDialogProps) {
  const queryClient = useQueryClient()
  const [hideArticle, setHideArticle] = useState(true)

  useEffect(() => {
    if (open) setHideArticle(true)
  }, [open])

  const refreshOrder = () =>
    queryClient.invalidateQueries({ queryKey: ['order', orderId] })

  const formedMutation = useMutation({
    mutationFn: () => formedPrintOrder(orderId, hideArticle),
    onSuccess: async () => {
      toast.success('Счёт сформирован')
      await refreshOrder()
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Не удалось сформировать счёт')
    },
  })

  const sendMutation = useMutation({
    mutationFn: () => sendPrintOrder(orderId),
    onSuccess: async () => {
      toast.success('Счёт отправлен на почту')
      await refreshOrder()
      onClose()
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Не удалось отправить счёт')
    },
  })

  const pending = formedMutation.isPending || sendMutation.isPending
  const canSend = Boolean(customerEmail) && printHash != null
  const invoiceHref = printHash ? publicInvoiceUrl(printHash) : null

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Сформировать счёт</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {invoiceHref ? (
            <a
              href={invoiceHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 break-all text-sm text-blue-600 hover:underline"
            >
              <ExternalLink className="size-3.5 shrink-0" />
              {invoiceHref}
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">Счёт ещё не сформирован</p>
          )}

          <div className="space-y-2">
            <Label>Скрывать артикул</Label>
            <div className="flex gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="hideArticle"
                  checked={hideArticle}
                  onChange={() => setHideArticle(true)}
                />
                Да
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="hideArticle"
                  checked={!hideArticle}
                  onChange={() => setHideArticle(false)}
                />
                Нет
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Закрыть
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={!canSend || pending}
              title={
                !customerEmail
                  ? 'Почта не указана'
                  : printHash == null
                    ? 'Сначала сформируйте счёт'
                    : undefined
              }
              onClick={() => sendMutation.mutate()}
            >
              {sendMutation.isPending
                ? 'Отправка…'
                : `Отправить на почту${customerEmail ? ` ${customerEmail}` : ' (почта не указана)'}`}
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => formedMutation.mutate()}
            >
              {formedMutation.isPending ? 'Формирование…' : 'Сформировать счёт'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
