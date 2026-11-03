import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { BUNDLED } from './lib/catalogue.js'
import { loadCatalogue, cachedCatalogue, supabase, onOnline, isOnline } from './lib/api.js'
import { BRAND, IS_ARTIFACT } from './lib/config.js'
import { waLink } from './lib/format.js'
import { Icon } from './components/Icon.jsx'
import { Brand, navigate } from './components/ui.jsx'
import Home from './pages/Home.jsx'
import Explore from './pages/Explore.jsx'
import Experience from './pages/Experience.jsx'
import Trips from './pages/Trips.jsx'
import Passport from './pages/Passport.jsx'
import Track from './pages/Track.jsx'
import Admin from './pages/Admin.jsx'
import Legal from './pages/Legal.jsx'

const AppCtx = createContext(null)
export const useApp = () => useContext(AppCtx)

function readRoute() {
  const h = decodeURIComponent(window.location.hash.replace(/^#/, ''))
  if (/access_token=|error_description=|type=magiclink/.test(h)) return { name: 'auth' }
  if (!h || h === 'home') return { name: 'home' }
  if (h === 'explore') return { name: 'explore' }
  if (h.startsWith('explore-')) return { name: 'explore', cat: h.slice(8) }
  if (h.startsWith('x-')) return { name: 'experience', slug: h.slice(2) }
  if (['trips', 'passport', 'track', 'admin'].includes(h)) return { name: h }
  if (['terms', 'privacy', 'booking-policy', 'about'].includes(h)) return { name: 'legal', page: h }
  return { name: 'home' }
}

function readRefCode() {
  try {
    const q = new URLSearchParams(window.location.search)
    const code = (q.get('ref') || q.get('code') || '').trim().toUpperCase()
    if (/^[A-Z0-9_-]{3,24}$/.test(code)) {
      localStorage.setItem('yx.ref', JSON.stringify({ code, at: Date.now() }))
      return code
    }
    const saved = JSON.parse(localStorage.getItem('yx.ref') || 'null')
    if (saved && Date.now() - saved.at < 1000 * 60 * 60 * 24 * 30) return saved.code
  } catch {}
  return ''
}

export default function App() {
  const [route, setRoute] = useState(readRoute)
  const [catalogue, setCatalogue] = useState(() => cachedCatalogue() || BUNDLED)
  const [online, setOnlineState] = useState(isOnline())
  const [session, setSession] = useState(null)
  const [query, setQuery] = useState('')
  const [refCode, setRefCode] = useState(readRefCode)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const on = () => {
      setRoute(readRoute())
      window.scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' })
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  useEffect(() => onOnline(setOnlineState), [])

  useEffect(() => {
    let alive = true
    loadCatalogue().then((c) => alive && c && setCatalogue(c))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (IS_ARTIFACT) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'SIGNED_IN') {
        let to = 'passport'
        try {
          to = localStorage.getItem('yx.returnTo') || 'passport'
          localStorage.removeItem('yx.returnTo')
        } catch {}
        if (/access_token|type=magiclink/.test(window.location.hash) || readRoute().name === 'auth') {
          history.replaceState(null, '', window.location.pathname + window.location.search + '#' + to)
          setRoute(readRoute())
        }
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const showToast = useCallback((msg, tone = 'ok') => {
    setToast({ msg, tone, id: Date.now() })
    setTimeout(() => setToast((t) => (t && Date.now() - t.id > 3500 ? null : t)), 3800)
  }, [])

  const ctx = useMemo(
    () => ({ catalogue, online, session, query, setQuery, refCode, setRefCode, showToast, route }),
    [catalogue, online, session, query, refCode, showToast, route]
  )

  let page
  switch (route.name) {
    case 'explore':
      page = <Explore cat={route.cat} />
      break
    case 'experience':
      page = <Experience slug={route.slug} key={route.slug} />
      break
    case 'trips':
      page = <Trips />
      break
    case 'passport':
    case 'auth':
      page = <Passport />
      break
    case 'track':
      page = <Track />
      break
    case 'admin':
      page = <Admin />
      break
    case 'legal':
      page = <Legal page={route.page} />
      break
    default:
      page = <Home />
  }

  const isAdmin = route.name === 'admin'

  return (
    <AppCtx.Provider value={ctx}>
      <a className="skip" href="#main-content" onClick={(e) => { e.preventDefault(); document.getElementById('main-content')?.focus() }}>
        Skip to content
      </a>
      {IS_ARTIFACT && (
        <div className="preview-bar">
          <Icon name="info" size={16} />
          <span>Preview build. Photos, sign-in and live booking switch on at experiences.yondo.global.</span>
        </div>
      )}
      <Header route={route} />
      <main id="main-content" tabIndex={-1} className={isAdmin ? 'main admin-main' : 'main'}>
        {page}
      </main>
      {!isAdmin && <Footer />}
      {!isAdmin && <TabBar route={route} />}
      {toast && (
        <div className={`toast ${toast.tone}`} role="status" key={toast.id}>
          <Icon name={toast.tone === 'error' ? 'info' : 'check'} size={18} /> {toast.msg}
        </div>
      )}
    </AppCtx.Provider>
  )
}

function Header({ route }) {
  const n = route.name
  const nav = [
    ['explore', 'Explore', n === 'explore' || n === 'experience'],
    ['trips', 'Curated trips', n === 'trips'],
    ['passport', 'Passport', n === 'passport' || n === 'auth'],
    ['track', 'Track a booking', n === 'track'],
  ]
  return (
    <header className="site-header">
      <div className="wrap header-row">
        <Brand />
        <nav className="main-nav" aria-label="Main">
          {nav.map(([to, label, active]) => (
            <a key={to} href={'#' + to} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}>
              {label}
            </a>
          ))}
        </nav>
        <a className="btn gold header-wa" href={waLink('Hi Yondo! I have a question about an experience.')} target="_blank" rel="noopener">
          <Icon name="whatsapp" size={18} /> <span>WhatsApp us</span>
        </a>
      </div>
    </header>
  )
}

function TabBar({ route }) {
  const n = route.name
  const tabs = [
    ['home', 'Home', 'home', n === 'home'],
    ['explore', 'Explore', 'compass', n === 'explore' || n === 'experience'],
    ['trips', 'Trips', 'road', n === 'trips'],
    ['passport', 'Passport', 'book', n === 'passport' || n === 'auth'],
  ]
  return (
    <nav className="tabbar" aria-label="Quick navigation">
      {tabs.map(([to, label, icon, active]) => (
        <a key={to} href={'#' + to} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}>
          <Icon name={icon} size={22} />
          <span>{label}</span>
        </a>
      ))}
      <a href={waLink('Hi Yondo! I have a question about an experience.')} target="_blank" rel="noopener" className="tab-wa">
        <Icon name="whatsapp" size={22} />
        <span>Chat</span>
      </a>
    </nav>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div className="footer-brand">
          <Brand footer />
          <p>Student-first experiences across the UAE. Real people on WhatsApp, every day of the week, around the clock.</p>
          <div className="footer-contact">
            <a href={waLink('Hi Yondo!')} target="_blank" rel="noopener">
              <Icon name="whatsapp" size={18} /> {BRAND.whatsappDisplay}
            </a>
            <a href={`mailto:${BRAND.email}`}>
              <Icon name="mail" size={18} /> {BRAND.email}
            </a>
            <a href={`https://instagram.com/${BRAND.instagram}`} target="_blank" rel="noopener">
              <Icon name="instagram" size={18} /> @{BRAND.instagram}
            </a>
          </div>
        </div>
        <div>
          <h3>Explore</h3>
          <ul>
            <li><a href="#explore-thrill">Theme parks</a></li>
            <li><a href="#explore-desert">Desert</a></li>
            <li><a href="#explore-sea">On the water</a></li>
            <li><a href="#explore-sky">Sky high</a></li>
            <li><a href="#explore-city">City & culture</a></li>
            <li><a href="#trips">Curated trips</a></li>
          </ul>
        </div>
        <div>
          <h3>Help</h3>
          <ul>
            <li><a href="#track">Track a booking</a></li>
            <li><a href="#passport">Your passport</a></li>
            <li><a href="#booking-policy">Booking and cancellations</a></li>
            <li><a href="#terms">Terms of use</a></li>
            <li><a href="#privacy">Privacy</a></li>
          </ul>
        </div>
        <div className="footer-legal">
          <h3>Company</h3>
          <p>
            Yondo Experiences is a brand of {BRAND.company}, {BRAND.address}.
          </p>
          <p>
            Licence no. {BRAND.licence}, issued by {BRAND.licenceIssuer}. Licensed activities include travel agency, tour operator and
            reservation services.
          </p>
        </div>
      </div>
      <div className="wrap footer-bottom">
        <span>© {new Date().getFullYear()} {BRAND.company}. Prices in UAE dirhams.</span>
        <span>Photos from Unsplash, credited on each experience.</span>
      </div>
    </footer>
  )
}
