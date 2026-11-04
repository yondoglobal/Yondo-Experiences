import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../App.jsx'
import { CATEGORIES, CAT, searchExperiences, recommendedRank } from '../lib/catalogue.js'
import { Icon, CAT_ICON } from '../components/Icon.jsx'
import { TicketCard, Mascot, navigate } from '../components/ui.jsx'
import { waLink } from '../lib/format.js'

const EMIRATE_FILTERS = ['Dubai', 'Abu Dhabi', 'Ras Al Khaimah', 'Fujairah', 'Musandam']
const PRICE_STEPS = [0, 100, 150, 250, 500, 1000]

export default function Explore({ cat }) {
  const { catalogue, query, setQuery } = useApp()
  const [emirate, setEmirate] = useState('')
  const [maxPrice, setMaxPrice] = useState(() => {
    try {
      const v = sessionStorage.getItem('yx.maxPrice')
      sessionStorage.removeItem('yx.maxPrice')
      return v ? parseInt(v) : 0
    } catch {
      return 0
    }
  })
  const [sort, setSort] = useState('recommended')
  const active = cat && CAT[cat] ? cat : ''


  const results = useMemo(() => {
    let list = catalogue.experiences
    if (active) list = list.filter((e) => e.cat === active)
    if (emirate) list = list.filter((e) => e.emirate === emirate)
    if (maxPrice) list = list.filter((e) => e.fromUnit !== 'trip' && e.from <= maxPrice)
    if (query.trim()) list = searchExperiences(list, query)
    else if (sort === 'recommended') list = [...list].sort((a, b) => recommendedRank(a) - recommendedRank(b) || a.sort - b.sort || a.name.localeCompare(b.name))
    if (sort === 'low') list = [...list].sort((a, b) => a.from - b.from)
    if (sort === 'high') list = [...list].sort((a, b) => b.from - a.from)
    return list
  }, [catalogue, active, emirate, maxPrice, query, sort])

  const filtersOn = !!(emirate || maxPrice || query)

  return (
    <div className="explore">
      <section className="explore-head">
        <div className="wrap">
          <h1>{active ? CAT[active].label : 'Explore the UAE'}</h1>
          <p className="muted">{active ? CAT[active].blurb : 'Every experience we can book for you, with live prices from our supplier list.'}</p>
          <div className="explore-search" role="search">
            <Icon name="search" size={20} />
            <label htmlFor="explore-q" className="sr-only">
              Search experiences
            </label>
            <input
              id="explore-q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, place or vibe"
              autoComplete="off"
            />
            {query && (
              <button className="icon-btn" onClick={() => setQuery('')} aria-label="Clear search">
                <Icon name="close" size={18} />
              </button>
            )}
          </div>
          <div className="cat-chips" role="tablist" aria-label="Categories">
            <button role="tab" aria-selected={!active} className={`chip ${!active ? 'on' : ''}`} onClick={() => navigate('explore')}>
              All
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                role="tab"
                aria-selected={active === c.id}
                className={`chip ${active === c.id ? 'on' : ''}`}
                onClick={() => navigate('explore-' + c.id)}
              >
                <Icon name={CAT_ICON[c.id]} size={16} /> {c.short}
              </button>
            ))}
          </div>
          <div className="filter-row">
            <div className="select-wrap">
              <label htmlFor="f-emirate" className="sr-only">
                Emirate
              </label>
              <select id="f-emirate" value={emirate} onChange={(e) => setEmirate(e.target.value)}>
                <option value="">Anywhere</option>
                {EMIRATE_FILTERS.map((x) => (
                  <option key={x} value={x}>
                    {x === 'Musandam' ? 'Musandam (Oman)' : x}
                  </option>
                ))}
              </select>
              <Icon name="down" size={16} />
            </div>
            <div className="select-wrap">
              <label htmlFor="f-price" className="sr-only">
                Price per person
              </label>
              <select id="f-price" value={maxPrice} onChange={(e) => setMaxPrice(parseInt(e.target.value))}>
                {PRICE_STEPS.map((p) => (
                  <option key={p} value={p}>
                    {p ? `Up to AED ${p} pp` : 'Any price'}
                  </option>
                ))}
              </select>
              <Icon name="down" size={16} />
            </div>
            <div className="select-wrap">
              <label htmlFor="f-sort" className="sr-only">
                Sort
              </label>
              <select id="f-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="recommended">Recommended</option>
                <option value="low">Price, low to high</option>
                <option value="high">Price, high to low</option>
              </select>
              <Icon name="down" size={16} />
            </div>
            <span className="result-count" aria-live="polite">
              {results.length} {results.length === 1 ? 'experience' : 'experiences'}
            </span>
          </div>
        </div>
      </section>

      <section className="wrap explore-results">
        {results.length ? (
          <div className="ticket-grid">
            {results.map((e) => (
              <TicketCard key={e.slug} exp={e} showStandard={catalogue.showStandard} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <Mascot pose="wavePhone" alt="" />
            <div>
              <h2>Nothing matches that yet</h2>
              <p>Try fewer filters, or tell us what you have in mind and we'll find it for you.</p>
              <div className="empty-actions">
                {filtersOn && (
                  <button
                    className="btn ghost"
                    onClick={() => {
                      setEmirate('')
                      setMaxPrice(0)
                      setQuery('')
                    }}
                  >
                    Clear filters
                  </button>
                )}
                <a className="btn gold" href={waLink(`Hi Yondo! I'm looking for ${query || 'something to do'}.`)} target="_blank" rel="noopener">
                  <Icon name="whatsapp" size={18} /> Ask us on WhatsApp
                </a>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
