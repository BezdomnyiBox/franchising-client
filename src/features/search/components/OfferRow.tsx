// @ts-nocheck
import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { setOrderElementOfferProduct } from '../api'
import { formatAssemblyTime, money } from '../lib/format'
import { getEtaSpeed, getOfferDays } from '../lib/offers'
import { AddToOrderModal } from './AddToOrderModal'
import { EtaDot } from './search-ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

export function OfferRow({
  good,
  offer,
  isBest,
  isFast,
  initialOrderNumber,
  offerAction = { mode: 'add-to-order' },
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [picking, setPicking] = useState(false)
  const supplierLabel = offer.warehousePublicName
    ? offer.warehousePublicName
    : offer.supplierName || offer.warehousePublicName || ''
  const days = getOfferDays(offer)
  const speed = getEtaSpeed(days)
  const displayPrice = offer.offerPrice || offer.price
  const isPickMode = offerAction.mode === 'set-to-element'

  const handlePickToElement = async () => {
    if (!isPickMode || picking) return
    setPicking(true)
    try {
      const result = await setOrderElementOfferProduct(offerAction.target.orderElementId, {
        brand: good.brand,
        article: good.article,
        name: good.name,
        price: offer.price,
        offerPrice: offer.offerPrice,
        quantity: offer.stock,
        warehouseVendorId: offer.warehouseVendorId,
        supplierAlias: offer.supplierAlias,
        deliveryDuration: offer.deliveryDuration,
        multiplicity: offer.multiplicity,
        productId: good.id || good.productId,
      })
      if (result.result === 'failed' || result.result === 'error') {
        throw new Error(result.error || result.message || 'Не удалось подставить товар')
      }
      toast.success('Товар подставлен в позицию')
      offerAction.target.onPicked?.()
    } catch (error) {
      const message = error?.message || 'Ошибка set_offer_product'
      toast.error(message)
      offerAction.target.onError?.(message)
    } finally {
      setPicking(false)
    }
  }

  return (
    <>
      <TableRow className={cn(isBest && 'bg-primary/5')}>
        <TableCell>
          <div className="space-y-0.5">
            {isBest ? (
              <Badge variant="secondary" className="mb-1 bg-primary/10 text-primary">
                Рекомендуем
              </Badge>
            ) : null}
            <div className="font-medium">{supplierLabel}</div>
            <div className="text-xs text-muted-foreground">
              {offer.warehousePublicNumber}
              {offer.rating ? ` · ★ ${offer.rating}` : ''}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="font-medium">{money(Number(displayPrice) || 0)}</div>
          <div className="text-xs text-muted-foreground">за 1 шт.</div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <EtaDot speed={speed} />
            <div>
              <div className="font-medium">{formatAssemblyTime(offer.assemblyTime)}</div>
              {isFast ? <div className="text-xs text-muted-foreground">самый быстрый</div> : null}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <span className="font-medium">{offer.stock}</span>{' '}
          <span className="text-xs text-muted-foreground">шт.</span>
        </TableCell>
        <TableCell className="text-muted-foreground">{offer.warranty || '—'}</TableCell>
        <TableCell className="text-right">
          {isPickMode ? (
            <Button type="button" size="sm" disabled={picking} onClick={() => void handlePickToElement()}>
              <Check className="size-4" />
              {picking ? '…' : 'В позицию'}
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={() => setModalOpen(true)}>
              <Plus className="size-4" />
              В заказ
            </Button>
          )}
        </TableCell>
      </TableRow>
      {!isPickMode ? (
        <AddToOrderModal
          good={good}
          offer={offer}
          initialOrderNumber={initialOrderNumber}
          open={modalOpen}
          onOpenChange={setModalOpen}
        />
      ) : null}
    </>
  )
}
