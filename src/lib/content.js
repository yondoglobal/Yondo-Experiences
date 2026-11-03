// Website text and images that admins can change (stored in settings.content).
// Anything left empty falls back to these defaults, so the site never shows a blank.
import { BRAND } from './config.js'
import { CATEGORIES } from './catalogue.js'

export const DEFAULT_CONTENT = {
  announcement: { on: false, text: '', link: '' },
  hero: {
    title: 'Make the weekend',
    accent: 'count.',
    sub: "Theme parks, desert nights, yachts and day trips across the UAE. Pick a plan, we confirm it on WhatsApp, and you pay only once it's locked in.",
    searchPlaceholder: 'Try desert, IMG or yacht',
    image: '',
    passenger: 'You + the squad',
    destination: 'The weekend',
    gate: 'WhatsApp, 24/7',
  },
  trust: {
    licence: 'Licensed tour operator',
    reviews: 'Reviewed on Google',
    support: 'Real people, 24/7',
    pay: 'Pay after we confirm',
    payText: 'Secure card link, no booking fees',
  },
  sections: {
    vibe: 'Pick your vibe',
    featured: 'Student favourites',
    curated: 'Plans we build for you',
  },
  how: {
    title: 'How booking works',
    intro: 'No checkout roulette. A real person checks your slot with the supplier before you pay a dirham.',
    steps: [
      { title: 'Pick your plan', text: 'Choose the experience, date and group size. You see the full price before you send anything.' },
      { title: 'We confirm on WhatsApp', text: 'Our team checks availability with the supplier and messages you back with the details.' },
      { title: 'Pay by secure link', text: 'We send a card payment link. You pay once your slot is locked in, never before.' },
      { title: 'Go, then collect your stamp', text: 'Tickets land on WhatsApp and email. After the experience, a stamp lands in your Yondo passport.' },
    ],
  },
  passport: {
    title: 'Your Yondo passport',
    text: 'Every experience you complete earns a stamp. Unlock badges like Desert nomad and Emirate hopper, climb from Explorer to Yondo Icon, and share your passport to your story.',
  },
  curated: [
    { title: 'Private yachts', text: 'Birthdays, sunset sails and squad days out. Tell us the date and headcount and we find the boat.', image: 'yacht', cat: 'sea' },
    { title: 'Private desert trips', text: 'Your own car, your own camp time, your own pace. Good for groups who want the dunes to themselves.', image: 'desert-night', cat: 'desert' },
    { title: 'Road trips', text: 'Khor Fakkan viewpoint and other days out beyond Dubai, with transport sorted.', image: 'east-coast', cat: 'trips' },
    { title: '50-seat group trips', text: 'Big coach trips with your uni crowd are coming soon. Join the list to hear first.', image: 'friends', cat: 'group' },
  ],
  reviews: {
    title: "Don't take our word for it",
    text: 'Read what students say about us on Google, unfiltered. Been on a Yondo plan? Your review helps the next squad decide.',
  },
  faq: {
    title: 'Questions people ask',
    sub: 'Still stuck? We reply on WhatsApp around the clock.',
    items: [
      { q: 'Do I pay when I send a request?', a: 'No. Sending a booking request is free. We check availability with the supplier first, then send you a secure card payment link on WhatsApp. You only pay once your booking is confirmed.' },
      { q: 'How do I get my tickets?', a: 'Once you have paid, we send your tickets or booking voucher on WhatsApp and to your email. For tours with pickup, we also confirm the pickup time and place.' },
      { q: 'Can I cancel or change my booking?', a: 'It depends on the supplier for that experience. We tell you the exact cancellation terms before you pay, so there are no surprises. Read the full booking policy for details.' },
      { q: 'What is a referral code?', a: 'Some ambassadors and partners have Yondo codes. Add one when you book: where the ticket allows, you get money off, and the person who shared it gets credit.' },
      { q: 'How does the Yondo passport work?', a: 'Sign in with your email. Every experience you complete adds a stamp to your passport, and stamps unlock badges and tiers. Bookings made with the same email are added automatically.' },
      { q: 'Can you organise something that is not listed?', a: 'Yes. Private yachts, desert trips, road trips like Khor Fakkan and group plans are built on request. Send us the details on the curated trips page or on WhatsApp.' },
    ],
  },
  footer: {
    tagline: 'Student-first experiences across the UAE. Real people on WhatsApp, every day of the week, around the clock.',
  },
  contact: { whatsapp: BRAND.whatsapp, email: BRAND.email, instagram: BRAND.instagram },
  categories: {},
  legal: {},
}

