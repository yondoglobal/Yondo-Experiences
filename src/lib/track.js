// First-party, anonymous visit counting for the admin's activity feed and daily summary.
// A random id is kept in this browser (no name, email or IP address). Respects "Do Not Track".
import { IS_ARTIFACT } from './config.js'
import { api } from './api.js'

function rid() {
  try {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 24)
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36)
  }
}

export function trackPage(path, title) {
  if (IS_ARTIFACT || typeof window === 'undefined') return
  try {
    if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return
    if (/^\/admin/.test(path) || localStorage.getItem('yx.noTrack') === '1') return
    let sid = sessionStorage.getItem('yx.sid')
    let newSession = false
    if (!sid) {
      sid = rid()
      sessionStorage.setItem('yx.sid', sid)
      newSession = true
    }
    let vid = localStorage.getItem('yx.vid')
    const returning = !!vid
    if (!vid) {
      vid = rid()
      localStorage.setItem('yx.vid', vid)
    }
    const q = new URLSearchParams(window.location.search)
    const ref = newSession && document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer : ''
    const w = window.innerWidth
    api.trackVisit({
      sid, vid, newSession, returning: returning && newSession, path, title, referrer: ref,
      utmSource: q.get('utm_source'), utmMedium: q.get('utm_medium'), utmCampaign: q.get('utm_campaign') || q.get('ref'),
      device: w < 700 ? 'mobile' : w < 1100 ? 'tablet' : 'desktop', lang: navigator.language,
    })
  } catch {}
}
