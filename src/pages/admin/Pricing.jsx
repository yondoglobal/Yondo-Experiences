import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApp } from '../../App.jsx'
import { supabase } from '../../lib/api.js'
import { CAT, todayUAE } from '../../lib/catalogue.js'
import { niceDate, niceDateTime } from '../../lib/format.js'
import { Icon } from '../../components/Icon.jsx'
import { Field, Notice, Sheet } from '../../components/ui.jsx'
import { autoSell, breakdown, priceForNet, priceForMargin, sellable, COMMISSION_TYPES, fmt, pct, r2 } from './money.js'

// ------------------------------------------------------------ data
export function derive(r, s, today) {
  const fee = Number(s.fee_pct)
  const fl = Number(s.profit_floor)
  const n = (x) => Number(x) || 0
  const ra = n(r.rec_adult), rc = n(r.rec_child), rt = n(r.rec_trip)
  const ca = n(r.cost_adult), cc = n(r.cost_child), ct = n(r.cost_trip)
  const combined = ra > 0 && rt > 0
  const d = r.discount_pct
  const aFloor = combined ? 0 : fl
  const childOk = ra > 0 && rc > 0 && rc * (1 - fee / 100) - cc >= aFloor
  const auto = {
    a: ra > 0 ? autoSell(ra, ca, d, fee, aFloor) : null,
    c: childOk ? autoSell(rc, cc, d, fee, aFloor) : null,
    t: rt > 0 ? autoSell(rt, ct, d, fee, fl) : null,
  }
  const offerLive = !!r.offer_id && (!r.offer_starts || r.offer_starts <= today)
  const pick = (k, ov) => (offerLive && ov != null ? Number(ov) : auto[k])
  const price = { a: pick('a', r.offer_adult), c: pick('c', r.offer_child), t: pick('t', r.offer_trip) }
  const lead = ra > 0 ? 'a' : 't'
  const pkg = {
    price: (lead === 'a' ? price.a : 0) + (rt > 0 ? price.t : 0),
    cost: (lead === 'a' ? ca : 0) + (rt > 0 ? ct : 0),
    standard: (lead === 'a' ? ra : 0) + (rt > 0 ? rt : 0),
  }
  const b = breakdown({ ...pkg, feePct: fee })
  const status = !r.sellable ? 'hidden' : r.experience_hidden ? 'off' : offerLive ? 'offer' : r.offer_id ? 'scheduled' : 'auto'
  return { ...r, ra, rc, rt, ca, cc, ct, combined, childOk, auto, price, lead, pkg, b, status, offerLive, fee, floor: fl, sellable: !!r.sellable }
}

export const STATUS_LABEL = { offer: 'On offer', scheduled: 'Offer scheduled', auto: 'Auto price', hidden: 'Hidden: under floor', off: 'Experience hidden' }

export function unitLabel(r) {
  if (r.unit === 'person+trip') return 'per person + vehicle'
  if (r.unit === 'trip') return 'per booking'
  return 'per person'
}

