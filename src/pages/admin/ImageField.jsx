import { useRef, useState } from 'react'
import { supabase } from '../../lib/api.js'
import { PHOTOS } from '../../lib/photos.js'
import { imageProps } from '../../lib/content.js'
import { Icon } from '../../components/Icon.jsx'
import { Photo } from '../../components/ui.jsx'

const MAX_W = 1800

// Re-encodes the photo in the browser: smaller files, and camera data such as GPS location is dropped.
async function prepareImage(file) {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, MAX_W / bmp.width)
  const w = Math.round(bmp.width * scale)
  const h = Math.round(bmp.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(bmp, 0, 0, w, h)
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.84))
  if (!blob) throw new Error('encode')
  return { blob, w, h }
}

export async function uploadImage(file, folder) {
  if (!/^image\//.test(file.type)) throw new Error('Choose an image file (JPG, PNG or WebP).')
  if (file.size > 25 * 1024 * 1024) throw new Error('That file is over 25 MB. Choose a smaller photo.')
  const { blob, w } = await prepareImage(file)
  if (w < 800) throw new Error(`That photo is only ${w}px wide. Use one at least 1200px wide so it stays sharp.`)
  const name = file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'photo'
  const path = `${folder}/${name}-${Date.now().toString(36)}.jpg`
  const { error } = await supabase.storage.from('media').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false })
  if (error) throw new Error('Upload failed. Check you are signed in as admin and try again.')
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
}

const LIBRARY = Object.entries(PHOTOS).sort((a, b) => a[1][2].localeCompare(b[1][2]))

export default function ImageField({ id, label, value, onChange, fallbackKey, cat = 'city', folder = 'site', demo, hint, credit, onCredit }) {
  const [mode, setMode] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [link, setLink] = useState(/^https?:/.test(value || '') ? value : '')
  const fileRef = useRef(null)
  const isUrl = /^https?:/.test(value || '')
  const source = !value ? 'Default photo' : isUrl ? (/supabase\.co\/storage/.test(value) ? 'Your upload' : 'Linked photo') : 'Photo library'

  async function onFile(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (demo) return setErr('Example data. Uploads work once you sign in on the live site.')
    setErr('')
    setBusy(true)
    try {
      onChange(await uploadImage(f, folder))
      setMode(null)
    } catch (ex) {
      setErr(ex.message || 'Upload failed.')
    }
    setBusy(false)
  }

  return (
    <div className="image-field">
      <span className="image-field-label" id={`${id}-label`}>
        {label}
      </span>
      <div className="image-field-row">
        <Photo {...imageProps(value, fallbackKey)} cat={cat} w={400} h={260} className="image-field-preview" />
        <div className="image-field-side">
          <span className="pill s-neutral">{source}</span>
          <div className="btn-row tight">
            <button type="button" className="btn ghost small" disabled={busy} onClick={() => fileRef.current?.click()}>
              <Icon name="upload" size={15} /> {busy ? 'Uploading…' : 'Upload'}
            </button>
            <button type="button" className="btn ghost small" onClick={() => setMode(mode === 'link' ? null : 'link')}>
              Paste link
            </button>
            <button type="button" className="btn ghost small" onClick={() => setMode(mode === 'lib' ? null : 'lib')}>
              Library
            </button>
            {value && (
              <button type="button" className="btn ghost small" onClick={() => onChange('')}>
                Reset
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onFile} aria-labelledby={`${id}-label`} />
        </div>
      </div>
      {mode === 'link' && (
        <div className="inline-edit">
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" aria-label="Photo link" />
          <button
            type="button"
            className="btn ghost small"
            onClick={() => {
              if (!/^https:\/\/\S+$/.test(link.trim())) return setErr('Use a full https:// link to an image.')
              setErr('')
              onChange(link.trim())
              setMode(null)
            }}
          >
            Use
          </button>
        </div>
      )}
      {mode === 'lib' && (
        <div className="select-wrap full">
          <select
            aria-label="Photo library"
            value={!isUrl ? value || '' : ''}
            onChange={(e) => {
              onChange(e.target.value)
              setMode(null)
            }}
          >
            <option value="">Choose a photo…</option>
            {LIBRARY.map(([k, p]) => (
              <option key={k} value={k}>
                {p[2]}
              </option>
            ))}
          </select>
          <Icon name="down" size={16} />
        </div>
      )}
      {onCredit && isUrl && (
        <input className="image-credit-input" value={credit || ''} onChange={(e) => onCredit(e.target.value)} placeholder="Photo credit (e.g. Courtesy of IMG Worlds)" aria-label="Photo credit" />
      )}
      {hint && !err && <small className="hint">{hint}</small>}
      {err && <small className="error-text">{err}</small>}
    </div>
  )
}
