import { useMemo, useState } from 'react'
import { useApp } from '../../App.jsx'
import { supabase } from '../../lib/api.js'
import { CATEGORIES, todayUAE } from '../../lib/catalogue.js'
import { DEFAULT_CONTENT, LEGAL_DEFAULTS, ORIGINAL_CATS, mergeContent, phoneDisplay } from '../../lib/content.js'
import { BRAND } from '../../lib/config.js'
import { Icon } from '../../components/Icon.jsx'
import { Field, Notice } from '../../components/ui.jsx'
import ImageField from './ImageField.jsx'

const clone = (o) => JSON.parse(JSON.stringify(o))
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v)

// Store only what differs from the defaults, so improving a default later still reaches the site.
function diff(base, cur) {
  if (Array.isArray(cur)) return JSON.stringify(cur) === JSON.stringify(base) ? undefined : cur
  if (isObj(cur)) {
    const out = {}
    for (const k of Object.keys(cur)) {
      const d = diff(base?.[k], cur[k])
      if (d !== undefined) out[k] = d
    }
    return Object.keys(out).length ? out : undefined
  }
  return cur === base || (cur === '' && base == null) ? undefined : cur
}

// Category defaults come from the catalogue so the editor shows real text, not blanks.
const CATEGORY_BASE = Object.fromEntries(CATEGORIES.map((c) => [c.id, { label: '', blurb: '', image: '' }]))

