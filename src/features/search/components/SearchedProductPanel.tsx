// @ts-nocheck
import { OffersMainSection } from './OffersMainSection'
import { SearchEmpty, SearchLoading } from './search-ui'
import { Card, CardContent } from '@/components/ui/card'

export function SearchedProductPanel({
  articleParam,
  isSearchLoading,
  currentGood,
  brands,
  offers,
  availableLoading,
  offerLoading,
  supplierOfferGroups,
  onToggleSupplier,
  initialOrderNumber,
  cities,
  citiesLoading,
  currentTownId,
}) {
  if (!articleParam) {
    return (
      <Card>
        <CardContent className="pt-6">
          <SearchEmpty>Введите артикул для поиска</SearchEmpty>
        </CardContent>
      </Card>
    )
  }

  if (isSearchLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <SearchLoading label="Идёт поиск товара…" />
        </CardContent>
      </Card>
    )
  }

  if (currentGood) {
    return (
      <OffersMainSection
        good={currentGood}
        offers={offers}
        offersLoading={{
          available: availableLoading,
          offer: offerLoading,
        }}
        supplierOfferGroups={supplierOfferGroups}
        onToggleSupplier={onToggleSupplier}
        initialOrderNumber={initialOrderNumber}
        cities={cities}
        citiesLoading={citiesLoading}
        currentTownId={currentTownId}
      />
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <SearchEmpty>
          {brands.length ? 'Нет товаров для выбранного бренда' : 'Информации о товаре нет'}
        </SearchEmpty>
      </CardContent>
    </Card>
  )
}
