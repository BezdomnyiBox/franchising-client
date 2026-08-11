import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

/**
 * Отдельная страница поиска больше не нужна для подбора в заказ:
 * как в CRM, поиск открывается локально на позиции (ОЕМ / корзина → set_item).
 */
export function SearchPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Поиск товаров</h1>
        <p className="text-sm text-muted-foreground">
          Подбор товара делается из карточки заказа — на строке позиции.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Как подобрать</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ol className="list-decimal space-y-2 pl-4">
            <li>Откройте заказ.</li>
            <li>
              Введите ОЕМ в поле позиции и нажмите Enter — или нажмите корзину (сначала сохранится
              ОЕМ).
            </li>
            <li>Выберите предложение — позиция заменится через set_item (в т.ч. заглушка «Деталь»).</li>
          </ol>
          <Button asChild>
            <Link to="/orders">К списку заказов</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
