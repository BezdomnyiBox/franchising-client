import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { fetchOrdersList } from '@/features/orders/api'
import {
  formatOrderListPrice,
  formatRubles,
  orderListStageLabel,
  orderStatusLabel,
  orderStatusVariant,
} from '@/features/orders/status'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { orderIdToPublicNumber } from '@/shared/config'

function todayIso() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function OrdersListPage() {
  const [from, setFrom] = useState(todayIso)
  const [to, setTo] = useState(todayIso)
  const [phone, setPhone] = useState('')
  const [article, setArticle] = useState('')
  const [applied, setApplied] = useState({ from: todayIso(), to: todayIso(), phone: '', article: '' })

  const query = useQuery({
    queryKey: ['orders', applied],
    queryFn: () =>
      fetchOrdersList({
        from: applied.from,
        to: applied.to,
        phone: applied.phone || undefined,
        article: applied.article || undefined,
      }),
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
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label htmlFor="from">С</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to">По</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Телефон</Label>
            <Input
              id="phone"
              placeholder="9xxxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="article">Артикул</Label>
            <Input
              id="article"
              placeholder="OEM / артикул"
              value={article}
              onChange={(e) => setArticle(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button
              className="w-full"
              onClick={() => setApplied({ from, to, phone, article })}
            >
              Найти
            </Button>
          </div>
        </CardContent>
      </Card>

      {query.isLoading ? (
        <Card>
          <CardContent className="space-y-2 pt-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ) : query.isError ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              Не удалось загрузить список. Проверьте авторизацию и API.
            </p>
          </CardContent>
        </Card>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Заказов не найдено.</p>
          </CardContent>
        </Card>
      ) : (
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата</TableHead>
                      <TableHead>№</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Клиент</TableHead>
                      <TableHead>Телефон</TableHead>
                      <TableHead>Авто</TableHead>
                      <TableHead className="text-right">Сумма</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.orders.map((order) => {
                      const publicNumber = order.number ?? orderIdToPublicNumber(order.id)
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {order.createdAt ?? '—'}
                          </TableCell>
                          <TableCell>
                            <Link
                              className="font-medium underline-offset-4 hover:underline"
                              to={`/orders/${publicNumber}`}
                            >
                              {publicNumber}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge variant={orderStatusVariant(order.status)}>
                              {order.statusDescription ?? orderStatusLabel(order.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>{order.customerFullName || '—'}</TableCell>
                          <TableCell>{order.phone || '—'}</TableCell>
                          <TableCell className="max-w-[12rem] truncate">
                            {order.fullCar || '—'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatOrderListPrice(order.price)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
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
      )}
    </div>
  )
}
