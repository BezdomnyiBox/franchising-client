import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  changeOrderCar,
  changeOrderCustomerField,
} from '@/features/orders/api'
import type { Order, OrderCustomerFieldData } from '@/entities/order/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { phoneToApiLocal } from '@/shared/phone'

function onlyCyrillicName(value: string): string {
  return value
    .replace(/[^а-яА-ЯёЁ ]/g, '')
    .replace(/\s/g, '')
    .replace(/^./, (v) => v.toUpperCase())
}

interface CustomerEditFormProps {
  orderId: number
  order: Order
  customer?: OrderCustomerFieldData
  onCancel: () => void
  onSaved: () => Promise<unknown> | void
}

export function CustomerEditForm({
  orderId,
  order,
  customer,
  onCancel,
  onSaved,
}: CustomerEditFormProps) {
  const [lastname, setLastname] = useState(customer?.lastname || '')
  const [firstname, setFirstname] = useState(customer?.firstname || '')
  const [fathername, setFathername] = useState(customer?.fathername || '')
  const [phone, setPhone] = useState(customer?.phone || order.customerPhone || '')
  const [additionalPhone, setAdditionalPhone] = useState(order.customerAdditionalPhone || '')
  const [email, setEmail] = useState(customer?.email || order.customerEmail || '')
  const [carBrand, setCarBrand] = useState(order.carBrand || '')
  const [carModel, setCarModel] = useState(order.carModel || '')
  const [carVin, setCarVin] = useState(order.carVin || '')

  useEffect(() => {
    setLastname(customer?.lastname || '')
    setFirstname(customer?.firstname || '')
    setFathername(customer?.fathername || '')
    setPhone(customer?.phone || order.customerPhone || '')
    setAdditionalPhone(order.customerAdditionalPhone || '')
    setEmail(customer?.email || order.customerEmail || '')
    setCarBrand(order.carBrand || '')
    setCarModel(order.carModel || '')
    setCarVin(order.carVin || '')
  }, [customer, order])

  const mutation = useMutation({
    mutationFn: async () => {
      const localPhone = phoneToApiLocal(phone)
      if (localPhone.length < 10) {
        throw new Error('Укажите корректный телефон')
      }

      await changeOrderCustomerField(orderId, 'lastname', {
        value: onlyCyrillicName(lastname.trim()),
      })
      await changeOrderCustomerField(orderId, 'firstname', {
        value: onlyCyrillicName(firstname.trim()),
      })
      await changeOrderCustomerField(orderId, 'fathername', {
        value: onlyCyrillicName(fathername.trim()),
      })
      await changeOrderCustomerField(orderId, 'phone', {
        phone: localPhone,
        additionalPhone: phoneToApiLocal(additionalPhone) || '',
        country: 'RU',
      })
      await changeOrderCustomerField(orderId, 'email', {
        email: email.trim(),
      })
      await changeOrderCar(orderId, {
        action: 'change',
        brand: carBrand.trim() || '*',
        model: carModel.trim() || '*',
        vin: carVin.trim() || '*',
      })
    },
    onSuccess: async () => {
      toast.success('Данные клиента сохранены')
      await onSaved()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Не удалось сохранить')
    },
  })

  return (
    <form
      className="space-y-4 pt-2"
      onSubmit={(e) => {
        e.preventDefault()
        mutation.mutate()
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="edit-lastname">Фамилия</Label>
          <Input
            id="edit-lastname"
            value={lastname}
            onChange={(e) => setLastname(onlyCyrillicName(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-firstname">Имя</Label>
          <Input
            id="edit-firstname"
            value={firstname}
            onChange={(e) => setFirstname(onlyCyrillicName(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-fathername">Отчество</Label>
          <Input
            id="edit-fathername"
            value={fathername}
            onChange={(e) => setFathername(onlyCyrillicName(e.target.value))}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="edit-phone">Телефон *</Label>
          <Input
            id="edit-phone"
            placeholder="8 (900) 000-0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-phone2">Доп. телефон</Label>
          <Input
            id="edit-phone2"
            value={additionalPhone}
            onChange={(e) => setAdditionalPhone(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="edit-email">Email</Label>
          <Input
            id="edit-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="edit-brand">Марка</Label>
          <Input
            id="edit-brand"
            value={carBrand === '*' ? '' : carBrand}
            onChange={(e) => setCarBrand(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-model">Модель</Label>
          <Input
            id="edit-model"
            value={carModel === '*' ? '' : carModel}
            onChange={(e) => setCarModel(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-vin">VIN / кузов</Label>
          <Input
            id="edit-vin"
            value={carVin === '*' ? '' : carVin}
            onChange={(e) => setCarVin(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Сохранение…' : 'Сохранить'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending}>
          Отмена
        </Button>
      </div>
    </form>
  )
}
