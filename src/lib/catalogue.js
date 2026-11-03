import bundled from '../data/catalogue.json'

export const CATEGORIES = [
  { id: 'thrill', label: 'Theme parks', short: 'Theme parks', blurb: 'Coasters, rides and full-day park passes.', img: 'coaster' },
  { id: 'desert', label: 'Desert', short: 'Desert', blurb: 'Dune bashing, camps, buggies and starry nights.', img: 'desert-buggies' },
  { id: 'sea', label: 'On the water', short: 'Water', blurb: 'Yachts, jet skis, dhow cruises and sunset sails.', img: 'yacht' },
  { id: 'water', label: 'Water parks', short: 'Water parks', blurb: 'Slides, lazy rivers and beach-day energy.', img: 'waterpark' },
  { id: 'sky', label: 'Sky high', short: 'Sky high', blurb: 'Observation decks, helicopters and big drops.', img: 'burj-night' },
  { id: 'city', label: 'City & culture', short: 'City', blurb: 'Museums, aquariums, shows and the city icons.', img: 'global-village' },
  { id: 'trips', label: 'Day trips & tours', short: 'Day trips', blurb: 'Guided tours and full days out beyond the city.', img: 'musandam' },
  { id: 'events', label: 'Events', short: 'Events', blurb: 'Race weekends, gala nights and one-offs.', img: 'f1' },
]
export const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]))

// Student staples first wherever we sort by "recommended"
export const FEATURED_ORDER = ['global-village', 'img-worlds-of-adventure', 'desert-safari-red-sands-camp', 'shared-yacht-tour', 'ski-dubai', 'burj-khalifa-at-the-top', 'buggy-quad-bike-safari', 'aquaventure-waterpark', 'jet-ski-dubai-harbour', 'aya-universe', 'ferrari-world-abu-dhabi', 'yas-island-multi-park-pass', 'musandam-day-trip-oman', 'abu-dhabi-grand-prix-2026']
export function recommendedRank(e) {
  const i = FEATURED_ORDER.indexOf(e.slug)
  return i >= 0 ? i : e.featured ? 50 : 100
}

// ---------- dates (UAE time)
export function todayUAE() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(new Date())
}
export function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// ---------- option helpers
const ADDON = /meal voucher|fast ?track|add ?on|addon|q-fast|upgrade|drinks package/i

function tagsFor(name) {
  const n = name.toLowerCase()
  const t = []
  if (/open dated|any day/.test(n)) t.push('Open-dated')
  else if (/dated ticket/.test(n)) t.push('Date-specific')
  if (/private/.test(n)) t.push('Private')
  else if (/sharing|shared/.test(n)) t.push('Shared')
  if (/transfer/.test(n) && !/direct reporting/.test(n)) t.push('Transfers')
  if (/direct reporting/.test(n)) t.push('Meet there')
  if (ADDON.test(name)) t.push('Add-on')
  return t
}

function guestRange(name) {
  let m = name.match(/(\d+)\s*-\s*(\d+)\s*(guests|pax)/i)
  if (m) return [parseInt(m[1]), parseInt(m[2])]
  m = name.match(/up to (\d+)\s*(guests|pax)/i)
  if (m) return [1, parseInt(m[1])]
  m = name.match(/(\d+)\s*(guest|pax)\b/i)
  if (m) return [parseInt(m[1]), parseInt(m[1])]
  return null
}

// What one "trip" unit means, in words people use
export function tripNoun(name, cat, plural = false) {
  const n = name.toLowerCase()
  let s, p
  if (/transfer/.test(n)) [s, p] = ['car', 'cars']
  else if (/jet ski|yamaha|vxc|vcx|1800cc/.test(n)) [s, p] = ['jet ski', 'jet skis']
  else if (/buggy|quad|polaris/.test(n)) [s, p] = ['vehicle', 'vehicles']
  else if (/flight/.test(n)) [s, p] = ['private flight', 'private flights']
  else if (/fishing|boat|yacht|cruise/.test(n) || cat === 'sea') [s, p] = ['boat', 'boats']
  else if (/donut|fly ?board|wake/.test(n)) [s, p] = ['session', 'sessions']
  else if (/car|cabrio|transfer|safari|tour/.test(n)) [s, p] = ['car', 'cars']
  else [s, p] = ['booking', 'bookings']
  return plural ? p : s
}

function unitOf(periods) {
  const p = periods.find((x) => x.a || x.t) || {}
  if (p.a && p.t) return 'person+trip'
  if (p.a) return 'person'
  return 'trip'
}

// Our price and the standard (supplier recommended retail) price for the lead unit of a period
function leadPrice(p, unit) {
  return unit === 'trip' ? [p.t, p.mt || p.t] : [p.a, p.ma || p.a]
}