// The standard policy text. {company}, {address}, {licence}, {whatsapp} and {email} are filled in on the page.
// Formatting: "## " starts a heading, "- " starts a bullet, a blank line starts a new paragraph.
export const LEGAL_DEFAULTS = {
  'booking-policy': {
    title: 'Booking and cancellations',
    updated: '2026-11-03',
    body: `Yondo Experiences books tickets, tours and activities run by third-party suppliers in the UAE (and, for the Musandam day trip, Oman). This page explains how a booking works from request to ticket.

## 1. Your request
When you send a booking request on this site, nothing is charged. A request tells us what you want; it is not a confirmed booking. Prices shown are for the date you choose and come from our current supplier price list.

## 2. Confirmation
We check availability with the supplier and reply on WhatsApp. If your slot is available, we confirm the price, what is included, any age, ID or dress rules, and the supplier's cancellation terms. If it isn't available, we suggest alternatives or close the request at no cost.

## 3. Payment
We send a secure card payment link. Your booking is only confirmed once payment is received. Payment links can expire; if yours does, ask us for a new one. Prices are in UAE dirhams (AED) and we don't add booking fees on top of the price we confirm.

## 4. Tickets and vouchers
After payment we send your tickets or booking voucher on WhatsApp and by email. Bring the ID the venue asks for. For tours with pickup, we confirm the pickup time and place before the day.

## 5. Changes and cancellations
Every supplier sets its own rules, so cancellation and change terms differ by experience and ticket type. We tell you the terms that apply before you pay. Many dated tickets and event tickets can't be refunded once issued. Where a refund is due under the supplier's terms, we return it to the original payment method.

## 6. If the supplier cancels
If a supplier cancels (for example because of weather or operational reasons), we offer you a new date, an alternative, or a refund of the amount you paid for that booking.

## 7. Referral codes
Referral codes may reduce the price where the ticket allows it. Codes can't be exchanged for cash, can have limits or expiry dates, and only apply when entered at the time of the request.

## 8. Contact
WhatsApp {whatsapp} or email {email}, any time.`,
  },
  terms: {
    title: 'Terms of use',
    updated: '2026-11-03',
    body: `This website is operated by {company} ({address}, licence no. {licence}) under the brand Yondo Experiences. By using the site you agree to these terms.

## Our role
We arrange bookings with independent suppliers who run the experiences. The supplier is responsible for delivering the experience safely and as described, and its own terms and safety rules apply on the day.

## Information on this site
We work to keep descriptions and prices accurate, but suppliers can change opening hours, inclusions and prices. The details we confirm on WhatsApp before you pay are the ones that apply to your booking. Photos are illustrative unless stated otherwise.

## Your account and passport
Your Yondo passport, stamps, badges and tiers are a loyalty feature. They have no cash value, can't be transferred, and perks are offered at our discretion. We may correct stamps added in error.

## Acceptable use
Don't send false booking requests, misuse referral codes or try to interfere with the site. We may cancel requests or codes that do.

## Liability
To the extent the law allows, we aren't liable for losses caused by a supplier, by events outside our control, or by information you give us that is incorrect. Nothing here limits rights you have under UAE consumer protection law.

## Law
These terms are governed by the laws of the United Arab Emirates.`,
  },
  privacy: {
    title: 'Privacy',
    updated: '2026-11-03',
    body: `{company} ("Yondo Experiences", "we") is responsible for the personal data you give us on this site. This notice explains what we collect and why.

## What we collect
- Booking and quote details: name, WhatsApp number, email, university (optional), the experience, date, guests and any notes you add.
- Passport details: your email, and the name and university you add to your profile.
- Referral codes you enter, so the right person gets credit.

## Why we use it
- To check availability, confirm and deliver your booking, and contact you about it.
- To run your passport (stamps, badges and tiers) and work out referral commission.
- To keep records we're required to keep.

We don't sell your data. We share booking details with the supplier only as needed to fulfil your booking.

## Where it's stored
Bookings and profiles are stored with our cloud database provider, Supabase, whose servers for this site are outside the UAE. Messages you send us on WhatsApp are handled by WhatsApp.

## How long we keep it
We keep booking records for as long as we need them for the booking, accounting and legal purposes, then delete or anonymise them.

## Your choices
You can ask to see, correct or delete your data, or close your passport, by emailing {email}. This site stores small preferences in your browser (like your last search and contact details for faster booking); you can clear them in your browser settings.`,
  },
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v)

