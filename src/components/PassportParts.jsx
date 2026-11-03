import { Icon, CAT_ICON } from './Icon.jsx'
import { Mascot } from './ui.jsx'
import { mrz } from '../lib/passport.js'
import { niceDate } from '../lib/format.js'

const INKS = ['ink-teal', 'ink-gold', 'ink-plum', 'ink-coral']

function hash(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function Stamp({ b, pending, delay = 0 }) {
  const h = hash(b.ref || b.experienceName)
  const rot = (h % 17) - 8
  const ink = pending ? 'ink-pending' : INKS[h % INKS.length]
  const round = h % 3 !== 0
  return (
    <div className={`stamp ${ink} ${round ? 'round' : 'rect'} ${pending ? 'pending' : ''}`} style={{ '--rot': `${rot}deg`, '--delay': `${delay}ms` }}>
      <div className="stamp-inner">
        <Icon name={CAT_ICON[b.category] || 'sparkle'} size={22} strokeWidth={1.6} />
        <strong>{shorten(b.experienceName)}</strong>
        <span>{b.emirate}</span>
        <em>{pending ? 'Upcoming' : niceDate(b.date, { day: '2-digit', month: 'short', year: '2-digit' })}</em>
      </div>
    </div>
  )
}

function shorten(n) {
  const s = (n || '').replace(/\(.*?\)/g, '').split(/[:,+]/)[0].trim()
  return s.length > 22 ? s.slice(0, 21) + '…' : s
}

export function PassportDataPage({ profile, tierName, stampCount, example }) {
  const [l1, l2] = mrz(profile.fullName, profile.passportNo, stampCount, tierName)
  return (
    <div className="pp-data">
      {example && <span className="example-flag">Example</span>}
      <div className="pp-data-head">
        <span>Yondo Experiences</span>
        <span>Digital passport</span>
      </div>
      <div className="pp-data-body">
        <div className="pp-photo">
          <Mascot pose="head" alt="" />
        </div>
        <dl>
          <div>
            <dt>Name</dt>
            <dd>{profile.fullName || 'Add your name'}</dd>
          </div>
          <div>
            <dt>Passport no.</dt>
            <dd className="mono">{profile.passportNo}</dd>
          </div>
          <div>
            <dt>University</dt>
            <dd>{profile.university || 'Add your university'}</dd>
          </div>
          <div>
            <dt>Tier</dt>
            <dd>{tierName}</dd>
          </div>
          <div>
            <dt>Stamps</dt>
            <dd>{stampCount}</dd>
          </div>
          <div>
            <dt>Holder since</dt>
            <dd>{profile.since ? niceDate(profile.since, { month: 'short', year: 'numeric' }) : '—'}</dd>
          </div>
        </dl>
      </div>
      <div className="pp-mrz mono" aria-label="Machine-readable zone">
        <span>{l1}</span>
        <span>{l2}</span>
      </div>
    </div>
  )
}

export function PassportCover({ small }) {
  return (
    <div className={`pp-cover ${small ? 'small' : ''}`} aria-hidden="true">
      <span className="pp-cover-top">Yondo Experiences</span>
      <div className="pp-emblem">
        <Mascot pose="head" alt="" />
      </div>
      <span className="pp-cover-title">Passport</span>
      <span className="pp-cover-chip" />
    </div>
  )
}

export function BadgeTile({ badge }) {
  return (
    <div className={`badge ${badge.earned ? 'earned' : 'locked'}`} title={badge.hint}>
      <div className="badge-medal">
        <Icon name={badge.earned ? badge.icon : 'lock'} size={22} strokeWidth={1.7} />
      </div>
      <strong>{badge.name}</strong>
      <small>{badge.earned ? 'Earned' : badge.hint}</small>
    </div>
  )
}

export function TierTrack({ count, tiers }) {
  const sorted = [...tiers].sort((a, b) => a.min - b.min)
  const max = sorted[sorted.length - 1].min
  const pct = Math.min(100, (count / max) * 100)
  return (
    <div className="tier-track">
      <div className="tier-bar">
        <div className="tier-fill" style={{ width: `${pct}%` }} />
        {sorted.map((t) => (
          <div key={t.id} className={`tier-node ${count >= t.min ? 'reached' : ''}`} style={{ left: `${(t.min / max) * 100}%` }}>
            <span className="tier-dot" />
            <span className="tier-name">{t.name}</span>
            <span className="tier-min">{t.min === 0 ? 'Start' : `${t.min} stamps`}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