// ------------------------------------------------------------ main
export default function Pricing({ settings, demo, onChange }) {
  const { showToast } = useApp()
  const [raw, setRaw] = useState(null)
  const [offers, setOffers] = useState([])
  const [q, setQ] = useState('')
  const [view, setView] = useState('all')
  const [sort, setSort] = useState('name')
  const [open, setOpen] = useState(null)
  const today = todayUAE()

  const load = useCallback(async () => {
    if (demo) {
      setRaw(DEMO_PRICING)
      setOffers(DEMO_OFFERS)
      return
    }
    const [p, o] = await Promise.all([
      loadPricing(false).catch(() => null),
      supabase.from('price_overrides').select('*').order('created_at', { ascending: false }).limit(500),
    ])
    if (!p) showToast('Could not load prices.', 'error')
    setRaw(p || [])
    setOffers(o.data || [])
  }, [demo, showToast])

  useEffect(() => {
    load()
  }, [load])

  const rows = useMemo(() => (raw || []).map((r) => derive(r, settings, today)), [raw, settings, today])
  const byKey = useMemo(() => Object.fromEntries(rows.map((r) => [r.option_key, r])), [rows])
  const onSale = rows.filter((r) => ['auto', 'offer', 'scheduled'].includes(r.status))
  const kpi = {
    onSale: onSale.length,
    avgMargin: onSale.length ? onSale.reduce((s, r) => s + r.b.marginPct, 0) / onSale.length : 0,
    offers: rows.filter((r) => r.status === 'offer').length,
    thin: onSale.filter((r) => r.b.marginPct < 5).length,
    hidden: rows.filter((r) => r.status === 'hidden').length,
  }

  const list = rows
    .filter((r) => {
      if (view === 'offer' && !['offer', 'scheduled'].includes(r.status)) return false
      if (view === 'thin' && !(['auto', 'offer'].includes(r.status) && r.b.marginPct < 5)) return false
      if (view === 'hidden' && r.status !== 'hidden') return false
      if (q) return (r.experience + ' ' + r.ticket).toLowerCase().includes(q.toLowerCase())
      return true
    })
    .sort((a, b) =>
      sort === 'margin' ? a.b.marginPct - b.b.marginPct : sort === 'net' ? b.b.net - a.b.net : a.experience.localeCompare(b.experience) || a.ticket.localeCompare(b.ticket)
    )

  const current = open ? byKey[open] : null
  const refresh = () => {
    load()
    onChange()
  }

  return (
    <div className="pricing">
      <Calculator fee={Number(settings.fee_pct)} floor={Number(settings.profit_floor)} />

      <div className="card">
        <div className="section-head">
          <div>
            <h2>Every ticket, live</h2>
            <p className="muted small">
              Buying price, market price and what each ticket sells for today, with the {Number(settings.fee_pct)}% PG fee and what Yondo keeps
              (before any referral commission). Tap a ticket to change any of its prices.
            </p>
          </div>
        </div>
        <div className="kpis compact">
          <Kpi label="On sale" value={kpi.onSale} />
          <Kpi label="Average margin" value={pct(kpi.avgMargin)} />
          <Kpi label="On offer" value={kpi.offers} />
          <Kpi label="Under 5% margin" value={kpi.thin} tone={kpi.thin ? 'warn' : ''} />
          <Kpi label="Hidden by floor" value={kpi.hidden} />
        </div>
        <div className="admin-filters">
          <div className="seg">
            {[['all', 'All'], ['offer', 'Offers'], ['thin', 'Thin margin'], ['hidden', 'Hidden']].map(([id, l]) => (
              <button key={id} className={view === id ? 'on' : ''} onClick={() => setView(id)}>
                {l}
              </button>
            ))}
          </div>
          <input className="admin-search" placeholder="Search experience or ticket" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search tickets" />
          <div className="select-wrap">
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort tickets">
              <option value="name">Sort by name</option>
              <option value="margin">Lowest margin first</option>
              <option value="net">Highest profit first</option>
            </select>
            <Icon name="down" size={16} />
          </div>
        </div>
        {raw === null ? (
          <p className="muted">Loading prices…</p>
        ) : list.length ? (
          <div className="table-wrap">
            <table className="admin-table pricing-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th className="num">Buying price</th>
                  <th className="num">Market price</th>
                  <th className="num">Our price</th>
                  <th className="num">PG {Number(settings.fee_pct)}%</th>
                  <th className="num">Yondo keeps</th>
                  <th className="num">Margin</th>
                  <th>Updated</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.option_key} onClick={() => setOpen(r.option_key)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen(r.option_key)} className={r.status === 'hidden' ? 'dim' : ''}>
                    <td>
                      <strong>{r.experience}</strong>
                      <small>
                        {r.ticket} · {unitLabel(r)}
                      </small>
                      {groupLine(r) && <small className="group-small">{groupLine(r)}</small>}
                    </td>
                    <td className="num">{fmt(r.pkg.cost)}</td>
                    <td className="num">{fmt(r.pkg.standard)}</td>
                    <td className="num strong">
                      {fmt(r.pkg.price)}
                      {r.b.savePct > 0 && <small>{pct(r.b.savePct)} off</small>}
                    </td>
                    <td className="num">−{fmt(r.b.fee)}</td>
                    <td className={`num ${r.b.net < r.floor ? 'neg' : ''}`}>{fmt(r.b.net)}</td>
                    <td className="num">
                      <MarginBar pct={r.b.marginPct} />
                    </td>
                    <td className="updated-cell">
                      {r.updated_at ? niceDate(r.updated_at, { day: 'numeric', month: 'short' }) : '—'}
                      <small>{r.updated_by && r.updated_by !== 'system' ? 'Edited in admin' : 'Price list'}</small>
                    </td>
                    <td>
                      <span className={`pill p-${r.status}`}>{STATUS_LABEL[r.status]}</span>
                      {r.offer_label && ['offer', 'scheduled'].includes(r.status) && <small>{r.offer_label}</small>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted empty-admin">No tickets in this view.</p>
        )}
      </div>

      <OffersList offers={offers} byKey={byKey} today={today} demo={demo} onChange={refresh} onOpen={setOpen} />

      {current && <TicketSheet r={current} settings={settings} demo={demo} onClose={() => setOpen(null)} onSaved={refresh} />}
    </div>
  )
}

function Kpi({ label, value, tone }) {
  return (
    <div className={`kpi ${tone || ''}`}>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  )
}

export function MarginBar({ pct: p }) {
  const w = Math.max(0, Math.min(100, p * 3))
  const tone = p < 3 ? 'low' : p < 8 ? 'mid' : 'high'
  return (
    <span className="margin-cell">
      <span className={`margin-bar ${tone}`} aria-hidden="true">
        <span style={{ width: w + '%' }} />
      </span>
      {pct(p)}
    </span>
  )
}

// ------------------------------------------------------------ money breakdown (shared)
function Breakdown({ b, floor, label = 'Customer pays', commissionLabel }) {
  const total = Math.max(b.price, 0.01)
  const seg = [
    ['cost', 'Supplier', b.cost],
    ['fee', 'Gateway', b.fee],
    ['com', 'Commission', b.commission],
    ['net', 'Yondo', Math.max(0, b.net)],
  ].filter((x) => x[2] > 0)
  return (
    <div className="breakdown">
      <div className="split-bar" role="img" aria-label={`Of ${fmt(b.price)}: supplier ${fmt(b.cost)}, gateway ${fmt(b.fee)}, commission ${fmt(b.commission)}, Yondo ${fmt(b.net)}`}>
        {seg.map(([k, l, v]) => (
          <span key={k} className={`sb-${k}`} style={{ flexGrow: v / total }} title={`${l}: ${fmt(v)}`} />
        ))}
      </div>
      <dl className="dl num bd-list">
        <dt>{label}</dt>
        <dd className="strong">{fmt(b.price)}</dd>
        {b.save > 0 && (
          <>
            <dt className="muted">Saves vs standard</dt>
            <dd className="muted">
              {fmt(b.save)} ({pct(b.savePct)})
            </dd>
          </>
        )}
        <dt>
          <i className="dot sb-cost" /> Supplier
        </dt>
        <dd>−{fmt(b.cost)}</dd>
        <dt>
          <i className="dot sb-fee" /> Bank and gateway
        </dt>
        <dd>−{fmt(b.fee)}</dd>
        {b.commission > 0 && (
          <>
            <dt>
              <i className="dot sb-com" /> {commissionLabel || 'Commission'}
            </dt>
            <dd>−{fmt(b.commission)}</dd>
          </>
        )}
        <dt className="strong">
          <i className="dot sb-net" /> Yondo keeps
        </dt>
        <dd className={`strong ${b.net < 0 ? 'neg' : b.net < floor ? 'warn-text' : 'pos'}`}>{fmt(b.net)}</dd>
        <dt className="muted">Margin on the sale</dt>
        <dd className="muted">{pct(b.marginPct)}</dd>
        <dt className="muted">Break-even price</dt>
        <dd className="muted">{fmt(b.breakEven)}</dd>
      </dl>
    </div>
  )
}

