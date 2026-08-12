import { useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format, parse } from 'date-fns'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { fetchOrdersList } from '@/features/orders/api'
import { CopyOrderActions } from '@/features/orders/CopyOrderActions'
import {
  formatOrderListPrice,
  formatRubles,
  ORDER_STATUS_FILTER_OPTIONS,
  orderListStageLabel,
  orderStatusLabel,
  orderStatusVariant,
} from '@/features/orders/status'
import type { OrderListItem, OrdersListFilters, OrdersListGroup } from '@/entities/order/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { APP_BASE_PATH, orderIdToPublicNumber } from '@/shared/config'
import { digitsOnlyPhone, formatPhoneRu, toTelHref } from '@/shared/phone'
import { cn } from '@/lib/utils'

type SortKey =
  | 'createdAt'
  | 'number'
  | 'status'
  | 'customerFullName'
  | 'phone'
  | 'fullCar'
  | 'workManagerName'
  | 'price'

type SortDir = 'asc' | 'desc'

type FilterDraft = {
  from: string
  to: string
  phone: string
  article: string
  car: string
  customer: string
  status: string
  priceFrom: string
  priceTo: string
}

const DEFAULT_SORT_KEY: SortKey = 'createdAt'
const DEFAULT_SORT_DIR: SortDir = 'desc'

/** Фиксированные ширины — одинаковые во всех группах. */
const COLUMN_WIDTHS: Record<SortKey | 'actions', string> = {
  createdAt: '10%',
  number: '7%',
  status: '11%',
  customerFullName: '14%',
  phone: '11%',
  fullCar: '14%',
  workManagerName: '12%',
  price: '10%',
  actions: '11%',
}

const SORT_COLUMNS: { key: SortKey; label: string; align?: 'right' }[] = [
  { key: 'createdAt', label: 'Дата' },
  { key: 'number', label: '№' },
  { key: 'status', label: 'Статус' },
  { key: 'customerFullName', label: 'Клиент' },
  { key: 'phone', label: 'Телефон' },
  { key: 'fullCar', label: 'Авто' },
  { key: 'workManagerName', label: 'Менеджер' },
  { key: 'price', label: 'Сумма', align: 'right' },
]

function todayIso() {
  return format(new Date(), 'yyyy-MM-dd')
}

function emptyFilters(from = todayIso(), to = todayIso()): FilterDraft {
  return {
    from,
    to,
    phone: '',
    article: '',
    car: '',
    customer: '',
    status: '',
    priceFrom: '',
    priceTo: '',
  }
}

function toListFilters(draft: FilterDraft): OrdersListFilters {
  return {
    from: draft.from,
    to: draft.to,
    phone: draft.phone || undefined,
    article: draft.article || undefined,
    car: draft.car || undefined,
    customer: draft.customer || undefined,
    status: draft.status || undefined,
    priceFrom: draft.priceFrom || undefined,
    priceTo: draft.priceTo || undefined,
  }
}

function parseOrderCreatedAt(order: OrderListItem): number {
  if (order.createdAt) {
    const parsed = parse(order.createdAt, 'HH:mm dd.MM.yyyy', new Date())
    if (!Number.isNaN(parsed.getTime())) return parsed.getTime()
  }
  if (order.createdDate) {
    const parsed = parse(order.createdDate, 'yyyy-MM-dd', new Date())
    if (!Number.isNaN(parsed.getTime())) return parsed.getTime()
  }
  return 0
}

function compareOrders(a: OrderListItem, b: OrderListItem, key: SortKey, dir: SortDir): number {
  let result = 0

  switch (key) {
    case 'createdAt':
      result = parseOrderCreatedAt(a) - parseOrderCreatedAt(b)
      break
    case 'number': {
      const an = Number(a.number ?? a.id)
      const bn = Number(b.number ?? b.id)
      result = an - bn
      break
    }
    case 'status': {
      const as = (a.statusDescription ?? a.status ?? '').toLocaleLowerCase('ru')
      const bs = (b.statusDescription ?? b.status ?? '').toLocaleLowerCase('ru')
      result = as.localeCompare(bs, 'ru')
      break
    }
    case 'customerFullName': {
      const as = (a.customerFullName ?? '').toLocaleLowerCase('ru')
      const bs = (b.customerFullName ?? '').toLocaleLowerCase('ru')
      result = as.localeCompare(bs, 'ru')
      break
    }
    case 'phone':
      result = digitsOnlyPhone(a.phone).localeCompare(digitsOnlyPhone(b.phone), 'ru')
      break
    case 'fullCar': {
      const as = (a.fullCar ?? '').toLocaleLowerCase('ru')
      const bs = (b.fullCar ?? '').toLocaleLowerCase('ru')
      result = as.localeCompare(bs, 'ru')
      break
    }
    case 'workManagerName': {
      const as = (a.workManagerName ?? '').toLocaleLowerCase('ru')
      const bs = (b.workManagerName ?? '').toLocaleLowerCase('ru')
      result = as.localeCompare(bs, 'ru')
      break
    }
    case 'price':
      result = (a.price ?? 0) - (b.price ?? 0)
      break
  }

  if (result === 0) {
    result = (a.id ?? 0) - (b.id ?? 0)
  }

  return dir === 'asc' ? result : -result
}

