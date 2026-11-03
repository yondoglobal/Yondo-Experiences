import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApp } from '../App.jsx'
import { supabase, sendSignInEmail, verifyCode, signOut } from '../lib/api.js'
import { IS_ARTIFACT, BRAND } from '../lib/config.js'
import { aed, niceDate, niceDateTime, waLink, guestLine, normalisePhone } from '../lib/format.js'
import { CATEGORIES, CAT, todayUAE } from '../lib/catalogue.js'
import { Icon } from '../components/Icon.jsx'
import { Field, Notice, Sheet, CopyButton, Mascot } from '../components/ui.jsx'

const STATUS = {
  new: ['New', 'Check availability'],
  confirmed: ['Awaiting payment', 'Payment link sent'],
  paid: ['Paid', 'Send tickets'],
  completed: ['Completed', 'Stamp given'],
  cancelled: ['Cancelled', ''],
}

export default function Admin() {
  const { session } = useApp()
  const [isAdmin, setIsAdmin] = useState(null)
  const [demo, setDemo] = useState(false)

  useEffect(() => {
    document.title = 'Admin | Yondo Experiences'
  }, [])

  useEffect(() => {
    if (!session) return setIsAdmin(null)
    supabase
      .from('admins')
      .select('email')
      .limit(1)
      .then(({ data }) => setIsAdmin(!!(data && data.length)))
  }, [session])

  if (demo) return <Dashboard demo onExitDemo={() => setDemo(false)} />
  if (!session) return <AdminSignIn onDemo={() => setDemo(true)} />
  if (isAdmin === null) return <div className="wrap admin-wait muted">Checking access…</div>
  if (!isAdmin)
    return (
      <div className="wrap admin-gate">
        <div className="card">
          <h1>No admin access</h1>
          <p>{session.user.email} isn't on the admin list. Sign in with the Yondo admin email.</p>
          <button className="btn ghost" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    )
  return <Dashboard />
}

function AdminSignIn({ onDemo }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  return (
    <div className="wrap admin-gate">
      <div className="card">
        <Mascot pose="phoneThumbs" alt="" className="gate-mascot" />
        <h1>Yondo admin</h1>
        <p className="muted">Bookings, codes, commissions and prices. Admin emails only.</p>
        {!sent ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const r = await sendSignInEmail(email.trim().toLowerCase(), 'admin')
              if (r.ok) setSent(true)
              else setMsg(r.error)
            }}
          >
            <Field id="ad-email" label="Admin email">
              <input id="ad-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </Field>
            <button className="btn gold block">Email me a sign-in link</button>
          </form>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const r = await verifyCode(email.trim().toLowerCase(), code)
              if (!r.ok) setMsg(r.error)
            }}
          >
            <Notice tone="ok">Check {email}. Tap the link, or enter the code.</Notice>
            <Field id="ad-code" label="Code">
              <input id="ad-code" className="mono" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
            </Field>
            <button className="btn gold block">Sign in</button>
          </form>
        )}
        {msg && <Notice tone={IS_ARTIFACT ? 'info' : 'error'}>{msg}</Notice>}
        {IS_ARTIFACT && (
          <button className="btn ghost block" onClick={onDemo}>
            Preview the dashboard with example data
          </button>
        )}
      </div>
    </div>
  )
}