function CommissionPicker({ idp, type, value, onType, onValue }) {
  return (
    <div className="two">
      <Field id={`${idp}-ct`} label="Commission">
        <div className="select-wrap full">
          <select id={`${idp}-ct`} value={type} onChange={(e) => onType(e.target.value)}>
            {COMMISSION_TYPES.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
          <Icon name="down" size={16} />
        </div>
      </Field>
      {type === 'none' ? (
        <p className="muted small commission-none">Pick a type to see the effect of a referral code.</p>
      ) : (
        <Field id={`${idp}-cv`} label={type.endsWith('pct') ? 'Commission %' : 'Commission AED'}>
          <input id={`${idp}-cv`} type="number" min={0} step="0.5" value={value} onChange={(e) => onValue(e.target.value)} />
        </Field>
      )}
    </div>
  )
}

function Solvers({ idp = 'sv', opts, onPrice }) {
  const [net, setNet] = useState('')
  const [margin, setMargin] = useState('')
  const pNet = net !== '' ? priceForNet(net, opts) : null
  const pMargin = margin !== '' ? priceForMargin(margin, opts) : null
  return (
    <div className="solvers">
      <div className="solver">
        <label htmlFor={`${idp}-net`}>To keep AED</label>
        <input id={`${idp}-net`} type="number" min={0} step="1" value={net} onChange={(e) => setNet(e.target.value)} placeholder="10" />
        <span className="muted">sell at</span>
        <strong>{pNet != null ? fmt(Math.ceil(pNet)) : '—'}</strong>
        <button type="button" className="btn ghost small" disabled={pNet == null} onClick={() => onPrice(Math.ceil(pNet))}>
          Use
        </button>
      </div>
      <div className="solver">
        <label htmlFor={`${idp}-m`}>For a margin of</label>
        <input id={`${idp}-m`} type="number" min={0} max={90} step="0.5" value={margin} onChange={(e) => setMargin(e.target.value)} placeholder="8" />
        <span className="muted">% sell at</span>
        <strong>{pMargin != null ? fmt(Math.ceil(pMargin)) : '—'}</strong>
        <button type="button" className="btn ghost small" disabled={pMargin == null} onClick={() => onPrice(Math.ceil(pMargin))}>
          Use
        </button>
      </div>
    </div>
  )
}

// ------------------------------------------------------------ standalone calculator
function Calculator({ fee: siteFee, floor }) {
  const [f, setF] = useState({ cost: 80, standard: 120, price: 100, units: 1, ctype: 'fixed_ticket', cval: 10, fee: siteFee })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const units = Math.max(1, parseInt(f.units) || 1)
  const opts = { cost: Number(f.cost) * units, feePct: Number(f.fee), commissionType: f.ctype, commissionValue: f.cval, units }
  const b = breakdown({ ...opts, price: Number(f.price) * units, standard: Number(f.standard) * units })
  const lo = Math.max(0, Math.floor(b.breakEven / units))
  const hi = Math.max(lo + 1, Math.ceil(Number(f.standard) || lo * 1.5 + 1))
  return (
    <div className="card calc">
      <div className="section-head">
        <div>
          <h2>Margin calculator</h2>
          <p className="muted small">Type what you buy at, the market price and your price. Everything else works itself out.</p>
        </div>
        <button className="btn ghost small" onClick={() => setF({ cost: '', standard: '', price: '', units: 1, ctype: 'none', cval: 0, fee: siteFee })}>
          Clear
        </button>
      </div>
      <div className="calc-grid">
        <div className="calc-inputs">
          <div className="two">
            <Field id="cl-cost" label="We buy at (AED)">
              <input id="cl-cost" type="number" min={0} step="0.01" value={f.cost} onChange={set('cost')} inputMode="decimal" />
            </Field>
            <Field id="cl-std" label="Market price (AED)">
              <input id="cl-std" type="number" min={0} step="0.01" value={f.standard} onChange={set('standard')} inputMode="decimal" />
            </Field>
          </div>
          <Field id="cl-price" label="We sell at (AED)">
            <input id="cl-price" type="number" min={0} step="0.01" value={f.price} onChange={set('price')} inputMode="decimal" className="big-input" />
          </Field>
          <input
            type="range"
            className="price-range"
            min={lo}
            max={hi}
            step={1}
            value={Math.min(hi, Math.max(lo, Number(f.price) || lo))}
            onChange={set('price')}
            aria-label="Drag to set our price"
          />
          <div className="range-ends muted small">
            <span>Break-even {fmt(b.breakEven / units)}</span>
            <span>Market {fmt(hi)}</span>
          </div>
          <CommissionPicker idp="cl" type={f.ctype} value={f.cval} onType={(v) => setF({ ...f, ctype: v })} onValue={(v) => setF({ ...f, cval: v })} />
          <div className="two">
            <Field id="cl-fee" label="Bank and gateway %">
              <input id="cl-fee" type="number" min={0} max={20} step="0.1" value={f.fee} onChange={set('fee')} />
            </Field>
            <Field id="cl-units" label="Tickets">
              <input id="cl-units" type="number" min={1} max={500} value={f.units} onChange={set('units')} />
            </Field>
          </div>
        </div>
        <div className="calc-out">
          <div className={`calc-headline ${b.net < 0 ? 'neg' : b.net < floor * units ? 'warn' : 'pos'}`}>
            <small>Yondo keeps</small>
            <strong>{fmt(b.net)}</strong>
            <span>
              {pct(b.marginPct)} margin{units > 1 ? ` on ${units} tickets` : ''}
            </span>
          </div>
          <Breakdown b={b} floor={floor * units} />
          <Solvers idp="cl-sv" opts={opts} onPrice={(p) => setF({ ...f, price: r2(p / units) })} />
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------ one ticket: supplier prices, our price and offer in one place
export function groupLine(r) {
  const g = r.group_prices || []
  return g.length ? 'Groups: ' + g.map((x) => `${x.n}+ ${fmt(x.p)}`).join(' · ') : ''
}

export function updatedLine(r) {
  if (!r.updated_at) return ''
  const by = r.updated_by && r.updated_by !== 'system' ? `edited by ${r.updated_by}` : `from ${r.source_file || 'the price list'}`
  return `${niceDateTime(r.updated_at)} · ${by}`
}

export function TicketSheet({ r, settings, demo, onClose, onSaved }) {
  const { showToast } = useApp()
  const today = todayUAE()
  const fee = Number(settings.fee_pct)
  const fl = Number(settings.profit_floor)
  const str = (x) => (x == null ? '' : String(Number(x)))
  const num = (x) => (String(x).trim() === '' ? null : Number(x))
  const initSup = { ra: str(r.rec_adult), rc: str(r.rec_child), rt: str(r.rec_trip), ca: str(r.cost_adult), cc: str(r.cost_child), ct: str(r.cost_trip) }
  const initOurs = { a: r.offer_id ? str(r.offer_adult) : '', c: r.offer_id ? str(r.offer_child) : '', t: r.offer_id ? str(r.offer_trip) : '' }
  const [sup, setSup] = useState(initSup)
  const [ours, setOurs] = useState(initOurs)
  const [label, setLabel] = useState(r.offer_label || '')
  const [start, setStart] = useState(r.offer_starts || '')
  const [end, setEnd] = useState(r.offer_ends || '')
  const [allPeriods, setAllPeriods] = useState(false)
  const [ctype, setCtype] = useState('none')
  const [cval, setCval] = useState(settings.default_commission_share ?? 30)
  const [disc, setDisc] = useState(r.experience_discount ?? '')
  const [busy, setBusy] = useState(false)
  const initGroups = (r.group_prices || []).map((g) => ({ n: String(g.n), pp: str(g.p), total: str(r2(g.p * g.n)) }))
  const g0 = (r.group_prices || [])[0] || {}
  const [groups, setGroups] = useState(initGroups)
  const [gLabel, setGLabel] = useState(g0.label || '')
  const [gStart, setGStart] = useState(g0.starts || '')
  const [gEnd, setGEnd] = useState(g0.ends || '')

  const showA = r.unit !== 'trip'
  const showT = r.unit !== 'person'
  const v = Object.fromEntries(Object.entries(sup).map(([k, x]) => [k, num(x) ?? 0]))
  const anyOurs = ['a', 'c', 't'].some((k) => ours[k] !== '')
  const live = derive(
    {
      ...r, rec_adult: v.ra, rec_child: v.rc, rec_trip: v.rt, cost_adult: v.ca, cost_child: v.cc, cost_trip: v.ct,
      offer_id: anyOurs ? r.offer_id || 'new' : null, offer_starts: null, offer_adult: num(ours.a), offer_child: num(ours.c), offer_trip: num(ours.t),
      sellable: sellable(v.ra, v.rt, v.ca, v.ct, fee, fl),
    },
    settings,
    today
  )

  const rows = [
    showA && { k: 'a', name: 'Adult', buy: 'ca', mkt: 'ra' },
    showA && { k: 'c', name: 'Child', buy: 'cc', mkt: 'rc' },
    showT && { k: 't', name: r.unit === 'trip' ? 'Booking' : 'Vehicle', buy: 'ct', mkt: 'rt' },
  ].filter(Boolean)
  const lineFor = (k) => {
    if (k === 'c' && !live.childOk) {
      const price = live.price.a || 0
      return { price, cost: v.ca, asAdult: true, ...lineMoney(price, v.ca) }
    }
    const price = live.price[k] || 0
    const cost = k === 'a' ? v.ca : k === 'c' ? v.cc : v.ct
    return { price, cost, ...lineMoney(price, cost) }
  }
  function lineMoney(price, cost) {
    const pg = (price * fee) / 100
    const keeps = price - pg - cost
    return { pg, keeps, margin: price > 0 ? (keeps / price) * 100 : 0, breakEven: cost / (1 - fee / 100) }
  }

  const b = breakdown({ ...live.pkg, feePct: fee, commissionType: ctype, commissionValue: ctype === 'none' ? 0 : cval })

  const problems = []
  const warnings = []
  if (Object.values(sup).some((x) => x !== '' && (isNaN(Number(x)) || Number(x) < 0))) problems.push('Prices can’t be negative.')
  if (showA && !(v.ra > 0)) problems.push('Add the adult market price.')
  if (r.unit === 'trip' && !(v.rt > 0)) problems.push('Add the market price.')
  for (const row of rows) {
    const o = ours[row.k]
    if (o !== '' && !(Number(o) > 0)) problems.push(`${row.name}: our price must be more than zero.`)
    const l = lineFor(row.k)
    if (row.k === 'c' && l.asAdult) continue
    if (l.price > 0 && l.keeps < 0) problems.push(`${row.name} sells at a loss. Break-even is ${fmt(Math.ceil(l.breakEven))}.`)
    const mkt = v[row.mkt]
    if (o !== '' && mkt > 0 && Number(o) > mkt) warnings.push(`${row.name}: our price is above the market price, so no saving shows to customers.`)
  }
  if (start && end && end < start) problems.push('The offer ends before it starts.')
  const normalPp = live.price.a || 0
  const seenN = new Set()
  for (const g of groups) {
    const n = parseInt(g.n)
    const pp = num(g.pp)
    if (!(n >= 2)) problems.push('Group prices need at least 2 guests.')
    else if (seenN.has(n)) problems.push(`There are two group prices for ${n}+ guests.`)
    seenN.add(n)
    if (!(pp > 0)) problems.push(`Add the price for ${n || '?'}+ guests.`)
    else if (pp - (pp * fee) / 100 - v.ca < 0) problems.push(`The ${n}+ group price sells at a loss. Break-even is ${fmt(Math.ceil(v.ca / (1 - fee / 100)))} each.`)
    else if (normalPp && pp >= normalPp) warnings.push(`The ${n}+ price (${fmt(pp)} each) isn't lower than the normal price (${fmt(normalPp)}), so it won't change anything.`)
  }
  if (gStart && gEnd && gEnd < gStart) problems.push('The group prices end before they start.')
  if (!live.sellable && !problems.length) warnings.push(`At the market price this ticket earns less than your floor (${fmt(fl)}), so it stays hidden from the site.`)
  else if (b.net >= 0 && live.b.net < fl && !problems.length) warnings.push(`Yondo keeps less than your floor of ${fmt(fl)} here. It will still sell at this price.`)

  const supChanged = JSON.stringify(sup) !== JSON.stringify(initSup)
  const offerChanged = JSON.stringify(ours) !== JSON.stringify(initOurs) || label !== (r.offer_label || '') || start !== (r.offer_starts || '') || end !== (r.offer_ends || '')
  const groupsChanged =
    JSON.stringify(groups.map((g) => [parseInt(g.n), num(g.pp)])) !== JSON.stringify(initGroups.map((g) => [parseInt(g.n), num(g.pp)])) ||
    (groups.length > 0 && (gLabel !== (g0.label || '') || gStart !== (g0.starts || '') || gEnd !== (g0.ends || '')))
  const dirty = supChanged || offerChanged || groupsChanged

  async function save() {
    if (demo) return showToast('Example data. Changes are not saved.', 'error')
    if (problems.length || !dirty) return
    setBusy(true)
    const done = []
    try {
      if (supChanged) {
        const fields = { rec_adult: v.ra, rec_child: v.rc, rec_trip: v.rt, cost_adult: v.ca, cost_child: v.cc, cost_trip: v.ct }
        let q = supabase.from('price_rows').update(fields)
        q = allPeriods ? q.eq('option_key', r.option_key).gte('period_end', today) : q.eq('id', r.price_row_id)
        const { error } = await q
        if (error) throw error
        done.push('supplier prices')
      }
      if (offerChanged) {
        if (anyOurs) {
          const row = {
            option_key: r.option_key, label: label.trim().slice(0, 28) || null, sell_adult: num(ours.a), sell_child: num(ours.c), sell_trip: num(ours.t),
            starts_on: start || null, ends_on: end || null, active: true,
          }
          const { error } = r.offer_id ? await supabase.from('price_overrides').update(row).eq('id', r.offer_id) : await supabase.from('price_overrides').insert(row)
          if (error) throw error
          done.push('our price')
        } else if (r.offer_id) {
          const { error } = await supabase.from('price_overrides').update({ active: false }).eq('id', r.offer_id)
          if (error) throw error
          done.push('automatic price')
        }
      }
      if (groupsChanged) {
        const tiers = groups.map((g) => ({ n: parseInt(g.n), p: num(g.pp) })).sort((a, b) => a.n - b.n)
        const { data, error } = await supabase.rpc('admin_set_group_prices', {
          p_option: r.option_key, p_tiers: tiers, p_label: gLabel.trim().slice(0, 28) || null, p_starts: gStart || null, p_ends: gEnd || null,
        })
        if (error || data?.ok === false) throw error || new Error(data.error)
        done.push(tiers.length ? 'group prices' : 'group prices removed')
      }
      showToast(`Saved ${done.join(' and ')}. The site is using it now.`)
      onSaved()
      onClose()
    } catch {
      showToast(done.length ? `Saved ${done.join(' and ')}, but not the rest. Refresh and check.` : 'Could not save. Nothing was changed.', 'error')
      if (done.length) onSaved()
    }
    setBusy(false)
  }

  async function saveDiscount() {
    if (demo) return showToast('Example data. Changes are not saved.', 'error')
    const val = disc === '' ? null : Math.min(60, Math.max(0, Number(disc)))
    const { error } = await supabase.from('experiences').update({ discount_pct: val }).eq('id', r.experience_id)
    if (error) return showToast('Could not save.', 'error')
    showToast(val == null ? 'Using the site discount again' : `${r.experience}: ${val}% off every ticket`)
    onSaved()
  }

  const leadPriceSetter = (p) => {
    const extra = live.lead === 'a' && showT ? live.price.t || 0 : 0
    setOurs({ ...ours, [live.lead]: String(Math.max(1, Math.ceil(p - extra))) })
  }

  return (
    <Sheet open onClose={onClose} title={r.ticket} wide>
      <div className="ticket-sheet">
        <p className="muted">
          {r.experience} · {CAT[r.category]?.label} · {unitLabel(r)} · price period {niceDate(r.period_start, { day: 'numeric', month: 'short' })} to{' '}
          {niceDate(r.period_end, { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>

        <div className="table-wrap">
          <table className="price-grid">
            <thead>
              <tr>
                <th />
                <th className="num">Buying price</th>
                <th className="num">Market price</th>
                <th className="num">Our price</th>
                <th className="num">PG {fee}%</th>
                <th className="num">Yondo keeps</th>
                <th className="num">Margin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const l = lineFor(row.k)
                const auto = live.auto[row.k]
                const childAsAdult = row.k === 'c' && l.asAdult
                return (
                  <tr key={row.k}>
                    <th scope="row">{row.name}</th>
                    <td className="num">
                      <input aria-label={`${row.name} buying price`} type="number" min={0} step="0.01" inputMode="decimal" value={sup[row.buy]} onChange={(e) => setSup({ ...sup, [row.buy]: e.target.value })} />
                    </td>
                    <td className="num">
                      <input aria-label={`${row.name} market price`} type="number" min={0} step="0.01" inputMode="decimal" value={sup[row.mkt]} onChange={(e) => setSup({ ...sup, [row.mkt]: e.target.value })} />
                    </td>
                    <td className="num">
                      <input
                        aria-label={`${row.name} our price`}
                        className={ours[row.k] !== '' ? 'set' : ''}
                        type="number"
                        min={0}
                        step="1"
                        inputMode="decimal"
                        disabled={childAsAdult}
                        placeholder={childAsAdult ? '= adult' : auto != null ? `Auto ${auto}` : ''}
                        value={ours[row.k]}
                        onChange={(e) => setOurs({ ...ours, [row.k]: e.target.value })}
                      />
                    </td>
                    <td className="num">{l.price ? `−${fmt(r2(l.pg))}` : '—'}</td>
                    <td className={`num strong ${l.keeps < 0 ? 'neg' : l.keeps < fl ? 'warn-text' : 'pos'}`}>{l.price ? fmt(r2(l.keeps)) : '—'}</td>
                    <td className="num">{l.price ? <MarginBar pct={r2(l.margin)} /> : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="fine grid-notes">
          Leave <strong>Our price</strong> empty to use the automatic price: market price minus {Number(live.discount_pct)}%, never under your floor.
          {live.combined && ' Customers pay the adult (and child) price per person plus one vehicle price per booking.'}
          {showA && !live.childOk && ' Children pay the adult price while the child figures leave no margin.'}
          <br />
          Supplier prices last updated {updatedLine(r) || 'with the last price list'}. The next Excel upload replaces buying and market prices; your own prices stay.
        </p>
        {r.periods > 1 && supChanged && (
          <label className="check">
            <input type="checkbox" checked={allPeriods} onChange={(e) => setAllPeriods(e.target.checked)} />
            <span>Apply these buying and market prices to all {r.periods} price periods of this ticket, not just this one</span>
          </label>
        )}

        {showA && (
          <section className="group-prices">
            <div className="gp-head">
              <div>
                <h3>Group prices</h3>
                <p className="muted small">
                  A lower price per person when more people book together, e.g. 2+ guests at one price and 4+ at a lower one. The site shows them on
                  the ticket and applies the best one to the booking total automatically.
                </p>
              </div>
              <button
                type="button"
                className="btn ghost small"
                onClick={() => {
                  const last = groups.length ? parseInt(groups[groups.length - 1].n) || 2 : 0
                  const n = last ? last + 2 : 2
                  setGroups([...groups, { n: String(n), pp: '', total: '' }])
                }}
              >
                <Icon name="plus" size={14} /> Add group price
              </button>
            </div>
            {groups.length > 0 && (
              <>
                <div className="table-wrap">
                  <table className="price-grid gp-grid">
                    <thead>
                      <tr>
                        <th>Guests</th>
                        <th className="num">Price for the group</th>
                        <th className="num">Per person</th>
                        <th className="num">PG {fee}%</th>
                        <th className="num">Yondo keeps each</th>
                        <th className="num">Margin</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map((g, i) => {
                        const n = parseInt(g.n) || 0
                        const pp = num(g.pp) || 0
                        const m = lineMoney(pp, v.ca)
                        const upd = (patch) => setGroups(groups.map((x, j) => (j === i ? { ...x, ...patch } : x)))
                        return (
                          <tr key={i}>
                            <th scope="row">
                              <span className="gp-n">
                                <input aria-label="Minimum guests" type="number" min={2} max={200} value={g.n} onChange={(e) => {
                                  const nn = parseInt(e.target.value) || 0
                                  upd({ n: e.target.value, total: g.pp !== '' && nn ? String(r2(Number(g.pp) * nn)) : g.total })
                                }} />
                                <span>+ guests</span>
                              </span>
                            </th>
                            <td className="num">
                              <input aria-label={`Total for ${n} guests`} type="number" min={0} step="1" inputMode="decimal" value={g.total} placeholder={n ? `for ${n}` : ''} onChange={(e) => {
                                const t = e.target.value
                                upd({ total: t, pp: t !== '' && n ? String(r2(Number(t) / n)) : '' })
                              }} />
                            </td>
                            <td className="num">
                              <input aria-label={`Price each for ${n}+ guests`} type="number" min={0} step="0.5" inputMode="decimal" value={g.pp} placeholder={normalPp ? `was ${normalPp}` : ''} onChange={(e) => {
                                const x = e.target.value
                                upd({ pp: x, total: x !== '' && n ? String(r2(Number(x) * n)) : '' })
                              }} />
                            </td>
                            <td className="num">{pp ? `−${fmt(r2(m.pg))}` : '—'}</td>
                            <td className={`num strong ${m.keeps < 0 ? 'neg' : m.keeps < fl ? 'warn-text' : 'pos'}`}>{pp ? fmt(r2(m.keeps)) : '—'}</td>
                            <td className="num">{pp ? <MarginBar pct={r2(m.margin)} /> : '—'}</td>
                            <td>
                              <button type="button" className="icon-btn" aria-label={`Remove ${n}+ group price`} onClick={() => setGroups(groups.filter((_, j) => j !== i))}>
                                <Icon name="close" size={16} />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="three">
                  <Field id="gp-label" label="Badge in the booking" optional hint="Shown when the group price applies. Default: Group price, 4+ guests.">
                    <input id="gp-label" value={gLabel} maxLength={28} onChange={(e) => setGLabel(e.target.value)} placeholder="Squad deal" />
                  </Field>
                  <Field id="gp-start" label="Starts" optional>
                    <input id="gp-start" type="date" value={gStart} onChange={(e) => setGStart(e.target.value)} />
                  </Field>
                  <Field id="gp-end" label="Ends" optional>
                    <input id="gp-end" type="date" value={gEnd} min={gStart || undefined} onChange={(e) => setGEnd(e.target.value)} />
                  </Field>
                </div>
                <p className="fine">
                  Group size counts adults and children. Children pay the group price or the child price, whichever is lower.
                  {live.combined && ' The vehicle price stays the same.'} A referral code can still take a little more off where the margin allows.
                </p>
              </>
            )}
          </section>
        )}

        <div className="ts-grid">
          <section>
            <h3>Offer badge and dates</h3>
            <p className="muted small">Used when you set your own price. Leave empty for a plain special price that runs until you change it.</p>
            <Field id="tp-label" label="Badge on the site" optional>
              <input id="tp-label" value={label} maxLength={28} onChange={(e) => setLabel(e.target.value)} placeholder="Winter deal" disabled={!anyOurs} />
            </Field>
            <div className="two">
              <Field id="tp-start" label="Starts" optional>
                <input id="tp-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} disabled={!anyOurs} />
              </Field>
              <Field id="tp-end" label="Ends" optional>
                <input id="tp-end" type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} disabled={!anyOurs} />
              </Field>
            </div>
            <Solvers idp="tp-sv" opts={{ cost: live.pkg.cost, feePct: fee, commissionType: ctype, commissionValue: ctype === 'none' ? 0 : cval, units: 1 }} onPrice={leadPriceSetter} />
          </section>
          <section>
            <h3>One {r.unit === 'person+trip' ? 'person plus vehicle' : r.unit === 'trip' ? 'booking' : 'adult'}, with a referral code</h3>
            <CommissionPicker idp="tp" type={ctype} value={cval} onType={setCtype} onValue={setCval} />
            <Breakdown b={b} floor={fl} label="Customer pays" commissionLabel="Referral commission" />
          </section>
        </div>

        {problems.map((m) => (
          <Notice key={m} tone="error">
            {m}
          </Notice>
        ))}
        {warnings.map((m) => (
          <Notice key={m} tone="info">
            {m}
          </Notice>
        ))}
        <div className="btn-row">
          <button className="btn gold" disabled={busy || !dirty || problems.length > 0} onClick={save}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
          {anyOurs && (
            <button className="btn ghost" onClick={() => setOurs({ a: '', c: '', t: '' })}>
              Use automatic price
            </button>
          )}
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
        </div>

        <section className="ts-bulk">
          <h3>Whole experience</h3>
          <p className="muted small">
            Take a percentage off the market price of every {r.experience} ticket that doesn't have its own price. Tickets never go under your floor.
            Site default: {Number(settings.site_discount_pct)}%.
          </p>
          <div className="inline-edit">
            <input type="number" min={0} max={60} step="0.5" value={disc} placeholder={String(settings.site_discount_pct)} onChange={(e) => setDisc(e.target.value)} aria-label="Discount for this experience" />
            <span className="muted">% off</span>
            <button className="btn ghost small" onClick={saveDiscount}>
              Save
            </button>
          </div>
        </section>
      </div>
    </Sheet>
  )
}

// Compact list of one experience's tickets (used in the Catalogue editor).
export function TicketList({ rows, onOpen }) {
  if (!rows) return <p className="muted small">Loading prices…</p>
  if (!rows.length) return <p className="muted small">No current prices for this experience. Upload a price list that includes it.</p>
  return (
    <ul className="ticket-list">
      {rows.map((r) => (
        <li key={r.option_key}>
          <button type="button" onClick={() => onOpen(r)}>
            <span className="tl-head">
              <strong>{r.ticket}</strong>
              <span className={`pill p-${r.status}`}>{STATUS_LABEL[r.status]}</span>
            </span>
            <span className="tl-figs">
              <span>
                Buy <b>{fmt(r.pkg.cost)}</b>
              </span>
              <span>
                Market <b>{fmt(r.pkg.standard)}</b>
              </span>
              <span>
                Ours <b>{fmt(r.pkg.price)}</b>
              </span>
              <span>
                PG <b>{fmt(r.b.fee)}</b>
              </span>
              <span>
                Keeps <b className={r.b.net < r.floor ? 'neg' : 'pos'}>{fmt(r.b.net)}</b> ({pct(r.b.marginPct)})
              </span>
            </span>
            <small className="muted">Updated {updatedLine(r)}</small>
          </button>
        </li>
      ))}
    </ul>
  )
}

export async function loadPricing(demo, experienceId) {
  if (demo) return DEMO_PRICING.filter((r) => experienceId == null || r.experience_id === experienceId)
  let q = supabase.from('admin_option_pricing').select('*').limit(2000)
  if (experienceId != null) q = q.eq('experience_id', experienceId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

// ------------------------------------------------------------ offers list
function OffersList({ offers, byKey, today, demo, onChange, onOpen }) {
  const { showToast } = useApp()
  const live = offers.filter((o) => o.active && (!o.ends_on || o.ends_on >= today))
  const past = offers.filter((o) => !live.includes(o)).slice(0, 10)
  async function end(o) {
    if (demo) return showToast('Example data. Changes are not saved.', 'error')
    const { error } = await supabase.from('price_overrides').update({ active: false }).eq('id', o.id)
    if (error) return showToast('Could not end the offer.', 'error')
    showToast('Offer ended')
    onChange()
  }
  const rowOf = (o) => byKey[o.option_key]
  const prices = (o) =>
    [o.sell_adult != null && `${fmt(o.sell_adult)} adult`, o.sell_child != null && `${fmt(o.sell_child)} child`, o.sell_trip != null && `${fmt(o.sell_trip)} ${o.sell_adult != null ? 'vehicle' : 'booking'}`]
      .filter(Boolean)
      .join(' · ')
  return (
    <div className="card">
      <h2>Offers</h2>
      {live.length ? (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Offer</th>
                <th>Prices</th>
                <th>Runs</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {live.map((o) => {
                const r = rowOf(o)
                const scheduled = o.starts_on && o.starts_on > today
                return (
                  <tr key={o.id}>
                    <td>
                      <strong>{o.label || 'Special price'}</strong>
                      <small>{r ? `${r.experience}: ${r.ticket}` : o.option_key}</small>
                    </td>
                    <td>{prices(o)}</td>
                    <td>
                      <span className={`pill ${scheduled ? 'p-scheduled' : 'p-offer'}`}>{scheduled ? 'Scheduled' : 'Live'}</span>
                      <small>
                        {o.starts_on ? niceDate(o.starts_on, { day: 'numeric', month: 'short' }) : 'Now'} to{' '}
                        {o.ends_on ? niceDate(o.ends_on, { day: 'numeric', month: 'short' }) : 'until you end it'}
                      </small>
                    </td>
                    <td>
                      <div className="row-actions">
                        {r && (
                          <button className="btn ghost small" onClick={() => onOpen(o.option_key)}>
                            Edit
                          </button>
                        )}
                        <button className="btn ghost small" onClick={() => end(o)}>
                          End
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">No offers running. Tap any ticket above to set a special price, with an optional badge and dates.</p>
      )}
      {past.length > 0 && (
        <details className="past-offers">
          <summary>Ended offers ({past.length})</summary>
          <ul>
            {past.map((o) => (
              <li key={o.id}>
                <strong>{o.label || 'Special price'}</strong> · {rowOf(o)?.experience || o.option_key} · {prices(o)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

// ------------------------------------------------------------ example data (preview only; illustrative numbers)
const ex = (o) => ({
  experience_id: 99, price_row_id: 0, periods: 1, updated_at: new Date(Date.now() - 864e5).toISOString(), updated_by: null, source_file: 'pricelist_5.xlsx', category: 'thrill', experience_hidden: false, experience_discount: null, period_start: '2026-10-01', period_end: '2027-05-31',
  cost_child: 0, rec_child: 0, cost_trip: 0, rec_trip: 0, discount_pct: 5, sellable: true, fee_pct: 5, floor: 5, unit: 'person',
  offer_id: null, offer_label: null, offer_starts: null, offer_ends: null, offer_adult: null, offer_child: null, offer_trip: null, ...o,
})
const DEMO_PRICING = [
  ex({ option_key: 'ex-gv', experience_id: 2, experience: 'Example city ticket', category: 'city', ticket: 'Any day entry', cost_adult: 24, rec_adult: 30 }),
  ex({ option_key: 'ex-1', experience_id: 1, experience: 'Example theme park', ticket: 'Open-dated ticket', cost_adult: 80, rec_adult: 120, rec_child: 110, cost_child: 75, offer_id: 1, offer_label: 'Winter deal', offer_adult: 100, group_prices: [{ n: 2, p: 97, label: 'Squad deal' }, { n: 4, p: 94, label: 'Squad deal' }] }),
  ex({ option_key: 'ex-2', experience_id: 1, updated_by: 'harrsh@yondo.global', updated_at: new Date().toISOString(), experience: 'Example theme park', ticket: 'Fast track add-on', cost_adult: 150, rec_adult: 200 }),
  ex({ option_key: 'ex-3', experience: 'Example desert safari', category: 'desert', ticket: 'Shared car, evening', cost_adult: 110, rec_adult: 150 }),
  ex({ option_key: 'ex-4', experience: 'Example yacht', category: 'sea', ticket: 'Private yacht, 2 hours', unit: 'trip', rec_adult: 0, cost_adult: 0, rec_trip: 1200, cost_trip: 950 }),
  ex({ option_key: 'ex-5', experience: 'Example observation deck', category: 'sky', ticket: 'Prime hours', cost_adult: 195, rec_adult: 220 }),
  ex({ option_key: 'ex-6', experience: 'Example museum', category: 'city', ticket: 'Entry', cost_adult: 60, rec_adult: 63, sellable: false }),
]
const DEMO_OFFERS = [{ id: 1, option_key: 'ex-1', label: 'Winter deal', sell_adult: 100, sell_child: null, sell_trip: null, starts_on: null, ends_on: null, active: true, created_at: new Date().toISOString() }]
