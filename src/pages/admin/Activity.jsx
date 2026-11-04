import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../../App.jsx'
import { supabase } from '../../lib/api.js'
import { aed, niceDateTime } from '../../lib/format.js'
import { Icon } from '../../components/Icon.jsx'
import { Field, Notice } from '../../components/ui.jsx'

const KINDS = {
  booking: ['🎟', 'Booking request'],
  quote: ['🧭', 'Quote request'],
  waitlist: ['📝', 'Joined the waitlist'],
  signup: ['🛂', 'Passport sign-up'],
  visit: ['👀', 'Visitor'],
}
const DEVICE_PREF = 'yx.adminNotify'

function readDevicePrefs() {
  try {
    return { booking: true, quote: true, waitlist: true, signup: true, visit: false, ...(JSON.parse(localStorage.getItem(DEVICE_PREF) || 'null') || {}), on: localStorage.getItem(DEVICE_PREF) !== null }
  } catch {
    return { booking: true, quote: true, waitlist: true, signup: true, visit: false, on: false }
  }
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

export function eventFrom(table, row) {
  if (table === 'bookings')
    return { kind: 'booking', at: row.created_at, title: `${row.experience_name} · ${aed(row.total)}`, sub: `${row.name} · ${row.ref}`, tab: 'inbox' }
  if (table === 'trip_requests')
    return { kind: 'quote', at: row.created_at, title: `${(row.kind || '').replace('-', ' ')}${row.title ? ': ' + row.title : ''} · group of ${row.group_size}`, sub: `${row.name} · ${row.ref}`, tab: 'quotes' }
  if (table === 'waitlist') return { kind: 'waitlist', at: row.created_at, title: row.interest || 'Group trips', sub: row.name, tab: 'waitlist' }
  if (table === 'profiles') return { kind: 'signup', at: row.created_at, title: row.email, sub: row.passport_no || 'New passport', tab: 'customers' }
  if (table === 'visits')
    return {
      kind: 'visit',
      at: row.at,
      title: row.path || '/',
      sub: [row.is_returning ? 'Returning' : 'New', row.device, row.utm_source || hostOf(row.referrer) || 'Direct'].filter(Boolean).join(' · '),
      tab: 'activity',
    }
  return null
}

// Live feed for the whole admin: new rows arrive over the realtime channel and can raise a notification on this device.
export function useLiveActivity(demo) {
  const [feed, setFeed] = useState([])
  const prefs = useRef(readDevicePrefs())
  const push = useCallback((ev) => {
    if (!ev) return
    setFeed((f) => [ev, ...f].slice(0, 200))
    const p = prefs.current
    if (p.on && p[ev.kind] && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        const n = new Notification(`${KINDS[ev.kind][0]} ${KINDS[ev.kind][1]}`, { body: `${ev.title}\n${ev.sub}`, tag: ev.kind + ev.at, icon: '/icon-192.png' })
        n.onclick = () => window.focus()
      } catch {}
    }
  }, [])

  useEffect(() => {
    if (demo) return
    const ch = supabase.channel('admin-activity')
    for (const t of ['bookings', 'trip_requests', 'waitlist', 'profiles', 'visits']) {
      ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: t }, (p) => {
        if (t === 'visits' && !p.new.new_session) return
        push(eventFrom(t, p.new))
      })
    }
    ch.subscribe()
    return () => supabase.removeChannel(ch)
  }, [demo, push])

  return { feed, setFeed, prefs }
}

