// Build-time renderer: writes each page as real HTML so search engines and AI assistants can read it
// without running JavaScript. The browser then takes over as normal.
import { renderToString } from 'react-dom/server'
import App, { routeFromKey } from './App.jsx'
import { prepare } from './lib/catalogue.js'
import { metaFor, allRouteKeys, pathFor, experienceFaq, SITE } from './lib/seo.js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './lib/config.js'
import { DEFAULT_CONTENT, mergeContent } from './lib/content.js'
import { CATEGORIES } from './lib/catalogue.js'

export { prepare, metaFor, allRouteKeys, pathFor, experienceFaq, SITE, SUPABASE_URL, SUPABASE_ANON_KEY, DEFAULT_CONTENT, mergeContent, CATEGORIES, routeFromKey }

export function render(key, catalogue) {
  const route = routeFromKey(key)
  const html = renderToString(<App ssrRoute={route} ssrCatalogue={catalogue} />)
  return { html, meta: metaFor(route, catalogue) }
}
