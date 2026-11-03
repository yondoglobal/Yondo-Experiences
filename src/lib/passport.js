// Stamps come from completed bookings. Badges and tiers are worked out from stamps.

export const BADGES = [
  { id: 'first', name: 'First stamp', hint: 'Complete your first experience', icon: 'star', test: (s) => s.length >= 1 },
  { id: 'desert', name: 'Desert nomad', hint: 'Complete a desert experience', icon: 'dune', test: (s) => s.some((x) => x.category === 'desert') },
  { id: 'sea', name: 'Sea legs', hint: 'Get out on the water', icon: 'wave', test: (s) => s.some((x) => x.category === 'sea') },
  { id: 'sky', name: 'Sky high', hint: 'Go up a tower or take a flight', icon: 'tower', test: (s) => s.some((x) => x.category === 'sky') },
  { id: 'thrill', name: 'Thrill seeker', hint: 'Two theme or water park days', icon: 'loop', test: (s) => s.filter((x) => x.category === 'thrill' || x.category === 'water').length >= 2 },
  { id: 'culture', name: 'Culture club', hint: 'Two museums, shows or city icons', icon: 'columns', test: (s) => s.filter((x) => x.category === 'city').length >= 2 },
  { id: 'hopper', name: 'Emirate hopper', hint: 'Stamps in two different emirates', icon: 'pin', test: (s) => new Set(s.map((x) => x.emirate).filter(Boolean)).size >= 2 },
  { id: 'border', name: 'Border hopper', hint: 'Take the Musandam day trip', icon: 'flag', test: (s) => s.some((x) => x.emirate === 'Musandam') },
  { id: 'squad', name: 'Squad goals', hint: 'Book for four or more people', icon: 'squad', test: (s) => s.some((x) => (x.adults || 0) + (x.children || 0) >= 4) },
  { id: 'night', name: 'Night owl', hint: 'A dinner cruise, night safari or NYE', icon: 'moon', test: (s) => s.some((x) => /dinner|night|nye|new year/i.test(`${x.experienceName} ${x.optionName}`)) },
  { id: 'weekend', name: 'Weekend warrior', hint: 'Three stamps within 30 days', icon: 'bolt', test: (s) => streak30(s) },
  { id: 'frequent', name: 'Frequent flyer', hint: 'Collect five stamps', icon: 'plane', test: (s) => s.length >= 5 },
]

function streak30(stamps) {
  const days = stamps.map((x) => new Date(x.date + 'T12:00:00Z').getTime()).sort((a, b) => a - b)
  for (let i = 0; i + 2 < days.length; i++) if (days[i + 2] - days[i] <= 30 * 864e5) return true
  return false
}

export function stampsFrom(bookings) {
  return (bookings || []).filter((b) => b.status === 'completed').sort((a, b) => (a.date < b.date ? -1 : 1))
}

export function badgesFor(stamps) {
  return BADGES.map((b) => ({ ...b, earned: b.test(stamps) }))
}

export function tierFor(count, tiers) {
  const sorted = [...tiers].sort((a, b) => a.min - b.min)
  let current = sorted[0]
  for (const t of sorted) if (count >= t.min) current = t
  const next = sorted.find((t) => t.min > count) || null
  return { current, next, sorted }
}

export function mrz(name, passportNo, stamps, tierName) {
  const clean = (s) => (s || '').toUpperCase().replace(/[^A-Z0-9]+/g, '<')
  const parts = (name || 'YONDO EXPLORER').trim().split(/\s+/)
  const surname = parts.length > 1 ? parts[parts.length - 1] : parts[0]
  const given = parts.length > 1 ? parts.slice(0, -1).join(' ') : ''
  const l1 = ('P<YONDO' + clean(surname) + '<<' + clean(given)).padEnd(44, '<').slice(0, 44)
  const l2 = (clean(passportNo).replace(/</g, '') + '<<UAE<<' + String(stamps).padStart(2, '0') + 'STAMPS<<' + clean(tierName)).padEnd(44, '<').slice(0, 44)
  return [l1, l2]
}

// Sample data for the preview and the signed-out showcase. Clearly labelled as an example wherever shown.
export const EXAMPLE_PASSPORT = {
  example: true,
  profile: { passportNo: 'YX26-01001', fullName: 'Sara Example', university: 'Your university', since: '2026-09-14' },
  bookings: [
    { ref: 'YX-EXMPL1', status: 'completed', experienceName: 'Desert safari + Red Sands camp', optionName: 'Safari, full program sharing car', category: 'desert', emirate: 'Dubai', date: '2026-09-20', adults: 4, children: 0, unit: 'person', total: 800 },
    { ref: 'YX-EXMPL2', status: 'completed', experienceName: 'IMG Worlds of Adventure', optionName: 'IMG Theme Park, Open Dated Tickets', category: 'thrill', emirate: 'Dubai', date: '2026-10-04', adults: 2, children: 0, unit: 'person', total: 530 },
    { ref: 'YX-EXMPL3', status: 'completed', experienceName: 'Louvre Abu Dhabi', optionName: 'Louvre Abu Dhabi – Open dated tickets', category: 'city', emirate: 'Abu Dhabi', date: '2026-10-11', adults: 1, children: 0, unit: 'person', total: 63 },
    { ref: 'YX-EXMPL4', status: 'confirmed', experienceName: 'Shared yacht tour', optionName: 'Shared Yacht Tour - Sunset', category: 'sea', emirate: 'Dubai', date: '2026-11-14', adults: 3, children: 0, unit: 'person', total: 930 },
  ],
}
