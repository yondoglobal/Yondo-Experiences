import { useEffect, useState } from 'react'
import { useApp } from '../App.jsx'
import { api } from '../lib/api.js'
import { IS_ARTIFACT } from '../lib/config.js'
import { waLink, normalisePhone, niceDate } from '../lib/format.js'
import { todayUAE } from '../lib/catalogue.js'
import { Icon } from '../components/Icon.jsx'
import { Photo, Field, Notice, Mascot, Stepper } from '../components/ui.jsx'

const KINDS = [
  { id: 'yacht', label: 'Private yacht', icon: 'boat', img: 'yacht', cat: 'sea', blurb: 'Birthdays, sunset sails, squad days out.' },
  { id: 'desert', label: 'Private desert', icon: 'dune', img: 'desert-night', cat: 'desert', blurb: 'Your own car, camp time and pace.' },
  { id: 'road-trip', label: 'Road trip', icon: 'road', img: 'east-coast', cat: 'trips', blurb: 'Khor Fakkan viewpoint and more, transport sorted.' },
  { id: 'group', label: 'Group plan', icon: 'squad', img: 'friends', cat: 'group', blurb: 'Society socials, uni trips, big crews.' },
  { id: 'custom', label: 'Something else', icon: 'sparkle', img: 'downtown', cat: 'city', blurb: 'Tell us the idea, we price it.' },
]
const BUDGETS = ['Under AED 150 pp', 'AED 150 to 300 pp', 'AED 300 to 600 pp', 'AED 600+ pp', 'Not sure yet']

export default function Trips() {
  return (
    <div className="trips">
      <section className="trips-hero">
        <div className="wrap trips-hero-grid">
          <div>
            <h1>Plans we build for you</h1>
            <p>
              Yachts, private desert trips, road trips and group plans are priced to your date and headcount. Tell us what you want and we come back
              with a quote on WhatsApp.
            </p>
          </div>
          <Mascot pose="thumbs" alt="" className="trips-mascot" />
        </div>
      </section>
      <div className="wrap trips-layout">
        <QuoteForm />
        <Waitlist />
      </div>
    </div>
  )
}

