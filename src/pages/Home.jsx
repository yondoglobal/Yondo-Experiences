import { useMemo, useRef, useState } from 'react'
import { useApp } from '../App.jsx'
import { CATEGORIES } from '../lib/catalogue.js'
import { BRAND } from '../lib/config.js'
import { waLink } from '../lib/format.js'
import { Icon, CAT_ICON } from '../components/Icon.jsx'
import { Mascot, Photo, TicketCard, navigate } from '../components/ui.jsx'
import { PassportCover, Stamp } from '../components/PassportParts.jsx'
import { EXAMPLE_PASSPORT, BADGES } from '../lib/passport.js'

const QUICK = [
  ['Desert', 'desert'],
  ['Theme parks', 'thrill'],
  ['On the water', 'sea'],
  ['Abu Dhabi', 'Abu Dhabi'],
  ['Under AED 150', 'cheap'],
]

export default function Home() {
  const { catalogue, setQuery } = useApp()
  const [q, setQ] = useState('')
  const featured = useMemo(() => {
    const order = ['global-village', 'img-worlds-of-adventure', 'desert-safari-red-sands-camp', 'shared-yacht-tour', 'ski-dubai', 'burj-khalifa-at-the-top', 'buggy-quad-bike-safari', 'aquaventure-waterpark', 'jet-ski-dubai-harbour', 'aya-universe', 'ferrari-world-abu-dhabi', 'yas-island-multi-park-pass', 'musandam-day-trip-oman', 'abu-dhabi-grand-prix-2026']
    const rank = (s) => (order.indexOf(s) + 1 || 99)
    return catalogue.experiences.filter((e) => e.featured).sort((a, b) => rank(a.slug) - rank(b.slug))
  }, [catalogue])
  const counts = useMemo(() => {
    const c = {}
    catalogue.experiences.forEach((e) => (c[e.cat] = (c[e.cat] || 0) + 1))
    return c
  }, [catalogue])

  function go(e) {
    e.preventDefault()
    setQuery(q)
    navigate('explore')
  }
  function quick(v) {
    if (['desert', 'thrill', 'sea'].includes(v)) return navigate('explore-' + v)
    setQuery(v === 'cheap' ? '' : v)
    if (v === 'cheap') {
      try {
        sessionStorage.setItem('yx.maxPrice', '150')
      } catch {}
    }
    navigate('explore')
  }

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <h1 className="hero-title">
              <span>Make the</span>
              <span>weekend</span>
              <span>count.</span>
            </h1>
            <p className="hero-sub">
              Theme parks, desert nights, yachts and day trips across the UAE. Pick a plan, we confirm it on WhatsApp, and you pay only once
              it's locked in.
            </p>
            <form className="hero-search" onSubmit={go} role="search">
              <Icon name="search" size={20} />
              <label htmlFor="hero-q" className="sr-only">
                Search experiences
              </label>
              <input id="hero-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try desert, IMG or yacht" autoComplete="off" />
              <button className="btn gold" type="submit">
                Search
              </button>
            </form>
            <div className="quick-chips">
              {QUICK.map(([label, v]) => (
                <button key={v} className="chip" type="button" onClick={() => quick(v)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="hero-pass" aria-hidden="true">
            <div className="pass">
              <Photo imgKey="downtown" cat="sky" w={900} h={1100} eager className="pass-photo" sizes="(max-width: 900px) 90vw, 440px" />
              <div className="pass-shade" />
              <Mascot pose="welcome" className="pass-mascot" fetchpriority="high" />
              <span className="pass-spark s1" />
              <span className="pass-spark s2" />
              <div className="pass-rows">
                <div>
                  <small>Passenger</small>
                  <strong>You + the squad</strong>
                </div>
                <div>
                  <small>Destination</small>
                  <strong>The weekend</strong>
                </div>
              </div>
              <div className="pass-stub">
                <div>
                  <small>Gate</small>
                  <strong>WhatsApp, 24/7</strong>
                </div>
                <div className="barcode" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="trust" aria-label="Why book with Yondo">
        <div className="wrap trust-row">
          <div className="trust-item">
            <Icon name="shield" size={26} />
            <div>
              <strong>Licensed tour operator</strong>
              <span>Licence no. {BRAND.licence}</span>
            </div>
          </div>
          <a className="trust-item" href={BRAND.googleReviews} target="_blank" rel="noopener">
            <Icon name="star" size={26} />
            <div>
              <strong>{BRAND.googleReviewCount} Google reviews</strong>
              <span className="link-like">Read them on Google</span>
            </div>
          </a>
          <a className="trust-item" href={waLink('Hi Yondo!')} target="_blank" rel="noopener">
            <Icon name="whatsapp" size={26} />
            <div>
              <strong>Real people, 24/7</strong>
              <span>{BRAND.whatsappDisplay}</span>
            </div>
          </a>
          <div className="trust-item">
            <Icon name="card" size={26} />
            <div>
              <strong>Pay after we confirm</strong>
              <span>Secure card link, no booking fees</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <h2>Pick your vibe</h2>
            <a className="text-link" href="#explore">
              See all {catalogue.experiences.length} experiences
            </a>
          </div>
          <div className="cat-grid">
            {CATEGORIES.map((c) => (
              <a key={c.id} className="cat-tile" href={'#explore-' + c.id}>
                <Photo imgKey={c.img} cat={c.id} w={520} h={360} sizes="(max-width: 700px) 46vw, 280px" />
                <div className="cat-tile-body">
                  <span className="cat-icon">
                    <Icon name={CAT_ICON[c.id]} size={20} />
                  </span>
                  <strong>{c.label}</strong>
                  <small>{counts[c.id] || 0} experiences</small>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <FeaturedRow items={featured} />

      <section className="section how">
        <div className="wrap how-grid">
          <div className="how-intro">
            <h2>How booking works</h2>
            <p>No checkout roulette. A real person checks your slot with the supplier before you pay a dirham.</p>
            <Mascot pose="pointUp" alt="" className="how-mascot" loading="lazy" />
          </div>
          <ol className="steps">
            <li>
              <span className="step-n">1</span>
              <div>
                <strong>Pick your plan</strong>
                <p>Choose the experience, date and group size. You see the full price before you send anything.</p>
              </div>
            </li>
            <li>
              <span className="step-n">2</span>
              <div>
                <strong>We confirm on WhatsApp</strong>
                <p>Our team checks availability with the supplier and messages you back with the details.</p>
              </div>
            </li>
            <li>
              <span className="step-n">3</span>
              <div>
                <strong>Pay by secure link</strong>
                <p>We send a card payment link. You pay once your slot is locked in, never before.</p>
              </div>
            </li>
            <li>
              <span className="step-n">4</span>
              <div>
                <strong>Go, then collect your stamp</strong>
                <p>Tickets land on WhatsApp and email. After the experience, a stamp lands in your Yondo passport.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section className="passport-promo">
        <div className="wrap promo-grid">
          <div className="promo-copy">
            <h2>Your Yondo passport</h2>
            <p>
              Every experience you complete earns a stamp. Unlock badges like Desert nomad and Emirate hopper, climb from Explorer to Yondo Icon,
              and share your passport to your story.
            </p>
            <ul className="promo-badges" aria-label="Some of the badges">
              {BADGES.slice(1, 7).map((b) => (
                <li key={b.id}>
                  <Icon name={b.icon} size={18} /> {b.name}
                </li>
              ))}
            </ul>
            <div className="promo-actions">
              <a className="btn gold" href="#passport">
                Open your passport
              </a>
            </div>
          </div>
          <div className="promo-visual" aria-hidden="true">
            <PassportCover />
            <div className="promo-page">
              {EXAMPLE_PASSPORT.bookings.slice(0, 3).map((b, i) => (
                <Stamp key={b.ref} b={b} delay={i * 120} />
              ))}
              <span className="example-flag">Example</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section curated-teaser">
        <div className="wrap">
          <div className="section-head">
            <h2>Plans we build for you</h2>
            <a className="text-link" href="#trips">
              Ask for a quote
            </a>
          </div>
          <div className="curated-grid">
            {[
              ['Private yachts', 'Birthdays, sunset sails and squad days out. Tell us the date and headcount and we find the boat.', 'yacht', 'sea'],
              ['Private desert trips', 'Your own car, your own camp time, your own pace. Good for groups who want the dunes to themselves.', 'desert-night', 'desert'],
              ['Road trips', 'Khor Fakkan viewpoint and other days out beyond Dubai, with transport sorted.', 'east-coast', 'trips'],
              ['50-seat group trips', 'Big coach trips with your uni crowd are coming soon. Join the list to hear first.', 'friends', 'trips'],
            ].map(([t, d, img, cat]) => (
              <a key={t} className="curated-card" href="#trips">
                <Photo imgKey={img} cat={cat} w={560} h={380} sizes="(max-width: 700px) 90vw, 280px" />
                <div>
                  <strong>{t}</strong>
                  <p>{d}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="reviews-band">
        <div className="wrap reviews-grid">
          <Mascot pose="selfie" alt="" className="reviews-mascot" loading="lazy" />
          <div>
            <h2>Don't take our word for it</h2>
            <p>
              {BRAND.googleReviewCount} people have reviewed Yondo on Google. Read them there, unfiltered, before you book anything.
            </p>
            <a className="btn dark" href={BRAND.googleReviews} target="_blank" rel="noopener">
              <Icon name="star" size={18} /> Read our Google reviews
            </a>
          </div>
        </div>
      </section>

      <Faq />
    </>
  )
}

function FeaturedRow({ items }) {
  const ref = useRef(null)
  const scroll = (dir) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' })
  return (
    <section className="section featured">
      <div className="wrap">
        <div className="section-head">
          <h2>Student favourites</h2>
          <div className="row-arrows">
            <button className="icon-btn" onClick={() => scroll(-1)} aria-label="Scroll left">
              <Icon name="back" />
            </button>
            <button className="icon-btn" onClick={() => scroll(1)} aria-label="Scroll right">
              <Icon name="next" />
            </button>
          </div>
        </div>
      </div>
      <div className="h-scroll" ref={ref}>
        <div className="h-scroll-inner">
          {items.map((e) => (
            <TicketCard key={e.slug} exp={e} />
          ))}
        </div>
      </div>
    </section>
  )
}

const FAQS = [
  ['Do I pay when I send a request?', 'No. Sending a booking request is free. We check availability with the supplier first, then send you a secure card payment link on WhatsApp. You only pay once your booking is confirmed.'],
  ['How do I get my tickets?', 'Once you have paid, we send your tickets or booking voucher on WhatsApp and to your email. For tours with pickup, we also confirm the pickup time and place.'],
  ['Can I cancel or change my booking?', 'It depends on the supplier for that experience. We tell you the exact cancellation terms before you pay, so there are no surprises. Read the full booking policy for details.'],
  ['What is a referral code?', 'Some ambassadors and partners have Yondo codes. Add one when you book: where the ticket allows, you get money off, and the person who shared it gets credit.'],
  ['How does the Yondo passport work?', 'Sign in with your email. Every experience you complete adds a stamp to your passport, and stamps unlock badges and tiers. Bookings made with the same email are added automatically.'],
  ['Can you organise something that is not listed?', 'Yes. Private yachts, desert trips, road trips like Khor Fakkan and group plans are built on request. Send us the details on the curated trips page or on WhatsApp.'],
]

function Faq() {
  return (
    <section className="section faq">
      <div className="wrap faq-grid">
        <div>
          <h2>Questions people ask</h2>
          <p className="muted">Still stuck? We reply on WhatsApp around the clock.</p>
          <a className="btn ghost" href={waLink('Hi Yondo! I have a question.')} target="_blank" rel="noopener">
            <Icon name="whatsapp" size={18} /> Ask on WhatsApp
          </a>
        </div>
        <div className="faq-list">
          {FAQS.map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <Icon name="down" size={18} />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
