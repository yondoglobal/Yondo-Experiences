import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../App.jsx'
import { CAT, estimate, periodFor, todayUAE, addDays, tripNoun } from '../lib/catalogue.js'
import { api } from '../lib/api.js'
import { aed, niceDate, waLink, normalisePhone } from '../lib/format.js'
import { photoCredit, photosEnabled } from '../lib/photos.js'
import { IS_ARTIFACT, BRAND } from '../lib/config.js'
import { Icon, CAT_ICON } from '../components/Icon.jsx'
import { Photo, Stepper, Field, Notice, Mascot, TicketCard, navigate } from '../components/ui.jsx'

export default function Experience({ slug }) {
  const { catalogue } = useApp()
  const exp = catalogue.bySlug[slug]

  useEffect(() => {
    if (exp) document.title = `${exp.name} | Yondo Experiences`
  }, [exp])

  if (!exp) {
    return (
      <div className="wrap empty page-empty">
        <Mascot pose="wavePhone" alt="" />
        <div>
          <h1>We couldn't find that experience</h1>
          <p>It may have sold out for the season or been renamed.</p>
          <a className="btn gold" href="#explore">
            Browse all experiences
          </a>
        </div>
      </div>
    )
  }
  return <ExperienceView exp={exp} />
}

function ExperienceView({ exp }) {
  const { catalogue } = useApp()
  const cat = CAT[exp.cat]
  const credit = exp.imageUrl ? exp.imageCredit : photosEnabled ? photoCredit(exp.img) && `${photoCredit(exp.img)} on Unsplash` : null
  const related = useMemo(
    () => catalogue.experiences.filter((e) => e.cat === exp.cat && e.slug !== exp.slug).slice(0, 4),
    [catalogue, exp]
  )

  return (
    <article className="exp">
      <div className="exp-banner">
        <Photo imgKey={exp.img} url={exp.imageUrl} alt={exp.name} cat={exp.cat} w={1600} h={700} eager sizes="100vw" className="exp-photo" />
        <div className="exp-banner-shade" />
        <div className="wrap exp-banner-copy">
          <nav className="crumbs" aria-label="Breadcrumb">
            <a href="#explore">Explore</a>
            <Icon name="next" size={14} />
            <a href={'#explore-' + exp.cat}>{cat?.label}</a>
          </nav>
          <h1>{exp.name}</h1>
          {exp.offer && <span className="offer-tag big">{exp.offer}</span>}
          <div className="exp-meta">
            <span className="chip light">
              <Icon name={CAT_ICON[exp.cat]} size={15} /> {cat?.short}
            </span>
            <span className="chip light">
              <Icon name="pin" size={15} /> {exp.emirate === 'Musandam' ? 'Musandam, Oman' : exp.emirate}
            </span>
          </div>
        </div>
        {credit && <span className="photo-credit">Photo: {credit}</span>}
      </div>

      <div className="wrap exp-layout">
        <div className="exp-main">
          <p className="exp-blurb">{exp.blurb}</p>
          <BookingFlow exp={exp} />
        </div>
      </div>

      {related.length > 0 && (
        <section className="section related">
          <div className="wrap">
            <div className="section-head">
              <h2>More {cat?.label.toLowerCase()}</h2>
              <a className="text-link" href={'#explore-' + exp.cat}>
                See all
              </a>
            </div>
            <div className="ticket-grid four">
              {related.map((e) => (
                <TicketCard key={e.slug} exp={e} compact showStandard={catalogue.showStandard} />
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  )
}

function defaultDate(option) {
  const t = todayUAE()
  const tomorrow = addDays(t, 1)
  if (!option) return tomorrow
  if (option.firstDate > tomorrow) return option.firstDate
  return periodFor(option, tomorrow) ? tomorrow : periodFor(option, t) ? t : option.firstDate
}

function BookingFlow({ exp }) {
  const { online, refCode, setRefCode, session, catalogue } = useApp()
  const showStd = catalogue.showStandard
  const firstMain = exp.options.find((o) => !o.addon) || exp.options[0]
  const [optKey, setOptKey] = useState(firstMain.key)
  const option = exp.options.find((o) => o.key === optKey) || firstMain
  const [date, setDate] = useState(() => defaultDate(firstMain))
  const minGuests = option.guests ? option.guests[0] : 1
  const maxGuests = option.guests ? option.guests[1] : option.unit === 'trip' ? 20 : 60
  const [adults, setAdults] = useState(() => Math.max(firstMain.unit === 'trip' ? 1 : 2, firstMain.guests?.[0] || 1))
  const [children, setChildren] = useState(0)
  const [groupSize, setGroupSize] = useState(2)
  const [pickup, setPickup] = useState('')
  const [codeOpen, setCodeOpen] = useState(!!refCode)
  const [code, setCode] = useState(refCode || '')
  const [quote, setQuote] = useState(null)
  const [step, setStep] = useState('choose')
  const [result, setResult] = useState(null)
  const panelRef = useRef(null)

  // keep guests inside the option's range when switching options
  useEffect(() => {
    const total = adults + (option.hasChild ? children : 0)
    if (option.guests && (total < option.guests[0] || total > option.guests[1])) {
      setAdults(option.guests[0])
      setChildren(0)
    }
    if (!option.hasChild && children) {
      setAdults((a) => Math.min(maxGuests, a + children))
      setChildren(0)
    }
    if (!periodFor(option, date)) setDate(defaultDate(option))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optKey])

  const est = estimate(option, date, adults, option.hasChild ? children : 0)

  // live quote from the server (applies codes and confirms the price)
  useEffect(() => {
    if (!online || !est) {
      setQuote(null)
      return
    }
    let alive = true
    const t = setTimeout(async () => {
      const q = await api.quote(option.key, date, adults, option.hasChild ? children : 0, codeOpen ? code : '')
      if (alive) setQuote(q)
    }, 350)
    return () => {
      alive = false
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, option.key, date, adults, children, code, codeOpen])

  const live = quote && quote.ok ? quote : null
  const total = live ? live.total : est?.subtotal
  const standard = live ? live.standardSubtotal : est?.standardSubtotal
  const discount = live ? live.discount : 0
  const noun = tripNoun(option.name, exp.cat)
  const nounPl = tripNoun(option.name, exp.cat, true)
  const today = todayUAE()
  const unavailable = !est || (quote && quote.ok === false && !quote.offline)

  const summary = {
    experience: exp.name,
    option: option.name,
    date,
    adults,
    children: option.hasChild ? children : 0,
    unit: option.unit,
    groupSize: option.unit === 'trip' ? groupSize : null,
    pickup,
    total,
    standard: showStd && standard > total ? standard : null,
    discount,
    code: live?.codeOk ? live.code : codeOpen && code ? code.toUpperCase() : '',
  }

  if (step === 'done') return <BookingDone exp={exp} summary={summary} result={result} onAnother={() => setStep('choose')} session={session} />

  return (
    <div className="booking">
      <section className="options" aria-labelledby="opt-title">
        <h2 id="opt-title">Choose your ticket</h2>
        <div className="option-list" role="radiogroup" aria-labelledby="opt-title">
          {exp.options.map((o) => {
            const on = o.key === option.key
            return (
              <label key={o.key} className={`option ${on ? 'on' : ''} ${o.addon ? 'addon' : ''}`}>
                <input type="radio" name="option" value={o.key} checked={on} onChange={() => setOptKey(o.key)} disabled={step !== 'choose'} />
                <span className="option-radio" aria-hidden="true" />
                <span className="option-main">
                  <span className="option-name">
                    {o.name}
                    {o.offer && <span className="offer-tag inline">{o.offer}</span>}
                  </span>
                  {o.tags.length > 0 && (
                    <span className="option-tags">
                      {o.tags.map((t) => (
                        <span key={t} className="tag">
                          {t}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
                <span className="option-price">
                  {showStd && o.fromStd > o.from && <s>{aed(o.fromStd)}</s>}
                  {o.unit === 'trip' ? (
                    <>
                      <strong>{aed(o.from)}</strong>
                      <small>per {tripNoun(o.name, exp.cat)}</small>
                    </>
                  ) : o.unit === 'person+trip' ? (
                    <>
                      <strong>{aed(o.from)}</strong>
                      <small>pp + {aed(o.tripFrom)} {tripNoun(o.name, exp.cat)}</small>
                    </>
                  ) : (
                    <>
                      <strong>{aed(o.from)}</strong>
                      <small>per person</small>
                    </>
                  )}
                </span>
              </label>
            )
          })}
        </div>
        <p className="fine">
          Prices can change by season. The price for your date shows in the summary. Cancellation terms depend on the supplier and are confirmed
          before you pay.
        </p>
      </section>

      <aside className="panel" ref={panelRef} aria-label="Your booking">
        <div className="panel-pass">
          <div className="panel-head">
            <span>Your booking</span>
            <strong>{exp.name}</strong>
            <small>{option.name}</small>
          </div>

          {step === 'choose' ? (
            <div className="panel-body">
              <Field id="b-date" label="Date" hint={option.tags.includes('Open-dated') ? 'Open-dated ticket. Pick the day you plan to go.' : null}>
                <div className="input-icon">
                  <Icon name="calendar" size={18} />
                  <input
                    id="b-date"
                    type="date"
                    value={date}
                    min={option.firstDate > today ? option.firstDate : today}
                    max={option.lastDate}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
              </Field>

              {option.unit === 'trip' ? (
                <>
                  <Stepper id="b-qty" label={nounPl.charAt(0).toUpperCase() + nounPl.slice(1)} sub={`Priced per ${noun}`} value={adults} min={1} max={20} onChange={setAdults} />
                  <Stepper id="b-group" label="People in your group" value={groupSize} min={1} max={60} onChange={setGroupSize} />
                </>
              ) : (
                <>
                  <Stepper
                    id="b-adults"
                    label={option.hasChild ? 'Adults' : 'Guests'}
                    sub={option.hasChild ? 'Age 12+' : option.guests ? `${option.guests[0]} to ${option.guests[1]} guests` : 'Same price for all ages'}
                    value={adults}
                    min={Math.max(1, minGuests - (option.hasChild ? children : 0))}
                    max={maxGuests - (option.hasChild ? children : 0)}
                    onChange={setAdults}
                  />
                  {option.hasChild && (
                    <Stepper id="b-children" label="Children" sub="Age rules vary by venue" value={children} min={0} max={Math.max(0, maxGuests - adults)} onChange={setChildren} />
                  )}
                </>
              )}

              {option.origins.length > 1 && (/transfer|pick ?up|sharing|shared|private car|safari|tour|trip/i.test(option.name) || ['desert', 'trips'].includes(exp.cat)) && (
                <Field id="b-pickup" label="Where are you coming from?" optional>
                  <div className="select-wrap full">
                    <select id="b-pickup" value={pickup} onChange={(e) => setPickup(e.target.value)}>
                      <option value="">Choose your emirate</option>
                      {option.origins.map((o) => (
                        <option key={o} value={o}>
                          {o === 'Fujeirah' ? 'Fujairah' : o}
                        </option>
                      ))}
                    </select>
                    <Icon name="down" size={16} />
                  </div>
                </Field>
              )}

              {!codeOpen ? (
                <button type="button" className="link-btn" onClick={() => setCodeOpen(true)}>
                  <Icon name="gift" size={16} /> Have a referral code?
                </button>
              ) : (
                <Field id="b-code" label="Referral code" optional error={quote && quote.codeOk === false ? quote.codeMessage : null}>
                  <input
                    id="b-code"
                    value={code}
                    onChange={(e) => {
                      const v = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 24)
                      setCode(v)
                      setRefCode(v)
                    }}
                    placeholder="e.g. SARA10"
                    autoCapitalize="characters"
                  />
                  {live?.codeOk && <small className="ok-text">{live.codeMessage}</small>}
                </Field>
              )}

              <PriceLines est={est} live={live} option={option} noun={noun} nounPl={nounPl} adults={adults} children={option.hasChild ? children : 0} date={date} showStd={showStd} />

              {unavailable ? (
                <Notice tone="error">{quote?.error || 'This ticket isn’t available on that date. Try another date or ticket.'}</Notice>
              ) : null}

              <button className="btn gold block big" disabled={unavailable} onClick={() => setStep('details')}>
                Request this booking
              </button>
              <p className="fine center">Free to request. You pay only after we confirm.</p>
            </div>
          ) : (
            <DetailsForm
              summary={summary}
              option={option}
              exp={exp}
              onBack={() => setStep('choose')}
              onDone={(r) => {
                setResult(r)
                setStep('done')
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            />
          )}
        </div>
      </aside>
    </div>
  )
}

function PriceLines({ est, live, option, noun, nounPl, adults, children, date, showStd }) {
  if (!est) return null
  const total = live ? live.total : est.subtotal
  const std = live ? live.standardSubtotal : est.standardSubtotal
  const saving = showStd && std > total ? std - total : 0
  const pa = live?.priceAdult ?? est.priceAdult
  const pc = live?.priceChild ?? est.priceChild
  const pt = live?.priceTrip ?? est.priceTrip
  return (
    <div className="price-lines" aria-live="polite">
      <div className="pl-date">
        <Icon name="calendar" size={16} /> {niceDate(date)}
      </div>
      {option.unit === 'trip' ? (
        <div className="pl">
          <span>
            {adults} × {adults === 1 ? noun : nounPl}
          </span>
          <span>{aed(adults * pa)}</span>
        </div>
      ) : (
        <>
          <div className="pl">
            <span>
              {adults} × {option.hasChild ? (adults === 1 ? 'adult' : 'adults') : adults === 1 ? 'guest' : 'guests'} at {aed(pa)}
            </span>
            <span>{aed(adults * pa)}</span>
          </div>
          {children > 0 && (
            <div className="pl">
              <span>
                {children} × {children === 1 ? 'child' : 'children'} at {aed(pc || pa)}
              </span>
              <span>{aed(children * (pc || pa))}</span>
            </div>
          )}
          {option.unit === 'person+trip' && pt && (
            <div className="pl">
              <span>Private {noun}</span>
              <span>{aed(pt)}</span>
            </div>
          )}
        </>
      )}
      {live && live.discount > 0 && (
        <div className="pl discount">
          <span>Code {live.code}</span>
          <span>−{aed(live.discount)}</span>
        </div>
      )}
      {saving > 0 && (
        <div className="pl std">
          <span>Standard price</span>
          <s>{aed(std)}</s>
        </div>
      )}
      <div className="pl total">
        <span>Your price</span>
        <span>{aed(total)}</span>
      </div>
      {saving > 0 && (
        <div className="you-save">
          <Icon name="sparkle" size={14} /> You save {aed(saving)} ({Math.round((saving / std) * 100)}%)
        </div>
      )}
    </div>
  )
}

function DetailsForm({ summary, option, exp, onBack, onDone }) {
  const { session, online } = useApp()
  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem('yx.contact') || '{}')
    } catch {
      return {}
    }
  })()
  const [f, setF] = useState({
    name: saved.name || '',
    phone: saved.phone || '+971 ',
    email: session?.user?.email || saved.email || '',
    university: saved.university || '',
    notes: '',
    website: '',
    agree: false,
  })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [serverError, setServerError] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  function validate() {
    const e = {}
    if (f.name.trim().length < 2) e.name = 'Add your name so we know who to look for.'
    const digits = normalisePhone(f.phone)
    if (digits.length < 7) e.phone = 'Add a WhatsApp number, with country code.'
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(f.email.trim())) e.email = 'Check your email address.'
    if (!f.agree) e.agree = 'Tick this to send your request.'
    setErrors(e)
    return !Object.keys(e).length
  }

  async function submit(ev) {
    ev.preventDefault()
    setServerError('')
    if (!validate()) return
    try {
      localStorage.setItem('yx.contact', JSON.stringify({ name: f.name, phone: f.phone, email: f.email, university: f.university }))
    } catch {}
    const notes = [f.notes, summary.groupSize ? `Group size: ${summary.groupSize}` : ''].filter(Boolean).join('\n')
    if (!online || IS_ARTIFACT) {
      onDone({ offline: true, contact: f })
      return
    }
    setBusy(true)
    const r = await api.requestBooking({
      option: option.key,
      date: summary.date,
      adults: summary.adults,
      children: summary.children,
      pickup: summary.pickup,
      code: summary.code,
      name: f.name.trim(),
      phone: '+' + normalisePhone(f.phone),
      email: f.email.trim(),
      university: f.university.trim(),
      notes,
      website: f.website,
    })
    setBusy(false)
    if (r?.ok) {
      try {
        const list = JSON.parse(localStorage.getItem('yx.bookings') || '[]')
        list.unshift({ ref: r.ref, email: f.email.trim(), name: exp.name, date: summary.date })
        localStorage.setItem('yx.bookings', JSON.stringify(list.slice(0, 10)))
      } catch {}
      onDone({ ...r, contact: f })
    } else if (r?.offline) {
      onDone({ offline: true, contact: f })
    } else setServerError(r?.error || 'Something went wrong. Message us on WhatsApp and we will sort it.')
  }

  return (
    <form className="panel-body" onSubmit={submit} noValidate>
      <button type="button" className="link-btn back" onClick={onBack}>
        <Icon name="back" size={16} /> Change date or guests
      </button>
      <div className="mini-summary">
        <span>{niceDate(summary.date)}</span>
        <strong>{aed(summary.total)}</strong>
      </div>
      <Field id="d-name" label="Your name" error={errors.name}>
        <input id="d-name" value={f.name} onChange={set('name')} autoComplete="name" />
      </Field>
      <Field id="d-phone" label="WhatsApp number" error={errors.phone} hint="We confirm your booking here.">
        <input id="d-phone" value={f.phone} onChange={set('phone')} inputMode="tel" autoComplete="tel" />
      </Field>
      <Field id="d-email" label="Email" error={errors.email} hint="Tickets and your passport stamp go to this address.">
        <input id="d-email" type="email" value={f.email} onChange={set('email')} autoComplete="email" />
      </Field>
      <Field id="d-uni" label="University" optional>
        <input id="d-uni" value={f.university} onChange={set('university')} autoComplete="organization" />
      </Field>
      <Field id="d-notes" label="Anything we should know?" optional>
        <textarea id="d-notes" rows={3} value={f.notes} onChange={set('notes')} placeholder="Preferred time, pickup area, celebrations…" />
      </Field>
      <div className="hp" aria-hidden="true">
        <label htmlFor="d-website">Website</label>
        <input id="d-website" tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} />
      </div>
      <label className={`check ${errors.agree ? 'has-error' : ''}`}>
        <input type="checkbox" checked={f.agree} onChange={set('agree')} />
        <span>
          I've read the <a href="#booking-policy" target="_blank">booking policy</a> and understand this is a request, not a payment.
        </span>
      </label>
      {errors.agree && <small className="error-text">{errors.agree}</small>}
      {serverError && <Notice tone="error">{serverError}</Notice>}
      <button className="btn gold block big" type="submit" disabled={busy}>
        {busy ? 'Sending…' : 'Send booking request'}
      </button>
    </form>
  )
}

function BookingDone({ exp, summary, result, onAnother, session }) {
  const c = result?.contact || {}
  const guests =
    summary.unit === 'trip'
      ? `${summary.adults} × ${tripNoun(summary.option, exp.cat, summary.adults !== 1)}${summary.groupSize ? `, group of ${summary.groupSize}` : ''}`
      : `${summary.adults} adult${summary.adults === 1 ? '' : 's'}${summary.children ? `, ${summary.children} child${summary.children === 1 ? '' : 'ren'}` : ''}`
  const lines = [
    result?.ref ? `Hi Yondo! Booking request ${result.ref}` : 'Hi Yondo! I would like to book:',
    `${exp.name}: ${summary.option}`,
    `Date: ${niceDate(summary.date)}`,
    `Guests: ${guests}`,
    summary.pickup ? `Coming from: ${summary.pickup}` : '',
    `Quoted total: ${aed(result?.total ?? summary.total)}${summary.code ? ` (code ${summary.code})` : ''}${summary.standard ? `, standard price ${aed(summary.standard)}` : ''}`,
    c.name ? `Name: ${c.name}` : '',
  ].filter(Boolean)
  const wa = waLink(lines.join('\n'))

  return (
    <div className="done">
      <div className="done-pass">
        <Mascot pose="jump" alt="" className="done-mascot" />
        <div className="done-head">
          <h2>{result?.offline ? 'Almost there' : 'Request sent'}</h2>
          {result?.offline ? (
            <p>
              {IS_ARTIFACT ? 'This preview can’t send requests. ' : 'Our booking system is unreachable right now. '}
              Send these details on WhatsApp and we'll confirm from there.
            </p>
          ) : (
            <p>
              We're checking availability with the supplier now. You'll hear from us on WhatsApp at {c.phone}. No payment until it's confirmed.
            </p>
          )}
        </div>
        <div className="done-ticket">
          {result?.ref && (
            <div className="done-ref">
              <small>Booking reference</small>
              <strong className="mono">{result.ref}</strong>
            </div>
          )}
          <dl>
            <div>
              <dt>Experience</dt>
              <dd>{exp.name}</dd>
            </div>
            <div>
              <dt>Ticket</dt>
              <dd>{summary.option}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{niceDate(summary.date)}</dd>
            </div>
            <div>
              <dt>Guests</dt>
              <dd>{guests}</dd>
            </div>
            <div>
              <dt>Your price</dt>
              <dd>
                {aed(result?.total ?? summary.total)}
                {summary.standard ? (
                  <span className="dd-save">
                    {' '}
                    <s>{aed(summary.standard)}</s> You save {aed(summary.standard - (result?.total ?? summary.total))}
                  </span>
                ) : null}
              </dd>
            </div>
          </dl>
        </div>
        <div className="done-actions">
          <a className="btn gold big" href={wa} target="_blank" rel="noopener">
            <Icon name="whatsapp" size={20} /> {result?.offline ? 'Send on WhatsApp' : 'Message us to speed it up'}
          </a>
          {result?.ref && (
            <a className="btn ghost" href="#track">
              Track this booking
            </a>
          )}
          {!session && result?.ref && (
            <a className="btn ghost" href="#passport">
              <Icon name="book" size={18} /> Save it to your passport
            </a>
          )}
          <button className="link-btn" onClick={onAnother}>
            Book another ticket for {exp.name}
          </button>
        </div>
      </div>
    </div>
  )
}
