import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApp } from '../../App.jsx'
import { supabase } from '../../lib/api.js'
import { aed, niceDate } from '../../lib/format.js'
import { Icon } from '../../components/Icon.jsx'
import { Notice, CopyButton } from '../../components/ui.jsx'

const SOURCE_LABEL = { booking: 'Booking', quote: 'Quote', waitlist: 'Waitlist', passport: 'Passport' }

export default function Customers({ demo }) {
  const { showToast } = useApp()
  const [rows, setRows] = useState(null)
  const [view, setView] = useState('all')
  const [q, setQ] = useState('')
  const [confirmOn, setConfirmOn] = useState(null)

  const load = useCallback(async () => {
    if (demo) return setRows(DEMO_CONTACTS)
    const { data, error } = await supabase.rpc('admin_contacts')
    if (error) {
      showToast('Could not load customers.', 'error')
      return setRows([])
    }
    setRows(data || [])
  }, [demo, showToast])
  useEffect(() => {
    load()
  }, [load])

  const all = rows || []
  const kpi = {
    total: all.length,
    opted: all.filter((r) => r.opted_in).length,
    booked: all.filter((r) => r.bookings > 0).length,
    paid: all.filter((r) => r.paid > 0).length,
    passport: all.filter((r) => r.sources?.includes('passport')).length,
  }
  const list = useMemo(
    () =>
      all.filter((r) => {
        if (view === 'opted' && !r.opted_in) return false
        if (view === 'booked' && !(r.bookings > 0)) return false
        if (view === 'paid' && !(r.paid > 0)) return false
        if (['passport', 'waitlist', 'quote'].includes(view) && !r.sources?.includes(view)) return false
        if (q) return [r.email, r.name, r.phone, r.university].join(' ').toLowerCase().includes(q.toLowerCase())
        return true
      }),
    [all, view, q]
  )

  async function setMarketing(r, on) {
    if (demo) return showToast('Example data. Changes are not saved.', 'error')
    const { error } = await supabase.rpc('admin_set_marketing', { p_email: r.email, p_opted_in: on })
    if (error) return showToast('Could not save.', 'error')
    setConfirmOn(null)
    showToast(on ? `${r.email} will get marketing emails` : `${r.email} unsubscribed`)
    load()
  }

  function exportCsv(onlyOpted) {
    const data = onlyOpted ? all.filter((r) => r.opted_in) : list
    const head = ['email', 'name', 'phone', 'university', 'marketing_opt_in', 'consent_date', 'sources', 'bookings', 'paid_bookings', 'spent_aed', 'first_seen', 'last_seen', 'passport_no']
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lines = data.map((r) =>
      [r.email, r.name, r.phone, r.university, r.opted_in ? 'yes' : 'no', r.consent_at?.slice(0, 10), (r.sources || []).join(' '), r.bookings, r.paid, r.spent, r.first_seen?.slice(0, 10), r.last_seen?.slice(0, 10), r.passport_no]
        .map(cell)
        .join(',')
    )
    const blob = new Blob(['﻿' + [head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `yondo-${onlyOpted ? 'marketing-list' : 'customers'}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }

  return (
    <div className="customers">
      <div className="kpis compact">
        <Kpi label="People" value={kpi.total} />
        <Kpi label="Agreed to marketing" value={kpi.opted} tone="good" />
        <Kpi label="Sent a booking" value={kpi.booked} />
        <Kpi label="Paid customers" value={kpi.paid} />
        <Kpi label="Passport members" value={kpi.passport} />
      </div>

      <div className="card">
        <div className="section-head">
          <div>
            <h2>Customers</h2>
            <p className="muted small">
              Everyone who sent a booking or quote request, joined the waitlist or opened a passport, one row per email. For email campaigns, use
              only people marked <strong>Yes</strong>: they ticked the box. Import the list into Zoho Campaigns or Mailchimp, which add the unsubscribe
              link for you.
            </p>
          </div>
          <div className="btn-row tight">
            <button className="btn gold small" onClick={() => exportCsv(true)} disabled={!kpi.opted}>
              <Icon name="download" size={15} /> Marketing list ({kpi.opted})
            </button>
            <button className="btn ghost small" onClick={() => exportCsv(false)} disabled={!list.length}>
              <Icon name="download" size={15} /> Export this view
            </button>
          </div>
        </div>
        <div className="admin-filters">
          <div className="seg">
            {[['all', 'All'], ['opted', 'Agreed to marketing'], ['booked', 'Booked'], ['paid', 'Paid'], ['passport', 'Passport'], ['waitlist', 'Waitlist'], ['quote', 'Quotes']].map(([id, l]) => (
              <button key={id} className={view === id ? 'on' : ''} onClick={() => setView(id)}>
                {l}
              </button>
            ))}
          </div>
          <input className="admin-search" placeholder="Search name, email, phone" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search customers" />
          {list.length > 0 && <CopyButton text={list.map((r) => r.email).join(', ')} label={`Copy ${list.length} emails`} />}
        </div>
        {rows === null ? (
          <p className="muted">Loading…</p>
        ) : list.length ? (
          <div className="table-wrap">
            <table className="admin-table customers-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Came from</th>
                  <th className="num">Bookings</th>
                  <th>Seen</th>
                  <th>Marketing emails</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.email}>
                    <td>
                      <strong>{r.name || '—'}</strong>
                      <small>
                        <a href={`mailto:${r.email}`}>{r.email}</a>
                      </small>
                      <small>
                        {[r.phone, r.university].filter(Boolean).join(' · ')}
                        {r.passport_no && ` · ${r.passport_no}`}
                      </small>
                    </td>
                    <td>
                      <span className="src-pills">
                        {(r.sources || []).map((s) => (
                          <span key={s} className={`pill src-${s}`}>
                            {SOURCE_LABEL[s] || s}
                          </span>
                        ))}
                      </span>
                    </td>
                    <td className="num">
                      {r.bookings}
                      {r.paid > 0 && <small>{r.paid} paid · {aed(r.spent)}</small>}
                    </td>
                    <td>
                      {niceDate(r.last_seen, { day: 'numeric', month: 'short' })}
                      <small>first {niceDate(r.first_seen, { day: 'numeric', month: 'short', year: '2-digit' })}</small>
                    </td>
                    <td>
                      {confirmOn === r.email ? (
                        <span className="confirm-inline">
                          Did they ask to get emails?
                          <button className="btn gold small" onClick={() => setMarketing(r, true)}>
                            Yes, add them
                          </button>
                          <button className="btn ghost small" onClick={() => setConfirmOn(null)}>
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <span className="mk-cell">
                          <label className="switch">
                            <input type="checkbox" checked={!!r.opted_in} onChange={() => (r.opted_in ? setMarketing(r, false) : setConfirmOn(r.email))} />
                            <span />
                            <span className="sr-only">Marketing emails for {r.email}</span>
                          </label>
                          <small>{r.opted_in ? `Yes, since ${niceDate(r.consent_at, { day: 'numeric', month: 'short' })}` : 'No'}</small>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted empty-admin">Nobody here yet. People appear as soon as they send a request, join the waitlist or open a passport.</p>
        )}
        <Notice tone="info">
          New forms ask customers to tick "Email me new experiences and student deals". People who came before that box existed show as No; only add them
          if they agree.
        </Notice>
      </div>
    </div>
  )
}

function Kpi({ label, value, tone }) {
  return (
    <div className={`kpi ${tone || ''}`}>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  )
}

const d = (n) => new Date(Date.now() - n * 864e5).toISOString()
const DEMO_CONTACTS = [
  { email: 'student@example.com', name: 'Example Student', phone: '+971500000001', university: 'Example University', sources: ['booking', 'passport'], bookings: 2, paid: 1, spent: 530, first_seen: d(20), last_seen: d(1), opted_in: true, consent_at: d(20), passport_no: 'YX26-000101' },
  { email: 'two@example.com', name: 'Example Two', phone: '+971500000002', university: null, sources: ['booking'], bookings: 1, paid: 0, spent: 0, first_seen: d(3), last_seen: d(3), opted_in: false, consent_at: null, passport_no: null },
  { email: 'person@example.com', name: 'Example Person', phone: null, university: 'Example University', sources: ['waitlist', 'quote'], bookings: 0, paid: 0, spent: 0, first_seen: d(9), last_seen: d(2), opted_in: true, consent_at: d(2), passport_no: null },
]
