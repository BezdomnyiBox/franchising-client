import { useMemo, type ReactNode } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import {
  ExternalLink,
  Mail,
  Phone,
  Search,
  User,
  Car,
  MapPin,
} from 'lucide-react'
import {
  fetchOrder,
  fetchOrderCustomer,
  fetchOrderElements,
  fetchOrderPayments,
  fetchOrderStatus,
} from '@/features/orders/api'
import { formatRubles, orderStatusLabel, orderStatusVariant } from '@/features/orders/status'
import type { OrderElement } from '@/entities/order/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { publicNumberToOrderId } from '@/shared/config'
import { formatPhoneRu, toTelHref } from '@/shared/phone'
import { cn } from '@/lib/utils'

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

/** retailPrice / offerPrice в копейках. */
function formatKopecks(value?: number | null): string {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return formatRubles(Number(value) / 100)
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

function elementBrand(el: OrderElement): string {
  return el.item?.product?.brand?.name || '—'
}

function elementArticle(el: OrderElement): string {
  return el.item?.product?.articleSearch || el.item?.product?.article || el.oem || '—'
}

function elementName(el: OrderElement): string {
  return el.description || el.item?.product?.name || '—'
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

  const order = orderQuery.data
  const customer = customerQuery.data
  const statusData = statusQuery.data
  const payments = paymentsQuery.data
  const elements = elementsQuery.data ?? []

  const activeElements = useMemo(
    () => elements.filter((el) => el.status !== 'canceled'),
    [elements],
  )

  const totals = useMemo(() => {
    return activeElements.reduce(
      (acc, el) => {
        const qty = el.quantity ?? 0
        const price = el.retailPrice ?? 0
        acc.qty += qty
        acc.sum += (price * qty) / 100
        return acc
      },
      { qty: 0, sum: 0 },
    )
  }, [activeElements])

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
            <CardTitle className="text-base">Клиент</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
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
                  {[order.carBrand, order.carModel].filter(Boolean).join(' ') || 'не указан'}
                  {order.carVin ? (
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
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <CardTitle className="text-base">Позиции заказа</CardTitle>
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Кол-во: </span>
                <span className="font-medium">{totals.qty}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Сумма: </span>
                <span className="font-medium">{formatRubles(totals.sum)}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {elementsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : activeElements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Позиций пока нет. Откройте поиск и добавьте товар в заказ.
            </p>
          ) : (
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Бренд</TableHead>
                  <TableHead>Артикул</TableHead>
                  <TableHead>Наименование</TableHead>
                  <TableHead>Склад</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Кол-во</TableHead>
                  <TableHead className="text-right">Цена</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeElements.map((el, index) => {
                  const qty = el.quantity ?? 0
                  const price = el.retailPrice ?? 0
                  return (
                    <TableRow key={el.id}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium">{elementBrand(el)}</TableCell>
                      <TableCell className="font-mono text-xs">{elementArticle(el)}</TableCell>
                      <TableCell className="max-w-[20rem] truncate" title={elementName(el)}>
                        {elementName(el)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {el.item?.warehouseName || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {el.statusDescription || el.status || '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{qty || '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatKopecks(price)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatRubles((price * qty) / 100)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
