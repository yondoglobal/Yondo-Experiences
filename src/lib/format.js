import { BRAND } from './config.js'

export function aed(n, { decimals } = {}) {
  if (n == null || isNaN(n)) return '—'
  const hasFils = Math.round(n * 100) % 100 !== 0
  const d = decimals ?? (hasFils ? 2 : 0)
  return 'AED ' + Number(n).toLocaleString('en-AE', { minimumFractionDigits: d, maximumFractionDigits: d })
}

export function niceDate(iso, opts = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!iso) return ''
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00Z' : iso)
  return d.toLocaleDateString('en-GB', { ...opts, timeZone: 'Asia/Dubai' })
}

export function niceDateTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai',
  })
}

export function waLink(text, number = BRAND.whatsapp) {
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
}

export function normalisePhone(p) {
  const digits = String(p || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('00')) return digits.slice(2)
  if (digits.startsWith('05') && digits.length === 10) return '971' + digits.slice(1)
  if (digits.startsWith('5') && digits.length === 9) return '971' + digits
  return digits
}

export function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`
}

export function guestLine(b) {
  if (b.unit === 'trip') return plural(b.adults, 'unit', 'units')
  const parts = [plural(b.adults, 'adult', 'adults')]
  if (b.children) parts.push(plural(b.children, 'child', 'children'))
  return parts.join(', ')
}
