import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY, IS_ARTIFACT } from './config.js'
import { prepare, BUNDLED } from './catalogue.js'

// Was this page opened from a sign-in email? Read the link before the auth library clears it from the address bar.
const startHash = typeof window !== 'undefined' ? window.location.hash : ''
export const AUTH_LINK = !IS_ARTIFACT && /access_token=|error_description=|error_code=/.test(startHash)
export const AUTH_LINK_ERROR = (() => {
  if (!AUTH_LINK) return null
  try {
    const q = new URLSearchParams(startHash.replace(/^#/, ''))
    if (!q.get('error') && !q.get('error_code')) return null
    return /expired|invalid/i.test(q.get('error_description') || q.get('error_code') || '')
      ? 'That sign-in link has expired or was already used. Enter your email and we will send a fresh code.'
      : 'That sign-in link did not work. Enter your email and we will send a fresh code.'
  } catch {
    return null
  }
})()

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: !IS_ARTIFACT, autoRefreshToken: !IS_ARTIFACT, detectSessionInUrl: !IS_ARTIFACT, flowType: 'implicit' },
})

// The preview inside claude.ai cannot reach the backend (its sandbox blocks network calls), so the app
// runs on the bundled catalogue there and clearly labels live features as preview-only.
let online = null
const listeners = new Set()
export function onOnline(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
export function isOnline() {
  return online
}
function setOnline(v) {
  online = v
  listeners.forEach((fn) => fn(v))
}

function withTimeout(p, ms) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))])
}

const CACHE_KEY = 'yx.catalogue.v1'
export function cachedCatalogue() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { at, data } = JSON.parse(raw)
    if (Date.now() - at > 1000 * 60 * 60 * 24) return null
    return prepare(data)
  } catch {
    return null
  }
}

export async function loadCatalogue() {
  if (IS_ARTIFACT) {
    setOnline(false)
    return BUNDLED
  }
  try {
    const { data, error } = await withTimeout(supabase.rpc('get_catalogue'), 9000)
    if (error) throw error
    setOnline(true)
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }))
    } catch {}
    return prepare(data)
  } catch (e) {
    setOnline(false)
    return null
  }
}

async function rpc(name, args) {
  if (IS_ARTIFACT || online === false) return { ok: false, offline: true, error: 'Live booking is switched off in this preview.' }
  try {
    const { data, error } = await withTimeout(supabase.rpc(name, args), 15000)
    if (error) return { ok: false, error: friendly(error) }
    return data
  } catch (e) {
    return { ok: false, error: 'We could not reach our booking system. Check your connection, or message us on WhatsApp.' }
  }
}

function friendly(error) {
  const m = String(error?.message || error || '')
  if (/JWT|auth/i.test(m)) return 'Your session expired. Sign in again.'
  return 'Something went wrong on our side. Message us on WhatsApp and we will sort it.'
}

export const api = {
  quote: (option, date, adults, children, code) =>
    rpc('quote_booking', { p_option: option, p_date: date, p_adults: adults, p_children: children, p_code: code || null }),
  requestBooking: (payload) => rpc('request_booking', { p: payload }),
  track: (ref, email) => rpc('track_booking', { p_ref: ref, p_email: email }),
  requestTrip: (payload) => rpc('request_trip', { p: payload }),
  joinWaitlist: (payload) => rpc('join_waitlist', { p: payload }),
  myPassport: () => rpc('my_passport', {}),
  updateProfile: (fullName, university, phone) =>
    rpc('update_profile', { p_full_name: fullName, p_university: university, p_phone: phone }),
}

// ---------- auth
export async function sendSignInEmail(email, returnTo) {
  if (IS_ARTIFACT) return { ok: false, error: 'Sign-in works on the live site, not in this preview.' }
  try {
    localStorage.setItem('yx.returnTo', returnTo || 'passport')
  } catch {}
  const redirect = window.location.origin + window.location.pathname
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect, shouldCreateUser: true } })
  if (error) {
    if (/rate|limit/i.test(error.message)) return { ok: false, error: 'Too many sign-in emails just now. Wait a minute and try again.' }
    return { ok: false, error: 'We could not send the email. Check the address and try again.' }
  }
  return { ok: true }
}

export async function verifyCode(email, token) {
  const { error } = await supabase.auth.verifyOtp({ email, token: token.trim(), type: 'email' })
  if (error) return { ok: false, error: 'That code did not work. Check it, or use the link in the email.' }
  return { ok: true }
}

export async function signOut() {
  await supabase.auth.signOut()
}