export default function Activity({ demo, data, live, onGo }) {
  const { showToast } = useApp()
  const [visits, setVisits] = useState(null)
  const [signups, setSignups] = useState([])

  const load = useCallback(async () => {
    if (demo) {
      setVisits(DEMO_VISITS)
      setSignups([])
      return
    }
    const since = new Date(Date.now() - 7 * 864e5).toISOString()
    const [v, p] = await Promise.all([
      supabase.from('visits').select('at,sid,path,referrer,utm_source,device,new_session,is_returning').gte('at', since).order('at', { ascending: false }).limit(10000),
      supabase.from('profiles').select('email,passport_no,created_at').order('created_at', { ascending: false }).limit(50),
    ])
    setVisits(v.data || [])
    setSignups(p.data || [])
  }, [demo])
  useEffect(() => {
    load()
  }, [load])

  // Today in Dubai
  const d0 = useMemo(() => {
    const s = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(new Date())
    return new Date(s + 'T00:00:00+04:00').toISOString()
  }, [])
  const vs = visits || []
  const today = vs.filter((v) => v.at >= d0)
  const stats = {
    visitors: new Set(today.map((v) => v.sid)).size,
    views: today.length,
    bookings: data.bookings.filter((b) => b.created_at >= d0).length,
    requested: data.bookings.filter((b) => b.created_at >= d0).reduce((s, b) => s + Number(b.total || 0), 0),
    quotes: data.trips.filter((t) => t.created_at >= d0).length,
    waitlist: data.waitlist.filter((w) => w.created_at >= d0).length,
  }

  // Last 7 days, visitors per day
  const days = useMemo(() => {
    const out = []
    for (let i = 6; i >= 0; i--) {
      const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(new Date(Date.now() - i * 864e5))
      const start = new Date(day + 'T00:00:00+04:00').toISOString()
      const end = new Date(new Date(day + 'T00:00:00+04:00').getTime() + 864e5).toISOString()
      const inDay = vs.filter((v) => v.at >= start && v.at < end)
      out.push({
        day,
        label: new Date(day + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short' }),
        visitors: new Set(inDay.map((v) => v.sid)).size,
        requests: data.bookings.filter((b) => b.created_at >= start && b.created_at < end).length + data.trips.filter((t) => t.created_at >= start && t.created_at < end).length,
      })
    }
    return out
  }, [vs, data])
  const maxV = Math.max(1, ...days.map((d) => d.visitors))

  const top = (fn) => {
    const m = new Map()
    for (const v of vs) {
      const k = fn(v)
      if (k) m.set(k, (m.get(k) || 0) + 1)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  }
  const topPages = top((v) => v.path)
  const topSources = top((v) => (v.new_session ? v.utm_source || hostOf(v.referrer) || 'Direct' : null))

  // Feed: recent history plus anything that arrived live
  const history = useMemo(() => {
    const evs = [
      ...data.bookings.slice(0, 30).map((r) => eventFrom('bookings', r)),
      ...data.trips.slice(0, 20).map((r) => eventFrom('trip_requests', r)),
      ...data.waitlist.slice(0, 20).map((r) => eventFrom('waitlist', r)),
      ...signups.slice(0, 20).map((r) => eventFrom('profiles', r)),
      ...vs.filter((v) => v.new_session).slice(0, 40).map((r) => eventFrom('visits', r)),
    ]
    return evs.filter(Boolean)
  }, [data, signups, vs])
  const merged = useMemo(() => {
    const seen = new Set()
    return [...live.feed, ...history]
      .filter((e) => {
        const k = e.kind + e.at + e.title
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
      .sort((a, b) => (a.at < b.at ? 1 : -1))
      .slice(0, 60)
  }, [live.feed, history])

  return (
    <div className="activity">
      <div className="kpis compact">
        <Kpi label="Visitors today" value={stats.visitors} />
        <Kpi label="Page views today" value={stats.views} />
        <Kpi label="Booking requests today" value={stats.bookings} sub={stats.requested ? aed(stats.requested) : ''} tone={stats.bookings ? 'alert' : ''} />
        <Kpi label="Quote requests today" value={stats.quotes} />
        <Kpi label="Waitlist today" value={stats.waitlist} />
      </div>

      <div className="act-grid">
        <section className="card">
          <div className="section-head">
            <h2>Live feed</h2>
            <span className="live-dot">Live</span>
          </div>
          {merged.length ? (
            <ul className="feed">
              {merged.map((e, i) => (
                <li key={i}>
                  <button type="button" onClick={() => onGo(e.tab)}>
                    <span className="feed-ico" aria-hidden="true">
                      {KINDS[e.kind][0]}
                    </span>
                    <span className="feed-main">
                      <strong>{KINDS[e.kind][1]}</strong>
                      <span>{e.title}</span>
                      <small>{e.sub}</small>
                    </span>
                    <small className="feed-time">{niceDateTime(e.at)}</small>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Nothing yet. New visitors, requests and sign-ups appear here the moment they happen.</p>
          )}
        </section>

        <div className="act-side">
          <section className="card">
            <h2>Last 7 days</h2>
            <div className="mini-chart" role="img" aria-label={`Visitors per day: ${days.map((d) => `${d.label} ${d.visitors}`).join(', ')}`}>
              {days.map((d) => (
                <div key={d.day} className="mc-col">
                  <span className="mc-val">{d.visitors}</span>
                  <span className="mc-bar" style={{ height: `${Math.max(3, (d.visitors / maxV) * 100)}%` }} />
                  <span className="mc-req">{d.requests ? `${d.requests} req` : ''}</span>
                  <span className="mc-label">{d.label}</span>
                </div>
              ))}
            </div>
            <p className="fine">Visitors per day. "req" is booking plus quote requests.</p>
          </section>
          <section className="card">
            <h2>Top pages</h2>
            <TopList rows={topPages} empty="No visits yet." />
            <h2 className="mt">Where visitors come from</h2>
            <TopList rows={topSources} empty="No visits yet." />
            <p className="fine">Add ?utm_source=instagram to links you share to see them here.</p>
          </section>
        </div>
      </div>

      <Alerts demo={demo} live={live} />
      {!demo && visits === null && <p className="muted">Loading visits…</p>}
    </div>
  )
}

function TopList({ rows, empty }) {
  if (!rows.length) return <p className="muted small">{empty}</p>
  const max = rows[0][1]
  return (
    <ul className="toplist">
      {rows.map(([k, n]) => (
        <li key={k}>
          <span className="tl-bar" style={{ width: `${(n / max) * 100}%` }} />
          <span className="tl-k">{k}</span>
          <span className="tl-n">{n}</span>
        </li>
      ))}
    </ul>
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

// ------------------------------------------------------------ alerts settings
function Alerts({ demo, live }) {
  const { showToast } = useApp()
  const [s, setS] = useState(null)
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState(0)
  const [found, setFound] = useState(null)
  const [dev, setDev] = useState(() => readDevicePrefs())
  const [perm, setPerm] = useState(() => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission))

  useEffect(() => {
    if (demo) return setS({ telegram_token: '', telegram_chat_id: '', webhook_url: '', on_booking: true, on_quote: true, on_waitlist: true, on_signup: true, on_visit: false, daily_summary: true })
    supabase
      .from('notify_settings')
      .select('*')
      .eq('id', 1)
      .single()
      .then(({ data }) => setS(data || {}))
  }, [demo])

  async function save(patch, msg = 'Alerts saved') {
    if (demo) return showToast('Example data. Changes are not saved.', 'error')
    setBusy(true)
    const next = { ...s, ...patch }
    const { error } = await supabase
      .from('notify_settings')
      .update({
        telegram_token: next.telegram_token?.trim() || null, telegram_chat_id: String(next.telegram_chat_id || '').trim() || null,
        webhook_url: next.webhook_url?.trim() || null, on_booking: next.on_booking, on_quote: next.on_quote, on_waitlist: next.on_waitlist,
        on_signup: next.on_signup, on_visit: next.on_visit, daily_summary: next.daily_summary, updated_at: new Date().toISOString(),
      })
      .eq('id', 1)
    setBusy(false)
    if (error) return showToast('Could not save alerts.', 'error')
    setS(next)
    showToast(msg)
  }

  async function findChat() {
    setFound(null)
    const token = (s.telegram_token || '').trim()
    if (!/^\d+:[\w-]{20,}$/.test(token)) return showToast('That doesn’t look like a bot token. It looks like 123456:ABC-xyz…', 'error')
    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/getUpdates`)
      const j = await r.json()
      if (!j.ok) return showToast('Telegram didn’t accept that token. Copy it again from BotFather.', 'error')
      const msgs = (j.result || []).map((u) => u.message || u.channel_post || u.my_chat_member).filter(Boolean)
      const last = msgs[msgs.length - 1]
      if (!last?.chat) return showToast('No messages yet. Send your bot a message in Telegram, then try again.', 'error')
      const c = last.chat
      setFound({ id: String(c.id), name: c.title || [c.first_name, c.last_name].filter(Boolean).join(' ') || c.username })
    } catch {
      showToast('Could not reach Telegram from this browser. Type the chat ID instead.', 'error')
    }
  }

  async function test() {
    if (demo) return showToast('Example data. Test alerts work on the live admin.', 'error')
    const { error } = await supabase.rpc('admin_test_notify')
    showToast(error ? 'Could not send a test.' : 'Test sent. It should arrive within a few seconds.', error ? 'error' : 'ok')
  }

  async function enableDevice() {
    if (typeof Notification === 'undefined') return
    const p = await Notification.requestPermission()
    setPerm(p)
    if (p === 'granted') {
      const next = { ...dev, on: true }
      setDev(next)
      try {
        localStorage.setItem(DEVICE_PREF, JSON.stringify(next))
      } catch {}
      live.prefs.current = next
      new Notification('Yondo alerts on', { body: 'You will see new activity here while the admin is open.', icon: '/icon-192.png' })
    }
  }
  function setDevKind(k, v) {
    const next = { ...dev, [k]: v }
    setDev(next)
    try {
      localStorage.setItem(DEVICE_PREF, JSON.stringify(next))
    } catch {}
    live.prefs.current = next
  }

  if (!s) return null
  const tgOn = !!(s.telegram_token && s.telegram_chat_id)
  const EVENTS = [
    ['on_booking', 'booking', 'Booking requests'],
    ['on_quote', 'quote', 'Quote requests'],
    ['on_waitlist', 'waitlist', 'Waitlist sign-ups'],
    ['on_signup', 'signup', 'Passport sign-ups'],
    ['on_visit', 'visit', 'Every new visitor (can be a lot)'],
  ]

  return (
    <section className="card alerts">
      <h2>Alerts</h2>
      <p className="muted small">Get told the moment something happens, even when the admin is closed. Choose what triggers an alert, then where it goes.</p>

      <div className="alert-grid">
        <div>
          <h3>What sends an alert</h3>
          <div className="toggles">
            {EVENTS.map(([col, , label]) => (
              <label key={col} className="toggle-row">
                <span>{label}</span>
                <span className="switch">
                  <input type="checkbox" checked={!!s[col]} onChange={(e) => save({ [col]: e.target.checked })} />
                  <span />
                </span>
              </label>
            ))}
            <label className="toggle-row">
              <span>Daily summary at 9pm (visitors, requests, top pages)</span>
              <span className="switch">
                <input type="checkbox" checked={!!s.daily_summary} onChange={(e) => save({ daily_summary: e.target.checked })} />
                <span />
              </span>
            </label>
          </div>
        </div>

        <div className="alert-channels">
          <div className={`channel ${tgOn ? 'on' : ''}`}>
            <div className="ch-head">
              <h3>Telegram, on your phone</h3>
              {tgOn && <span className="pill p-auto">Connected</span>}
            </div>
            {tgOn && step === 0 ? (
              <>
                <p className="small muted">Alerts go to chat {s.telegram_chat_id}. Free and instant, even when the admin is closed.</p>
                <div className="btn-row tight">
                  <button className="btn gold small" onClick={test}>
                    Send a test
                  </button>
                  <button className="btn ghost small" onClick={() => setStep(1)}>
                    Change
                  </button>
                  <button className="btn ghost small" onClick={() => save({ telegram_token: '', telegram_chat_id: '' }, 'Telegram disconnected')}>
                    Disconnect
                  </button>
                </div>
              </>
            ) : (
              <ol className="steps-small">
                <li>
                  In Telegram, open <strong>@BotFather</strong>, send <code>/newbot</code>, and name it, e.g. <em>Yondo Alerts</em>. It gives you a token.
                  <Field id="tg-token" label="Bot token">
                    <input id="tg-token" type="password" autoComplete="off" value={s.telegram_token || ''} onChange={(e) => setS({ ...s, telegram_token: e.target.value })} placeholder="123456789:AA…" />
                  </Field>
                </li>
                <li>
                  Open your new bot in Telegram and send it any message, like <em>hi</em>. To alert a team, add the bot to a group and say hi there.
                  <div className="btn-row tight">
                    <button className="btn ghost small" onClick={findChat} disabled={!s.telegram_token}>
                      Find my chat
                    </button>
                  </div>
                  {found && (
                    <Notice tone="ok">
                      Found {found.name} (chat {found.id}).
                    </Notice>
                  )}
                  <Field id="tg-chat" label="Chat ID" optional hint="Filled in by Find my chat.">
                    <input id="tg-chat" value={found?.id || s.telegram_chat_id || ''} onChange={(e) => setS({ ...s, telegram_chat_id: e.target.value })} />
                  </Field>
                </li>
                <li>
                  <div className="btn-row tight">
                    <button
                      className="btn gold small"
                      disabled={busy || !s.telegram_token || !(found?.id || s.telegram_chat_id)}
                      onClick={async () => {
                        await save({ telegram_chat_id: found?.id || s.telegram_chat_id }, 'Telegram connected')
                        setStep(0)
                        setTimeout(test, 400)
                      }}
                    >
                      Connect and send a test
                    </button>
                  </div>
                </li>
              </ol>
            )}
          </div>

          <div className="channel">
            <h3>This device</h3>
            <p className="small muted">Pop-up notifications on this computer or phone while the admin is open in a tab.</p>
            {perm === 'unsupported' ? (
              <p className="small muted">This browser doesn't support notifications.</p>
            ) : perm === 'granted' && dev.on ? (
              <div className="device-kinds">
                {EVENTS.map(([, k, label]) => (
                  <label key={k} className="check">
                    <input type="checkbox" checked={!!dev[k]} onChange={(e) => setDevKind(k, e.target.checked)} />
                    <span>{label.replace(' (can be a lot)', '')}</span>
                  </label>
                ))}
              </div>
            ) : perm === 'denied' ? (
              <p className="small muted">Notifications are blocked for this site. Allow them in your browser's site settings.</p>
            ) : (
              <button className="btn ghost small" onClick={enableDevice}>
                <Icon name="bolt" size={15} /> Turn on for this device
              </button>
            )}
          </div>

          <div className="channel">
            <h3>Webhook (Make, Zapier, WhatsApp, email)</h3>
            <p className="small muted">
              Paste a webhook address from Make or Zapier. Each alert is sent there as JSON, so you can forward it to WhatsApp, email, Google Sheets or
              your CRM.
            </p>
            <div className="inline-edit">
              <input value={s.webhook_url || ''} onChange={(e) => setS({ ...s, webhook_url: e.target.value })} placeholder="https://hook.eu1.make.com/…" aria-label="Webhook address" />
              <button className="btn ghost small" disabled={busy} onClick={() => save({ webhook_url: s.webhook_url }, s.webhook_url ? 'Webhook saved' : 'Webhook removed')}>
                Save
              </button>
            </div>
            {s.webhook_url && (
              <button className="link-btn" onClick={test}>
                Send a test
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

const ago = (m) => new Date(Date.now() - m * 60000).toISOString()
const DEMO_VISITS = [
  { at: ago(3), sid: 'a', path: '/experiences/global-village/', referrer: 'https://www.instagram.com/', utm_source: null, device: 'mobile', new_session: true, is_returning: false },
  { at: ago(4), sid: 'a', path: '/', referrer: '', utm_source: null, device: 'mobile', new_session: false, is_returning: false },
  { at: ago(25), sid: 'b', path: '/explore/desert/', referrer: 'https://www.google.com/', utm_source: null, device: 'desktop', new_session: true, is_returning: true },
  { at: ago(70), sid: 'c', path: '/experiences/img-worlds-of-adventure/', referrer: '', utm_source: 'whatsapp', device: 'mobile', new_session: true, is_returning: false },
  { at: ago(60 * 26), sid: 'd', path: '/', referrer: '', utm_source: null, device: 'mobile', new_session: true, is_returning: false },
  { at: ago(60 * 50), sid: 'e', path: '/trips/', referrer: 'https://www.google.com/', utm_source: null, device: 'desktop', new_session: true, is_returning: false },
]
