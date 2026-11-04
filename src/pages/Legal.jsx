import { useEffect } from 'react'
import { to } from '../components/ui.jsx'
import { useApp } from '../App.jsx'
import { LEGAL_DEFAULTS, fillPlaceholders, richBlocks } from '../lib/content.js'
import { niceDate } from '../lib/format.js'

export default function Legal({ page }) {
  const { content } = useApp()
  const key = LEGAL_DEFAULTS[page] ? page : 'booking-policy'
  const base = LEGAL_DEFAULTS[key]
  const over = content.legal?.[key] || {}
  const title = over.title || base.title
  const body = over.body || base.body
  const updated = (over.body && over.updated) || base.updated


  return (
    <article className="wrap legal">
      <h1>{title}</h1>
      <p className="muted">Last updated {niceDate(updated, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      <div className="legal-body">
        {richBlocks(fillPlaceholders(body)).map((b, i) =>
          b.type === 'h2' ? (
            <h2 key={i}>{b.text}</h2>
          ) : b.type === 'ul' ? (
            <ul key={i}>
              {b.items.map((t, j) => (
                <li key={j}>{t}</li>
              ))}
            </ul>
          ) : (
            <p key={i}>{b.text}</p>
          )
        )}
      </div>
      <nav className="legal-nav" aria-label="Policies">
        {Object.entries(LEGAL_DEFAULTS).map(([k, v]) => (
          <a key={k} href={to(k)}>
            {content.legal?.[k]?.title || v.title}
          </a>
        ))}
      </nav>
    </article>
  )
}
