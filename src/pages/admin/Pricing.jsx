import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApp } from '../../App.jsx'
import { supabase } from '../../lib/api.js'
import { CAT, todayUAE } from '../../lib/catalogue.js'
import { niceDate } from '../../lib/format.js'
import { Icon } from '../../components/Icon.jsx'
import { Field, Notice, Sheet } from '../../components/ui.jsx'
import { autoSell, breakdown, priceForNet, priceForMargin, COMMISSION_TYPES, fmt, pct, r2 } from './money.js'

// ------------------------------------------------------------ data
function derive(r, s, today) {
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
  return { ...r, ra, rc, rt, ca, cc, ct, combined, childOk, auto, price, lead, pkg, b, status, offerLive, fee, floor: fl }
}

const STATUS_LABEL = { offer: 'On offer', scheduled: 'Offer scheduled', auto: 'Auto price', hidden: 'Hidden: under floor', off: 'Experience hidden' }

function unitLabel(r) {
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
      supabase.from('admin_option_pricing').select('*').limit(2000),
      supabase.from('price_overrides').select('*').order('created_at', { ascending: false }).limit(500),
    ])
    if (p.error) showToast('Could not load prices.', 'error')
    setRaw(p.data || [])
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
              What each ticket sells for today and what Yondo keeps after the supplier and the {Number(settings.fee_pct)}% gateway fee (before any
              referral commission). Tap a ticket to run the numbers or create an offer.
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
                  <th className="num">Buy</th>
                  <th className="num">Standard</th>
                  <th className="num">Our price</th>
                  <th className="num">Gateway</th>
                  <th className="num">Yondo keeps</th>
                  <th className="num">Margin</th>
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

