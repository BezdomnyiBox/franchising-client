import { useState, type ReactNode } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import {
  CheckCircle,
  ExternalLink,
  Mail,
  Pencil,
  Phone,
  Search,
  User,
  Car,
  MapPin,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  confirmOrder,
  fetchOrder,
  fetchOrderCustomer,
  fetchOrderElements,
  fetchOrderPayments,
  fetchOrderStatus,
} from '@/features/orders/api'
import { ConfirmOrderDialog } from '@/features/orders/ConfirmOrderDialog'
import { CustomerEditForm } from '@/features/orders/CustomerEditForm'
import { OrderElementsTable } from '@/features/orders/OrderElementsTable'
import { orderStatusLabel, orderStatusVariant, formatRubles } from '@/features/orders/status'
import { useAuth } from '@/features/auth/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { publicNumberToOrderId } from '@/shared/config'
import { formatPhoneRu, toTelHref } from '@/shared/phone'
import { cn } from '@/lib/utils'

/** Как в CRM ActionButtons: accepted / notified_customer / confirmed без флага confirmed. */
function canConfirmOrder(status?: string, confirmed?: unknown): boolean {
  if (['accepted', 'notified_customer'].includes(status ?? '')) return true
  return status === 'confirmed' && !confirmed
}

function formatCreatedAt(value?: string | null): string {
  if (!value) return '—'
  try {
    return format(parseISO(value.replace(' ', 'T')), 'HH:mm dd.MM.yy')
  } catch {
    return value
  }
}

function formatAssemblyTime(value?: string | null): string {
  if (!value) return 'не задано'
  try {
    return format(parseISO(value.replace(' ', 'T')), 'HH:mm, dd.MM.yy')
  } catch {
    return value
  }
}

function paymentLabel(paymentAmount?: number | null, paymentsCount?: number): string {
  if (paymentAmount == null) {
    return paymentsCount ? 'Оплачен' : 'Не оплачен'
  }
  if (paymentAmount === 0) {
    return paymentsCount ? 'Оплачен' : 'Не оплачен'
  }
  if (paymentAmount > 0) return `Доплата: ${formatRubles(paymentAmount)}`
  return `На возврат: ${formatRubles(Math.abs(paymentAmount))}`
}

function DataRow({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('border-b py-3 last:border-b-0', className)}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{children}</div>
    </div>
  )
}

