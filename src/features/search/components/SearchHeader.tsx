// @ts-nocheck
import { BrandSelector } from './BrandSelector'
import { SearchTabs } from './SearchTabs'

export function SearchHeader({
  cityLabel,
  searchArticle,
  onArticleChange,
  onSearch,
  onClear,
  brands,
  articleParam,
  activeBrand,
  onBrandSelect,
  activeTab,
  onTabChange,
  analogsCount,
  searchedCount,
}) {
  return (
    <div className="searchzone">
      <div className="sz-in">
        <div className="city">
          Наличие и стоимость для города
          <button type="button">
            <svg className="ic" viewBox="0 0 24 24">
              <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z" />
              <circle cx="12" cy="10" r="2.6" />
            </svg>
            {cityLabel}
            <svg className="ic" viewBox="0 0 24 24">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <span className="sp" />
        </div>
        <div className="qrow">
          <div className="qbox">
            <svg className="ic ic-l" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              placeholder="Артикул"
              value={searchArticle}
              onChange={(event) => onArticleChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onSearch(event.target.value)
              }}
            />
            <button className="clr" title="Очистить" type="button" onClick={onClear}>
              <svg className="ic" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="scope">
            <button type="button" className="on">Артикул</button>
            <button type="button">Название</button>
            <button type="button">По каталогу</button>
            <button type="button">Масла</button>
          </div>
          <button
            type="button"
            className="qgo"
            disabled={!searchArticle}
            onClick={() => onSearch(searchArticle)}
          >
            <svg className="ic" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            Искать
          </button>
        </div>
        <BrandSelector
          key={articleParam}
          brands={brands}
          selectedBrand={activeBrand}
          onSelect={onBrandSelect}
        />
        <SearchTabs
          activeTab={activeTab}
          onChange={onTabChange}
          analogsCount={analogsCount}
          searchedCount={searchedCount}
        />
      </div>
    </div>
  )
}
