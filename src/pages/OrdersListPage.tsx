import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { fetchOrdersList } from '@/features/orders/api'
import { orderStatusLabel, orderStatusVariant } from '@/features/orders/status'
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

  const orders = useMemo(() => query.data ?? [], [query.data])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Заказы ПВ</h1>
          <p className="text-sm text-muted-foreground">
            Только заказы вашего пункта выдачи. Фильтры применяются по кнопке «Найти».
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

      <Card>
        <CardContent className="pt-6">
          {query.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : query.isError ? (
            <p className="text-sm text-destructive">
              Не удалось загрузить список. Проверьте авторизацию и API.
            </p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Заказов не найдено.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>№</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Телефон</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const publicNumber = order.number ?? orderIdToPublicNumber(order.id)
                  return (
                    <TableRow key={order.id}>
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
                          {orderStatusLabel(order.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{order.customerName ?? '—'}</TableCell>
                      <TableCell>{order.phone ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        {order.totalPrice != null ? `${order.totalPrice} ₽` : '—'}
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