// Deep merge where empty strings and missing keys fall back to the default. Arrays are replaced whole.
export function mergeContent(base, over) {
  if (!isObj(over)) return base
  const out = Array.isArray(base) ? [...base] : { ...base }
  for (const k of Object.keys(over)) {
    const v = over[k]
    if (v === '' || v == null) continue
    if (isObj(v) && isObj(base?.[k])) out[k] = mergeContent(base[k], v)
    else if (Array.isArray(v)) out[k] = v.length ? v : base?.[k]
    else out[k] = v
  }
  return out
}

export function phoneDisplay(digits) {
  const d = String(digits || '').replace(/\D/g, '')
  const m = d.match(/^971(5\d)(\d{3})(\d{4})$/)
  return m ? `+971 ${m[1]} ${m[2]} ${m[3]}` : d ? '+' + d : ''
}

export const ORIGINAL_CATS = CATEGORIES.map((c) => ({ ...c }))

// Push contact details and category names into the shared objects the whole site reads.
export function applyContent(content) {
  const c = content?.contact || {}
  const wa = String(c.whatsapp || '').replace(/\D/g, '')
  if (wa.length >= 9) {
    BRAND.whatsapp = wa
    BRAND.whatsappDisplay = phoneDisplay(wa)
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email || '')) BRAND.email = c.email.trim()
  if (c.instagram) BRAND.instagram = String(c.instagram).replace(/^@/, '').trim()
  CATEGORIES.forEach((cat, i) => {
    const o = content?.categories?.[cat.id] || {}
    const base = ORIGINAL_CATS[i]
    cat.label = o.label || base.label
    cat.short = o.short || o.label || base.short
    cat.blurb = o.blurb || base.blurb
    cat.image = o.image || ''
  })
}

export function fillPlaceholders(text) {
  return String(text || '')
    .replace(/\{company\}/g, BRAND.company)
    .replace(/\{address\}/g, BRAND.address)
    .replace(/\{licence\}/g, BRAND.licence)
    .replace(/\{whatsapp\}/g, BRAND.whatsappDisplay)
    .replace(/\{email\}/g, BRAND.email)
}

// Tiny formatter for policy text: "## " headings, "- " bullets, blank-line paragraphs.
export function richBlocks(text) {
  const blocks = []
  let list = null
  let para = []
  const flushPara = () => {
    if (para.length) blocks.push({ type: 'p', text: para.join(' ') })
    para = []
  }
  const flushList = () => {
    if (list) blocks.push({ type: 'ul', items: list })
    list = null
  }
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim()
    if (!line) {
      flushPara()
      flushList()
    } else if (line.startsWith('## ')) {
      flushPara()
      flushList()
      blocks.push({ type: 'h2', text: line.slice(3) })
    } else if (/^[-*] /.test(line)) {
      flushPara()
      ;(list ||= []).push(line.slice(2))
    } else {
      flushList()
      para.push(line)
    }
  }
  flushPara()
  flushList()
  return blocks
}

// Image fields hold either a photo key from the built-in library or a full https URL.
export function imageProps(value, fallbackKey) {
  const v = value || fallbackKey
  if (!v) return {}
  return /^https?:\/\//.test(v) ? { url: v } : { imgKey: v }
}
