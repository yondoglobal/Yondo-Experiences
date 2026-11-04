import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useApp } from '../App.jsx'
import { supabase, sendSignInEmail, verifyCode, signOut } from '../lib/api.js'
import { IS_ARTIFACT, BRAND } from '../lib/config.js'
import { aed, niceDate, niceDateTime, waLink, guestLine, normalisePhone } from '../lib/format.js'
import { CATEGORIES, CAT, todayUAE } from '../lib/catalogue.js'
import { Icon } from '../components/Icon.jsx'
import { Field, Notice, Sheet, CopyButton, Mascot, Photo } from '../components/ui.jsx'
import { PLACE_PHOTOS } from '../lib/photos.js'
import Pricing, { TicketSheet, TicketList, derive, loadPricing, unitLabel, updatedLine, groupLine } from './admin/Pricing.jsx'
import Website from './admin/Website.jsx'
import Customers from './admin/Customers.jsx'
import Activity, { useLiveActivity } from './admin/Activity.jsx'
import ImageField from './admin/ImageField.jsx'
import { CODE_COMMISSION_TYPES } from './admin/money.js'

export function commissionTerms(type, value) {
  const v = Number(value) || 0
  switch (type) {
    case 'sale_pct':
      return `${v}% of the sale`
    case 'fixed_ticket':
      return `AED ${v} per ticket`
    case 'fixed_booking':
      return `AED ${v} per booking`
    default:
      return `${v}% of profit`
  }
}

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
  const [mode, setMode] = useState('password')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const addr = email.trim().toLowerCase()

  async function passwordSignIn(e) {
    e.preventDefault()
    if (IS_ARTIFACT) return setMsg('Sign-in works on the live site, not in this preview.')
    if (!addr || !pw) return setMsg('Enter your admin email and password.')
    setBusy(true)
    setMsg('')
    const { error } = await supabase.auth.signInWithPassword({ email: addr, password: pw })
    setBusy(false)
    if (error) setMsg(/rate|many/i.test(error.message) ? 'Too many attempts. Wait a minute and try again.' : 'That email and password don’t match.')
  }

  return (
    <div className="wrap admin-gate">
      <div className="card">
        <Mascot pose="phoneThumbs" alt="" className="gate-mascot" />
        <h1>Yondo admin</h1>
        <p className="muted">Bookings, prices, offers, codes and the website. Admin accounts only.</p>
        {mode === 'password' ? (
          <form onSubmit={passwordSignIn}>
            <Field id="ad-email" label="Admin email">
              <input id="ad-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            </Field>
            <Field id="ad-pw" label="Password">
              <div className="pw-wrap">
                <input id="ad-pw" type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
                <button type="button" className="link-btn" onClick={() => setShow(!show)} aria-pressed={show}>
                  {show ? 'Hide' : 'Show'}
                </button>
              </div>
            </Field>
            <button className="btn gold block" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
            <button type="button" className="link-btn center" onClick={() => { setMode('code'); setMsg('') }}>
              Email me a one-time code instead
            </button>
          </form>
        ) : !sent ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const r = await sendSignInEmail(addr, 'admin')
              if (r.ok) setSent(true)
              else setMsg(r.error)
            }}
          >
            <Field id="ad-email2" label="Admin email">
              <input id="ad-email2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </Field>
            <button className="btn gold block">Email me a code</button>
            <button type="button" className="link-btn center" onClick={() => { setMode('password'); setMsg('') }}>
              Use my password
            </button>
          </form>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const r = await verifyCode(addr, code)
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
  const { showToast, session } = useApp()
  const tempPassword = !demo && !!session?.user?.user_metadata?.temp_password
  const live = useLiveActivity(demo)
  useEffect(() => {
    // Don't count the admin's own browsing in visitor stats.
    if (!demo)
      try {
        localStorage.setItem('yx.noTrack', '1')
      } catch {}
  }, [demo])
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
    ['activity', 'Activity & alerts', 0],
    ['customers', 'Customers', 0],
    ['pricing', 'Pricing & offers', 0],
    ['catalogue', 'Catalogue & photos', 0],
    ['codes', 'Referral codes', 0],
    ['website', 'Website', 0],
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
        {tempPassword && tab !== 'settings' && (
          <Notice tone="info">
            You're signed in with a temporary password.{' '}
            <button className="link-btn" onClick={() => setTab('settings')}>
              Set your own in Settings
            </button>
          </Notice>
        )}
        {loading ? (
          <p className="muted">Loading…</p>
        ) : tab === 'inbox' ? (
          <Inbox bookings={d.bookings} settings={d.settings} demo={demo} onChange={load} />
        ) : tab === 'quotes' ? (
          <Quotes trips={d.trips} demo={demo} onChange={load} />
        ) : tab === 'codes' ? (
          <Codes codes={d.codes} settings={d.settings} demo={demo} onChange={load} />
        ) : tab === 'activity' ? (
          <Activity demo={demo} data={d} live={live} onGo={setTab} />
        ) : tab === 'customers' ? (
          <Customers demo={demo} />
        ) : tab === 'pricing' ? (
          <Pricing settings={d.settings} demo={demo} onChange={load} />
        ) : tab === 'website' ? (
          <Website settings={d.settings} demo={demo} onChange={load} />
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
    done: `Hope you loved ${b.experience_name}, ${first}! Your stamp is in your Yondo passport: ${BRAND.site}/passport/\n\nIf you have a minute, a Google review helps us a lot: ${reviewLink}`,
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
                    Commission to {b.code} ({commissionTerms(b.commission_type, b.commission_value ?? b.commission_share)})
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
  const blank = { code: '', owner_name: '', owner_contact: '', kind: 'ambassador', customer_discount_pct: settings?.default_discount_pct ?? 5, commission_type: 'profit_pct', commission_value: settings?.default_commission_share ?? 30, max_uses: '', expires_at: '' }
  const [f, setF] = useState(blank)
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: k === 'code' ? e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') : e.target.value })

  async function create(e) {
    e.preventDefault()
    if (demo) return showToast('Example data. Changes are not saved.', 'error')
    if (f.code.length < 3 || !f.owner_name.trim()) return setErr('Add a code (3+ characters) and who owns it.')
    const cv = Number(f.commission_value) || 0
    if (f.commission_type.endsWith('pct') && cv > 100) return setErr('A percentage commission can’t be over 100%.')
    const row = {
      ...f, max_uses: f.max_uses ? parseInt(f.max_uses) : null, expires_at: f.expires_at || null, customer_discount_pct: Number(f.customer_discount_pct),
      commission_value: cv, commission_share_pct: f.commission_type === 'profit_pct' ? cv : 0,
    }
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
          The customer discount only applies where the ticket has margin to spare, and never pushes Yondo's profit (after this commission) below your
          floor. Commission is owed on paid and completed bookings.
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
          <Field id="c-ctype" label="Commission paid as">
            <div className="select-wrap full">
              <select id="c-ctype" value={f.commission_type} onChange={set('commission_type')}>
                {CODE_COMMISSION_TYPES.map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
              <Icon name="down" size={16} />
            </div>
          </Field>
          <Field id="c-share" label={f.commission_type.endsWith('pct') ? 'Commission %' : 'Commission AED'}>
            <input id="c-share" type="number" min={0} step="0.5" value={f.commission_value} onChange={set('commission_value')} />
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
                    <small>{commissionTerms(c.commission_type, c.commission_value ?? c.commission_share_pct)}</small>
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
function photoKind(e) {
  if (e.image_url) return ['own', 'Your photo']
  if (PLACE_PHOTOS.has(e.image_key)) return ['place', 'Photo of the place']
  return ['activity', 'Activity photo']
}

function Catalogue({ experiences, imports, settings, demo, onChange }) {
  const siteD = Number(settings?.site_discount_pct ?? 5)
  const { showToast } = useApp()
  const [filter, setFilter] = useState('')
  const [view, setView] = useState('all')
  const [edit, setEdit] = useState(null)
  const [ticket, setTicket] = useState(null)
  const [openRows, setOpenRows] = useState(() => new Set())
  const toggleRow = (id) =>
    setOpenRows((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  const [prices, setPrices] = useState(null)
  const loadPrices = useCallback(async () => {
    try {
      setPrices(await loadPricing(demo))
    } catch {
      setPrices([])
    }
  }, [demo])
  useEffect(() => {
    loadPrices()
  }, [loadPrices])
  const byExp = useMemo(() => {
    const today = todayUAE()
    const m = {}
    for (const r of prices || []) (m[r.experience_id] ||= []).push(derive(r, settings, today))
    for (const k of Object.keys(m)) m[k].sort((a, b) => a.pkg.price - b.pkg.price)
    return m
  }, [prices, settings])
  const needPhoto = experiences.filter((e) => !e.hidden && photoKind(e)[0] === 'activity').length
  const list = experiences.filter((e) => {
    if (view === 'photo' && (e.hidden || photoKind(e)[0] !== 'activity')) return false
    if (view === 'hidden' && !e.hidden) return false
    if (view === 'featured' && !e.featured) return false
    return !filter || (e.name + e.category + e.source_name).toLowerCase().includes(filter.toLowerCase())
  })

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
          <div>
            <h2>Experiences</h2>
            <p className="muted small">
              Names, descriptions, photos and what shows on the site. Show prices on any row to see buying, market and our price with the PG fee and margin for every ticket.{' '}
              {needPhoto > 0 && `${needPhoto} live ${needPhoto === 1 ? 'experience uses' : 'experiences use'} an activity photo rather than a photo of the actual place; upload the supplier's photo to replace it.`}
            </p>
          </div>
        </div>
        <div className="admin-filters">
          <div className="seg">
            {[['all', 'All'], ['photo', `Needs a real photo (${needPhoto})`], ['featured', 'Featured'], ['hidden', 'Hidden']].map(([id, l]) => (
              <button key={id} className={view === id ? 'on' : ''} onClick={() => setView(id)}>
                {l}
              </button>
            ))}
          </div>
          <input className="admin-search" placeholder="Filter" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter experiences" />
          <button className="btn ghost small" onClick={() => setOpenRows(openRows.size ? new Set() : new Set(list.filter((e) => byExp[e.id]?.length).map((e) => e.id)))}>
            {openRows.size ? 'Collapse all prices' : 'Show all prices'}
          </button>
        </div>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Photo</th>
                <th>Name on site</th>
                <th>Category</th>
                <th>Prices</th>
                <th className="num">Yondo discount</th>
                <th>Featured</th>
                <th>Shown</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((e) => {
                const [kind, kindLabel] = photoKind(e)
                const rows = byExp[e.id]
                const expanded = openRows.has(e.id)
                return (
                  <Fragment key={e.id}>
                  <tr className={`${e.hidden ? 'dim' : ''} ${expanded ? 'expanded' : ''}`}>
                    <td>
                      <button className="thumb-btn" onClick={() => setEdit(e)} aria-label={`Change photo for ${e.name}`}>
                        <Photo imgKey={e.image_key} url={e.image_url} cat={e.category} w={160} h={110} className="thumb" />
                      </button>
                      <small className={`photo-kind k-${kind}`}>{kindLabel}</small>
                    </td>
                    <td>
                      <strong>{e.name}</strong>
                      <small>
                        {e.emirate} · {e.source_name}
                      </small>
                      {e.offer_label && <span className="offer-tag inline">{e.offer_label}</span>}
                    </td>
                    <td>{CAT[e.category]?.label || e.category}</td>
                    <td>
                      <PriceSummary rows={rows} loading={prices === null} />
                      {rows?.length > 0 && (
                        <button type="button" className="link-btn small-link" aria-expanded={expanded} onClick={() => toggleRow(e.id)}>
                          {expanded ? 'Hide prices' : 'Show prices'} <Icon name={expanded ? 'up' : 'down'} size={14} />
                        </button>
                      )}
                    </td>
                    <td className="num">
                      {e.discount_pct != null ? `${Number(e.discount_pct)}%` : `${siteD}%`}
                      <small>{e.discount_pct != null ? 'own setting' : 'site default'}</small>
                    </td>
                    <td>
                      <label className="switch">
                        <input type="checkbox" checked={e.featured} onChange={() => save(e.id, { featured: !e.featured }, e.featured ? 'Removed from favourites' : 'Added to favourites on the home page')} />
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
                  {expanded && rows?.length > 0 && (
                    <tr className="price-expand">
                      <td colSpan={8}>
                        <InlinePrices rows={rows} onOpen={setTicket} />
                      </td>
                    </tr>
                  )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      {ticket && (
        <TicketSheet
          r={ticket}
          settings={settings}
          demo={demo}
          onClose={() => setTicket(null)}
          onSaved={() => {
            loadPrices()
            onChange()
          }}
        />
      )}
      {edit && (
        <EditExperience
          e={edit}
          siteD={siteD}
          demo={demo}
          hidden={!!ticket}
          tickets={prices === null ? null : byExp[edit.id] || []}
          onOpenTicket={setTicket}
          onClose={() => setEdit(null)}
          onSave={(fields) => {
            save(edit.id, fields)
            setEdit(null)
          }}
        />
      )}
    </div>
  )
}

// Every ticket of one experience, with the full money breakdown, right inside the catalogue.
function InlinePrices({ rows, onOpen }) {
  return (
    <div className="inline-prices">
      <table>
        <thead>
          <tr>
            <th>Ticket</th>
            <th className="num">Buying</th>
            <th className="num">Market</th>
            <th className="num">Our price</th>
            <th className="num">PG {rows[0]?.fee}%</th>
            <th className="num">Yondo keeps</th>
            <th className="num">Margin</th>
            <th>Last updated</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.option_key} className={r.status === 'hidden' ? 'dim' : ''}>
              <td>
                <strong>{r.ticket}</strong>
                <small>
                  {unitLabel(r)}
                  {r.status !== 'auto' && <span className={`pill p-${r.status} tiny`}>{STATUS_SHORT[r.status]}</span>}
                </small>
                {groupLine(r) && <small className="group-small">{groupLine(r)}</small>}
              </td>
              <td className="num">{aed(r.pkg.cost)}</td>
              <td className="num">{aed(r.pkg.standard)}</td>
              <td className="num strong">{aed(r.pkg.price)}</td>
              <td className="num">−{aed(r.b.fee)}</td>
              <td className={`num ${r.b.net < 0 ? 'neg' : r.b.net < r.floor ? 'warn-text' : 'pos'}`}>{aed(r.b.net)}</td>
              <td className="num">{Number(r.b.marginPct).toFixed(1)}%</td>
              <td>
                <small className="updated-cell">{updatedLine(r)}</small>
              </td>
              <td>
                <button className="btn ghost small" onClick={() => onOpen(r)}>
                  Edit prices
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
const STATUS_SHORT = { offer: 'Own price', scheduled: 'Scheduled', hidden: 'Hidden: under floor', off: 'Experience hidden' }

function PriceSummary({ rows, loading }) {
  if (loading) return <span className="muted">…</span>
  if (!rows?.length) return <span className="muted">No current prices</span>
  const live = rows.filter((r) => r.status !== 'hidden')
  const margins = live.map((r) => r.b.marginPct)
  const latest = rows.reduce((m, r) => (r.updated_at > m ? r.updated_at : m), '')
  return (
    <>
      {live.length ? `From ${aed(Math.min(...live.map((r) => r.pkg.price)))}` : 'All hidden'}
      <small>
        {rows.length} {rows.length === 1 ? 'ticket' : 'tickets'}
        {margins.length
          ? Math.round(Math.min(...margins)) === Math.round(Math.max(...margins))
            ? ` · margin ${Math.round(margins[0])}%`
            : ` · margin ${Math.round(Math.min(...margins))}–${Math.round(Math.max(...margins))}%`
          : ''}
      </small>
      {latest && <small>Updated {niceDate(latest, { day: 'numeric', month: 'short' })}</small>}
    </>
  )
}

function EditExperience({ e, siteD, demo, hidden, tickets, onOpenTicket, onClose, onSave }) {
  const [f, setF] = useState({
    name: e.name, category: e.category, emirate: e.emirate || '', blurb: e.blurb || '', image_url: e.image_url || '', image_key: e.image_key || '',
    image_credit: e.image_credit || '', offer_label: e.offer_label || '', sort: e.sort || 0, discount_pct: e.discount_pct ?? '',
  })
  const set = (k) => (ev) => setF({ ...f, [k]: ev.target.value })
  return (
    <Sheet open={!hidden} onClose={onClose} title={`Edit ${e.name}`}>
      <form
        className="form-grid"
        onSubmit={(ev) => {
          ev.preventDefault()
          onSave({
            ...f,
            name: f.name.trim() || e.name,
            sort: parseInt(f.sort) || 0,
            image_url: f.image_url || null,
            image_credit: f.image_url ? f.image_credit.trim() || null : null,
            offer_label: f.offer_label.trim() || null,
            discount_pct: f.discount_pct === '' ? null : Math.min(60, Math.max(0, Number(f.discount_pct))),
          })
        }}
      >
        <ImageField
          id="ee-photo"
          label="Photo"
          value={f.image_url || (f.image_key !== e.image_key ? f.image_key : '')}
          fallbackKey={e.image_key}
          cat={f.category}
          folder="experiences"
          demo={demo}
          credit={f.image_credit}
          onCredit={(v) => setF({ ...f, image_credit: v })}
          onChange={(v) => setF(/^https?:/.test(v) ? { ...f, image_url: v } : v ? { ...f, image_key: v, image_url: '' } : { ...f, image_url: '', image_key: e.image_key })}
          hint="Best: the supplier's official photo (ask for their media kit). Landscape, at least 1600px wide. Only use photos you have the rights to."
        />
        <div className="field">
          <span className="image-field-label">Tickets and prices</span>
          <TicketList rows={tickets} onOpen={onOpenTicket} />
          <small className="hint">Tap a ticket to change its buying price, market price or our price.</small>
        </div>
        <Field id="ee-name" label="Name on site">
          <input id="ee-name" value={f.name} onChange={set('name')} maxLength={60} />
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
        <Field id="ee-badge" label="Badge on the card" optional hint="A short tag like Student favourite or New. Ticket offers set their own badge in Pricing.">
          <input id="ee-badge" value={f.offer_label} onChange={set('offer_label')} maxLength={28} />
        </Field>
        <div className="two">
          <Field
            id="ee-disc"
            label="Yondo discount (%)"
            optional
            hint={`Empty uses the site default (${siteD}%).${e.room?.room_min_pct != null ? ` Room before your floor: ${Math.max(0, e.room.room_min_pct)}% on every ticket, up to ${Math.max(0, e.room.room_max_pct)}% on some.` : ''}`}
          >
            <input id="ee-disc" type="number" min={0} max={60} step="0.5" value={f.discount_pct} onChange={set('discount_pct')} placeholder={`${siteD}`} />
          </Field>
          <Field id="ee-sort" label="Sort order" hint="Lower numbers show first.">
            <input id="ee-sort" type="number" value={f.sort} onChange={set('sort')} />
          </Field>
        </div>
        <p className="fine">Supplier name: {e.source_name}</p>
        <button className="btn gold">Save changes</button>
      </form>
    </Sheet>
  )
}

const SUPPLIER_HEADER = ['Tour or Attraction', 'Ticket Name', 'Points of origin', 'Pricing Period Start', 'Pricing Period End', 'Rec.Price/Adult (AED)', 'Rec.Price/Child (AED)', 'Rec.Price/Trip (AED)', 'B2B Rate/Adult (AED)', 'B2B Rate/Child (AED)', 'B2B Rate/Trip (AED)']

function PriceImport({ imports, demo, onDone }) {
  const { showToast } = useApp()
  const [rows, setRows] = useState(null)
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function onFile(e) {
    const fl = e.target.files?.[0]
    e.target.value = ''
    if (!fl) return
    setErr('')
    setPreview(null)
    setFile(fl.name)
    let parsed
    try {
      const XLSX = await loadSheetJS()
      const wb = XLSX.read(await fl.arrayBuffer(), { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      parsed = parseSupplierRows(XLSX.utils.sheet_to_json(ws, { header: 1, raw: true }))
      if (parsed.length < 10) throw new Error('few')
    } catch (ex) {
      setRows(null)
      return setErr('That file doesn’t look like the supplier price list. It needs the same columns as the supplier sheet (or the file you download here).')
    }
    setRows(parsed)
    if (demo) return
    setBusy(true)
    const { data, error } = await supabase.rpc('admin_preview_prices', { p_rows: parsed })
    setBusy(false)
    if (error) return setErr('Could not compare with current prices. You can still import.')
    setPreview(data)
  }

  async function doImport() {
    if (demo) return showToast('Example data. Changes are not saved.', 'error')
    setBusy(true)
    const { data, error } = await supabase.rpc('admin_import_prices', { p_rows: rows, p_source: file })
    setBusy(false)
    if (error || !data?.ok) return setErr(data?.error || 'Import failed. Nothing was changed.')
    showToast(`Prices updated: ${data.rows} rows. The site is using them now.`)
    if (data.newAttractions?.length) setErr(`New in this list (hidden until you review them below): ${data.newAttractions.join(', ')}`)
    setRows(null)
    setPreview(null)
    onDone()
  }

  async function download() {
    if (demo) return showToast('Example data. Download works on the live site.', 'error')
    setBusy(true)
    try {
      const [XLSX, res] = await Promise.all([
        loadSheetJS(),
        supabase.from('price_rows').select('attraction,ticket,origins,period_start,period_end,rec_adult,rec_child,rec_trip,cost_adult,cost_child,cost_trip').order('attraction').order('ticket').order('period_start').limit(10000),
      ])
      if (res.error) throw res.error
      const us = (iso) => {
        const [y, m, d] = iso.split('-')
        return `${parseInt(m)}/${parseInt(d)}/${y}`
      }
      const aoa = [SUPPLIER_HEADER, ...res.data.map((r) => [r.attraction, r.ticket, r.origins || '', us(r.period_start), us(r.period_end), +r.rec_adult, +r.rec_child, +r.rec_trip, +r.cost_adult, +r.cost_child, +r.cost_trip])]
      const ws = XLSX.utils.aoa_to_sheet(aoa)
      ws['!cols'] = [{ wch: 38 }, { wch: 52 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, ...Array(6).fill({ wch: 11 })]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
      XLSX.writeFile(wb, `yondo-prices-${todayUAE()}.xlsx`)
    } catch {
      showToast('Could not build the file. Try again.', 'error')
    }
    setBusy(false)
  }

  const attractions = rows ? new Set(rows.map((r) => r.attraction)).size : 0
  const removedShare = preview && preview.same + preview.changed + preview.removed > 0 ? preview.removed / (preview.same + preview.changed + preview.removed) : 0
  return (
    <div className="card price-import">
      <div className="section-head">
        <div>
          <h2>Update prices from Excel</h2>
          <p className="muted small">
            Upload the supplier's latest list, or download the current prices, edit them in Excel and upload the file back. You see every change
            before anything goes live. Your rates, offers and margins recalculate automatically.
          </p>
        </div>
        <button className="btn ghost small" onClick={download} disabled={busy}>
          <Icon name="download" size={16} /> Download current prices
        </button>
      </div>
      <label className="upload">
        <input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} />
        <Icon name="upload" size={18} /> {file || 'Choose a price list (.xlsx)'}
      </label>
      {rows && (
        <div className="import-review">
          <p>
            <strong>{rows.length}</strong> price rows across <strong>{attractions}</strong> attractions in this file.
          </p>
          {busy && !preview && <p className="muted">Comparing with current prices…</p>}
          {preview && (
            <>
              <div className="kpis compact">
                <div className="kpi">
                  <small>Price changes</small>
                  <strong>{preview.changed}</strong>
                </div>
                <div className="kpi">
                  <small>New tickets</small>
                  <strong>{preview.new}</strong>
                </div>
                <div className={`kpi ${removedShare > 0.25 ? 'warn' : ''}`}>
                  <small>Removed tickets</small>
                  <strong>{preview.removed}</strong>
                </div>
                <div className="kpi">
                  <small>Buy price up</small>
                  <strong>{preview.costUp}</strong>
                </div>
                <div className="kpi">
                  <small>Buy price down</small>
                  <strong>{preview.costDown}</strong>
                </div>
                <div className="kpi">
                  <small>Unchanged</small>
                  <strong>{preview.same}</strong>
                </div>
              </div>
              {removedShare > 0.25 && (
                <Notice tone="error">
                  This file would remove {Math.round(removedShare * 100)}% of current tickets. Check it's the full price list before importing.
                </Notice>
              )}
              {preview.newAttractions?.length > 0 && (
                <Notice tone="info">New attractions arrive hidden so you can name and photograph them first: {preview.newAttractions.join(', ')}.</Notice>
              )}
              {preview.changes?.length > 0 && (
                <div className="table-wrap import-diff">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Change</th>
                        <th>Ticket</th>
                        <th className="num">Standard</th>
                        <th className="num">Buy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.changes.map((c, i) => (
                        <tr key={i}>
                          <td>
                            <span className={`pill d-${c.kind}`}>{c.kind === 'changed' ? 'Changed' : c.kind === 'new' ? 'New' : 'Removed'}</span>
                          </td>
                          <td>
                            <strong>{c.attraction}</strong>
                            <small>
                              {c.ticket} · {niceDate(c.from, { day: 'numeric', month: 'short' })} to {niceDate(c.to, { day: 'numeric', month: 'short', year: '2-digit' })}
                            </small>
                          </td>
                          <td className="num">
                            <Delta a={c.oldStd} b={c.newStd} />
                          </td>
                          <td className="num">
                            <Delta a={c.oldCost} b={c.newCost} invert />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.changed + preview.new + preview.removed > preview.changes.length && (
                    <p className="fine">Showing the first {preview.changes.length} changes.</p>
                  )}
                </div>
              )}
            </>
          )}
          <div className="btn-row">
            <button className="btn gold" disabled={busy} onClick={doImport}>
              {busy && preview ? 'Importing…' : 'Apply these prices'}
            </button>
            <button className="btn ghost" onClick={() => { setRows(null); setPreview(null); setFile('') }}>
              Cancel
            </button>
          </div>
        </div>
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

function Delta({ a, b, invert }) {
  const n = (x) => (x == null ? null : Number(x))
  a = n(a)
  b = n(b)
  if (a == null && b == null) return '—'
  if (a == null) return aed(b)
  if (b == null) return <s>{aed(a)}</s>
  if (a === b) return aed(b)
  const up = b > a
  return (
    <span className={`delta ${up !== !!invert ? 'good' : 'bad'}`}>
      <s>{aed(a)}</s> {aed(b)}
    </span>
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
    s.onerror = () => {
      sheetJs = null
      rej(new Error('load'))
    }
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

// Reads the supplier sheet (or our own export). Columns are found by their headings, so moved columns still work.
export function parseSupplierRows(raw) {
  const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
  const num = (x) => {
    const n = parseFloat(String(x ?? '').replace(/[^\d.-]/g, ''))
    return isNaN(n) ? 0 : Math.round(n * 100) / 100
  }
  const hi = raw.findIndex((r) => Array.isArray(r) && r.some((c) => /ticket/i.test(String(c ?? ''))))
  const head = hi >= 0 ? raw[hi].map((h) => String(h ?? '').toLowerCase()) : []
  const find = (re, fb) => {
    const i = head.findIndex((h) => re.test(h))
    return i >= 0 ? i : fb
  }
  const col = {
    attraction: find(/tour|attraction/, 0), ticket: find(/ticket/, 1), origins: find(/origin/, 2), start: find(/start/, 3), end: find(/\bend\b/, 4),
    ra: find(/rec.*adult/, 5), rc: find(/rec.*child/, 6), rt: find(/rec.*trip/, 7),
    ca: find(/(b2b|cost|buy|net).*adult/, 8), cc: find(/(b2b|cost|buy|net).*child/, 9), ct: find(/(b2b|cost|buy|net).*trip/, 10),
  }
  const out = []
  for (const r of raw.slice(hi >= 0 ? hi + 1 : 1)) {
    if (!r || !r[col.attraction] || !r[col.ticket]) continue
    const start = excelDate(r[col.start])
    const end = excelDate(r[col.end])
    if (!start || !end) continue
    out.push({
      attraction: norm(r[col.attraction]), ticket: norm(r[col.ticket]), origins: norm(r[col.origins]), start, end,
      rec_adult: num(r[col.ra]), rec_child: num(r[col.rc]), rec_trip: num(r[col.rt]), cost_adult: num(r[col.ca]), cost_child: num(r[col.cc]), cost_trip: num(r[col.ct]),
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
      <PasswordCard demo={demo} />
      <div className="card">
        <h2>Yondo rates</h2>
        <p className="muted small">
          Your rate is the standard price (the supplier's recommended retail price) minus this discount. The standard price shows struck through
          next to it. A ticket is never discounted below your profit floor; set offers and per-experience discounts in Pricing & offers.
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

function PasswordCard({ demo }) {
  const { showToast, session } = useApp()
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const temp = !!session?.user?.user_metadata?.temp_password
  async function save(e) {
    e.preventDefault()
    if (demo) return showToast('Example data. Changes are not saved.', 'error')
    if (a.length < 10) return setErr('Use at least 10 characters.')
    if (!/[a-zA-Z]/.test(a) || !/\d/.test(a)) return setErr('Mix letters and numbers.')
    if (a !== b) return setErr('The two passwords don’t match.')
    setErr('')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: a, data: { temp_password: false } })
    setBusy(false)
    if (error) return setErr(/same|different/i.test(error.message) ? 'Choose a password you haven’t used here before.' : 'Could not change the password. Sign out, sign in again and retry.')
    setA('')
    setB('')
    showToast('Password changed')
  }
  return (
    <form className={`card ${temp ? 'highlight' : ''}`} onSubmit={save}>
      <h2>Your password</h2>
      <p className="muted small">
        {temp ? 'You signed in with a temporary password. Choose your own now.' : `Signed in as ${session?.user?.email || 'admin'}.`} Use 10+ characters with letters and
        numbers.
      </p>
      <input type="text" name="username" autoComplete="username" value={session?.user?.email || ''} readOnly hidden />
      <div className="form-row">
        <Field id="pw-new" label="New password">
          <input id="pw-new" type="password" autoComplete="new-password" value={a} onChange={(e) => setA(e.target.value)} />
        </Field>
        <Field id="pw-new2" label="Type it again">
          <input id="pw-new2" type="password" autoComplete="new-password" value={b} onChange={(e) => setB(e.target.value)} />
        </Field>
      </div>
      {err && <Notice tone="error">{err}</Notice>}
      <button className="btn gold" disabled={busy || !a}>
        {busy ? 'Saving…' : 'Change password'}
      </button>
    </form>
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
  codes: [{ code: 'SARA10', owner_name: 'Sara (example ambassador)', owner_contact: '+971500000009', kind: 'ambassador', customer_discount_pct: 5, commission_share_pct: 30, commission_type: 'profit_pct', commission_value: 30, active: true, uses: 2, revenue: 180, discounts_given: 0, commission_owed: 4.32, commission_paid: 0, created_at: new Date().toISOString() }],
  experiences: [
    { id: 1, name: 'IMG Worlds of Adventure', source_name: 'IMG Worlds of Adventure Theme Park', category: 'thrill', emirate: 'Dubai', featured: true, hidden: false, blurb: '', sort: 0, discount_pct: null, image_key: 'coaster', room: { room_min_pct: 4.1, room_max_pct: 39.6 } },
    { id: 2, name: 'Global Village', source_name: 'Global Village', category: 'city', emirate: 'Dubai', featured: true, hidden: false, blurb: '', sort: 0, discount_pct: null, image_key: 'global-village', offer_label: 'Student favourite', room: { room_min_pct: 8.8, room_max_pct: 8.8 } },
  ],
  settings: { id: 1, content: {}, fee_pct: 5, profit_floor: 5, default_discount_pct: 5, default_commission_share: 30, site_discount_pct: 5, show_standard_price: true, google_reviews_url: 'https://share.google/wpT4mj3k5yt2fROYn', google_write_review_url: 'https://share.google/wpT4mj3k5yt2fROYn', tiers: [{ id: 'explorer', name: 'Explorer', min: 0, perks: [{ text: 'Your digital passport and badge collection', active: true }] }, { id: 'trailblazer', name: 'Trailblazer', min: 3, perks: [{ text: 'Priority replies on WhatsApp', active: false }] }] },
  imports: [],
}
function addDaysIso(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