function MarginBar({ pct: p }) {
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

// ------------------------------------------------------------ one ticket: numbers + offer
function TicketSheet({ r, settings, demo, onClose, onSaved }) {
  const { showToast } = useApp()
  const has = { a: r.ra > 0, c: r.childOk, t: r.rt > 0 }
  const init = (k, ov) => String(r.offer_id && ov != null ? Number(ov) : r.auto[k] ?? '')
  const [p, setP] = useState({ a: init('a', r.offer_adult), c: init('c', r.offer_child), t: init('t', r.offer_trip) })
  const [label, setLabel] = useState(r.offer_label || '')
  const [start, setStart] = useState(r.offer_starts || '')
  const [end, setEnd] = useState(r.offer_ends || '')
  const [ctype, setCtype] = useState('none')
  const [cval, setCval] = useState(settings.default_commission_share ?? 30)
  const [disc, setDisc] = useState(r.experience_discount ?? '')
  const [busy, setBusy] = useState(false)
  const fee = r.fee
  const lead = r.lead
  const leadStd = lead === 'a' ? r.ra : r.rt
  const leadCost = lead === 'a' ? r.ca : r.ct

  const pkgPrice = (lead === 'a' ? Number(p.a) || 0 : 0) + (has.t ? Number(p.t) || 0 : 0)
  const opts = { cost: r.pkg.cost, feePct: fee, commissionType: ctype, commissionValue: ctype === 'none' ? 0 : cval, units: 1 }
  const b = breakdown({ ...opts, price: pkgPrice, standard: r.pkg.standard })
  const bChild = has.c ? breakdown({ price: Number(p.c) || 0, cost: r.cc, standard: r.rc, feePct: fee, commissionType: ctype, commissionValue: ctype === 'none' ? 0 : cval }) : null
  const noCom = breakdown({ price: pkgPrice, cost: r.pkg.cost, standard: r.pkg.standard, feePct: fee })
  const childNoCom = has.c ? breakdown({ price: Number(p.c) || 0, cost: r.cc, standard: r.rc, feePct: fee }) : null

  const problems = []
  const warnings = []
  for (const [k, l, rec] of [['a', 'Adult', r.ra], ['c', 'Child', r.rc], ['t', 'Vehicle', r.rt]]) {
    if (!has[k]) continue
    const v = Number(p[k])
    if (!(v > 0)) problems.push(`${l} price is missing.`)
    else if (v > rec) warnings.push(`${l} price is above the standard price (${fmt(rec)}), so no saving shows to customers.`)
  }
  if (noCom.net < 0) problems.push(`This sells at a loss. Break-even is ${fmt(noCom.breakEven)}.`)
  else if (noCom.net < r.floor) warnings.push(`Profit is under your floor of ${fmt(r.floor)} per booking. It will still sell at this price.`)
  if (childNoCom && childNoCom.net < 0) problems.push(`The child price sells at a loss. Break-even is ${fmt(childNoCom.breakEven)}.`)
  if (start && end && end < start) problems.push('The offer ends before it starts.')

  const changed = ['a', 'c', 't'].some((k) => has[k] && Number(p[k]) !== Number(r.auto[k]))

  async function saveOffer() {
    if (demo) return showToast('Example data. Changes are not saved.', 'error')
    if (problems.length) return
    setBusy(true)
    const row = {
      option_key: r.option_key,
      label: label.trim().slice(0, 28) || null,
      sell_adult: has.a ? Number(p.a) : null,
      sell_child: has.c ? Number(p.c) : null,
      sell_trip: has.t ? Number(p.t) : null,
      starts_on: start || null,
      ends_on: end || null,
      active: true,
    }
    const res = r.offer_id ? await supabase.from('price_overrides').update(row).eq('id', r.offer_id) : await supabase.from('price_overrides').insert(row)
    setBusy(false)
    if (res.error) return showToast('Could not save the offer.', 'error')
    showToast(r.offer_id ? 'Offer updated. It is live on the site.' : start > todayUAE() ? 'Offer scheduled' : 'Offer saved. It is live on the site.')
    onSaved()
    onClose()
  }
  async function removeOffer() {
    if (demo) return showToast('Example data. Changes are not saved.', 'error')
    setBusy(true)
    const { error } = await supabase.from('price_overrides').update({ active: false }).eq('id', r.offer_id)
    setBusy(false)
    if (error) return showToast('Could not end the offer.', 'error')
    showToast('Offer ended. Back to the automatic price.')
    onSaved()
    onClose()
  }
  async function saveDiscount() {
    if (demo) return showToast('Example data. Changes are not saved.', 'error')
    const v = disc === '' ? null : Math.min(60, Math.max(0, Number(disc)))
    const { error } = await supabase.from('experiences').update({ discount_pct: v }).eq('id', r.experience_id)
    if (error) return showToast('Could not save.', 'error')
    showToast(v == null ? 'Using the site discount again' : `${r.experience}: ${v}% off every ticket`)
    onSaved()
  }

  const priceInput = (k, l, std, cost) =>
    has[k] && (
      <div className="ticket-price-row" key={k}>
        <Field id={`tp-${k}`} label={`${l} price (AED)`}>
          <input id={`tp-${k}`} type="number" min={0} step="1" value={p[k]} onChange={(e) => setP({ ...p, [k]: e.target.value })} inputMode="decimal" />
        </Field>
        <div className="tpr-facts">
          <span>
            Buy <strong>{fmt(cost)}</strong>
          </span>
          <span>
            Standard <strong>{fmt(std)}</strong>
          </span>
          <span>
            Auto <strong>{r.auto[k] != null ? fmt(r.auto[k]) : '—'}</strong>
          </span>
        </div>
      </div>
    )

  return (
    <Sheet open onClose={onClose} title={r.ticket} wide>
      <div className="ticket-sheet">
        <p className="muted">
          {r.experience} · {CAT[r.category]?.label} · {unitLabel(r)} · prices valid {niceDate(r.period_start, { day: 'numeric', month: 'short' })} to{' '}
          {niceDate(r.period_end, { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
        {r.status === 'hidden' && (
          <Notice tone="info">
            Hidden from the site: at the standard price this ticket earns less than your floor of {fmt(r.floor)}. Lower the floor in Settings to
            show it.
          </Notice>
        )}
        <div className="ts-grid">
          <section>
            <h3>{r.offer_id ? 'Edit offer' : 'Create an offer'}</h3>
            {priceInput('a', 'Adult', r.ra, r.ca)}
            {priceInput('c', 'Child', r.rc, r.cc)}
            {priceInput('t', r.unit === 'trip' ? 'Booking' : 'Vehicle', r.rt, r.ct)}
            <Solvers idp="tp-sv" opts={{ ...opts }} onPrice={(v) => setP({ ...p, [lead]: String(Math.max(0, Math.ceil(v - (lead === 'a' && has.t ? Number(p.t) || 0 : 0)))) })} />
            <Field id="tp-label" label="Badge on the site" optional hint="Shows on the ticket and the experience card, e.g. Winter deal or Student price.">
              <input id="tp-label" value={label} maxLength={28} onChange={(e) => setLabel(e.target.value)} placeholder="Winter deal" />
            </Field>
            <div className="two">
              <Field id="tp-start" label="Starts" optional>
                <input id="tp-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </Field>
              <Field id="tp-end" label="Ends" optional>
                <input id="tp-end" type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} />
              </Field>
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
              <button className="btn gold" disabled={busy || problems.length > 0 || (!changed && !r.offer_id && !label)} onClick={saveOffer}>
                {r.offer_id ? 'Save offer' : 'Publish offer'}
              </button>
              {r.offer_id && (
                <button className="btn ghost" disabled={busy} onClick={removeOffer}>
                  End offer
                </button>
              )}
            </div>
          </section>
          <section>
            <h3>The numbers</h3>
            <p className="muted small">
              One {r.unit === 'person+trip' ? 'person plus the vehicle' : r.unit === 'trip' ? 'booking' : 'adult'}, at the price on the left.
            </p>
            <CommissionPicker idp="tp" type={ctype} value={cval} onType={setCtype} onValue={setCval} />
            <Breakdown b={b} floor={r.floor} commissionLabel="Referral commission" />
            {bChild && (
              <p className="small muted child-line">
                Child ticket: customer pays {fmt(bChild.price)}, Yondo keeps <strong>{fmt(bChild.net)}</strong> ({pct(bChild.marginPct)}).
              </p>
            )}
          </section>
        </div>
        <section className="ts-bulk">
          <h3>Whole experience</h3>
          <p className="muted small">
            Instead of a fixed price, take a percentage off the standard price of every {r.experience} ticket. Tickets never go under your floor.
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
  experience_id: 1, category: 'thrill', experience_hidden: false, experience_discount: null, period_start: '2026-10-01', period_end: '2027-05-31',
  cost_child: 0, rec_child: 0, cost_trip: 0, rec_trip: 0, discount_pct: 5, sellable: true, fee_pct: 5, floor: 5, unit: 'person',
  offer_id: null, offer_label: null, offer_starts: null, offer_ends: null, offer_adult: null, offer_child: null, offer_trip: null, ...o,
})
const DEMO_PRICING = [
  ex({ option_key: 'ex-1', experience: 'Example theme park', ticket: 'Open-dated ticket', cost_adult: 80, rec_adult: 120, rec_child: 110, cost_child: 75, offer_id: 1, offer_label: 'Winter deal', offer_adult: 100 }),
  ex({ option_key: 'ex-2', experience: 'Example theme park', ticket: 'Fast track add-on', cost_adult: 150, rec_adult: 200 }),
  ex({ option_key: 'ex-3', experience: 'Example desert safari', category: 'desert', ticket: 'Shared car, evening', cost_adult: 110, rec_adult: 150 }),
  ex({ option_key: 'ex-4', experience: 'Example yacht', category: 'sea', ticket: 'Private yacht, 2 hours', unit: 'trip', rec_adult: 0, cost_adult: 0, rec_trip: 1200, cost_trip: 950 }),
  ex({ option_key: 'ex-5', experience: 'Example observation deck', category: 'sky', ticket: 'Prime hours', cost_adult: 195, rec_adult: 220 }),
  ex({ option_key: 'ex-6', experience: 'Example museum', category: 'city', ticket: 'Entry', cost_adult: 60, rec_adult: 63, sellable: false }),
]
const DEMO_OFFERS = [{ id: 1, option_key: 'ex-1', label: 'Winter deal', sell_adult: 100, sell_child: null, sell_trip: null, starts_on: null, ends_on: null, active: true, created_at: new Date().toISOString() }]
