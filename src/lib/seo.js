// Titles, descriptions and structured data for every page. Used in the browser (as you move around) and at build
// time, when each page is written out as its own HTML file for search engines and AI assistants.
import { CAT, CATEGORIES } from './catalogue.js'
import { DEFAULT_CONTENT, mergeContent, LEGAL_DEFAULTS } from './content.js'
import { BRAND } from './config.js'
import { photoUrl } from './photos.js'

export const SITE = 'https://experiences.yondo.global'

export function pathFor(key) {
  if (!key || key === 'home') return '/'
  if (key === 'explore') return '/explore/'
  if (key.startsWith('explore-')) return `/explore/${key.slice(8)}/`
  if (key.startsWith('x-')) return `/experiences/${key.slice(2)}/`
  return `/${key}/`
}

const clip = (s, n = 158) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim()
  if (t.length <= n) return t
  const cut = t.slice(0, n - 1)
  return cut.slice(0, cut.lastIndexOf(' ')) + '…'
}
const aed = (n) => 'AED ' + Math.round(Number(n) || 0).toLocaleString('en-US')
const emirateText = (e) => (e === 'Musandam' ? 'Musandam, Oman' : e)

function imageFor(exp, w = 1200, h = 630) {
  if (exp?.imageUrl) return exp.imageUrl
  return photoUrl(exp?.img, w, h, true) || `${SITE}/og.jpg`
}

export const ORG = {
  '@type': 'TravelAgency',
  '@id': `${SITE}/#org`,
  name: 'Yondo Experiences',
  legalName: 'Bindal Univentures LLC',
  url: `${SITE}/`,
  logo: `${SITE}/icon-512.png`,
  image: `${SITE}/og.jpg`,
  description: 'Student-first experiences across the UAE: theme parks, desert safaris, yachts, city attractions and curated group trips, booked over WhatsApp.',
  telephone: '+971503676042',
  email: 'harrsh@yondo.global',
  priceRange: 'AED 25 - AED 5,000',
  currenciesAccepted: 'AED',
  address: { '@type': 'PostalAddress', addressLocality: 'Sharjah Media City (Shams)', addressRegion: 'Sharjah', addressCountry: 'AE' },
  areaServed: [{ '@type': 'Country', name: 'United Arab Emirates' }],
  openingHoursSpecification: { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: '00:00', closes: '23:59' },
  sameAs: ['https://instagram.com/yondo.experiences', 'https://share.google/wpT4mj3k5yt2fROYn'],
}

function breadcrumbs(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + path })),
  }
}

function itemList(name, exps) {
  return {
    '@type': 'ItemList',
    name,
    itemListElement: exps.slice(0, 50).map((e, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + pathFor('x-' + e.slug), name: e.name })),
  }
}

// Plain-language answers about one experience, built only from its real prices and how Yondo books.
export function experienceFaq(exp) {
  if (!exp) return []
  const unit = exp.fromUnit === 'trip' ? exp.fromNoun : 'person'
  const prices = exp.options.filter((o) => !o.addon)
  const top = (prices.length ? prices : exp.options).slice(0, 4).map((o) => `${o.name} (from ${aed(o.from)})`).join('; ')
  const save = exp.fromStd > exp.from ? ` That is below the standard price of ${aed(exp.fromStd)}.` : ''
  const groups = exp.options.find((o) => o.groups?.length)
  return [
    {
      q: `How much does ${exp.name} cost?`,
      a: `With Yondo Experiences, ${exp.name} starts from ${aed(exp.from)} per ${unit}.${save} Prices depend on the date and ticket type. Options include: ${top}.${
        groups ? ` Group prices apply for ${groups.groups.map((g) => `${g.n}+ guests (${aed(g.p)} each)`).join(', ')}.` : ''
      }`,
    },
    {
      q: `How do I book ${exp.name}?`,
      a: `Pick your ticket, date and group size on this page and send a free booking request. Our team checks availability with the supplier and confirms on WhatsApp, then sends a secure card payment link. You only pay once your booking is confirmed, and tickets arrive on WhatsApp and email.`,
    },
    {
      q: `Where is ${exp.name}?`,
      a: `${exp.name} is in ${emirateText(exp.emirate)}. ${exp.blurb || ''}`.trim(),
    },
    {
      q: `Can I cancel my ${exp.name} booking?`,
      a: `Cancellation terms are set by the supplier and differ by ticket. We tell you the exact terms before you pay. Many dated tickets can't be refunded once issued.`,
    },
  ]
}

function faqPage(items) {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }
}

