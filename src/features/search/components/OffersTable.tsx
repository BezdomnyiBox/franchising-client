// @ts-nocheck
import { OfferRow } from './OfferRow'
import { SearchEmpty } from './search-ui'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function OffersTable({ good, offers, initialOrderNumber }) {
  if (!offers.length) {
    return <SearchEmpty>Нет предложений</SearchEmpty>
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Склад и поставщик</TableHead>
            <TableHead>Цена</TableHead>
            <TableHead>Готовность к выдаче</TableHead>
            <TableHead>Кол-во</TableHead>
            <TableHead>Гарантия</TableHead>
            <TableHead className="text-right">Действие</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {offers.map((offer) => (
            <OfferRow
              key={`${offer.supplierAlias}|${offer.warehouseVendorId}`}
              good={good}
              offer={offer}
              isBest={offer.bestId}
              isFast={offer.isFast}
              initialOrderNumber={initialOrderNumber}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
