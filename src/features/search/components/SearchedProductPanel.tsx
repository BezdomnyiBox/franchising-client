// @ts-nocheck
import { OffersMainSection } from './OffersMainSection'

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
    return <div className="card empty-msg">Введите артикул для поиска</div>
  }

  if (isSearchLoading) {
    return (
      <div className="card loading-card" aria-live="polite" aria-busy="true">
        <span className="loading-card__spinner" aria-label="Загрузка" />
        <span>Идёт поиск товара...</span>
      </div>
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
    <div className="card empty-msg">
      {brands.length ? 'Нет товаров для выбранного бренда' : 'Информации о товаре нет'}
    </div>
  )
}