export function OrderDetailPage() {
  const { publicNumber = '' } = useParams()
  const orderId = publicNumberToOrderId(publicNumber)
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [editingCustomer, setEditingCustomer] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const enabled = Number.isFinite(orderId)

  const orderQuery = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => fetchOrder(orderId),
    enabled,
  })

  const fieldQueries = useQueries({
    queries: [
      {
        queryKey: ['order-customer', orderId],
        queryFn: () => fetchOrderCustomer(orderId),
        enabled: enabled && !!orderQuery.data?.id,
      },
      {
        queryKey: ['order-status', orderId],
        queryFn: () => fetchOrderStatus(orderId),
        enabled: enabled && !!orderQuery.data?.id,
      },
      {
        queryKey: ['order-payments', orderId],
        queryFn: () => fetchOrderPayments(orderId),
        enabled: enabled && !!orderQuery.data?.id,
      },
    ],
  })

  const [customerQuery, statusQuery, paymentsQuery] = fieldQueries

  const elementsQuery = useQuery({
    queryKey: ['order-elements', orderId],
    queryFn: () => fetchOrderElements(orderId),
    enabled: enabled && !!orderQuery.data?.id,
  })

  const confirmMutation = useMutation({
    mutationFn: (assemblyTime: string) => {
      const id = orderQuery.data?.id
      if (!id) throw new Error('Заказ не загружен')
      return confirmOrder(id, assemblyTime)
    },
    onSuccess: async () => {
      toast.success('Заказ подтверждён')
      setConfirmOpen(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['order', orderId] }),
        queryClient.invalidateQueries({ queryKey: ['order-elements', orderId] }),
        queryClient.invalidateQueries({ queryKey: ['order-status', orderId] }),
        queryClient.invalidateQueries({ queryKey: ['order-payments', orderId] }),
      ])
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Не удалось подтвердить заказ')
    },
  })

  const order = orderQuery.data
  const customer = customerQuery.data
  const statusData = statusQuery.data
  const payments = paymentsQuery.data
  const elements = elementsQuery.data ?? []

  if (!enabled) {
    return <p className="text-sm text-destructive">Некорректный номер заказа.</p>
  }

  if (orderQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (orderQuery.isError || !order) {
    return (
      <Card>
        <CardContent className="space-y-3 pt-6">
          <p className="text-sm text-destructive">
            {(orderQuery.error as Error)?.message || 'Не удалось загрузить заказ.'}
          </p>
          <Button variant="outline" asChild>
            <Link to="/orders">К списку заказов</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const displayNumber = order.number ?? publicNumber
  const phone = customer?.phone || order.customerPhone
  const phoneLabel = formatPhoneRu(phone)
  const telHref = toTelHref(phone)
  const fullName =
    customer?.fullName ||
    [customer?.lastname, customer?.firstname, customer?.fathername].filter(Boolean).join(' ') ||
    '—'
  const statusText =
    statusData?.statusDescription || order.statusDescription || orderStatusLabel(order.status)
  const payAmount = payments?.paymentAmount
  const payCount = payments?.payments?.length ?? order.paymentsCount ?? 0

  const refreshElements = () => {
    void queryClient.invalidateQueries({ queryKey: ['order-elements', orderId] })
    void queryClient.invalidateQueries({ queryKey: ['order', orderId] })
  }

  const showConfirm =
    canConfirmOrder(statusData?.status || order.status, order.confirmed) &&
    !(customer?.isInBlackList && !order.paymentsCount)

  const openConfirmDialog = () => {
    if (!order.clientSource) {
      toast.warning('Не указан источник обращения')
      return
    }
    setConfirmOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Заказ № {displayNumber}</h1>
            <Badge variant={orderStatusVariant(order.status)}>{statusText}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            принят {formatCreatedAt(order.createdDate)}
            {order.workManager ? ` · ${order.workManager}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/orders">К списку</Link>
          </Button>
          {order.mobileHash ? (
            <Button variant="outline" asChild>
              <a
                href={`https://podzamenu.ru/m/${order.mobileHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="size-4" />
                Публичная ссылка
              </a>
            </Button>
          ) : null}
          {showConfirm ? (
            <Button
              type="button"
              variant="secondary"
              disabled={confirmMutation.isPending}
              onClick={openConfirmDialog}
            >
              <CheckCircle className="size-4" />
              Подтвердить
            </Button>
          ) : null}
          <Button asChild>
            <Link to={`/search?orderNumber=${displayNumber}`}>
              <Search className="size-4" />
              Найти товар
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Данные заказа</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <DataRow label="Статус">
              <span className="font-bold">{statusText}</span>
            </DataRow>
            <DataRow label="Оплата">
              <span
                className={cn(
                  payAmount === 0 && payCount > 0 && 'text-green-700',
                  (payAmount ?? 0) < 0 && 'text-destructive',
                )}
              >
                {paymentLabel(payAmount, payCount)}
              </span>
            </DataRow>
            <DataRow label="Источник обращения">
              {order.clientSourceDescription || order.clientSource || '—'}
            </DataRow>
            <DataRow label="Время выполнения">{formatAssemblyTime(order.assemblyTime)}</DataRow>
            <DataRow label="Ответственный">{order.workManager || '—'}</DataRow>
            <DataRow label="ПВ">
              {[order.branchTownName, order.branchAddress].filter(Boolean).join(', ') || '—'}
            </DataRow>
            {statusData?.history?.length ? (
              <DataRow label="История статусов">
                <ul className="space-y-1 font-normal">
                  {statusData.history.map((item, idx) => (
                    <li key={`${item.status}-${idx}`} style={{ color: item.color || undefined }}>
                      {item.description} · {item.date}
                    </li>
                  ))}
                </ul>
              </DataRow>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Клиент</CardTitle>
              {!editingCustomer ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingCustomer(true)}
                >
                  <Pencil className="size-3.5" />
                  Изменить
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {editingCustomer ? (
              <CustomerEditForm
                orderId={order.id}
                order={order}
                customer={customer}
                onCancel={() => setEditingCustomer(false)}
                onSaved={async () => {
                  await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ['order', orderId] }),
                    queryClient.invalidateQueries({ queryKey: ['order-customer', orderId] }),
                  ])
                  setEditingCustomer(false)
                }}
              />
            ) : (
              <>
                <DataRow label="ФИО">
                  <span className="inline-flex items-center gap-2">
                    <User className="size-4 text-muted-foreground" />
                    {customerQuery.isLoading ? <Skeleton className="h-4 w-40" /> : fullName}
                  </span>
                </DataRow>
                <DataRow label="Телефон">
                  <span className="inline-flex items-center gap-2">
                    <Phone className="size-4 text-muted-foreground" />
                    {telHref && phoneLabel ? (
                      <a
                        href={telHref}
                        className="font-bold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {phoneLabel}
                      </a>
                    ) : (
                      '—'
                    )}
                  </span>
                </DataRow>
                <DataRow label="Email">
                  <span className="inline-flex items-center gap-2">
                    <Mail className="size-4 text-muted-foreground" />
                    {order.customerEmail || customer?.email || '—'}
                  </span>
                </DataRow>
                <DataRow label="Автомобиль">
                  <span className="inline-flex items-start gap-2">
                    <Car className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span>
                      {[order.carBrand, order.carModel]
                        .filter((v) => v && v !== '*')
                        .join(' ') || 'не указан'}
                      {order.carVin && order.carVin !== '*' ? (
                        <span className="mt-1 block font-mono text-xs text-muted-foreground">
                          VIN {order.carVin}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </DataRow>
                <DataRow label="Доставка / ТК">
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="size-4 text-muted-foreground" />
                    {order.transportCompanyAlias
                      ? `${order.transportCompanyAlias}${
                          order.transportCompanyPrice
                            ? ` · ${formatRubles(order.transportCompanyPrice)}`
                            : ''
                        }`
                      : 'Самовывоз / не указана'}
                  </span>
                </DataRow>
                {customer?.typeDescription ? (
                  <DataRow label="Тип клиента">{customer.typeDescription}</DataRow>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Позиции заказа</CardTitle>
          <p className="text-xs text-muted-foreground">
            Enter в ОЕМ или кнопка корзины — поиск и подстановка через set_item (как в CRM).
          </p>
        </CardHeader>
        <CardContent>
          {elementsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <OrderElementsTable
              orderId={order.id}
              orderNumber={displayNumber}
              orderStatus={order.status}
              userId={user?.id}
              elements={elements}
              onRefresh={refreshElements}
            />
          )}
        </CardContent>
      </Card>

      <ConfirmOrderDialog
        open={confirmOpen}
        defaultAssemblyTime={order.assemblyTime}
        saving={confirmMutation.isPending}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async (assemblyTime) => {
          await confirmMutation.mutateAsync(assemblyTime)
        }}
      />
    </div>
  )
}
