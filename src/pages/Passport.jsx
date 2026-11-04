import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApp } from '../App.jsx'
import { api, sendSignInEmail, verifyCode, signOut } from '../lib/api.js'
import { IS_ARTIFACT } from '../lib/config.js'
import { aed, niceDate, guestLine } from '../lib/format.js'
import { DEFAULT_TIERS } from '../lib/catalogue.js'
import { BADGES, badgesFor, stampsFrom, tierFor, EXAMPLE_PASSPORT } from '../lib/passport.js'
import { Icon } from '../components/Icon.jsx'
import { Field, Notice, Mascot, Sheet, MASCOT } from '../components/ui.jsx'
import { PassportCover, PassportDataPage, Stamp, BadgeTile, TierTrack } from '../components/PassportParts.jsx'
import { STATUS_STEPS } from './Track.jsx'

export default function Passport() {
  const { session, catalogue, route } = useApp()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = 'Your passport | Yondo Experiences'
  }, [])

  const load = useCallback(async () => {
    if (!session) return
    setLoading(true)
    const r = await api.myPassport()
    setLoading(false)
    if (r?.ok) setData(r)
    else setError(r?.error || 'We could not open your passport. Try again.')
  }, [session])

  useEffect(() => {
    load()
  }, [load])

  if (route.name === 'auth' && !session) {
    return (
      <div className="wrap passport-loading">
        <PassportCover />
        <p className="muted">Signing you in…</p>
      </div>
    )
  }

  if (session && (data || loading)) {
    if (!data) return <div className="wrap passport-loading"><PassportCover /><p className="muted">Opening your passport…</p></div>
    return <PassportView data={data} tiers={data.tiers || catalogue.tiers} onRefresh={load} email={session.user.email} />
  }

  return (
    <div className="passport-out">
      <section className="pp-hero">
        <div className="wrap pp-hero-grid">
          <div>
            <h1>Your Yondo passport</h1>
            <p>
              Every experience you complete earns a stamp. Stamps unlock badges and move you up the tiers, from Explorer to Yondo Icon. Bookings made
              with your email are added automatically.
            </p>
            {error && <Notice tone="error">{error}</Notice>}
            <SignIn />
          </div>
          <div className="pp-hero-visual" aria-hidden="true">
            <PassportCover />
          </div>
        </div>
      </section>
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <h2>What's inside</h2>
          </div>
          <ExamplePassport tiers={catalogue.tiers} />
        </div>
      </section>
    </div>
  )
}

function SignIn() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  async function send(e) {
    e.preventDefault()
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email.trim())) return setMsg({ tone: 'error', text: 'Check your email address.' })
    setBusy(true)
    const r = await sendSignInEmail(email.trim().toLowerCase(), 'passport')
    setBusy(false)
    if (r.ok) {
      setSent(true)
      setMsg(null)
    } else setMsg({ tone: IS_ARTIFACT ? 'info' : 'error', text: r.error })
  }
  async function verify(e) {
    e.preventDefault()
    if (code.trim().length < 6) return setMsg({ tone: 'error', text: 'Enter the code from the email.' })
    setBusy(true)
    const r = await verifyCode(email.trim().toLowerCase(), code)
    setBusy(false)
    if (!r.ok) setMsg({ tone: 'error', text: r.error })
  }

  return (
    <div className="card signin">
      {!sent ? (
        <form onSubmit={send} noValidate>
          <Field id="si-email" label="Your email" hint="Use the email you book with so your stamps find you.">
            <input id="si-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@university.ac.ae" />
          </Field>
          <button className="btn gold block" type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Email me a sign-in link'}
          </button>
          <small className="muted">No password needed. We'll never post or share anything.</small>
        </form>
      ) : (
        <form onSubmit={verify} noValidate>
          <Notice tone="ok">
            Check your inbox at <strong>{email}</strong>. Tap the link on this device, or type the code from the email below.
          </Notice>
          <Field id="si-code" label="Code from the email">
            <input id="si-code" className="mono code-input" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))} />
          </Field>
          <button className="btn gold block" type="submit" disabled={busy}>
            {busy ? 'Checking…' : 'Open my passport'}
          </button>
          <button type="button" className="link-btn" onClick={() => { setSent(false); setCode('') }}>
            Use a different email
          </button>
        </form>
      )}
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
    </div>
  )
}

