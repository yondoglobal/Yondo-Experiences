import { useEffect, useRef, useState } from 'react'
import { Icon, CAT_ICON } from './Icon.jsx'
import { photoUrl, photoSrcSet, photoAlt, CAT_ART } from '../lib/photos.js'
import { CAT } from '../lib/catalogue.js'
import { aed } from '../lib/format.js'

import welcome from '../assets/mascot/welcome.webp'
import welcomeSm from '../assets/mascot/welcome-sm.webp'
import pointUp from '../assets/mascot/point-up-sm.webp'
import jump from '../assets/mascot/jump-sm.webp'
import selfie from '../assets/mascot/selfie-sm.webp'
import thumbs from '../assets/mascot/thumbs-walk-sm.webp'
import wavePhone from '../assets/mascot/wave-phone-sm.webp'
import phoneThumbs from '../assets/mascot/phone-thumbs-sm.webp'
import wave from '../assets/mascot/wave-sm.webp'
import head from '../assets/mascot/head.webp'

export const MASCOT = { welcome, welcomeSm, pointUp, jump, selfie, thumbs, wavePhone, phoneThumbs, wave, head }

export function Mascot({ pose = 'welcome', className = '', alt = '', ...rest }) {
  return <img className={`mascot ${className}`} src={MASCOT[pose]} alt={alt} draggable="false" decoding="async" {...rest} />
}

export function navigate(hash) {
  if (window.location.hash === '#' + hash) window.dispatchEvent(new HashChangeEvent('hashchange'))
  else window.location.hash = hash
}

export function Link({ to, className = '', children, ...rest }) {
  return (
    <a href={'#' + to} className={className} {...rest}>
      {children}
    </a>
  )
}

// A photo that degrades to category art if photos are off or fail to load.
export function Photo({ imgKey, cat, url, w = 800, h, sizes, className = '', eager = false, children }) {
  const [failed, setFailed] = useState(false)
  const src = url || photoUrl(imgKey, w, h)
  const [c1, c2] = CAT_ART[cat] || CAT_ART.city
  return (
    <div className={`photo ${className}`} style={{ '--art1': c1, '--art2': c2 }}>
      <div className="photo-art" aria-hidden="true">
        <Icon name={CAT_ICON[cat] || 'sparkle'} size={56} strokeWidth={1.4} />
      </div>
      {src && !failed && (
        <img
          src={src}
          srcSet={url ? undefined : photoSrcSet(imgKey, [w / 2, w, w * 1.5].map(Math.round), h)}
          sizes={sizes}
          alt={photoAlt(imgKey)}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
      {children}
    </div>
  )
}

export function PriceFrom({ exp, small }) {
  const noun = exp.fromUnit === 'trip' ? exp.fromNoun : 'person'
  return (
    <span className={`price-from ${small ? 'small' : ''}`}>
      <span className="pf-label">from</span>
      <strong>{aed(exp.from)}</strong>
      <span className="pf-unit">per {noun}</span>
    </span>
  )
}

export function TicketCard({ exp, compact = false }) {
  const cat = CAT[exp.cat]
  return (
    <a className={`ticket ${compact ? 'compact' : ''}`} href={'#x-' + exp.slug} aria-label={`${exp.name}, from ${aed(exp.from)}`}>
      <Photo imgKey={exp.img} url={exp.imageUrl} cat={exp.cat} w={640} h={440} sizes="(max-width: 700px) 80vw, 320px" className="ticket-photo">
        <span className="chip on-photo">
          <Icon name={CAT_ICON[exp.cat]} size={14} /> {cat?.short}
        </span>
      </Photo>
      <div className="ticket-perf" aria-hidden="true" />
      <div className="ticket-body">
        <div className="ticket-top">
          <h3>{exp.name}</h3>
          <span className="ticket-place">
            <Icon name="pin" size={14} /> {exp.emirate}
          </span>
        </div>
        {!compact && <p className="ticket-blurb">{exp.blurb}</p>}
        <div className="ticket-foot">
          <PriceFrom exp={exp} small />
          <span className="ticket-cta" aria-hidden="true">
            View
          </span>
        </div>
      </div>
    </a>
  )
}

export function Stepper({ id, label, sub, value, min = 0, max = 60, onChange }) {
  return (
    <div className="stepper">
      <label htmlFor={id}>
        <span>{label}</span>
        {sub && <small>{sub}</small>}
      </label>
      <div className="stepper-ctl">
        <button type="button" aria-label={`Fewer ${label}`} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>
          <Icon name="minus" size={18} />
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const v = parseInt(e.target.value || '0', 10)
            onChange(Math.min(max, Math.max(min, isNaN(v) ? min : v)))
          }}
        />
        <button type="button" aria-label={`More ${label}`} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
          <Icon name="plus" size={18} />
        </button>
      </div>
    </div>
  )
}

export function Field({ id, label, hint, error, children, optional }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>
        {label}
        {optional && <span className="optional"> (optional)</span>}
      </label>
      {children}
      {hint && !error && <small className="hint">{hint}</small>}
      {error && <small className="error-text">{error}</small>}
    </div>
  )
}

export function Notice({ tone = 'info', icon, children }) {
  return (
    <div className={`notice ${tone}`} role={tone === 'error' ? 'alert' : undefined}>
      <Icon name={icon || (tone === 'error' ? 'info' : tone === 'ok' ? 'check' : 'info')} size={18} />
      <div>{children}</div>
    </div>
  )
}

export function Sheet({ open, onClose, title, children, wide }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')
    setTimeout(() => ref.current?.focus(), 30)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('no-scroll')
      prev?.focus?.()
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`sheet ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}

export function CopyButton({ text, label = 'Copy', className = '' }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      className={`btn ghost small ${className}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          setTimeout(() => setDone(false), 1600)
        } catch {
          window.prompt?.('Copy this:', text)
        }
      }}
    >
      <Icon name={done ? 'check' : 'copy'} size={16} /> {done ? 'Copied' : label}
    </button>
  )
}

export function useMedia(q) {
  const [m, setM] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(q).matches : false))
  useEffect(() => {
    const mq = window.matchMedia(q)
    const fn = () => setM(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [q])
  return m
}
