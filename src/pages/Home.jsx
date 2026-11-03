import { useMemo, useRef, useState } from 'react'
import { useApp } from '../App.jsx'
import { CATEGORIES, recommendedRank } from '../lib/catalogue.js'
import { BRAND } from '../lib/config.js'
import { waLink } from '../lib/format.js'
import { Icon, CAT_ICON } from '../components/Icon.jsx'
import { Mascot, Photo, TicketCard, navigate } from '../components/ui.jsx'
import { PassportCover, Stamp } from '../components/PassportParts.jsx'
import { EXAMPLE_PASSPORT, BADGES } from '../lib/passport.js'
import { imageProps } from '../lib/content.js'

const QUICK = [
  ['Desert', 'desert'],
  ['Theme parks', 'thrill'],
  ['On the water', 'sea'],
  ['Abu Dhabi', 'Abu Dhabi'],
  ['Under AED 150', 'cheap'],
]

export default function Home() {
  const { catalogue, content: C, setQuery } = useApp()
  const reviewsUrl = catalogue.reviewsUrl || BRAND.googleReviews
  const writeReviewUrl = catalogue.writeReviewUrl || reviewsUrl
  const [q, setQ] = useState('')
  const featured = useMemo(() => {
    return catalogue.experiences.filter((e) => e.featured).sort((a, b) => recommendedRank(a) - recommendedRank(b))
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
              {C.hero.title}{' '}
              <span className="hero-accent">
                {C.hero.accent}
                <svg className="swoosh" viewBox="0 0 320 40" aria-hidden="true" preserveAspectRatio="none">
                  <path d="M4 30 C80 8 200 4 316 18" />
                </svg>
              </span>
            </h1>
            <p className="hero-sub">{C.hero.sub}</p>
            <form className="hero-search" onSubmit={go} role="search">
              <Icon name="search" size={20} />
              <label htmlFor="hero-q" className="sr-only">
                Search experiences
              </label>
              <input id="hero-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={C.hero.searchPlaceholder} autoComplete="off" />
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
              <Photo {...imageProps(C.hero.image, 'downtown')} cat="sky" w={900} h={1100} eager className="pass-photo" sizes="(max-width: 900px) 90vw, 440px" />
              <div className="pass-shade" />
              <Mascot pose="welcome" className="pass-mascot" fetchpriority="high" />
              <span className="pass-spark s1" />
              <span className="pass-spark s2" />
              <div className="pass-rows">
                <div>
                  <small>Passenger</small>
                  <strong>{C.hero.passenger}</strong>
                </div>
                <div>
                  <small>Destination</small>
                  <strong>{C.hero.destination}</strong>
                </div>
              </div>
              <div className="pass-stub">
                <div>
                  <small>Gate</small>
                  <strong>{C.hero.gate}</strong>
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
              <strong>{C.trust.licence}</strong>
              <span>Licence no. {BRAND.licence}</span>
            </div>
          </div>
          <div className="trust-item">
            <Icon name="star" size={26} />
            <div>
              <strong>{C.trust.reviews}</strong>
              <span>
                <a href={reviewsUrl} target="_blank" rel="noopener">
                  Read
                </a>{' '}
                or{' '}
                <a href={writeReviewUrl} target="_blank" rel="noopener">
                  leave a review
                </a>
              </span>
            </div>
          </div>
          <a className="trust-item" href={waLink('Hi Yondo!')} target="_blank" rel="noopener">
            <Icon name="whatsapp" size={26} />
            <div>
              <strong>{C.trust.support}</strong>
              <span>{BRAND.whatsappDisplay}</span>
            </div>
          </a>
          <div className="trust-item">
            <Icon name="card" size={26} />
            <div>
              <strong>{C.trust.pay}</strong>
              <span>{C.trust.payText}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <h2>{C.sections.vibe}</h2>
            <a className="text-link" href="#explore">
              See all {catalogue.experiences.length} experiences
            </a>
          </div>
          <div className="cat-grid">
            {CATEGORIES.map((c) => (
              <a key={c.id} className="cat-tile" href={'#explore-' + c.id}>
                <Photo {...imageProps(c.image, c.img)} cat={c.id} w={520} h={360} sizes="(max-width: 700px) 46vw, 280px" />
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

      <FeaturedRow title={C.sections.featured} items={featured} showStandard={catalogue.showStandard} />

      <section className="section how">
        <div className="wrap how-grid">
          <div className="how-intro">
            <h2>{C.how.title}</h2>
            <p>{C.how.intro}</p>
            <Mascot pose="pointUp" alt="" className="how-mascot" />
          </div>
          <ol className="steps">
            {C.how.steps.map((st, i) => (
              <li key={i}>
                <span className="step-n">{i + 1}</span>
                <div>
                  <strong>{st.title}</strong>
                  <p>{st.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="passport-promo">
        <div className="wrap promo-grid">
          <div className="promo-copy">
            <h2>{C.passport.title}</h2>
            <p>{C.passport.text}</p>
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
            <h2>{C.sections.curated}</h2>
            <a className="text-link" href="#trips">
              Ask for a quote
            </a>
          </div>
          <div className="curated-grid">
            {C.curated.map(({ title: t, text: d, image: img, cat }) => (
              <a key={t} className="curated-card" href="#trips">
                <Photo {...imageProps(img)} cat={cat || 'trips'} w={560} h={380} sizes="(max-width: 700px) 90vw, 280px" />
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
          <Mascot pose="selfieThumb" alt="" className="reviews-mascot" />
          <div>
            <h2>{C.reviews.title}</h2>
            <p>{C.reviews.text}</p>
            <div className="btn-row">
              <a className="btn dark" href={reviewsUrl} target="_blank" rel="noopener">
                <Icon name="star" size={18} /> Read our Google reviews
              </a>
              <a className="btn outline-dark" href={writeReviewUrl} target="_blank" rel="noopener">
                Leave a review
              </a>
            </div>
          </div>
        </div>
      </section>

      <Faq faq={C.faq} />
    </>
  )
}

function FeaturedRow({ title, items, showStandard }) {
  const ref = useRef(null)
  const scroll = (dir) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' })
  return (
    <section className="section featured">
      <div className="wrap">
        <div className="section-head">
          <h2>{title}</h2>
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
            <TicketCard key={e.slug} exp={e} showStandard={showStandard} />
          ))}
        </div>
      </div>
    </section>
  )
}

function Faq({ faq }) {
  return (
    <section className="section faq">
      <div className="wrap faq-grid">
        <div>
          <h2>{faq.title}</h2>
          <p className="muted">{faq.sub}</p>
          <a className="btn ghost" href={waLink('Hi Yondo! I have a question.')} target="_blank" rel="noopener">
            <Icon name="whatsapp" size={18} /> Ask on WhatsApp
          </a>
        </div>
        <div className="faq-list">
          {faq.items.filter((f) => f.q && f.a).map(({ q, a }) => (
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