function SortableHead({
  columnKey,
  label,
  align,
  sortKey,
  sortDir,
  onSort,
}: {
  columnKey: SortKey
  label: string
  align?: 'right'
  sortKey: SortKey
  sortDir: SortDir
  onSort: (key: SortKey) => void
}) {
  const active = sortKey === columnKey
  const Icon = !active ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown

  return (
    <TableHead
      style={{ width: COLUMN_WIDTHS[columnKey] }}
      className={cn(align === 'right' && 'text-right')}
    >
      <button
        type="button"
        className={cn(
          'inline-flex max-w-full items-center gap-1 font-medium hover:text-foreground',
          align === 'right' && 'ml-auto flex-row-reverse',
          active ? 'text-foreground' : 'text-muted-foreground',
        )}
        onClick={() => onSort(columnKey)}
      >
        <span className="truncate">{label}</span>
        <Icon className="size-3.5 shrink-0 opacity-70" aria-hidden />
      </button>
    </TableHead>
  )
}

function OrdersGroupTable({
  group,
  sortKey,
  sortDir,
  onSort,
}: {
  group: OrdersListGroup
  sortKey: SortKey
  sortDir: SortDir
  onSort: (key: SortKey) => void
}) {
  const orders = useMemo(
    () => [...group.orders].sort((a, b) => compareOrders(a, b, sortKey, sortDir)),
    [group.orders, sortKey, sortDir],
  )

  return (
    <div className="overflow-x-auto">
      <Table className="table-fixed min-w-[1100px]">
        <colgroup>
          {SORT_COLUMNS.map((col) => (
            <col key={col.key} style={{ width: COLUMN_WIDTHS[col.key] }} />
          ))}
          <col style={{ width: COLUMN_WIDTHS.actions }} />
        </colgroup>
        <TableHeader>
          <TableRow>
            {SORT_COLUMNS.map((col) => (
              <SortableHead
                key={col.key}
                columnKey={col.key}
                label={col.label}
                align={col.align}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
              />
            ))}
            <TableHead style={{ width: COLUMN_WIDTHS.actions }} className="text-right">
              <span className="text-muted-foreground">Копия</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const publicNumber = order.number ?? orderIdToPublicNumber(order.id)
            const orderHref = `${APP_BASE_PATH}/orders/${publicNumber}`
            const phoneLabel = formatPhoneRu(order.phone)
            const telHref = toTelHref(order.phone)

            return (
              <TableRow key={order.id}>
                <TableCell
                  style={{ width: COLUMN_WIDTHS.createdAt }}
                  className="truncate text-muted-foreground"
                >
                  {order.createdAt ?? '—'}
                </TableCell>
                <TableCell style={{ width: COLUMN_WIDTHS.number }} className="truncate">
                  <a
                    href={orderHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {publicNumber}
                  </a>
                </TableCell>
                <TableCell style={{ width: COLUMN_WIDTHS.status }}>
                  <Badge variant={orderStatusVariant(order.status)} className="max-w-full truncate">
                    {order.statusDescription ?? orderStatusLabel(order.status)}
                  </Badge>
                </TableCell>
                <TableCell
                  style={{ width: COLUMN_WIDTHS.customerFullName }}
                  className="truncate"
                  title={order.customerFullName || undefined}
                >
                  {order.customerFullName || '—'}
                </TableCell>
                <TableCell style={{ width: COLUMN_WIDTHS.phone }} className="truncate">
                  {telHref && phoneLabel ? (
                    <a
                      href={telHref}
                      className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {phoneLabel}
                    </a>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell
                  style={{ width: COLUMN_WIDTHS.fullCar }}
                  className="truncate"
                  title={order.fullCar || undefined}
                >
                  {order.fullCar || '—'}
                </TableCell>
                <TableCell
                  style={{ width: COLUMN_WIDTHS.workManagerName }}
                  className="truncate"
                  title={order.workManagerName || undefined}
                >
                  {order.workManagerName || '—'}
                </TableCell>
                <TableCell
                  style={{ width: COLUMN_WIDTHS.price }}
                  className="text-right tabular-nums"
                >
                  {formatOrderListPrice(order.price)}
                </TableCell>
                <TableCell style={{ width: COLUMN_WIDTHS.actions }}>
                  <CopyOrderActions orderId={order.id} />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export function OrdersListPage() {
  const [draft, setDraft] = useState<FilterDraft>(() => emptyFilters())
  const [applied, setApplied] = useState<FilterDraft>(() => emptyFilters())
  const [sortKey, setSortKey] = useState<SortKey>(DEFAULT_SORT_KEY)
  const [sortDir, setSortDir] = useState<SortDir>(DEFAULT_SORT_DIR)

  const query = useQuery({
    queryKey: ['orders', applied],
    queryFn: () => fetchOrdersList(toListFilters(applied)),
  })

  const groups = useMemo(() => query.data ?? [], [query.data])

  const totals = useMemo(() => {
    return groups.reduce(
      (acc, group) => {
        acc.orders += group.orders.length
        acc.amount += group.amount || 0
        acc.takeMoney += group.takeMoney || 0
        return acc
      },
      { orders: 0, amount: 0, takeMoney: 0 },
    )
  }, [groups])

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDir(key === 'createdAt' || key === 'price' || key === 'number' ? 'desc' : 'asc')
  }

  const patchDraft = (patch: Partial<FilterDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }))
  }

  const handleClearAll = () => {
    const cleaned = emptyFilters()
    setDraft(cleaned)
    setApplied(cleaned)
  }

  let listContent: ReactNode
  if (query.isLoading) {
    listContent = (
      <Card>
        <CardContent className="space-y-2 pt-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    )
  } else if (query.isError) {
    listContent = (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">
            Не удалось загрузить список. Проверьте авторизацию и API.
          </p>
        </CardContent>
      </Card>
    )
  } else if (groups.length === 0) {
    listContent = (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Заказов не найдено.</p>
        </CardContent>
      </Card>
    )
  } else {
    listContent = (
      <>
        {groups.map((group) => (
          <Card key={group.key}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Стадия сделки</p>
                  <CardTitle className="text-lg">
                    {group.description || orderListStageLabel(group.status)}
                  </CardTitle>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Количество: </span>
                    <span className="font-medium">{group.orders.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Сумма: </span>
                    <span className="font-medium">{formatRubles(group.amount)}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <OrdersGroupTable
                group={group}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardContent className="flex flex-wrap gap-6 pt-6 text-sm">
            <div>
              <span className="text-muted-foreground">Всего заказов: </span>
              <span className="font-medium">{totals.orders}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Сумма всех сделок: </span>
              <span className="font-medium">{formatRubles(totals.amount)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Сумма оплаченных: </span>
              <span className="font-medium">{formatRubles(totals.takeMoney)}</span>
            </div>
          </CardContent>
        </Card>
      </>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Заказы ПВ</h1>
          <p className="text-sm text-muted-foreground">
            Группы по стадиям сделки, как отдаёт API. Фильтры — по кнопке «Найти».
          </p>
        </div>
        <Button asChild>
          <Link to="/orders/new">Новый заказ</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Фильтры</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <div className="space-y-1.5">
            <Label htmlFor="from">С</Label>
            <Input
              id="from"
              type="date"
              value={draft.from}
              onChange={(e) => patchDraft({ from: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to">По</Label>
            <Input
              id="to"
              type="date"
              value={draft.to}
              onChange={(e) => patchDraft({ to: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Статус</Label>
            <Select
              value={draft.status || '__all__'}
              onValueChange={(value) =>
                patchDraft({ status: !value || value === '__all__' ? '' : value })
              }
            >
              <SelectTrigger id="status" className="w-full">
                <SelectValue placeholder="Все" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Все</SelectItem>
                {ORDER_STATUS_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="priceFrom">Сумма от</Label>
            <Input
              id="priceFrom"
              inputMode="decimal"
              placeholder="0"
              value={draft.priceFrom}
              onChange={(e) => patchDraft({ priceFrom: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="priceTo">Сумма до</Label>
            <Input
              id="priceTo"
              inputMode="decimal"
              placeholder="0"
              value={draft.priceTo}
              onChange={(e) => patchDraft({ priceTo: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Телефон</Label>
            <Input
              id="phone"
              placeholder="9xxxxxxxxx"
              value={draft.phone}
              onChange={(e) => patchDraft({ phone: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="car">Авто</Label>
            <Input
              id="car"
              placeholder="марка / модель / VIN"
              value={draft.car}
              onChange={(e) => patchDraft({ car: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="article">Артикул</Label>
            <Input
              id="article"
              placeholder="OEM / артикул"
              value={draft.article}
              onChange={(e) => patchDraft({ article: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="customer">Клиент</Label>
            <Input
              id="customer"
              placeholder="ФИО"
              value={draft.customer}
              onChange={(e) => patchDraft({ customer: e.target.value })}
            />
          </div>
          <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-4 xl:col-span-1">
            <Button className="flex-1" onClick={() => setApplied({ ...draft })}>
              Найти
            </Button>
            <Button className="flex-1" variant="outline" onClick={handleClearAll}>
              Сбросить
            </Button>
          </div>
        </CardContent>
      </Card>

      {listContent}
    </div>
  )
}
