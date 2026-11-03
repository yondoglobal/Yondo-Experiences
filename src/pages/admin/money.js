// Pricing maths for the admin. Mirrors the database (public._sell and the commission rules in admin_bookings),
// so what you see here is what customers are charged.

export const COMMISSION_TYPES = [
  ['none', 'No commission'],
  ['fixed_ticket', 'AED per ticket'],
  ['fixed_booking', 'AED per booking'],
  ['sale_pct', '% of the sale'],
  ['profit_pct', '% of the profit'],
]
export const CODE_COMMISSION_TYPES = COMMISSION_TYPES.filter(([k]) => k !== 'none')

export const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100

// Yondo's automatic price: the standard price minus the discount, never under cost + floor after fees, never above standard.
export function autoSell(rec, cost, discountPct, feePct, floor) {
  rec = Number(rec) || 0
  if (rec <= 0) return null
  const fee = feePct / 100
  const disc = Math.round(rec * (1 - (Number(discountPct) || 0) / 100))
  const minimum = Math.ceil(Math.round(((Number(cost) + Number(floor)) / (1 - fee)) * 1e9) / 1e9)
  return Math.min(rec, Math.max(disc, minimum))
}

export function sellable(ra, rt, ca, ct, feePct, floor) {
  const f = 1 - feePct / 100
  if (ra > 0 && rt > 0) return (ra + rt) * f - (ca + ct) >= floor
  if (ra > 0) return ra * f - ca >= floor
  if (rt > 0) return rt * f - ct >= floor
  return false
}

export function commissionAmount(type, value, { price, gross, units = 1 }) {
  const v = Number(value) || 0
  switch (type) {
    case 'fixed_ticket':
      return v * units
    case 'fixed_booking':
      return v
    case 'sale_pct':
      return (price * v) / 100
    case 'profit_pct':
      return (Math.max(0, gross) * v) / 100
    default:
      return 0
  }
}

// Full breakdown for one sale. price/cost/standard are totals for `units` tickets.
export function breakdown({ price, cost, standard, feePct, commissionType = 'none', commissionValue = 0, units = 1 }) {
  price = Number(price) || 0
  cost = Number(cost) || 0
  const fee = (price * feePct) / 100
  const gross = price - fee - cost
  const commission = commissionAmount(commissionType, commissionValue, { price, gross, units })
  const net = gross - commission
  const std = Number(standard) || 0
  return {
    price: r2(price),
    fee: r2(fee),
    cost: r2(cost),
    gross: r2(gross),
    commission: r2(commission),
    net: r2(net),
    marginPct: price > 0 ? r2((net / price) * 100) : 0,
    markupPct: cost > 0 ? r2((net / cost) * 100) : 0,
    save: std > price ? r2(std - price) : 0,
    savePct: std > price ? r2(((std - price) / std) * 100) : 0,
    breakEven: priceForNet(0, { cost, feePct, commissionType, commissionValue, units }),
  }
}

// The price that leaves exactly `net` for Yondo.
export function priceForNet(net, { cost, feePct, commissionType = 'none', commissionValue = 0, units = 1 }) {
  const f = 1 - feePct / 100
  const v = Number(commissionValue) || 0
  cost = Number(cost) || 0
  net = Number(net) || 0
  let p
  switch (commissionType) {
    case 'fixed_ticket':
      p = (cost + v * units + net) / f
      break
    case 'fixed_booking':
      p = (cost + v + net) / f
      break
    case 'sale_pct':
      p = (cost + net) / Math.max(0.01, f - v / 100)
      break
    case 'profit_pct':
      p = (cost + net / Math.max(0.01, 1 - v / 100)) / f
      break
    default:
      p = (cost + net) / f
  }
  return r2(p)
}

export function priceForMargin(marginPct, opts) {
  // net = price * m  →  solve by bisection (works for every commission type)
  const m = Number(marginPct) / 100
  let lo = 0
  let hi = Math.max(1, (Number(opts.cost) || 0) * 20 + 1000)
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    const b = breakdown({ ...opts, price: mid })
    if (b.net - mid * m < 0) lo = mid
    else hi = mid
  }
  return r2(hi)
}

export const fmt = (n) =>
  'AED ' + (Number(n) || 0).toLocaleString('en-AE', { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 })
export const pct = (n) => `${(Number(n) || 0).toLocaleString('en-AE', { maximumFractionDigits: 1 })}%`