// ------------------------------------------------------------ dashboard
function Dashboard({ demo, onExitDemo }) {
  const { showToast } = useApp()
  const [tab, setTab] = useState('inbox')
  const [d, setD] = useState({ bookings: [], trips: [], waitlist: [], codes: [], experiences: [], settings: null, imports: [] })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (demo) {
      setD(DEMO)
      setLoading(false)
      return
    }
    const [b, t, w, c, e, s, i, r] = await Promise.all([
      supabase.from('admin_bookings').select('*').order('created_at', { ascending: false }).limit(1000),
      supabase.from('trip_requests').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('waitlist').select('*').order('created_at', { ascending: false }).limit(2000),
      supabase.from('admin_code_stats').select('*').order('created_at', { ascending: false }),
      supabase.from('experiences').select('*').order('category').order('name'),
      supabase.from('settings').select('*').eq('id', 1).single(),
      supabase.from('price_imports').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('admin_experience_pricing').select('*'),
    ])
    const room = Object.fromEntries((r.data || []).map((x) => [x.id, x]))
    setD({
      bookings: b.data || [], trips: t.data || [], waitlist: w.data || [], codes: c.data || [],
      experiences: (e.data || []).map((x) => ({ ...x, room: room[x.id] })), settings: s.data, imports: i.data || [],
    })
    setLoading(false)
  }, [demo])

  useEffect(() => {
    load()
  }, [load])

  // live inbox
  useEffect(() => {
    if (demo) return
    const ch = supabase
      .channel('admin-inbox')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, (p) => {
        showToast(`New booking request ${p.new.ref}`)
        load()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trip_requests' }, (p) => {
        showToast(`New quote request ${p.new.ref}`)
        load()
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [demo, load, showToast])

  const newCount = d.bookings.filter((b) => b.status === 'new').length
  const newTrips = d.trips.filter((t) => t.status === 'new').length
  useEffect(() => {
    document.title = (newCount ? `(${newCount}) ` : '') + 'Admin | Yondo Experiences'
  }, [newCount])

  const tabs = [
    ['inbox', 'Bookings', newCount],
    ['quotes', 'Quote requests', newTrips],
    ['codes', 'Referral codes', 0],
    ['catalogue', 'Catalogue & prices', 0],
    ['waitlist', 'Waitlist', 0],
    ['settings', 'Settings', 0],
  ]

  return (
    <div className="admin">
      <div className="admin-top">
        <div className="wrap admin-top-row">
          <h1>Admin</h1>
          {demo ? (
            <span className="example-flag static">Example data</span>
          ) : (
            <span className="muted small">Updates live</span>
          )}
          <div className="admin-top-actions">
            <button className="btn ghost small" onClick={load}>
              <Icon name="refresh" size={16} /> Refresh
            </button>
            {demo ? (
              <button className="btn ghost small" onClick={onExitDemo}>
                Exit preview
              </button>
            ) : (
              <button className="btn ghost small" onClick={signOut}>
                <Icon name="logout" size={16} /> Sign out
              </button>
            )}
          </div>
        </div>
        <div className="wrap">
          <div className="admin-tabs" role="tablist">
            {tabs.map(([id, label, n]) => (
              <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
                {label}
                {n > 0 && <span className="count">{n}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="wrap admin-body">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : tab === 'inbox' ? (
          <Inbox bookings={d.bookings} settings={d.settings} demo={demo} onChange={load} />
        ) : tab === 'quotes' ? (
          <Quotes trips={d.trips} demo={demo} onChange={load} />
        ) : tab === 'codes' ? (
          <Codes codes={d.codes} settings={d.settings} demo={demo} onChange={load} />
        ) : tab === 'catalogue' ? (
          <Catalogue experiences={d.experiences} imports={d.imports} settings={d.settings} demo={demo} onChange={load} />
        ) : tab === 'waitlist' ? (
          <Waitlist rows={d.waitlist} />
        ) : (
          <Settings settings={d.settings} demo={demo} onChange={load} />
        )}
      </div>
    </div>
  )
}

function monthStart() {
  return todayUAE().slice(0, 8) + '01'
}

// ------------------------------------------------------------ inbox
function Inbox({ bookings, settings, demo, onChange }) {
  const [filter, setFilter] = useState('open')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(null)
  const ms = monthStart()
  const kpi = useMemo(() => {
    const month = bookings.filter((b) => b.created_at.slice(0, 10) >= ms && ['paid', 'completed'].includes(b.status))
    const sum = (arr, k) => arr.reduce((s, b) => s + Number(b[k] || 0), 0)
    return {
      new: bookings.filter((b) => b.status === 'new').length,
      confirmed: bookings.filter((b) => b.status === 'confirmed').length,
      revenue: sum(month, 'total'),
      net: sum(month, 'yondo_net'),
      owed: sum(bookings.filter((b) => b.code && ['paid', 'completed'].includes(b.status) && !b.commission_paid_at), 'commission'),
    }
  }, [bookings, ms])

  const list = bookings.filter((b) => {
    if (filter === 'open' && !['new', 'confirmed', 'paid'].includes(b.status)) return false
    if (!['open', 'all'].includes(filter) && b.status !== filter) return false
    if (q) {
      const s = q.toLowerCase()
      return [b.ref, b.name, b.email, b.phone, b.experience_name, b.code].join(' ').toLowerCase().includes(s)
    }
    return true
  })
  const current = open ? bookings.find((b) => b.id === open) : null

  return (
    <>
      <div className="kpis">
        <Kpi label="New requests" value={kpi.new} tone={kpi.new ? 'alert' : ''} />
        <Kpi label="Awaiting payment" value={kpi.confirmed} />
        <Kpi label="Sales this month" value={aed(kpi.revenue)} sub="Paid and completed" />
        <Kpi label="Net profit this month" value={aed(kpi.net)} sub="After fees and commission" />
        <Kpi label="Commission owed" value={aed(kpi.owed)} sub="To code owners" />
      </div>
      <div className="admin-filters">
        <div className="seg">
          {[['open', 'Open'], ['new', 'New'], ['confirmed', 'Awaiting payment'], ['paid', 'Paid'], ['completed', 'Completed'], ['cancelled', 'Cancelled'], ['all', 'All']].map(([id, l]) => (
            <button key={id} className={filter === id ? 'on' : ''} onClick={() => setFilter(id)}>
              {l}
            </button>
          ))}
        </div>
        <input className="admin-search" placeholder="Search name, ref, phone, code" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search bookings" />
      </div>
      {list.length ? (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ref</th>
                <th>Received</th>
                <th>Customer</th>
                <th>Experience</th>
                <th>Date</th>
                <th className="num">Total</th>
                <th className="num">Net</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((b) => (
                <tr key={b.id} onClick={() => setOpen(b.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen(b.id)}>
                  <td className="mono">{b.ref}</td>
                  <td>{niceDateTime(b.created_at)}</td>
                  <td>
                    <strong>{b.name}</strong>
                    <small>{b.phone}</small>
                  </td>
                  <td>
                    <strong>{b.experience_name}</strong>
                    <small>{b.option_name}</small>
                  </td>
                  <td>
                    {niceDate(b.travel_date, { day: 'numeric', month: 'short' })}
                    <small>{guestLine(b)}</small>
                  </td>
                  <td className="num">
                    {aed(b.total)}
                    {b.code && <small className="code-tag">{b.code}</small>}
                  </td>
                  <td className={`num ${b.yondo_net < 0 ? 'neg' : ''}`}>{aed(b.yondo_net)}</td>
                  <td>
                    <span className={`pill s-${b.status}`}>{STATUS[b.status][0]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted empty-admin">No bookings in this view.</p>
      )}
      {current && <BookingSheet b={current} settings={settings} demo={demo} onClose={() => setOpen(null)} onChange={onChange} />}
    </>
  )
}

function Kpi({ label, value, sub, tone }) {
  return (
    <div className={`kpi ${tone || ''}`}>
      <small>{label}</small>
      <strong>{value}</strong>
      {sub && <span>{sub}</span>}
    </div>
  )
}

function BookingSheet({ b, settings, demo, onClose, onChange }) {
  const reviewLink = settings?.google_write_review_url || BRAND.googleReviews
  const { showToast } = useApp()
  const [link, setLink] = useState(b.payment_link || '')
  const [note, setNote] = useState(b.admin_note || '')
  const [busy, setBusy] = useState(false)
  const first = (b.name || '').split(' ')[0]
  const phone = normalisePhone(b.phone)
  const msgs = {
    confirm: `Hi ${first}! Good news: ${b.experience_name} (${b.option_name}) on ${niceDate(b.travel_date)} is available for ${guestLine(b)}.\n\nTotal: ${aed(b.total)}\nPay securely here to lock it in: ${link || '[payment link]'}\n\nRef ${b.ref}. Any questions, just reply here.`,
    reminder: `Hi ${first}, a quick reminder to complete payment for ${b.experience_name} on ${niceDate(b.travel_date)} (ref ${b.ref}): ${link || '[payment link]'}`,
    paid: `Thanks ${first}, payment received for ${b.experience_name} on ${niceDate(b.travel_date)}. Your tickets are coming next. Ref ${b.ref}.`,
    done: `Hope you loved ${b.experience_name}, ${first}! Your stamp is in your Yondo passport: ${BRAND.site}/#passport\n\nIf you have a minute, a Google review helps us a lot: ${reviewLink}`,
  }

  async function update(fields, toast) {
    if (demo) return showToast('Example data. Changes are not saved.', 'error')
    setBusy(true)
    const { error } = await supabase.from('bookings').update(fields).eq('id', b.id)
    setBusy(false)
    if (error) return showToast('Could not save. Try again.', 'error')
    showToast(toast)
    onChange()
  }

  return (
    <Sheet open onClose={onClose} title={`Booking ${b.ref}`} wide>
      <div className="bk">
        <div className="bk-status">
          <span className={`pill s-${b.status}`}>{STATUS[b.status][0]}</span>
          <span className="muted">Received {niceDateTime(b.created_at)}</span>
        </div>
        <div className="bk-grid">
          <section>
            <h3>Customer</h3>
            <dl className="dl">
              <dt>Name</dt>
              <dd>{b.name}</dd>
              <dt>WhatsApp</dt>
              <dd>
                <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener">
                  {b.phone}
                </a>
              </dd>
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${b.email}`}>{b.email}</a>
              </dd>
              {b.university && (
                <>
                  <dt>University</dt>
                  <dd>{b.university}</dd>
                </>
              )}
              {b.pickup && (
                <>
                  <dt>Coming from</dt>
                  <dd>{b.pickup}</dd>
                </>
              )}
              {b.notes && (
                <>
                  <dt>Notes</dt>
                  <dd className="pre">{b.notes}</dd>
                </>
              )}
            </dl>
          </section>
          <section>
            <h3>Booking</h3>
            <dl className="dl">
              <dt>Experience</dt>
              <dd>{b.experience_name}</dd>
              <dt>Ticket</dt>
              <dd>{b.option_name}</dd>
              <dt>Date</dt>
              <dd>{niceDate(b.travel_date)}</dd>
              <dt>Guests</dt>
              <dd>{guestLine(b)}</dd>
            </dl>
          </section>
          <section className="money">
            <h3>Money</h3>
            <dl className="dl num">
              {b.standard_subtotal > b.total && (
                <>
                  <dt>Standard price</dt>
                  <dd>
                    <s>{aed(b.standard_subtotal)}</s>
                  </dd>
                </>
              )}
              <dt>Customer pays</dt>
              <dd>{aed(b.total)}</dd>
              {b.discount > 0 && (
                <>
                  <dt>Code discount included</dt>
                  <dd>{aed(b.discount)}</dd>
                </>
              )}
              <dt>Supplier cost</dt>
              <dd>−{aed(b.cost_total)}</dd>
              <dt>Bank and gateway ({Number(b.fee_pct)}%)</dt>
              <dd>−{aed((b.total * b.fee_pct) / 100)}</dd>
              <dt>Net profit</dt>
              <dd>{aed(b.net_profit)}</dd>
              {b.code && (
                <>
                  <dt>
                    Commission to {b.code} ({Number(b.commission_share)}%)
                  </dt>
                  <dd>−{aed(b.commission)}</dd>
                </>
              )}
              <dt className="strong">Yondo keeps</dt>
              <dd className="strong">{aed(b.yondo_net)}</dd>
            </dl>
            {b.code && ['paid', 'completed'].includes(b.status) && (
              <label className="check">
                <input
                  type="checkbox"
                  checked={!!b.commission_paid_at}
                  onChange={(e) => update({ commission_paid_at: e.target.checked ? new Date().toISOString() : null }, e.target.checked ? 'Commission marked as paid' : 'Commission marked as owed')}
                />
                <span>Commission paid to {b.code}</span>
              </label>
            )}
          </section>
        </div>

        <section className="bk-actions">
          <h3>Next step</h3>
          {b.status === 'new' && (
            <>
              <Field id="bk-link" label="Payment link" hint="Paste the Stripe or bank payment link, then confirm.">
                <input id="bk-link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://buy.stripe.com/…" />
              </Field>
              <div className="btn-row">
                <button className="btn gold" disabled={busy || !/^https?:\/\//.test(link)} onClick={() => update({ status: 'confirmed', payment_link: link }, 'Marked as confirmed')}>
                  <Icon name="check" size={16} /> Confirm availability
                </button>
                <a className="btn ghost" href={waLink(msgs.confirm, phone)} target="_blank" rel="noopener">
                  <Icon name="whatsapp" size={16} /> Send confirmation on WhatsApp
                </a>
              </div>
            </>
          )}
          {b.status === 'confirmed' && (
            <div className="btn-row">
              <button className="btn gold" disabled={busy} onClick={() => update({ status: 'paid' }, 'Marked as paid')}>
                <Icon name="card" size={16} /> Mark as paid
              </button>
              <a className="btn ghost" href={waLink(msgs.reminder, phone)} target="_blank" rel="noopener">
                <Icon name="whatsapp" size={16} /> Send payment reminder
              </a>
            </div>
          )}
          {b.status === 'paid' && (
            <div className="btn-row">
              <button className="btn gold" disabled={busy} onClick={() => update({ status: 'completed' }, 'Completed. Stamp added to their passport.')}>
                <Icon name="star" size={16} /> Mark completed and give stamp
              </button>
              <a className="btn ghost" href={waLink(msgs.paid, phone)} target="_blank" rel="noopener">
                <Icon name="whatsapp" size={16} /> Send payment thanks
              </a>
            </div>
          )}
          {b.status === 'completed' && (
            <div className="btn-row">
              <a className="btn ghost" href={waLink(msgs.done, phone)} target="_blank" rel="noopener">
                <Icon name="whatsapp" size={16} /> Send thank-you and review link
              </a>
            </div>
          )}
          {['confirmed', 'paid'].includes(b.status) && (
            <Field id="bk-link2" label="Payment link">
              <div className="inline-edit">
                <input id="bk-link2" value={link} onChange={(e) => setLink(e.target.value)} />
                <button className="btn ghost small" onClick={() => update({ payment_link: link }, 'Payment link saved')}>
                  Save
                </button>
              </div>
            </Field>
          )}
          <Field id="bk-note" label="Internal note">
            <textarea id="bk-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="btn-row">
            <button className="btn ghost small" onClick={() => update({ admin_note: note }, 'Note saved')}>
              Save note
            </button>
            {!['cancelled', 'completed'].includes(b.status) && (
              <CancelButton onConfirm={() => update({ status: 'cancelled' }, 'Booking cancelled')} />
            )}
            {b.status === 'cancelled' && (
              <button className="btn ghost small" onClick={() => update({ status: 'new' }, 'Reopened')}>
                Reopen
              </button>
            )}
          </div>
        </section>
      </div>
    </Sheet>
  )
}

function CancelButton({ onConfirm }) {
  const [ask, setAsk] = useState(false)
  return ask ? (
    <span className="confirm-inline">
      Cancel this booking?
      <button className="btn danger small" onClick={onConfirm}>
        Yes, cancel
      </button>
      <button className="btn ghost small" onClick={() => setAsk(false)}>
        Keep it
      </button>
    </span>
  ) : (
    <button className="btn ghost small danger-text" onClick={() => setAsk(true)}>
      Cancel booking
    </button>
  )
}

// ------------------------------------------------------------ quotes
function Quotes({ trips, demo, onChange }) {
  const { showToast } = useApp()
  async function setStatus(t, status) {
    if (demo) return showToast('Example data. Changes are not saved.', 'error')
    const { error } = await supabase.from('trip_requests').update({ status }).eq('id', t.id)
    if (error) return showToast('Could not save.', 'error')
    onChange()
  }
  if (!trips.length) return <p className="muted empty-admin">No quote requests yet.</p>
  return (
    <div className="quote-list">
      {trips.map((t) => (
        <div key={t.id} className="card quote-item">
          <div className="tr-head">
            <span className="mono">{t.ref}</span>
            <select value={t.status} onChange={(e) => setStatus(t, e.target.value)} aria-label="Status">
              {['new', 'quoted', 'booked', 'closed'].map((s) => (
                <option key={s} value={s}>
                  {s[0].toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <strong>
            {t.kind.replace('-', ' ')}
            {t.title ? `: ${t.title}` : ''}
          </strong>
          <span className="muted">
            {t.preferred_date ? niceDate(t.preferred_date) : 'No date yet'}, group of {t.group_size}
            {t.budget ? `, ${t.budget}` : ''}
          </span>
          {t.details && <p className="pre">{t.details}</p>}
          <span>
            {t.name}, {t.email}
            {t.university ? `, ${t.university}` : ''}
            {t.code ? `, code ${t.code}` : ''}
          </span>
          <a className="btn ghost small" href={waLink(`Hi ${t.name.split(' ')[0]}! Thanks for your ${t.kind.replace('-', ' ')} request (${t.ref}).`, normalisePhone(t.phone))} target="_blank" rel="noopener">
            <Icon name="whatsapp" size={16} /> Reply on WhatsApp
          </a>
          <small className="muted">Received {niceDateTime(t.created_at)}</small>
        </div>
      ))}
    </div>
  )
}

// ------------------------------------------------------------ codes
function Codes({ codes, settings, demo, onChange }) {
  const { showToast } = useApp()
  const blank = { code: '', owner_name: '', owner_contact: '', kind: 'ambassador', customer_discount_pct: settings?.default_discount_pct ?? 5, commission_share_pct: settings?.default_commission_share ?? 30, max_uses: '', expires_at: '' }
  const [f, setF] = useState(blank)
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: k === 'code' ? e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') : e.target.value })

  async function create(e) {
    e.preventDefault()
    if (demo) return showToast('Example data. Changes are not saved.', 'error')
    if (f.code.length < 3 || !f.owner_name.trim()) return setErr('Add a code (3+ characters) and who owns it.')
    const row = { ...f, max_uses: f.max_uses ? parseInt(f.max_uses) : null, expires_at: f.expires_at || null, customer_discount_pct: Number(f.customer_discount_pct), commission_share_pct: Number(f.commission_share_pct) }
    const { error } = await supabase.from('promo_codes').insert(row)
    if (error) return setErr(/duplicate/.test(error.message) ? 'That code already exists.' : 'Could not create the code.')
    setErr('')
    setF(blank)
    showToast(`Code ${row.code} created`)
    onChange()
  }
  async function toggle(c) {
    if (demo) return showToast('Example data. Changes are not saved.', 'error')
    await supabase.from('promo_codes').update({ active: !c.active }).eq('code', c.code)
    onChange()
  }

  return (
    <div className="codes">
      <form className="card code-form" onSubmit={create}>
        <h2>New referral code</h2>
        <p className="muted small">
          The customer discount only applies where the ticket has margin to spare, and never pushes a booking below your profit floor. Commission is a
          share of Yondo's net profit on each paid booking.
        </p>
        <div className="form-row">
          <Field id="c-code" label="Code">
            <input id="c-code" className="mono" value={f.code} onChange={set('code')} placeholder="SARA10" maxLength={24} />
          </Field>
          <Field id="c-owner" label="Owner">
            <input id="c-owner" value={f.owner_name} onChange={set('owner_name')} placeholder="Sara (Campus Crew)" />
          </Field>
          <Field id="c-contact" label="Owner contact" optional>
            <input id="c-contact" value={f.owner_contact} onChange={set('owner_contact')} placeholder="WhatsApp or email" />
          </Field>
          <Field id="c-kind" label="Type">
            <div className="select-wrap full">
              <select id="c-kind" value={f.kind} onChange={set('kind')}>
                <option value="ambassador">Ambassador</option>
                <option value="partner">Partner</option>
                <option value="campaign">Campaign</option>
                <option value="customer">Customer referral</option>
              </select>
              <Icon name="down" size={16} />
            </div>
          </Field>
          <Field id="c-disc" label="Customer discount %">
            <input id="c-disc" type="number" min={0} max={50} step="0.5" value={f.customer_discount_pct} onChange={set('customer_discount_pct')} />
          </Field>
          <Field id="c-share" label="Commission (% of profit)">
            <input id="c-share" type="number" min={0} max={100} step="1" value={f.commission_share_pct} onChange={set('commission_share_pct')} />
          </Field>
          <Field id="c-max" label="Max uses" optional>
            <input id="c-max" type="number" min={1} value={f.max_uses} onChange={set('max_uses')} />
          </Field>
          <Field id="c-exp" label="Expires" optional>
            <input id="c-exp" type="date" value={f.expires_at} onChange={set('expires_at')} />
          </Field>
        </div>
        {err && <Notice tone="error">{err}</Notice>}
        <button className="btn gold">Create code</button>
      </form>

      {codes.length ? (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Owner</th>
                <th className="num">Terms</th>
                <th className="num">Uses</th>
                <th className="num">Sales</th>
                <th className="num">Owed</th>
                <th className="num">Paid out</th>
                <th>Share link</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.code} className={c.active ? '' : 'dim'}>
                  <td className="mono">{c.code}</td>
                  <td>
                    <strong>{c.owner_name}</strong>
                    <small>{c.owner_contact}</small>
                  </td>
                  <td className="num">
                    {Number(c.customer_discount_pct)}% off
                    <small>{Number(c.commission_share_pct)}% of profit</small>
                  </td>
                  <td className="num">
                    {c.uses}
                    {c.max_uses ? `/${c.max_uses}` : ''}
                  </td>
                  <td className="num">{aed(c.revenue)}</td>
                  <td className="num strong">{aed(c.commission_owed)}</td>
                  <td className="num">{aed(c.commission_paid)}</td>
                  <td>
                    <CopyButton text={`${BRAND.site}/?ref=${c.code}`} label="Copy link" />
                  </td>
                  <td>
                    <label className="switch">
                      <input type="checkbox" checked={c.active} onChange={() => toggle(c)} />
                      <span />
                      <span className="sr-only">Active</span>
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted empty-admin">No codes yet. Create one for your first ambassador above.</p>
      )}
    </div>
  )
}

// ------------------------------------------------------------ catalogue
function Catalogue({ experiences, imports, settings, demo, onChange }) {
  const siteD = Number(settings?.site_discount_pct ?? 5)
  const { showToast } = useApp()
  const [filter, setFilter] = useState('')
  const [edit, setEdit] = useState(null)
  const list = experiences.filter((e) => !filter || (e.name + e.category + e.source_name).toLowerCase().includes(filter.toLowerCase()))

  async function save(id, fields, msg = 'Saved') {
    if (demo) return showToast('Example data. Changes are not saved.', 'error')
    const { error } = await supabase.from('experiences').update(fields).eq('id', id)
    if (error) return showToast('Could not save.', 'error')
    showToast(msg)
    onChange()
  }

  return (
    <div className="catalogue-admin">
      <PriceImport imports={imports} demo={demo} onDone={onChange} />
      <div className="card">
        <div className="section-head">
          <h2>Experiences</h2>
          <input className="admin-search" placeholder="Filter" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter experiences" />
        </div>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name on site</th>
                <th>Category</th>
                <th>Emirate</th>
                <th className="num">Yondo discount</th>
                <th className="num">Room at your floor</th>
                <th>Featured</th>
                <th>Shown</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id} className={e.hidden ? 'dim' : ''}>
                  <td>
                    <strong>{e.name}</strong>
                    <small>{e.source_name}</small>
                  </td>
                  <td>{CAT[e.category]?.label || e.category}</td>
                  <td>{e.emirate}</td>
                  <td className="num">
                    {e.discount_pct != null ? `${Number(e.discount_pct)}%` : `${siteD}%`}
                    <small>{e.discount_pct != null ? 'own setting' : 'site default'}</small>
                  </td>
                  <td className="num">
                    {e.room?.room_min_pct != null ? `${Math.max(0, e.room.room_min_pct)}–${Math.max(0, e.room.room_max_pct)}%` : '—'}
                    <small>max % off before the floor</small>
                  </td>
                  <td>
                    <label className="switch">
                      <input type="checkbox" checked={e.featured} onChange={() => save(e.id, { featured: !e.featured })} />
                      <span />
                      <span className="sr-only">Featured</span>
                    </label>
                  </td>
                  <td>
                    <label className="switch">
                      <input type="checkbox" checked={!e.hidden} onChange={() => save(e.id, { hidden: !e.hidden }, e.hidden ? 'Now showing on the site' : 'Hidden from the site')} />
                      <span />
                      <span className="sr-only">Shown on site</span>
                    </label>
                  </td>
                  <td>
                    <button className="btn ghost small" onClick={() => setEdit(e)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {edit && <EditExperience e={edit} siteD={siteD} onClose={() => setEdit(null)} onSave={(fields) => { save(edit.id, fields); setEdit(null) }} />}
    </div>
  )
}

function EditExperience({ e, siteD, onClose, onSave }) {
  const [f, setF] = useState({ name: e.name, category: e.category, emirate: e.emirate || '', blurb: e.blurb || '', image_url: e.image_url || '', sort: e.sort || 0, discount_pct: e.discount_pct ?? '' })
  const set = (k) => (ev) => setF({ ...f, [k]: ev.target.value })
  return (
    <Sheet open onClose={onClose} title={`Edit ${e.name}`}>
      <form className="form-grid" onSubmit={(ev) => { ev.preventDefault(); onSave({ ...f, sort: parseInt(f.sort) || 0, image_url: f.image_url || null, discount_pct: f.discount_pct === '' ? null : Math.min(60, Math.max(0, Number(f.discount_pct))) }) }}>
        <Field id="ee-name" label="Name on site">
          <input id="ee-name" value={f.name} onChange={set('name')} />
        </Field>
        <div className="two">
          <Field id="ee-cat" label="Category">
            <div className="select-wrap full">
              <select id="ee-cat" value={f.category} onChange={set('category')}>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <Icon name="down" size={16} />
            </div>
          </Field>
          <Field id="ee-em" label="Emirate">
            <input id="ee-em" value={f.emirate} onChange={set('emirate')} />
          </Field>
        </div>
        <Field id="ee-blurb" label="Short description">
          <textarea id="ee-blurb" rows={3} value={f.blurb} onChange={set('blurb')} maxLength={220} />
        </Field>
        <Field id="ee-img" label="Photo URL" optional hint="Use a photo you have the rights to (supplier media kit or your own). Leave empty for the default.">
          <input id="ee-img" value={f.image_url} onChange={set('image_url')} placeholder="https://…" />
        </Field>
        <Field
          id="ee-disc"
          label="Yondo discount off the standard price (%)"
          optional
          hint={`Leave empty to use the site default (${siteD}%). ${e.room?.room_min_pct != null ? `Room before your profit floor: ${Math.max(0, e.room.room_min_pct)}% on every ticket, up to ${Math.max(0, e.room.room_max_pct)}% on some.` : ''} Tickets never go below the floor.`}
        >
          <input id="ee-disc" type="number" min={0} max={60} step="0.5" value={f.discount_pct} onChange={set('discount_pct')} placeholder={`${siteD}`} />
        </Field>
        <Field id="ee-sort" label="Sort order" hint="Lower numbers show first.">
          <input id="ee-sort" type="number" value={f.sort} onChange={set('sort')} />
        </Field>
        <p className="fine">Supplier name: {e.source_name}</p>
        <button className="btn gold">Save changes</button>
      </form>
    </Sheet>
  )
}

function PriceImport({ imports, demo, onDone }) {
  const { showToast } = useApp()
  const [rows, setRows] = useState(null)
  const [file, setFile] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function onFile(e) {
    const fl = e.target.files?.[0]
    if (!fl) return
    setErr('')
    setFile(fl.name)
    try {
      const XLSX = await loadSheetJS()
      const wb = XLSX.read(await fl.arrayBuffer(), { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true })
      const parsed = parseSupplierRows(raw)
      if (parsed.length < 10) throw new Error('few')
      setRows(parsed)
    } catch (ex) {
      setRows(null)
      setErr('That file doesn’t look like the supplier price list. It needs the same columns as pricelist_5.xlsx.')
    }
  }

  async function doImport() {
    if (demo) return showToast('Example data. Changes are not saved.', 'error')
    setBusy(true)
    const { data, error } = await supabase.rpc('admin_import_prices', { p_rows: rows, p_source: file })
    setBusy(false)
    if (error || !data?.ok) return setErr(data?.error || 'Import failed. Nothing was changed.')
    showToast(`Imported ${data.rows} price rows`)
    if (data.newAttractions?.length) setErr(`New in this list (hidden until you review them below): ${data.newAttractions.join(', ')}`)
    setRows(null)
    onDone()
  }

  const attractions = rows ? new Set(rows.map((r) => r.attraction)).size : 0
  return (
    <div className="card price-import">
      <h2>Update prices</h2>
      <p className="muted small">
        Upload the latest supplier price list (.xlsx, same format as pricelist_5). It replaces all prices. Your rates are the standard price minus
        your Yondo discount, never below your profit floor. New attractions arrive hidden so you can name and categorise them first.
      </p>
      <label className="upload">
        <input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} />
        <Icon name="upload" size={18} /> {file || 'Choose price list file'}
      </label>
      {rows && (
        <Notice tone="info">
          {rows.length} price rows across {attractions} attractions ready to import.
          <div className="btn-row">
            <button className="btn gold small" disabled={busy} onClick={doImport}>
              {busy ? 'Importing…' : 'Replace prices with this file'}
            </button>
            <button className="btn ghost small" onClick={() => setRows(null)}>
              Cancel
            </button>
          </div>
        </Notice>
      )}
      {err && <Notice tone="info">{err}</Notice>}
      {imports.length > 0 && (
        <p className="fine">
          Last import: {imports[0].source_file || 'file'}, {imports[0].row_count} rows, {niceDateTime(imports[0].created_at)}
        </p>
      )}
    </div>
  )
}

let sheetJs
function loadSheetJS() {
  if (window.XLSX) return Promise.resolve(window.XLSX)
  if (sheetJs) return sheetJs
  sheetJs = new Promise((res, rej) => {
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
    s.onload = () => res(window.XLSX)
    s.onerror = rej
    document.head.appendChild(s)
  })
  return sheetJs
}

function excelDate(v) {
  if (v == null || v === '') return null
  if (typeof v === 'number') {
    const d = new Date(Math.round((v - 25569) * 864e5))
    return d.toISOString().slice(0, 10)
  }
  const s = String(v).trim()
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  return null
}

export function parseSupplierRows(raw) {
  const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
  const num = (x) => {
    const n = parseFloat(x)
    return isNaN(n) ? 0 : Math.round(n * 100) / 100
  }
  const out = []
  for (const r of raw.slice(1)) {
    if (!r || !r[0]) continue
    const start = excelDate(r[3])
    const end = excelDate(r[4])
    if (!start || !end) continue
    out.push({
      attraction: norm(r[0]), ticket: norm(r[1]), origins: norm(r[2]), start, end,
      rec_adult: num(r[5]), rec_child: num(r[6]), rec_trip: num(r[7]), cost_adult: num(r[8]), cost_child: num(r[9]), cost_trip: num(r[10]),
    })
  }
  return out
}

// ------------------------------------------------------------ waitlist
function Waitlist({ rows }) {
  function csv() {
    const head = ['Joined', 'Name', 'Email', 'Phone', 'University', 'Interest']
    const lines = rows.map((r) => [r.created_at, r.name, r.email, r.phone, r.university, r.interest].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'yondo-waitlist.csv'
    a.click()
  }
  return (
    <div className="card">
      <div className="section-head">
        <h2>Group trip waitlist ({rows.length})</h2>
        {rows.length > 0 && (
          <button className="btn ghost small" onClick={csv}>
            <Icon name="download" size={16} /> Export CSV
          </button>
        )}
      </div>
      {rows.length ? (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Joined</th>
                <th>Name</th>
                <th>Contact</th>
                <th>University</th>
                <th>Interest</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{niceDateTime(r.created_at)}</td>
                  <td>{r.name}</td>
                  <td>
                    {r.email}
                    <small>{r.phone}</small>
                  </td>
                  <td>{r.university}</td>
                  <td>{r.interest}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">Nobody on the list yet.</p>
      )}
    </div>
  )
}

// ------------------------------------------------------------ settings
function Settings({ settings, demo, onChange }) {
  const { showToast } = useApp()
  const [f, setF] = useState(() => ({ ...settings }))
  const [tiers, setTiers] = useState(() => JSON.parse(JSON.stringify(settings?.tiers || [])))
  if (!settings) return <p className="muted">Settings unavailable.</p>
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  async function save() {
    if (demo) return showToast('Example data. Changes are not saved.', 'error')
    const { error } = await supabase
      .from('settings')
      .update({
        fee_pct: Number(f.fee_pct), profit_floor: Number(f.profit_floor), default_discount_pct: Number(f.default_discount_pct),
        default_commission_share: Number(f.default_commission_share), site_discount_pct: Number(f.site_discount_pct),
        show_standard_price: !!f.show_standard_price, google_reviews_url: f.google_reviews_url, google_write_review_url: f.google_write_review_url,
        tiers, updated_at: new Date().toISOString(),
      })
      .eq('id', 1)
    if (error) return showToast('Could not save settings.', 'error')
    showToast('Settings saved')
    onChange()
  }
  return (
    <div className="settings">
      <div className="card">
        <h2>Yondo rates</h2>
        <p className="muted small">
          Your rate is the standard price (the supplier's recommended retail price) minus this discount. The standard price shows struck through
          next to it. A ticket is never discounted below your profit floor; set bigger discounts per experience in Catalogue & prices.
        </p>
        <div className="form-row">
          <Field id="s-site" label="Discount off standard price (%)">
            <input id="s-site" type="number" step="0.5" min={0} max={60} value={f.site_discount_pct} onChange={set('site_discount_pct')} />
          </Field>
          <label className="check toggle-line">
            <input type="checkbox" checked={!!f.show_standard_price} onChange={(e) => setF({ ...f, show_standard_price: e.target.checked })} />
            <span>Show the standard price struck through</span>
          </label>
        </div>
      </div>
      <div className="card">
        <h2>Google reviews</h2>
        <div className="form-row wide">
          <Field id="s-rev" label="Link to read reviews">
            <input id="s-rev" value={f.google_reviews_url || ''} onChange={set('google_reviews_url')} />
          </Field>
          <Field id="s-wrev" label="Link to leave a review" hint="Google Business Profile, then Ask for reviews, then copy the link.">
            <input id="s-wrev" value={f.google_write_review_url || ''} onChange={set('google_write_review_url')} />
          </Field>
        </div>
      </div>
      <div className="card">
        <h2>Pricing rules</h2>
        <div className="form-row">
          <Field id="s-fee" label="Bank and gateway fees %" hint="Taken off every sale before profit.">
            <input id="s-fee" type="number" step="0.1" min={0} value={f.fee_pct} onChange={set('fee_pct')} />
          </Field>
          <Field id="s-floor" label="Profit floor (AED per ticket)" hint="Tickets that would earn less than this are hidden.">
            <input id="s-floor" type="number" step="0.5" min={0} value={f.profit_floor} onChange={set('profit_floor')} />
          </Field>
          <Field id="s-disc" label="Default code discount %">
            <input id="s-disc" type="number" step="0.5" min={0} value={f.default_discount_pct} onChange={set('default_discount_pct')} />
          </Field>
          <Field id="s-share" label="Default commission (% of profit)">
            <input id="s-share" type="number" step="1" min={0} value={f.default_commission_share} onChange={set('default_commission_share')} />
          </Field>
        </div>
      </div>
      <div className="card">
        <h2>Passport tiers and perks</h2>
        <p className="muted small">Perks only show to customers when switched on. Nothing is given automatically; you honour perks manually on WhatsApp.</p>
        {tiers.map((t, ti) => (
          <div key={t.id} className="tier-edit">
            <div className="form-row">
              <Field id={`t-n-${ti}`} label="Tier name">
                <input id={`t-n-${ti}`} value={t.name} onChange={(e) => { const n = [...tiers]; n[ti] = { ...t, name: e.target.value }; setTiers(n) }} />
              </Field>
              <Field id={`t-m-${ti}`} label="Stamps needed">
                <input id={`t-m-${ti}`} type="number" min={0} value={t.min} disabled={ti === 0} onChange={(e) => { const n = [...tiers]; n[ti] = { ...t, min: parseInt(e.target.value) || 0 }; setTiers(n) }} />
              </Field>
            </div>
            {(t.perks || []).map((p, pi) => (
              <div key={pi} className="perk-row">
                <label className="switch">
                  <input type="checkbox" checked={p.active} onChange={() => { const n = [...tiers]; const perks = [...t.perks]; perks[pi] = { ...p, active: !p.active }; n[ti] = { ...t, perks }; setTiers(n) }} />
                  <span />
                  <span className="sr-only">Perk on</span>
                </label>
                <input value={p.text} aria-label="Perk" onChange={(e) => { const n = [...tiers]; const perks = [...t.perks]; perks[pi] = { ...p, text: e.target.value }; n[ti] = { ...t, perks }; setTiers(n) }} />
                <button className="icon-btn" aria-label="Remove perk" onClick={() => { const n = [...tiers]; n[ti] = { ...t, perks: t.perks.filter((_, i) => i !== pi) }; setTiers(n) }}>
                  <Icon name="close" size={16} />
                </button>
              </div>
            ))}
            <button className="link-btn" onClick={() => { const n = [...tiers]; n[ti] = { ...t, perks: [...(t.perks || []), { text: '', active: false }] }; setTiers(n) }}>
              <Icon name="plus" size={14} /> Add perk
            </button>
          </div>
        ))}
      </div>
      <button className="btn gold big" onClick={save}>
        Save settings
      </button>
    </div>
  )
}

// ------------------------------------------------------------ example data for the preview
const mk = (o) => {
  const net = Math.round((o.total * 0.95 - o.cost_total) * 100) / 100
  const com = o.code ? Math.round(net * (o.commission_share / 100) * 100) / 100 : 0
  return { fee_pct: 5, discount: 0, children: 0, unit: 'person', commission_share: 0, standard_subtotal: Math.round(o.total / 0.95), ...o, net_profit: net, commission: com, yondo_net: Math.round((net - com) * 100) / 100 }
}
const DEMO = {
  bookings: [
    mk({ id: 1, ref: 'YX-K7P2QA', created_at: new Date(Date.now() - 36e5).toISOString(), name: 'Example Student', phone: '+971500000001', email: 'student@example.com', university: 'Example University', experience_name: 'IMG Worlds of Adventure', option_name: 'IMG Theme Park, Open Dated Tickets', travel_date: addDaysIso(4), adults: 4, total: 1060, cost_total: 620, status: 'new', code: 'SARA10', commission_share: 30, discount: 0 }),
    mk({ id: 2, ref: 'YX-9HC3TM', created_at: new Date(Date.now() - 864e5).toISOString(), name: 'Example Two', phone: '+971500000002', email: 'two@example.com', experience_name: 'Desert safari + Red Sands camp', option_name: 'Safari, full program sharing car', travel_date: addDaysIso(2), adults: 3, total: 600, cost_total: 330, status: 'confirmed', payment_link: 'https://buy.stripe.com/example' }),
    mk({ id: 3, ref: 'YX-2WQ8RN', created_at: new Date(Date.now() - 3 * 864e5).toISOString(), name: 'Example Three', phone: '+971500000003', email: 'three@example.com', experience_name: 'Shared yacht tour', option_name: 'Shared Yacht Tour - Sunset', travel_date: addDaysIso(-1), adults: 2, total: 620, cost_total: 496, status: 'paid' }),
    mk({ id: 4, ref: 'YX-M4XZ7B', created_at: new Date(Date.now() - 6 * 864e5).toISOString(), name: 'Example Four', phone: '+971500000004', email: 'four@example.com', experience_name: 'Global Village', option_name: 'Global Village, Any Day Tickets', travel_date: addDaysIso(-4), adults: 6, total: 180, cost_total: 126, status: 'completed', code: 'SARA10', commission_share: 30 }),
  ],
  trips: [{ id: 1, ref: 'YQ-7TR2KD', created_at: new Date(Date.now() - 2 * 36e5).toISOString(), kind: 'yacht', title: 'Birthday sunset sail', preferred_date: addDaysIso(10), group_size: 12, budget: 'AED 150 to 300 pp', details: 'Cake on board if possible.', name: 'Example Person', email: 'person@example.com', phone: '+971500000005', status: 'new' }],
  waitlist: [{ id: 1, created_at: new Date().toISOString(), name: 'Example Person', email: 'person@example.com', phone: '', university: 'Example University', interest: '50-seat trip: Road trip' }],
  codes: [{ code: 'SARA10', owner_name: 'Sara (example ambassador)', owner_contact: '+971500000009', kind: 'ambassador', customer_discount_pct: 5, commission_share_pct: 30, active: true, uses: 2, revenue: 180, discounts_given: 0, commission_owed: 4.32, commission_paid: 0, created_at: new Date().toISOString() }],
  experiences: [
    { id: 1, name: 'IMG Worlds of Adventure', source_name: 'IMG Worlds of Adventure Theme Park', category: 'thrill', emirate: 'Dubai', featured: true, hidden: false, blurb: '', sort: 0, discount_pct: null, room: { room_min_pct: 4.1, room_max_pct: 39.6 } },
    { id: 2, name: 'Global Village', source_name: 'Global Village', category: 'city', emirate: 'Dubai', featured: true, hidden: false, blurb: '', sort: 0, discount_pct: null, room: { room_min_pct: 8.8, room_max_pct: 8.8 } },
  ],
  settings: { id: 1, fee_pct: 5, profit_floor: 5, default_discount_pct: 5, default_commission_share: 30, site_discount_pct: 5, show_standard_price: true, google_reviews_url: 'https://share.google/wpT4mj3k5yt2fROYn', google_write_review_url: 'https://share.google/wpT4mj3k5yt2fROYn', tiers: [{ id: 'explorer', name: 'Explorer', min: 0, perks: [{ text: 'Your digital passport and badge collection', active: true }] }, { id: 'trailblazer', name: 'Trailblazer', min: 3, perks: [{ text: 'Priority replies on WhatsApp', active: false }] }] },
  imports: [],
}
function addDaysIso(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
