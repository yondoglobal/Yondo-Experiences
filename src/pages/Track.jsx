import { useEffect, useState } from 'react'
import { useApp } from '../App.jsx'
import { api } from '../lib/api.js'
import { IS_ARTIFACT } from '../lib/config.js'
import { aed, niceDate, guestLine, waLink, niceDateTime } from '../lib/format.js'
import { Icon } from '../components/Icon.jsx'
import { Field, Notice, Mascot } from '../components/ui.jsx'

export const STATUS_STEPS = [
  ['new', 'Request received', 'We have your request and are checking with the supplier.'],
  ['confirmed', 'Confirmed', 'Your slot is available. Pay with the secure link to lock it in.'],
  ['paid', 'Paid', 'Payment received. Your tickets are on their way.'],
  ['completed', 'Done', 'Hope it was a good one. Your passport stamp is in.'],
]

export default function Track() {
  const { online } = useApp()
  const recent = (() => {
    try {
      return JSON.parse(localStorage.getItem('yx.bookings') || '[]')
    } catch {
      return []
    }
  })()
  const [ref, setRef] = useState(recent[0]?.ref || '')
  const [email, setEmail] = useState(recent[0]?.email || '')
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState(null)


  async function submit(e) {
    e?.preventDefault()
    if (!ref.trim() || !email.trim()) return setRes({ ok: false, error: 'Add your booking reference and the email you used.' })
    if (IS_ARTIFACT || !online) return setRes({ ok: false, error: 'Tracking works on the live site. This preview cannot look up bookings.' })
    setBusy(true)
    setRes(await api.track(ref, email))
    setBusy(false)
  }

  return (
    <div className="wrap track">
      <div className="track-grid">
        <div>
          <h1>Track a booking</h1>
          <p className="muted">Use the reference from your confirmation (it starts with YX) and the email you booked with.</p>
          <form className="card track-form" onSubmit={submit} noValidate>
            <Field id="tr-ref" label="Booking reference">
              <input id="tr-ref" className="mono" value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} placeholder="YX-AB12CD" />
            </Field>
            <Field id="tr-email" label="Email">
              <input id="tr-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </Field>
            <button className="btn gold" type="submit" disabled={busy}>
              {busy ? 'Looking…' : 'Find my booking'}
            </button>
            {recent.length > 1 && (
              <div className="recent">
                <small>Recent on this device</small>
                {recent.slice(0, 4).map((r) => (
                  <button
                    type="button"
                    key={r.ref}
                    className="chip"
                    onClick={() => {
                      setRef(r.ref)
                      setEmail(r.email)
                    }}
                  >
                    <span className="mono">{r.ref}</span> {r.name}
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>
        <div>
          {res && !res.ok && <Notice tone="error">{res.error}</Notice>}
          {res?.ok ? <TrackResult b={res} /> : !res && <Mascot pose="phoneThumbs" alt="" className="track-mascot" />}
        </div>
      </div>
    </div>
  )
}

function TrackResult({ b }) {
  const idx = b.status === 'cancelled' ? -1 : STATUS_STEPS.findIndex(([s]) => s === b.status)
  return (
    <div className="card track-result">
      <div className="tr-head">
        <span className="mono">{b.ref}</span>
        <span className={`pill s-${b.status}`}>{b.status === 'cancelled' ? 'Cancelled' : STATUS_STEPS[idx]?.[1]}</span>
      </div>
      <h2>{b.experienceName}</h2>
      <p className="muted">
        {b.optionName}
        <br />
        {niceDate(b.date)}, {guestLine(b)}, total {aed(b.total)}
      </p>
      {b.status === 'cancelled' ? (
        <Notice tone="info">This booking was cancelled. Message us if that's unexpected.</Notice>
      ) : (
        <ol className="timeline">
          {STATUS_STEPS.map(([s, label, text], i) => (
            <li key={s} className={i < idx ? 'past' : i === idx ? 'now' : ''}>
              <span className="tl-dot">{i < idx ? <Icon name="check" size={14} /> : null}</span>
              <div>
                <strong>{label}</strong>
                {i === idx && <p>{text}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
      {b.paymentLink && (
        <a className="btn gold big block" href={b.paymentLink} target="_blank" rel="noopener">
          <Icon name="card" size={20} /> Pay {aed(b.total)} securely
        </a>
      )}
      <a className="btn ghost block" href={waLink(`Hi Yondo! Question about booking ${b.ref}.`)} target="_blank" rel="noopener">
        <Icon name="whatsapp" size={18} /> Ask about this booking
      </a>
      <small className="muted">Requested {niceDateTime(b.createdAt)}</small>
    </div>
  )
}