function QuoteForm() {
  const { online, refCode } = useApp()
  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem('yx.contact') || '{}')
    } catch {
      return {}
    }
  })()
  const [kind, setKind] = useState('yacht')
  const [f, setF] = useState({
    title: '', date: '', budget: '', details: '', name: saved.name || '', phone: saved.phone || '+971 ', email: saved.email || '',
    university: saved.university || '', website: '', marketing: false,
  })
  const [size, setSize] = useState(6)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const k = KINDS.find((x) => x.id === kind)

  async function submit(e) {
    e.preventDefault()
    const v = {}
    if (f.name.trim().length < 2) v.name = 'Add your name.'
    if (normalisePhone(f.phone).length < 7) v.phone = 'Add a WhatsApp number, with country code.'
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(f.email.trim())) v.email = 'Check your email address.'
    setErrors(v)
    if (Object.keys(v).length) return
    setErr('')
    if (!online || IS_ARTIFACT) return setDone({ offline: true })
    setBusy(true)
    const r = await api.requestTrip({ kind, ...f, phone: '+' + normalisePhone(f.phone), groupSize: size, code: refCode })
    setBusy(false)
    if (r?.ok) setDone(r)
    else if (r?.offline) setDone({ offline: true })
    else setErr(r?.error || 'Something went wrong. Message us on WhatsApp instead.')
  }

  const wa = waLink(
    [
      done?.ref ? `Hi Yondo! Quote request ${done.ref}` : 'Hi Yondo! I would like a quote:',
      `Trip: ${k.label}${f.title ? ` (${f.title})` : ''}`,
      f.date ? `Date: ${niceDate(f.date)}` : '',
      `Group size: ${size}`,
      f.budget ? `Budget: ${f.budget}` : '',
      f.details ? `Details: ${f.details}` : '',
      f.name ? `Name: ${f.name}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  )

  if (done) {
    return (
      <section className="card quote-done">
        <Mascot pose="jump" alt="" className="done-mascot" />
        <h2>{done.offline ? 'Send it on WhatsApp' : 'Quote request sent'}</h2>
        {done.offline ? (
          <p>{IS_ARTIFACT ? 'This preview can’t send requests.' : 'Our system is unreachable right now.'} Tap below to send your request on WhatsApp.</p>
        ) : (
          <p>
            Reference <strong className="mono">{done.ref}</strong>. We'll come back on WhatsApp with options and prices.
          </p>
        )}
        <a className="btn gold big" href={wa} target="_blank" rel="noopener">
          <Icon name="whatsapp" size={20} /> {done.offline ? 'Send on WhatsApp' : 'Message us to speed it up'}
        </a>
      </section>
    )
  }

  return (
    <section className="card quote-form" aria-labelledby="quote-title">
      <h2 id="quote-title">Request a quote</h2>
      <div className="kind-grid" role="radiogroup" aria-label="Trip type">
        {KINDS.map((x) => (
          <label key={x.id} className={`kind ${kind === x.id ? 'on' : ''}`}>
            <input type="radio" name="kind" value={x.id} checked={kind === x.id} onChange={() => setKind(x.id)} />
            <Photo imgKey={x.img} cat={x.cat} w={360} h={240} sizes="180px" />
            <span className="kind-label">
              <Icon name={x.icon} size={18} /> {x.label}
            </span>
          </label>
        ))}
      </div>
      <p className="muted kind-blurb">{k.blurb}</p>
      <form onSubmit={submit} noValidate className="form-grid">
        <Field id="t-title" label="What's the plan?" optional>
          <input id="t-title" value={f.title} onChange={set('title')} placeholder={kind === 'road-trip' ? 'e.g. Khor Fakkan viewpoint day trip' : kind === 'yacht' ? 'e.g. 3-hour birthday sail from the Marina' : 'One line is enough'} />
        </Field>
        <div className="two">
          <Field id="t-date" label="Preferred date" optional>
            <input id="t-date" type="date" min={todayUAE()} value={f.date} onChange={set('date')} />
          </Field>
          <Field id="t-budget" label="Budget" optional>
            <div className="select-wrap full">
              <select id="t-budget" value={f.budget} onChange={set('budget')}>
                <option value="">Choose a range</option>
                {BUDGETS.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
              <Icon name="down" size={16} />
            </div>
          </Field>
        </div>
        <Stepper id="t-size" label="Group size" value={size} min={1} max={500} onChange={setSize} />
        <Field id="t-details" label="Anything else?" optional>
          <textarea id="t-details" rows={3} value={f.details} onChange={set('details')} placeholder="Timing, food, decorations, pickup area…" />
        </Field>
        <div className="two">
          <Field id="t-name" label="Your name" error={errors.name}>
            <input id="t-name" value={f.name} onChange={set('name')} autoComplete="name" />
          </Field>
          <Field id="t-phone" label="WhatsApp number" error={errors.phone}>
            <input id="t-phone" value={f.phone} onChange={set('phone')} inputMode="tel" autoComplete="tel" />
          </Field>
        </div>
        <div className="two">
          <Field id="t-email" label="Email" error={errors.email}>
            <input id="t-email" type="email" value={f.email} onChange={set('email')} autoComplete="email" />
          </Field>
          <Field id="t-uni" label="University" optional>
            <input id="t-uni" value={f.university} onChange={set('university')} />
          </Field>
        </div>
        <div className="hp" aria-hidden="true">
          <label htmlFor="t-website">Website</label>
          <input id="t-website" tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} />
        </div>
        <label className="check soft">
          <input type="checkbox" checked={f.marketing} onChange={set('marketing')} />
          <span>Email me new experiences and student deals. You can unsubscribe any time.</span>
        </label>
        {err && <Notice tone="error">{err}</Notice>}
        <button className="btn gold big" type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Send quote request'}
        </button>
      </form>
    </section>
  )
}

function Waitlist() {
  const { online } = useApp()
  const [f, setF] = useState({ name: '', email: '', phone: '', university: '', interest: 'Road trip', website: '', marketing: false })
  const [state, setState] = useState('idle')
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  async function submit(e) {
    e.preventDefault()
    if (f.name.trim().length < 2 || !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(f.email.trim())) {
      setErr('Add your name and a valid email.')
      return
    }
    setErr('')
    if (!online || IS_ARTIFACT) return setState('offline')
    setState('busy')
    const r = await api.joinWaitlist({ ...f, interest: '50-seat trip: ' + f.interest })
    if (r?.ok) setState('done')
    else {
      setState('idle')
      setErr(r?.error || 'Something went wrong. Try again in a minute.')
    }
  }
  return (
    <aside className="card waitlist" aria-labelledby="wl-title">
      <Photo imgKey="friends" cat="group" w={700} h={420} sizes="(max-width: 900px) 92vw, 380px" className="wl-photo" />
      <div className="wl-body">
        <span className="soon">Coming soon</span>
        <h2 id="wl-title">50-seat group trips</h2>
        <p>Coach trips with your uni crowd at group prices. Join the list and you'll hear about the first ones before anyone else.</p>
        {state === 'done' ? (
          <Notice tone="ok">You're on the list. We'll message you when the first trip drops.</Notice>
        ) : state === 'offline' ? (
          <Notice tone="info">Joining the list works on the live site. This preview can't save it.</Notice>
        ) : (
          <form onSubmit={submit} noValidate className="form-grid">
            <Field id="w-name" label="Name">
              <input id="w-name" value={f.name} onChange={set('name')} autoComplete="name" />
            </Field>
            <Field id="w-email" label="Email">
              <input id="w-email" type="email" value={f.email} onChange={set('email')} autoComplete="email" />
            </Field>
            <Field id="w-phone" label="WhatsApp" optional>
              <input id="w-phone" value={f.phone} onChange={set('phone')} inputMode="tel" />
            </Field>
            <Field id="w-interest" label="Which trip would you join?">
              <div className="select-wrap full">
                <select id="w-interest" value={f.interest} onChange={set('interest')}>
                  {['Road trip', 'Beach day', 'Desert camp night', 'Theme park day', 'Abu Dhabi day out'].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
                <Icon name="down" size={16} />
              </div>
            </Field>
            <div className="hp" aria-hidden="true">
              <label htmlFor="w-website">Website</label>
              <input id="w-website" tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} />
            </div>
            <label className="check soft">
              <input type="checkbox" checked={f.marketing} onChange={set('marketing')} />
              <span>Also email me other new experiences and student deals.</span>
            </label>
            {err && <Notice tone="error">{err}</Notice>}
            <button className="btn dark" type="submit" disabled={state === 'busy'}>
              {state === 'busy' ? 'Joining…' : 'Join the list'}
            </button>
          </form>
        )}
      </div>
    </aside>
  )
}