export function prepare(raw) {
  const today = todayUAE()
  const experiences = (raw.experiences || [])
    .filter((e) => !e.hidden)
    .map((e) => {
      const options = (e.options || [])
        .map((o) => {
          const periods = (o.periods || []).filter((p) => p.e >= today)
          if (!periods.length) return null
          const unit = unitOf(periods)
          const cheapest = periods.filter((p) => leadPrice(p, unit)[0]).reduce((m, p) => (leadPrice(p, unit)[0] < leadPrice(m, unit)[0] ? p : m))
          const [from, fromStd] = leadPrice(cheapest, unit)
          return {
            key: o.key,
            name: o.name,
            origins: o.origins || [],
            periods,
            unit,
            tags: tagsFor(o.name),
            addon: ADDON.test(o.name),
            guests: guestRange(o.name),
            hasChild: periods.some((p) => p.c),
            from,
            fromStd,
            tripFrom: unit === 'person+trip' ? cheapest.t : null,
            tripStd: unit === 'person+trip' ? cheapest.mt || cheapest.t : null,
            firstDate: periods.reduce((m, p) => (p.s < m ? p.s : m), periods[0].s),
            lastDate: periods.reduce((m, p) => (p.e > m ? p.e : m), periods[0].e),
          }
        })
        .filter(Boolean)
        .sort((a, b) => a.addon - b.addon || a.from - b.from)
      if (!options.length) return null
      const main = options.filter((o) => !o.addon)
      const lead = (main.length ? main : options).reduce((m, o) => (o.from < m.from ? o : m))
      return {
        slug: e.slug,
        name: e.name,
        cat: e.cat,
        emirate: e.emirate,
        blurb: e.blurb,
        img: e.img,
        imageUrl: e.imageUrl || null,
        featured: !!e.featured,
        sort: e.sort || 0,
        options,
        from: lead.from,
        fromStd: lead.fromStd,
        savePct: lead.fromStd > lead.from ? Math.round((1 - lead.from / lead.fromStd) * 100) : 0,
        fromUnit: lead.unit,
        fromNoun: lead.unit === 'trip' ? tripNoun(lead.name, e.cat) : 'person',
      }
    })
    .filter(Boolean)
  const tiers = raw.tiers || DEFAULT_TIERS
  return {
    experiences,
    tiers,
    showStandard: raw.showStandardPrice !== false,
    reviewsUrl: raw.reviewsUrl || null,
    writeReviewUrl: raw.writeReviewUrl || raw.reviewsUrl || null,
    bySlug: Object.fromEntries(experiences.map((e) => [e.slug, e])),
  }
}

export const DEFAULT_TIERS = [
  { id: 'explorer', name: 'Explorer', min: 0, perks: [{ text: 'Your digital passport and badge collection', active: true }] },
  { id: 'trailblazer', name: 'Trailblazer', min: 3, perks: [] },
  { id: 'legend', name: 'Legend', min: 6, perks: [] },
  { id: 'icon', name: 'Yondo Icon', min: 10, perks: [] },
]

export const BUNDLED = prepare(bundled)
export const BUNDLED_DATE = bundled.generated

// ---------- pricing (mirrors the server; the server's quote is the one that counts)
export function periodFor(option, date) {
  if (!option || !date) return null
  const hits = option.periods.filter((p) => p.s <= date && date <= p.e)
  if (!hits.length) return null
  hits.sort((a, b) => (a.s < b.s ? 1 : a.s > b.s ? -1 : 0))
  return hits[0]
}

export function estimate(option, date, adults, children) {
  const p = periodFor(option, date)
  if (!p) return null
  if (option.unit === 'trip') {
    const std = p.mt || p.t
    return {
      unit: 'trip', priceAdult: p.t, priceChild: null, priceTrip: null, standardAdult: std,
      subtotal: round2(adults * p.t), standardSubtotal: round2(adults * std), units: adults,
    }
  }
  const child = p.c || null
  const childStd = child ? p.mc || child : null
  const withTrip = option.unit === 'person+trip'
  const sub = adults * p.a + children * (child || p.a) + (withTrip ? p.t || 0 : 0)
  const std = adults * (p.ma || p.a) + children * (childStd || p.ma || p.a) + (withTrip ? p.mt || p.t || 0 : 0)
  return {
    unit: option.unit,
    priceAdult: p.a,
    priceChild: child,
    priceTrip: withTrip ? p.t : null,
    standardAdult: p.ma || p.a,
    standardChild: childStd,
    standardTrip: withTrip ? p.mt || p.t : null,
    subtotal: round2(sub),
    standardSubtotal: round2(std),
    units: adults + children,
  }
}

const round2 = (n) => Math.round(n * 100) / 100

// ---------- search
export function searchExperiences(list, q) {
  const s = q.trim().toLowerCase()
  if (!s) return list
  const words = s.split(/\s+/)
  return list
    .map((e) => {
      const hay = [e.name, e.blurb, e.emirate, CAT[e.cat]?.label, ...e.options.map((o) => o.name)].join(' ').toLowerCase()
      const score = words.reduce((acc, w) => acc + (hay.includes(w) ? 1 + (e.name.toLowerCase().includes(w) ? 2 : 0) : -10), 0)
      return [e, score]
    })
    .filter(([, sc]) => sc > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([e]) => e)
}