export default function Website({ settings, demo, onChange }) {
  const { showToast } = useApp()
  const initial = useMemo(() => {
    const c = mergeContent(clone(DEFAULT_CONTENT), settings?.content || {})
    c.categories = { ...CATEGORY_BASE, ...(c.categories || {}) }
    c.legal = Object.fromEntries(
      Object.entries(LEGAL_DEFAULTS).map(([k, v]) => [k, { title: c.legal?.[k]?.title || v.title, body: c.legal?.[k]?.body || v.body, updated: c.legal?.[k]?.updated || v.updated }])
    )
    return c
  }, [settings])
  const [c, setC] = useState(() => clone(initial))
  const [busy, setBusy] = useState(false)
  const [openSec, setOpenSec] = useState('hero')
  const dirty = JSON.stringify(c) !== JSON.stringify(initial)

  const set = (path, value) =>
    setC((prev) => {
      const next = clone(prev)
      let o = next
      for (let i = 0; i < path.length - 1; i++) o = o[path[i]]
      o[path[path.length - 1]] = value
      return next
    })
  const bind = (...path) => ({
    value: path.reduce((o, k) => o?.[k], c) ?? '',
    onChange: (e) => set(path, e.target.value),
  })

  async function save() {
    if (demo) return showToast('Example data. Changes are not saved.', 'error')
    const wa = String(c.contact.whatsapp || '').replace(/\D/g, '')
    if (wa.length < 9) return showToast('Check the WhatsApp number (digits with country code, e.g. 971503676042).', 'error')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.contact.email || '')) return showToast('Check the support email.', 'error')
    const out = clone(c)
    out.contact.whatsapp = wa
    // policies: keep only edited pages, stamped with today's date
    out.legal = {}
    for (const [k, v] of Object.entries(c.legal)) {
      const base = LEGAL_DEFAULTS[k]
      const changedBody = v.body.trim() !== base.body.trim()
      const changedTitle = v.title.trim() !== base.title
      if (changedBody || changedTitle) {
        const before = initial.legal[k]
        const bodyEdited = v.body !== before.body
        out.legal[k] = { title: v.title.trim(), body: changedBody ? v.body : '', updated: bodyEdited ? todayUAE() : before.updated }
      }
    }
    const base = clone(DEFAULT_CONTENT)
    base.categories = CATEGORY_BASE
    base.legal = {}
    const stored = diff(base, out) || {}
    if (Object.keys(out.legal).length) stored.legal = out.legal
    else delete stored.legal
    setBusy(true)
    const { error } = await supabase.from('settings').update({ content: stored, whatsapp: wa, support_email: c.contact.email.trim(), updated_at: new Date().toISOString() }).eq('id', 1)
    setBusy(false)
    if (error) return showToast('Could not save. Try again.', 'error')
    showToast('Website updated. Refresh the site to see it.')
    onChange()
  }

  const Sec = ({ id, title, sub, children }) => (
    <section className={`card web-sec ${openSec === id ? 'open' : ''}`}>
      <button type="button" className="web-sec-head" aria-expanded={openSec === id} onClick={() => setOpenSec(openSec === id ? '' : id)}>
        <span>
          <strong>{title}</strong>
          {sub && <small>{sub}</small>}
        </span>
        <Icon name="down" size={18} />
      </button>
      {openSec === id && <div className="web-sec-body">{children}</div>}
    </section>
  )

  return (
    <div className="website-admin">
      <div className="web-intro">
        <div>
          <h2>Website</h2>
          <p className="muted small">
            Every headline, paragraph, photo and policy on the public site. Empty fields fall back to the standard text. Prices, experiences and
            offers live in Pricing and Catalogue.
          </p>
        </div>
        <a className="btn ghost small" href={BRAND.site} target="_blank" rel="noopener">
          <Icon name="next" size={15} /> Open the site
        </a>
      </div>

      {Sec({
        id: 'announce',
        title: 'Announcement bar',
        sub: c.announcement.on ? 'On' : 'Off',
        children: (
          <>
            <label className="check">
              <input type="checkbox" checked={!!c.announcement.on} onChange={(e) => set(['announcement', 'on'], e.target.checked)} />
              <span>Show a strip at the top of every page</span>
            </label>
            <Field id="w-an-t" label="Text">
              <input id="w-an-t" maxLength={120} placeholder="Global Village is open: 10% off this week" {...bind('announcement', 'text')} />
            </Field>
            <Field id="w-an-l" label="Link" optional hint="A page on the site like #x-global-village, or a full https:// link.">
              <input id="w-an-l" placeholder="#x-global-village" {...bind('announcement', 'link')} />
            </Field>
          </>
        ),
      })}

      {Sec({
        id: 'hero',
        title: 'Top of the home page',
        sub: `${c.hero.title} ${c.hero.accent}`,
        children: (
          <>
            <div className="two">
              <Field id="w-h-t" label="Headline">
                <input id="w-h-t" maxLength={60} {...bind('hero', 'title')} />
              </Field>
              <Field id="w-h-a" label="Highlighted words" hint="Shown in gold with the swoosh.">
                <input id="w-h-a" maxLength={24} {...bind('hero', 'accent')} />
              </Field>
            </div>
            <Field id="w-h-s" label="Intro">
              <textarea id="w-h-s" rows={3} maxLength={260} {...bind('hero', 'sub')} />
            </Field>
            <Field id="w-h-p" label="Search box hint">
              <input id="w-h-p" maxLength={40} {...bind('hero', 'searchPlaceholder')} />
            </Field>
            <ImageField id="w-h-img" label="Boarding pass photo" value={c.hero.image} fallbackKey="downtown" cat="sky" folder="site" demo={demo} onChange={(v) => set(['hero', 'image'], v)} hint="A tall photo works best." />
            <div className="three">
              <Field id="w-h-p1" label="Passenger">
                <input id="w-h-p1" maxLength={28} {...bind('hero', 'passenger')} />
              </Field>
              <Field id="w-h-p2" label="Destination">
                <input id="w-h-p2" maxLength={28} {...bind('hero', 'destination')} />
              </Field>
              <Field id="w-h-p3" label="Gate">
                <input id="w-h-p3" maxLength={28} {...bind('hero', 'gate')} />
              </Field>
            </div>
          </>
        ),
      })}

      {Sec({
        id: 'trust',
        title: 'Trust strip',
        sub: 'The four promises under the top section',
        children: (
          <>
            <div className="two">
              <Field id="w-t-l" label="Licence headline">
                <input id="w-t-l" maxLength={40} {...bind('trust', 'licence')} />
              </Field>
              <Field id="w-t-r" label="Reviews headline">
                <input id="w-t-r" maxLength={40} {...bind('trust', 'reviews')} />
              </Field>
              <Field id="w-t-s" label="Support headline">
                <input id="w-t-s" maxLength={40} {...bind('trust', 'support')} />
              </Field>
              <Field id="w-t-p" label="Payment headline">
                <input id="w-t-p" maxLength={40} {...bind('trust', 'pay')} />
              </Field>
            </div>
            <Field id="w-t-pt" label="Payment line">
              <input id="w-t-pt" maxLength={60} {...bind('trust', 'payText')} />
            </Field>
          </>
        ),
      })}

      {Sec({
        id: 'cats',
        title: 'Categories',
        sub: 'Names, descriptions and cover photos',
        children: (
          <div className="cat-edit-list">
            {CATEGORIES.map((cat) => (
              <div key={cat.id} className="cat-edit">
                <div className="two">
                  <Field id={`w-c-${cat.id}-l`} label="Name">
                    <input id={`w-c-${cat.id}-l`} maxLength={28} placeholder={DEFAULT_LABELS[cat.id]} {...bind('categories', cat.id, 'label')} />
                  </Field>
                  <Field id={`w-c-${cat.id}-b`} label="Description">
                    <input id={`w-c-${cat.id}-b`} maxLength={90} placeholder={DEFAULT_BLURBS[cat.id]} {...bind('categories', cat.id, 'blurb')} />
                  </Field>
                </div>
                <ImageField id={`w-c-${cat.id}-i`} label="Cover photo" value={c.categories[cat.id]?.image} fallbackKey={cat.img} cat={cat.id} folder="site" demo={demo} onChange={(v) => set(['categories', cat.id, 'image'], v)} />
              </div>
            ))}
          </div>
        ),
      })}

      {Sec({
        id: 'sections',
        title: 'Section titles',
        children: (
          <div className="three">
            <Field id="w-s-v" label="Categories">
              <input id="w-s-v" maxLength={40} {...bind('sections', 'vibe')} />
            </Field>
            <Field id="w-s-f" label="Featured row" hint="Pick featured experiences in Catalogue.">
              <input id="w-s-f" maxLength={40} {...bind('sections', 'featured')} />
            </Field>
            <Field id="w-s-c" label="Curated plans">
              <input id="w-s-c" maxLength={40} {...bind('sections', 'curated')} />
            </Field>
          </div>
        ),
      })}

      {Sec({
        id: 'how',
        title: 'How booking works',
        children: (
          <>
            <Field id="w-hw-t" label="Title">
              <input id="w-hw-t" maxLength={40} {...bind('how', 'title')} />
            </Field>
            <Field id="w-hw-i" label="Intro">
              <textarea id="w-hw-i" rows={2} maxLength={200} {...bind('how', 'intro')} />
            </Field>
            {c.how.steps.map((st, i) => (
              <div key={i} className="two step-edit">
                <Field id={`w-hw-${i}-t`} label={`Step ${i + 1}`}>
                  <input id={`w-hw-${i}-t`} maxLength={40} {...bind('how', 'steps', i, 'title')} />
                </Field>
                <Field id={`w-hw-${i}-x`} label="Text">
                  <textarea id={`w-hw-${i}-x`} rows={2} maxLength={180} {...bind('how', 'steps', i, 'text')} />
                </Field>
              </div>
            ))}
          </>
        ),
      })}

      {Sec({
        id: 'curated',
        title: 'Curated plans cards',
        sub: 'The four cards that lead to quote requests',
        children: (
          <div className="cat-edit-list">
            {c.curated.map((card, i) => (
              <div key={i} className="cat-edit">
                <div className="two">
                  <Field id={`w-cu-${i}-t`} label="Title">
                    <input id={`w-cu-${i}-t`} maxLength={32} {...bind('curated', i, 'title')} />
                  </Field>
                  <Field id={`w-cu-${i}-x`} label="Text">
                    <textarea id={`w-cu-${i}-x`} rows={2} maxLength={160} {...bind('curated', i, 'text')} />
                  </Field>
                </div>
                <ImageField id={`w-cu-${i}-i`} label="Photo" value={card.image} cat={card.cat || 'trips'} folder="site" demo={demo} onChange={(v) => set(['curated', i, 'image'], v)} />
              </div>
            ))}
          </div>
        ),
      })}

      {Sec({
        id: 'passport',
        title: 'Passport and reviews',
        children: (
          <>
            <Field id="w-pp-t" label="Passport title">
              <input id="w-pp-t" maxLength={40} {...bind('passport', 'title')} />
            </Field>
            <Field id="w-pp-x" label="Passport text">
              <textarea id="w-pp-x" rows={3} maxLength={280} {...bind('passport', 'text')} />
            </Field>
            <Field id="w-rv-t" label="Reviews title">
              <input id="w-rv-t" maxLength={50} {...bind('reviews', 'title')} />
            </Field>
            <Field id="w-rv-x" label="Reviews text" hint="The Google review links are in Settings.">
              <textarea id="w-rv-x" rows={2} maxLength={240} {...bind('reviews', 'text')} />
            </Field>
          </>
        ),
      })}

      {Sec({
        id: 'faq',
        title: 'Questions and answers',
        sub: `${c.faq.items.length} questions`,
        children: (
          <>
            <div className="two">
              <Field id="w-fq-t" label="Title">
                <input id="w-fq-t" maxLength={40} {...bind('faq', 'title')} />
              </Field>
              <Field id="w-fq-s" label="Line under the title">
                <input id="w-fq-s" maxLength={90} {...bind('faq', 'sub')} />
              </Field>
            </div>
            {c.faq.items.map((f, i) => (
              <div key={i} className="faq-edit">
                <div className="faq-edit-head">
                  <strong>Question {i + 1}</strong>
                  <div className="row-actions">
                    <button type="button" className="icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => { const it = [...c.faq.items]; [it[i - 1], it[i]] = [it[i], it[i - 1]]; set(['faq', 'items'], it) }}>
                      <Icon name="up" size={16} />
                    </button>
                    <button type="button" className="icon-btn" aria-label="Move down" disabled={i === c.faq.items.length - 1} onClick={() => { const it = [...c.faq.items]; [it[i + 1], it[i]] = [it[i], it[i + 1]]; set(['faq', 'items'], it) }}>
                      <Icon name="down" size={16} />
                    </button>
                    <button type="button" className="icon-btn" aria-label="Remove question" onClick={() => set(['faq', 'items'], c.faq.items.filter((_, j) => j !== i))}>
                      <Icon name="close" size={16} />
                    </button>
                  </div>
                </div>
                <input aria-label={`Question ${i + 1}`} maxLength={120} {...bind('faq', 'items', i, 'q')} />
                <textarea aria-label={`Answer ${i + 1}`} rows={3} maxLength={600} {...bind('faq', 'items', i, 'a')} />
              </div>
            ))}
            <button type="button" className="link-btn" onClick={() => set(['faq', 'items'], [...c.faq.items, { q: '', a: '' }])}>
              <Icon name="plus" size={14} /> Add a question
            </button>
          </>
        ),
      })}

      {Sec({
        id: 'contact',
        title: 'Contact details and footer',
        sub: `${phoneDisplay(c.contact.whatsapp)} · ${c.contact.email}`,
        children: (
          <>
            <div className="three">
              <Field id="w-ct-w" label="WhatsApp number" hint="Country code and number, digits only.">
                <input id="w-ct-w" inputMode="tel" {...bind('contact', 'whatsapp')} />
              </Field>
              <Field id="w-ct-e" label="Support email">
                <input id="w-ct-e" type="email" {...bind('contact', 'email')} />
              </Field>
              <Field id="w-ct-i" label="Instagram handle">
                <input id="w-ct-i" {...bind('contact', 'instagram')} />
              </Field>
            </div>
            <Field id="w-ft" label="Footer line">
              <textarea id="w-ft" rows={2} maxLength={200} {...bind('footer', 'tagline')} />
            </Field>
            <p className="fine">Company name, address and licence number come from the trade licence and are not editable here.</p>
          </>
        ),
      })}

      {Sec({
        id: 'legal',
        title: 'Policies',
        sub: 'Booking and cancellations, terms, privacy',
        children: (
          <>
            <Notice tone="info">
              Formatting: start a line with <code>## </code> for a heading and <code>- </code> for a bullet. Leave a blank line between paragraphs.{' '}
              <code>{'{company}'}</code>, <code>{'{licence}'}</code>, <code>{'{whatsapp}'}</code> and <code>{'{email}'}</code> fill in automatically. The
              "last updated" date changes when you save an edit.
            </Notice>
            {Object.entries(c.legal).map(([k, v]) => (
              <div key={k} className="legal-edit">
                <div className="faq-edit-head">
                  <Field id={`w-lg-${k}-t`} label="Page title">
                    <input id={`w-lg-${k}-t`} maxLength={60} {...bind('legal', k, 'title')} />
                  </Field>
                  {(v.body !== LEGAL_DEFAULTS[k].body || v.title !== LEGAL_DEFAULTS[k].title) && (
                    <button type="button" className="btn ghost small" onClick={() => set(['legal', k], { ...LEGAL_DEFAULTS[k] })}>
                      Reset to standard text
                    </button>
                  )}
                </div>
                <textarea aria-label={`${v.title} text`} className="mono-ish" rows={14} {...bind('legal', k, 'body')} />
              </div>
            ))}
          </>
        ),
      })}

      <div className={`save-bar ${dirty ? 'show' : ''}`}>
        <span>{dirty ? 'You have unsaved changes' : 'All changes saved'}</span>
        <div className="btn-row tight">
          {dirty && (
            <button className="btn ghost small" onClick={() => setC(clone(initial))}>
              Discard
            </button>
          )}
          <button className="btn gold" disabled={!dirty || busy} onClick={save}>
            {busy ? 'Saving…' : 'Publish changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

const DEFAULT_LABELS = Object.fromEntries(ORIGINAL_CATS.map((c) => [c.id, c.label]))
const DEFAULT_BLURBS = Object.fromEntries(ORIGINAL_CATS.map((c) => [c.id, c.blurb]))
