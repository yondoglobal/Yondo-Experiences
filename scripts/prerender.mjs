// Runs after `vite build`: renders every public page to static HTML, and writes sitemap.xml, robots.txt and llms.txt.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const DIST = path.resolve('dist')
const ssr = await import(pathToFileURL(path.resolve('dist-ssr/entry-server.js')).href)
const { SITE } = ssr
const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')

// Live catalogue (current prices, photos and site text) with the bundled snapshot as a fallback.
let raw = null
try {
  const res = await fetch(`${ssr.SUPABASE_URL}/rest/v1/rpc/get_catalogue`, {
    method: 'POST',
    headers: { apikey: ssr.SUPABASE_ANON_KEY, Authorization: `Bearer ${ssr.SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
    body: '{}',
    signal: AbortSignal.timeout(15000),
  })
  if (res.ok) raw = await res.json()
} catch {}
const live = !!raw
if (!raw) raw = JSON.parse(fs.readFileSync(path.resolve('src/data/catalogue.json'), 'utf8'))
const catalogue = ssr.prepare(raw)
const content = ssr.mergeContent(ssr.DEFAULT_CONTENT, catalogue.content || {})

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const jsonld = (graph) => JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')

function page({ html, meta }) {
  let out = template
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(meta.title)}</title>`)
  out = out.replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(meta.description)}" />`)
  out = out.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${esc(meta.canonical)}" />`)
  out = out.replace(/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${esc(meta.canonical)}" />`)
  out = out.replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${esc(meta.title)}" />`)
  out = out.replace(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${esc(meta.description)}" />`)
  out = out.replace(/<meta property="og:image" content="[^"]*"\s*\/?>/, `<meta property="og:image" content="${esc(meta.image)}" />`)
  out = out.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">${jsonld(meta.jsonld)}</script>`)
  if (meta.noindex) out = out.replace('</head>', '  <meta name="robots" content="noindex" />\n  </head>')
  out = out.replace('<div id="root"></div>', `<div id="root">${html || ''}</div>`)
  return out
}

function write(urlPath, htmlText) {
  const file = urlPath === '/' ? path.join(DIST, 'index.html') : path.join(DIST, urlPath, 'index.html')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, htmlText)
}

const keys = [...ssr.allRouteKeys(catalogue), 'track']
const indexed = []
for (const key of keys) {
  const r = ssr.render(key, catalogue)
  write(ssr.pathFor(key), page(r))
  if (!r.meta.noindex) indexed.push(ssr.pathFor(key))
}
// Admin and unknown addresses: the app shell only, never indexed.
const shell = (title) => page({ html: '', meta: { title, description: 'Yondo Experiences', canonical: SITE + '/', image: `${SITE}/og.jpg`, jsonld: [], noindex: true } })
write('/admin/', shell('Admin | Yondo Experiences'))
fs.writeFileSync(path.join(DIST, '404.html'), shell('Yondo Experiences'))

const today = new Date().toISOString().slice(0, 10)
fs.writeFileSync(
  path.join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexed
    .map((p) => `  <url><loc>${SITE}${p}</loc><lastmod>${today}</lastmod><changefreq>${p.startsWith('/experiences/') || p === '/' ? 'daily' : 'weekly'}</changefreq><priority>${p === '/' ? '1.0' : p.startsWith('/experiences/') ? '0.8' : '0.6'}</priority></url>`)
    .join('\n')}\n</urlset>\n`
)

fs.writeFileSync(
  path.join(DIST, 'robots.txt'),
  `# Yondo Experiences. Search engines and AI assistants are welcome to read and cite this site.
User-agent: *
Allow: /
Disallow: /admin/

Sitemap: ${SITE}/sitemap.xml
`
)

// llms.txt: a plain summary for AI assistants (https://llmstxt.org).
const aed = (n) => 'AED ' + Math.round(n).toLocaleString('en-US')
const lines = []
lines.push('# Yondo Experiences', '')
lines.push(
  '> Yondo Experiences (experiences.yondo.global) is a licensed UAE tour operator for students and young people. It books theme parks, desert safaris, yachts, observation decks, museums, water parks and day trips across the UAE at prices below the standard rate, and builds private yacht, desert and group trips on request. Customers send a free booking request, Yondo confirms availability on WhatsApp, and they pay by secure card link only once the booking is confirmed.',
  ''
)
lines.push(
  '- Operator: Yondo Experiences, a brand of Bindal Univentures LLC, Sharjah Media City (Shams), UAE. Trade licence 2433960.01.',
  '- Contact: WhatsApp +971 50 367 6042 (24/7), email harrsh@yondo.global, Instagram @yondo.experiences.',
  '- Prices are in UAE dirhams (AED). No booking fees on top of the confirmed price.',
  '- Rewards: a free digital Yondo passport with stamps, badges and tiers for completed experiences.',
  ''
)
lines.push('## Categories', '')
for (const c of ssr.CATEGORIES) {
  const n = catalogue.experiences.filter((e) => e.cat === c.id).length
  if (n) lines.push(`- [${c.label}](${SITE}${ssr.pathFor('explore-' + c.id)}): ${c.blurb} ${n} experiences.`)
}
lines.push('', '## Experiences', '')
for (const e of catalogue.experiences) {
  const unit = e.fromUnit === 'trip' ? e.fromNoun : 'person'
  lines.push(`- [${e.name}](${SITE}${ssr.pathFor('x-' + e.slug)}): ${e.emirate}. From ${aed(e.from)} per ${unit}${e.fromStd > e.from ? ` (standard ${aed(e.fromStd)})` : ''}. ${e.blurb}`)
}
lines.push('', '## Booking and policies', '')
lines.push(`- [Curated trips and quotes](${SITE}/trips/): private yachts, private desert trips, road trips such as Khor Fakkan, group plans.`)
lines.push(`- [Booking and cancellations](${SITE}/booking-policy/)`, `- [Terms of use](${SITE}/terms/)`, `- [Privacy](${SITE}/privacy/)`)
lines.push('', '## Questions', '')
for (const f of content.faq.items.filter((x) => x.q && x.a)) lines.push(`### ${f.q}`, f.a, '')
fs.writeFileSync(path.join(DIST, 'llms.txt'), lines.join('\n'))

console.log(`prerendered ${keys.length} pages (${indexed.length} in sitemap) from the ${live ? 'live' : 'bundled'} catalogue`)
