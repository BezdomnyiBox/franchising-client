// @ts-nocheck
import { TAB_ANALOGS, TAB_SEARCHED } from '../lib/constants'

export function SearchTabs({ activeTab, onChange, analogsCount, searchedCount }) {
  return (
    <div className="tabs">
      <button
        type="button"
        className={`tab${activeTab === TAB_SEARCHED ? ' on' : ''}`}
        onClick={() => onChange(TAB_SEARCHED)}
      >
        Искомая запчасть
        {searchedCount > 0 ? <span className="n">{searchedCount}</span> : null}
      </button>
      <button
        type="button"
        className={`tab${activeTab === TAB_ANALOGS ? ' on' : ''}`}
        onClick={() => onChange(TAB_ANALOGS)}
      >
        Аналоги
        {analogsCount > 0 ? <span className="n">{analogsCount}</span> : null}
      </button>
    </div>
  )
}