export function metaFor(route, catalogue) {
  const content = mergeContent(DEFAULT_CONTENT, catalogue?.content || {})
  const exps = catalogue?.experiences || []
  const key = route.name === 'experience' ? 'x-' + route.slug : route.name === 'explore' ? (route.cat ? 'explore-' + route.cat : 'explore') : route.name === 'legal' ? route.page : route.name
  const canonical = SITE + pathFor(key === 'auth' ? 'passport' : key)
  const base = { canonical, image: `${SITE}/og.jpg`, jsonld: [ORG], noindex: false }

  if (route.name === 'experience') {
    const e = catalogue?.bySlug?.[route.slug]
    if (!e) return { ...base, title: 'Experience not found | Yondo Experiences', description: 'This experience is no longer listed.', noindex: true }
    const cat = CAT[e.cat]
    const unit = e.fromUnit === 'trip' ? e.fromNoun : 'person'
    const all = e.options.flatMap((o) => [o.from, o.tripFrom].filter(Boolean))
    const title = `${e.name} tickets from ${aed(e.from)} | Yondo Experiences`
    const description = clip(`${e.name} in ${emirateText(e.emirate)} from ${aed(e.from)} per ${unit}${e.fromStd > e.from ? ` (standard ${aed(e.fromStd)})` : ''}. ${e.blurb} Request online, we confirm on WhatsApp, you pay once it's locked in.`)
    const image = imageFor(e)
    return {
      ...base,
      title,
      description,
      image,
      jsonld: [
        ORG,
        {
          '@type': 'Product',
          '@id': canonical + '#product',
          name: e.name,
          description: e.blurb,
          image,
          category: cat?.label,
          brand: { '@type': 'Brand', name: 'Yondo Experiences' },
          offers: {
            '@type': 'AggregateOffer',
            priceCurrency: 'AED',
            lowPrice: Math.min(...all),
            highPrice: Math.max(...all),
            offerCount: e.options.length,
            availability: 'https://schema.org/InStock',
            url: canonical,
            seller: { '@id': `${SITE}/#org` },
          },
        },
        {
          '@type': 'TouristAttraction',
          name: e.name,
          description: e.blurb,
          image,
          address: { '@type': 'PostalAddress', addressRegion: e.emirate === 'Musandam' ? 'Musandam' : e.emirate, addressCountry: e.emirate === 'Musandam' ? 'OM' : 'AE' },
          isAccessibleForFree: false,
        },
        faqPage(experienceFaq(e)),
        breadcrumbs([['Home', '/'], ['Explore', '/explore/'], [cat?.label || 'Experiences', pathFor('explore-' + e.cat)], [e.name, pathFor('x-' + e.slug)]]),
      ],
    }
  }

  if (route.name === 'explore') {
    const c = route.cat && CAT[route.cat]
    const list = c ? exps.filter((x) => x.cat === route.cat) : exps
    const from = list.filter((x) => x.fromUnit !== 'trip').reduce((m, x) => Math.min(m, x.from), Infinity)
    const title = c ? `${c.label} in the UAE: ${list.length} experiences | Yondo Experiences` : `Things to do in the UAE: ${exps.length} experiences | Yondo Experiences`
    const description = clip(
      c
        ? `${c.blurb} ${list.length} ${c.label.toLowerCase()} experiences across the UAE${isFinite(from) ? `, from ${aed(from)}` : ''}, at student prices. Book on WhatsApp with Yondo Experiences.`
        : `Every experience Yondo can book across the UAE: theme parks, desert safaris, yachts, observation decks, museums and day trips${isFinite(from) ? `, from ${aed(from)}` : ''}. Live prices, pay after we confirm.`
    )
    return {
      ...base,
      title,
      description,
      jsonld: [ORG, itemList(title, list), breadcrumbs(c ? [['Home', '/'], ['Explore', '/explore/'], [c.label, pathFor('explore-' + route.cat)]] : [['Home', '/'], ['Explore', '/explore/']])],
    }
  }

  if (route.name === 'trips')
    return {
      ...base,
      title: 'Private yachts, desert trips & group road trips in the UAE | Yondo Experiences',
      description: clip('Private yacht charters, private desert trips, Khor Fakkan road trips and group plans, built around your date, headcount and budget. Ask Yondo Experiences for a quote.'),
      jsonld: [ORG, breadcrumbs([['Home', '/'], ['Curated trips', '/trips/']])],
    }
  if (route.name === 'passport' || route.name === 'auth')
    return {
      ...base,
      title: 'Yondo passport: stamps, badges and rewards | Yondo Experiences',
      description: clip(content.passport.text),
    }
  if (route.name === 'track') return { ...base, title: 'Track a booking | Yondo Experiences', description: 'Check the status of your Yondo Experiences booking with your reference and email.', noindex: true }
  if (route.name === 'admin') return { ...base, title: 'Admin | Yondo Experiences', description: 'Yondo Experiences admin.', noindex: true }
  if (route.name === 'legal') {
    const l = LEGAL_DEFAULTS[route.page] || LEGAL_DEFAULTS['booking-policy']
    const t = content.legal?.[route.page]?.title || l.title
    return { ...base, title: `${t} | Yondo Experiences`, description: clip(`${t} for Yondo Experiences, operated by ${BRAND.company}.`) }
  }
  if (route.name === 'notfound') return { ...base, title: 'Page not found | Yondo Experiences', description: 'This page does not exist.', noindex: true }

  // home
  const featured = exps.filter((x) => x.featured)
  return {
    ...base,
    title: 'Yondo Experiences | UAE attractions, desert safaris & yachts at student prices',
    description: clip(content.hero.sub),
    jsonld: [
      ORG,
      { '@type': 'WebSite', '@id': `${SITE}/#website`, name: 'Yondo Experiences', url: `${SITE}/`, publisher: { '@id': `${SITE}/#org` }, inLanguage: 'en' },
      itemList('Student favourites', featured.length ? featured : exps),
      faqPage(content.faq.items.filter((f) => f.q && f.a)),
    ],
  }
}

export function allRouteKeys(catalogue) {
  return [
    'home',
    'explore',
    ...CATEGORIES.map((c) => 'explore-' + c.id),
    ...(catalogue?.experiences || []).map((e) => 'x-' + e.slug),
    'trips',
    'passport',
    'booking-policy',
    'terms',
    'privacy',
  ]
}