function ExamplePassport({ tiers }) {
  const stamps = stampsFrom(EXAMPLE_PASSPORT.bookings)
  const t = tierFor(stamps.length, tiers)
  const badges = badgesFor(stamps)
  return (
    <div className="pp-example">
      <div className="pp-spread">
        <PassportDataPage profile={EXAMPLE_PASSPORT.profile} tierName={t.current.name} stampCount={stamps.length} example />
        <div className="pp-stamps-page">
          <span className="example-flag">Example</span>
          <div className="stamp-grid">
            {stamps.map((b, i) => (
              <Stamp key={b.ref} b={b} delay={i * 140} />
            ))}
            <Stamp b={EXAMPLE_PASSPORT.bookings[3]} pending />
          </div>
        </div>
      </div>
      <div className="pp-explain">
        <div>
          <h3>Tiers</h3>
          <TierTrack count={stamps.length} tiers={tiers} />
          <TierPerks tiers={tiers} count={stamps.length} />
        </div>
        <div>
          <h3>Badges to collect</h3>
          <div className="badge-grid">
            {badges.map((b) => (
              <BadgeTile key={b.id} badge={b} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function TierPerks({ tiers, count }) {
  const sorted = [...tiers].sort((a, b) => a.min - b.min)
  return (
    <ul className="tier-perks">
      {sorted.map((t) => {
        const perks = (t.perks || []).filter((p) => p.active)
        return (
          <li key={t.id} className={count >= t.min ? 'reached' : ''}>
            <strong>{t.name}</strong>
            <span>{t.min === 0 ? 'From your first sign-in' : `${t.min} stamps`}</span>
            <p>{perks.length ? perks.map((p) => p.text).join('. ') + '.' : 'Perks for this tier are announced soon.'}</p>
          </li>
        )
      })}
    </ul>
  )
}

function PassportView({ data, tiers, onRefresh, email }) {
  const { showToast } = useApp()
  const [editing, setEditing] = useState(false)
  const [sharing, setSharing] = useState(false)
  const profile = { ...data.profile, fullName: data.profile.fullName }
  const stamps = useMemo(() => stampsFrom(data.bookings), [data])
  const upcoming = data.bookings.filter((b) => ['new', 'confirmed', 'paid'].includes(b.status))
  const t = tierFor(stamps.length, tiers || DEFAULT_TIERS)
  const badges = badgesFor(stamps)
  const earned = badges.filter((b) => b.earned).length

  return (
    <div className="passport-in">
      <section className="wrap pp-top">
        <div className="pp-top-head">
          <div>
            <h1>{profile.fullName ? `${profile.fullName.split(' ')[0]}'s passport` : 'Your passport'}</h1>
            <p className="muted">
              {stamps.length} {stamps.length === 1 ? 'stamp' : 'stamps'}, {earned} of {badges.length} badges, tier {t.current.name}
            </p>
          </div>
          <div className="pp-actions">
            <button className="btn gold" onClick={() => setSharing(true)}>
              <Icon name="sparkle" size={16} /> Share my passport
            </button>
            <button className="btn ghost" onClick={() => setEditing(true)}>
              <Icon name="user" size={16} /> Edit details
            </button>
            <button className="btn ghost" onClick={async () => { await signOut(); showToast('Signed out') }}>
              <Icon name="logout" size={16} /> Sign out
            </button>
          </div>
        </div>
        <div className="pp-spread">
          <PassportDataPage profile={profile} tierName={t.current.name} stampCount={stamps.length} />
          <div className="pp-stamps-page">
            {stamps.length || upcoming.length ? (
              <div className="stamp-grid">
                {stamps.map((b, i) => (
                  <Stamp key={b.ref} b={b} delay={i * 120} />
                ))}
                {upcoming.slice(0, 4).map((b) => (
                  <Stamp key={b.ref} b={b} pending />
                ))}
              </div>
            ) : (
              <div className="stamps-empty">
                <Mascot pose="pointUp" alt="" />
                <p>Your first stamp lands here after your first experience.</p>
                <a className="btn gold" href="#explore">
                  Find something to do
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="wrap pp-section">
        <h2>Your tier</h2>
        <TierTrack count={stamps.length} tiers={tiers} />
        {t.next ? (
          <p className="muted">
            {t.next.min - stamps.length} more {t.next.min - stamps.length === 1 ? 'stamp' : 'stamps'} to reach {t.next.name}.
          </p>
        ) : (
          <p className="muted">Top tier. Legend status, literally.</p>
        )}
        <TierPerks tiers={tiers} count={stamps.length} />
      </section>

      <section className="wrap pp-section">
        <h2>Badges</h2>
        <div className="badge-grid">
          {badges.map((b) => (
            <BadgeTile key={b.id} badge={b} />
          ))}
        </div>
      </section>

      <section className="wrap pp-section">
        <div className="section-head">
          <h2>Your bookings</h2>
          <button className="btn ghost small" onClick={onRefresh}>
            <Icon name="refresh" size={16} /> Refresh
          </button>
        </div>
        {data.bookings.length ? (
          <div className="my-bookings">
            {data.bookings.map((b) => (
              <div key={b.ref} className="card my-booking">
                <div className="tr-head">
                  <span className="mono">{b.ref}</span>
                  <span className={`pill s-${b.status}`}>{b.status === 'cancelled' ? 'Cancelled' : STATUS_STEPS.find(([s]) => s === b.status)?.[1]}</span>
                </div>
                <strong>{b.experienceName}</strong>
                <span className="muted">{b.optionName}</span>
                <span className="muted">
                  {niceDate(b.date)}, {guestLine(b)}, {aed(b.total)}
                </span>
                {b.paymentLink && (
                  <a className="btn gold small" href={b.paymentLink} target="_blank" rel="noopener">
                    <Icon name="card" size={16} /> Pay securely
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No bookings with {email} yet. Bookings you make with this email show up here automatically.</p>
        )}
      </section>

      <EditProfile open={editing} onClose={() => setEditing(false)} profile={profile} onSaved={() => { setEditing(false); onRefresh(); showToast('Details saved') }} />
      <ShareCard open={sharing} onClose={() => setSharing(false)} profile={profile} stamps={stamps} tier={t.current.name} badges={earned} />
    </div>
  )
}

function EditProfile({ open, onClose, profile, onSaved }) {
  const [f, setF] = useState({ name: profile.fullName || '', uni: profile.university || '', phone: profile.phone || '' })
  const [busy, setBusy] = useState(false)
  useEffect(() => setF({ name: profile.fullName || '', uni: profile.university || '', phone: profile.phone || '' }), [profile, open])
  return (
    <Sheet open={open} onClose={onClose} title="Your details">
      <form
        className="form-grid"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          await api.updateProfile(f.name, f.uni, f.phone)
          setBusy(false)
          onSaved()
        }}
      >
        <Field id="ep-name" label="Name on your passport">
          <input id="ep-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" />
        </Field>
        <Field id="ep-uni" label="University" optional>
          <input id="ep-uni" value={f.uni} onChange={(e) => setF({ ...f, uni: e.target.value })} />
        </Field>
        <Field id="ep-phone" label="WhatsApp number" optional>
          <input id="ep-phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} inputMode="tel" />
        </Field>
        <button className="btn gold" disabled={busy}>
          {busy ? 'Saving…' : 'Save details'}
        </button>
      </form>
    </Sheet>
  )
}

// Story-sized image (1080×1920) drawn on canvas for Instagram.
function ShareCard({ open, onClose, profile, stamps, tier, badges }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    if (!open) return
    let cancelled = false
    draw(profile, stamps, tier, badges).then((u) => !cancelled && setUrl(u))
    return () => {
      cancelled = true
    }
  }, [open, profile, stamps, tier, badges])
  return (
    <Sheet open={open} onClose={onClose} title="Share your passport">
      {url ? (
        <div className="share">
          <img src={url} alt="Your Yondo passport card" className="share-img" />
          <a className="btn gold block" href={url} download="yondo-passport.png">
            <Icon name="download" size={18} /> Save image
          </a>
          <p className="fine center">Post it to your story and tag @yondo.experiences.</p>
        </div>
      ) : (
        <p className="muted">Drawing your card…</p>
      )}
    </Sheet>
  )
}

async function draw(profile, stamps, tier, badges) {
  const c = document.createElement('canvas')
  c.width = 1080
  c.height = 1920
  const x = c.getContext('2d')
  await document.fonts?.ready
  const g = x.createLinearGradient(0, 0, 0, 1920)
  g.addColorStop(0, '#05545c')
  g.addColorStop(1, '#03363c')
  x.fillStyle = g
  x.fillRect(0, 0, 1080, 1920)
  // gold frame
  x.strokeStyle = '#ffc531'
  x.lineWidth = 6
  roundRect(x, 60, 60, 960, 1800, 48)
  x.stroke()
  x.fillStyle = '#ffc531'
  x.font = '600 40px "Instrument Sans", system-ui, sans-serif'
  x.textAlign = 'center'
  x.fillText('Yondo Experiences', 540, 170)
  x.font = '900 120px "Archivo", system-ui, sans-serif'
  x.fillText('PASSPORT', 540, 300)
  const img = await loadImg(MASCOT.welcome)
  const h = 760
  const w = (img.width / img.height) * h
  x.drawImage(img, 540 - w / 2, 360, w, h)
  x.fillStyle = '#ffffff'
  x.font = '800 76px "Archivo", system-ui, sans-serif'
  x.fillText(profile.fullName || 'Yondo explorer', 540, 1240, 900)
  x.fillStyle = '#9fe3e8'
  x.font = '500 40px "Instrument Sans", system-ui, sans-serif'
  x.fillText(profile.university || 'UAE', 540, 1300, 900)
  const stats = [
    [String(stamps.length), stamps.length === 1 ? 'stamp' : 'stamps'],
    [String(badges), badges === 1 ? 'badge' : 'badges'],
    [tier, 'tier'],
  ]
  stats.forEach(([v, l], i) => {
    const cx = 220 + i * 320
    x.fillStyle = '#ffc531'
    x.font = '900 84px "Archivo", system-ui, sans-serif'
    x.fillText(v, cx, 1470, 300)
    x.fillStyle = '#d9f3f4'
    x.font = '500 36px "Instrument Sans", system-ui, sans-serif'
    x.fillText(l, cx, 1525)
  })
  x.fillStyle = 'rgba(255,255,255,.7)'
  x.font = '500 34px "IBM Plex Mono", monospace'
  x.fillText(profile.passportNo || '', 540, 1680)
  x.fillStyle = '#ffffff'
  x.font = '600 38px "Instrument Sans", system-ui, sans-serif'
  x.fillText('experiences.yondo.global', 540, 1770)
  return c.toDataURL('image/png')
}
function roundRect(x, a, b, w, h, r) {
  x.beginPath()
  x.moveTo(a + r, b)
  x.arcTo(a + w, b, a + w, b + h, r)
  x.arcTo(a + w, b + h, a, b + h, r)
  x.arcTo(a, b + h, a, b, r)
  x.arcTo(a, b, a + w, b, r)
  x.closePath()
}
function loadImg(src) {
  return new Promise((res, rej) => {
    const i = new Image()
    i.onload = () => res(i)
    i.onerror = rej
    i.src = src
  })
}
