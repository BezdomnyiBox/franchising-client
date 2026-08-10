import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { createFranchisingOrder } from '@/features/orders/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { orderIdToPublicNumber } from '@/shared/config'

const schema = z.object({
  firstName: z
    .string()
    .min(1, 'Укажите имя')
    .regex(/^[а-яА-ЯёЁ]+$/, 'Только кириллица'),
  lastName: z.string().optional(),
  fatherName: z.string().optional(),
  phone: z
    .string()
    .min(10, 'Укажите телефон')
    .regex(/^[\d\s()+-]+$/, 'Некорректный телефон'),
  email: z.string().email('Некорректный email').or(z.literal('')).optional(),
  carBrand: z.string().optional(),
  carModel: z.string().optional(),
  carVin: z.string().optional(),
  warehouseId: z.enum(['2', '29']),
})

type FormValues = z.infer<typeof schema>

export function CreateOrderPage() {
  const navigate = useNavigate()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      fatherName: '',
      phone: '',
      email: '',
      carBrand: '',
      carModel: '',
      carVin: '',
      warehouseId: '2',
    },
  })

  const mutation = useMutation({
    mutationFn: createFranchisingOrder,
    onSuccess: (data) => {
      const publicNumber = orderIdToPublicNumber(data.orderId)
      navigate(`/orders/${publicNumber}`)
    },
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Новый заказ</h1>
        <p className="text-sm text-muted-foreground">
          Создание заказа от имени менеджера франшизы. ПВ берётся из сессии на бэкенде.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Клиент</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          >
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="lastName">Фамилия</Label>
              <Input id="lastName" {...form.register('lastName')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="firstName">Имя *</Label>
              <Input id="firstName" {...form.register('firstName')} />
              {form.formState.errors.firstName ? (
                <p className="text-xs text-destructive">{form.formState.errors.firstName.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="fatherName">Отчество</Label>
              <Input id="fatherName" {...form.register('fatherName')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Телефон *</Label>
              <Input id="phone" placeholder="8 (900) 000-0000" {...form.register('phone')} />
              {form.formState.errors.phone ? (
                <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register('email')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="carBrand">Марка</Label>
              <Input id="carBrand" {...form.register('carBrand')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="carModel">Модель</Label>
              <Input id="carModel" {...form.register('carModel')} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="carVin">VIN / кузов</Label>
              <Input id="carVin" {...form.register('carVin')} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="warehouseId">Склад</Label>
              <select
                id="warehouseId"
                className="border-input bg-background h-9 w-full rounded-lg border px-3 text-sm"
                {...form.register('warehouseId')}
              >
                <option value="2">Владивосток</option>
                <option value="29">Ответственное хранение</option>
              </select>
            </div>

            {mutation.isError ? (
              <p className="text-sm text-destructive sm:col-span-2">
                Не удалось создать заказ. Проверьте сессию и права ПВ.
              </p>
            ) : null}

            <div className="sm:col-span-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Создание…' : 'Создать заказ'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
