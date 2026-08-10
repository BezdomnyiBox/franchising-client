import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { fetchOrder, fetchOrderElements } from '@/features/orders/api'
import { orderStatusLabel, orderStatusVariant } from '@/features/orders/status'
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

export function OrderDetailPage() {
  const { publicNumber = '' } = useParams()
  const orderId = publicNumberToOrderId(publicNumber)

  const orderQuery = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => fetchOrder(orderId),
    enabled: Number.isFinite(orderId),
  })

  const elementsQuery = useQuery({
    queryKey: ['order-elements', orderId],
    queryFn: () => fetchOrderElements(orderId),
    enabled: Number.isFinite(orderId),
  })

  if (!Number.isFinite(orderId)) {
    return <p className="text-sm text-destructive">Некорректный номер заказа.</p>
  }

  const order = orderQuery.data
  const elements = elementsQuery.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Заказ #{publicNumber}</h1>
            {order ? (
              <Badge variant={orderStatusVariant(order.status)}>
                {orderStatusLabel(order.status)}
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            Карточка заказа вашего ПВ. Добавление позиций — через поиск.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/orders">К списку</Link>
          </Button>
          <Button asChild>
            <Link to={`/search?orderNumber=${publicNumber}`}>Найти товар</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Клиент и авто</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {orderQuery.isLoading ? (
              <>
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
              </>
            ) : orderQuery.isError ? (
              <p className="text-destructive">Не удалось загрузить заказ.</p>
            ) : (
              <>
                <p>
                  {[order?.lastName, order?.firstName, order?.fatherName].filter(Boolean).join(' ') ||
                    '—'}
                </p>
                <p className="text-muted-foreground">{order?.phone ?? '—'}</p>
                <p className="text-muted-foreground">{order?.email || 'нет email'}</p>
                <p>
                  {[order?.carBrand, order?.carModel].filter(Boolean).join(' ') || 'Авто не указано'}
                </p>
                {order?.carVin ? <p className="font-mono text-xs">{order.carVin}</p> : null}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Позиции</CardTitle>
          </CardHeader>
          <CardContent>
            {elementsQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : elements.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Позиций пока нет. Откройте поиск и добавьте товар в заказ.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Артикул</TableHead>
                    <TableHead>Бренд</TableHead>
                    <TableHead>Наименование</TableHead>
                    <TableHead>Кол-во</TableHead>
                    <TableHead className="text-right">Цена</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {elements.map((el) => (
                    <TableRow key={el.id}>
                      <TableCell className="font-mono text-xs">{el.article ?? '—'}</TableCell>
                      <TableCell>{el.brand ?? '—'}</TableCell>
                      <TableCell>{el.name ?? el.description ?? '—'}</TableCell>
                      <TableCell>{el.quantity ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        {el.price != null ? `${el.price} ₽` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
