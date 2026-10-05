// @ts-nocheck
import { useState } from 'react'
import { BACK_HOST } from '../lib/constants'
import { formatAssemblyTime, money } from '../lib/format'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AddToOrderModal({ good, offer, initialOrderNumber = '', open, onOpenChange }) {
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber || '')

  const handleAddToOrder = () => {
    if (!orderNumber) return

    fetch(`${BACK_HOST}/order/add_offer_product`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNumber,
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
      }),
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.result === 'success') window.alert('Товар добавлен в заказ')
        else window.alert(result.message)
      })
      .then(() => onOpenChange(false))
      .catch((error) => {
        window.alert(error.message)
        onOpenChange(false)
      })
  }

  const displayPrice = offer.offerPrice ?? offer.price

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить товар в заказ</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-1 pt-1 text-sm">
              <p>
                {good.brand} / <span className="font-mono text-xs">{good.article}</span>
              </p>
              <p>{good.name}</p>
              <p>Цена: {money(Number(displayPrice) || 0)}</p>
              <p>Срок поставки: {formatAssemblyTime(offer.assemblyTime)}</p>
              <p>
                Склад: {offer.warehousePublicName} ({offer.warehousePublicNumber})
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="order-number-input">Номер заказа</Label>
          <Input
            id="order-number-input"
            value={orderNumber}
            onChange={(event) => setOrderNumber(event.target.value)}
          />
        </div>
        <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Отменить
          </Button>
          <Button type="button" onClick={handleAddToOrder}>
            Добавить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
