import { useState, useEffect, useRef } from 'react'
import Sidebar from '../Components/Sidebar'
import { useTheme } from '../Context/ThemeContext'
import { useIsMobile } from '../hooks/useIsMobile'

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */
const EMPTY_FORM = { name: '', slug: '', category: 'Mains', price: '', description: '', emoji: '🍽️', sort_order: 0 }

const CATEGORIES = ['All', 'Mains', 'Drinks', 'Sides', 'Desserts']

const CAT_META = {
  All:      { glyph: '◈', accent: '#c8a96e' },
  Mains:    { glyph: '◉', accent: '#c8a96e' },
  Drinks:   { glyph: '◎', accent: '#7eb8c8' },
  Sides:    { glyph: '◇', accent: '#a8c87e' },
  Desserts: { glyph: '✦', accent: '#c87ea8' },
}

/* ─────────────────────────────────────────────────────────────
   FONT INJECTION
───────────────────────────────────────────────────────────── */
function injectFonts() {
  if (document.getElementById('menu-fonts')) return
  const l = document.createElement('link')
  l.id = 'menu-fonts'; l.rel = 'stylesheet'
  l.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;500;600&family=Manrope:wght@300;400;500;600&display=swap'
  document.head.appendChild(l)
}

/* ─────────────────────────────────────────────────────────────
   STYLED INPUT (reusable)
───────────────────────────────────────────────────────────── */
function Field({ label, children, hint }) {
  const { theme: t } = useTheme()
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <label style={{ fontFamily: 'Manrope,sans-serif', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(200,169,110,.7)' }}>{label}</label>
        {hint && <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: t.muted }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function getInputStyle(t) {
  return {
    width: '100%',
    background: t.inputBg,
    border: '1px solid rgba(200,169,110,.2)',
    borderRadius: 4,
    padding: '9px 12px',
    color: t.text,
    fontFamily: 'Manrope,sans-serif',
    fontSize: 13,
    outline: 'none',
    transition: 'border-color .15s',
    boxSizing: 'border-box',
  }
}

/* ─────────────────────────────────────────────────────────────
   ADD ITEM DRAWER (slides down)
───────────────────────────────────────────────────────────── */
function AddItemForm({ form, setForm, imageFile, setImageFile, imagePreview, setImagePreview,
  fileInputRef, saving, error, onSave, onCancel }) {
  const { theme: t } = useTheme()
  const isMobile = useIsMobile()
  const inputStyle = getInputStyle(t)

  function handleImageChange(e) {
    const file = e.target.files[0]; if (!file) return
    setImageFile(file); setImagePreview(URL.createObjectURL(file))
  }
  function handleNameChange(name) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    setForm(f => ({ ...f, name, slug }))
  }

  return (
    <div style={{
      background: t.isDark ? 'rgba(10,10,10,.97)' : t.cardBg,
      border: `1px solid ${t.isDark ? 'rgba(200,169,110,.25)' : t.cardBorder}`,
      borderRadius: 8,
      padding: '32px 36px',
      marginBottom: 32,
      backdropFilter: 'blur(12px)',
      animation: 'slideDown .28s cubic-bezier(.23,1,.32,1)',
    }}>
      {/* Form header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 28 }}>
        <span style={{ fontFamily: 'Syne,sans-serif', fontSize: 22, fontWeight: 600, color: t.text, letterSpacing: '-0.01em' }}>
          New Menu Item
        </span>
        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: 'rgba(200,169,110,.5)', letterSpacing: '0.1em' }}>DRAFT</span>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 4, padding: '10px 14px', marginBottom: 20, fontFamily: 'Manrope,sans-serif', fontSize: 12, color: '#fca5a5' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '120px 1fr', gap: 32, marginBottom: 28 }}>
        {/* Image well */}
        <div>
          <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(200,169,110,.7)', marginBottom: 8 }}>Photo</div>
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: 120, height: 120,
              borderRadius: 6,
              border: '1.5px dashed rgba(200,169,110,.3)',
              background: 'rgba(255,255,255,.03)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              overflow: 'hidden',
              position: 'relative',
            }}>
            {imagePreview
              ? <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 40 }}>{form.emoji || '🍽️'}</span>}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0,
              transition: 'opacity .15s',
              fontSize: 11, color: '#fff', fontFamily: 'Manrope,sans-serif', letterSpacing: '0.05em',
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = 1}
              onMouseLeave={e => e.currentTarget.style.opacity = 0}>
              Upload
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange} style={{ display: 'none' }} />
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: t.muted, marginTop: 6, lineHeight: 1.4 }}>
            JPG PNG WEBP<br />max 2 MB
          </div>
        </div>

        {/* Fields grid */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '16px 20px' }}>
          <Field label="Name">
            <input value={form.name} onChange={e => handleNameChange(e.target.value)}
              placeholder="Chicken & Chips" style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'rgba(200,169,110,.6)'}
              onBlur={e => e.target.style.borderColor = 'rgba(200,169,110,.2)'} />
          </Field>
          <Field label="Slug" hint="bot key">
            <input value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
              placeholder="chicken_chips"
              style={{ ...inputStyle, fontFamily: 'JetBrains Mono,monospace', fontSize: 12 }}
              onFocus={e => e.target.style.borderColor = 'rgba(200,169,110,.6)'}
              onBlur={e => e.target.style.borderColor = 'rgba(200,169,110,.2)'} />
          </Field>
          <Field label="Emoji">
            <input value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
              style={{ ...inputStyle, textAlign: 'center', fontSize: 22 }}
              onFocus={e => e.target.style.borderColor = 'rgba(200,169,110,.6)'}
              onBlur={e => e.target.style.borderColor = 'rgba(200,169,110,.2)'} />
          </Field>
          <Field label="Category">
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              style={{ ...inputStyle, cursor: 'pointer' }}
              onFocus={e => e.target.style.borderColor = 'rgba(200,169,110,.6)'}
              onBlur={e => e.target.style.borderColor = 'rgba(200,169,110,.2)'}>
              {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Price (R)">
            <input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              placeholder="0.00" type="number" step="0.01"
              style={{ ...inputStyle, fontFamily: 'JetBrains Mono,monospace' }}
              onFocus={e => e.target.style.borderColor = 'rgba(200,169,110,.6)'}
              onBlur={e => e.target.style.borderColor = 'rgba(200,169,110,.2)'} />
          </Field>
          <Field label="Description">
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Short description for bot"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'rgba(200,169,110,.6)'}
              onBlur={e => e.target.style.borderColor = 'rgba(200,169,110,.2)'} />
          </Field>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, paddingTop: 24, borderTop: `1px solid ${t.isDark ? 'rgba(200,169,110,.12)' : t.border}` }}>
        <button onClick={onSave} disabled={saving} style={{
          fontFamily: 'Manrope,sans-serif', fontSize: 12, fontWeight: 600,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          padding: '10px 28px', borderRadius: 4, cursor: saving ? 'not-allowed' : 'pointer',
          background: saving ? 'rgba(200,169,110,.3)' : '#c8a96e',
          color: saving ? 'rgba(255,255,255,.4)' : '#0f0b07',
          border: 'none', transition: 'all .15s',
        }}>
          {saving ? 'Saving…' : 'Save Item'}
        </button>
        <button onClick={onCancel} style={{
          fontFamily: 'Manrope,sans-serif', fontSize: 12, letterSpacing: '0.05em',
          padding: '10px 20px', borderRadius: 4, cursor: 'pointer',
          background: 'transparent', color: t.muted,
          border: `1px solid ${t.border}`, transition: 'all .15s',
        }}
          onMouseEnter={e => e.currentTarget.style.color = t.text}
          onMouseLeave={e => e.currentTarget.style.color = t.muted}>
          Cancel
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   MENU CARD
───────────────────────────────────────────────────────────── */
function MenuCard({ item, onToggle, onDelete, onUploadImage }) {
  const [hover, setHover] = useState(false)
  const [deleteHover, setDeleteHover] = useState(false)
  const cat = CAT_META[item.category] ?? CAT_META.Mains
  const { theme: t } = useTheme()

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover
          ? (t.isDark ? 'rgba(255,255,255,.035)' : t.rowHover)
          : (t.isDark ? 'rgba(255,255,255,.02)' : t.cardBg),
        border: `1px solid ${hover ? 'rgba(200,169,110,.3)' : (t.isDark ? 'rgba(255,255,255,.07)' : t.cardBorder)}`,
        borderRadius: 8,
        overflow: 'hidden',
        opacity: item.available ? 1 : 0.45,
        transition: 'all .22s cubic-bezier(.23,1,.32,1)',
        transform: hover ? 'translateY(-2px)' : 'none',
        display: 'flex',
        flexDirection: 'column',
      }}>

      {/* IMAGE */}
      <div
        onClick={() => onUploadImage(item)}
        style={{
          height: 160,
          background: t.isDark ? 'rgba(255,255,255,.04)' : '#ede8e0',
          position: 'relative',
          cursor: 'pointer',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
        {item.image_url
          ? <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .4s ease', transform: hover ? 'scale(1.04)' : 'scale(1)' }} />
          : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, filter: 'saturate(.7)' }}>
              {item.emoji}
            </div>
          )
        }

        {/* photo overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: hover ? 1 : 0, transition: 'opacity .2s',
        }}>
          <span style={{ fontFamily: 'Manrope,sans-serif', fontSize: 11, letterSpacing: '0.1em', color: '#fff', textTransform: 'uppercase', background: 'rgba(200,169,110,.9)', padding: '6px 14px', borderRadius: 3 }}>
            Change Photo
          </span>
        </div>

        {/* available pip */}
        <div style={{
          position: 'absolute', top: 10, right: 10,
          width: 8, height: 8, borderRadius: '50%',
          background: item.available ? '#4ade80' : 'rgba(255,255,255,.25)',
          boxShadow: item.available ? '0 0 6px #4ade80' : 'none',
        }} />

        {/* category glyph */}
        <div style={{
          position: 'absolute', bottom: 10, left: 12,
          fontFamily: 'JetBrains Mono,monospace', fontSize: 10,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: cat.accent, background: 'rgba(0,0,0,.65)',
          padding: '3px 8px', borderRadius: 2,
        }}>
          {cat.glyph} {item.category}
        </div>
      </div>

      {/* INFO */}
      <div style={{ padding: '16px 18px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          fontFamily: 'Syne,sans-serif',
          fontSize: 19, fontWeight: 600,
          color: t.text,
          lineHeight: 1.2,
          marginBottom: 5,
          letterSpacing: '-0.01em',
        }}>{item.name}</div>

        {item.description && (
          <div style={{
            fontFamily: 'Manrope,sans-serif', fontSize: 11.5,
            color: t.muted,
            lineHeight: 1.5,
            marginBottom: 12,
            flex: 1,
          }}>{item.description}</div>
        )}

        <div style={{
          fontFamily: 'JetBrains Mono,monospace',
          fontSize: 20, fontWeight: 500,
          color: cat.accent,
          letterSpacing: '-0.01em',
          marginBottom: 14,
        }}>
          R{Number(item.price).toFixed(2)}
        </div>

        {/* ACTIONS */}
        <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: `1px solid ${t.border}` }}>
          <button onClick={() => onToggle(item)} style={{
            flex: 1,
            fontFamily: 'Manrope,sans-serif', fontSize: 11, fontWeight: 500,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            padding: '7px 0', borderRadius: 3, cursor: 'pointer',
            background: item.available ? 'rgba(74,222,128,.1)' : 'rgba(255,255,255,.05)',
            color: item.available ? '#4ade80' : 'rgba(255,255,255,.35)',
            border: `1px solid ${item.available ? 'rgba(74,222,128,.3)' : 'rgba(255,255,255,.1)'}`,
            transition: 'all .15s',
          }}>
            {item.available ? 'Available' : 'Unavailable'}
          </button>
          <button
            onClick={() => onDelete(item.id)}
            onMouseEnter={() => setDeleteHover(true)}
            onMouseLeave={() => setDeleteHover(false)}
            style={{
              width: 34, padding: '7px 0', borderRadius: 3, cursor: 'pointer',
              background: deleteHover ? 'rgba(239,68,68,.15)' : (t.isDark ? 'rgba(255,255,255,.04)' : '#f5f5f5'),
              color: deleteHover ? '#f87171' : t.muted,
              border: `1px solid ${deleteHover ? 'rgba(239,68,68,.4)' : t.border}`,
              fontSize: 14, transition: 'all .15s',
            }}>✕</button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
export default function Menu() {
  const [items,        setItems]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [filter,       setFilter]       = useState('All')
  const [showForm,     setShowForm]     = useState(false)
  const [form,         setForm]         = useState(EMPTY_FORM)
  const [imageFile,    setImageFile]    = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState(null)
  const fileInputRef = useRef(null)
  const { theme: t } = useTheme()
  const isMobile = useIsMobile()

  useEffect(() => { injectFonts() }, [])
  useEffect(() => { fetchItems() }, [])

  async function fetchItems() {
    setLoading(true)
    try {
      const res = await fetch('/api/menu-items', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setItems(await res.json())
    } catch (e) { setError('Could not load menu items.') }
    finally { setLoading(false) }
  }

  function resetForm() {
    setForm(EMPTY_FORM); setImageFile(null); setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setShowForm(false); setError(null)
  }

  function csrfToken() { return document.querySelector('meta[name="csrf-token"]')?.content ?? '' }

  async function apiRequest(url, options = {}) {
    const res = await fetch(url, {
      credentials: 'same-origin',
      headers: { 'X-CSRF-TOKEN': csrfToken(), Accept: 'application/json', ...(options.headers ?? {}) },
      ...options,
    })
    const isJson = res.headers.get('content-type')?.includes('application/json')
    const data = isJson ? await res.json() : await res.text()
    return { ok: res.ok, status: res.status, data: isJson ? data : null }
  }

  async function addItem() {
    if (!form.name || !form.price || !form.slug) { setError('Name, slug and price are required.'); return }
    setSaving(true); setError(null)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v !== null && v !== undefined) fd.append(k, v) })
      if (imageFile) fd.append('image', imageFile)
      const { ok, status, data } = await apiRequest('/api/menu-items', { method: 'POST', body: fd })
      if (!ok) {
        if (status === 401) { setError('Session expired — please refresh.'); return }
        setError(data ? (Object.values(data.errors ?? {}).flat().join(' ') || data.message || 'Failed to save.') : `Server error (${status}).`)
        return
      }
      setItems(prev => [...prev, data]); resetForm()
    } catch { setError('Could not reach server.') }
    finally { setSaving(false) }
  }

  async function toggleAvailable(item) {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, available: !i.available } : i))
    const fd = new FormData(); fd.append('available', item.available ? '0' : '1')
    await apiRequest(`/api/menu-items/${item.id}`, { method: 'POST', body: fd })
  }

  async function deleteItem(id) {
    if (!confirm('Delete this item?')) return
    setItems(prev => prev.filter(i => i.id !== id))
    await apiRequest(`/api/menu-items/${id}`, { method: 'DELETE' })
  }

  async function uploadImage(item) {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'image/jpeg,image/png,image/webp'
    input.onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return
      const fd = new FormData(); fd.append('image', file)
      const { ok, data } = await apiRequest(`/api/menu-items/${item.id}`, { method: 'POST', body: fd })
      if (ok && data) setItems(prev => prev.map(i => i.id === item.id ? { ...i, image_url: data.image_url } : i))
    }
    input.click()
  }

  const filtered   = filter === 'All' ? items : items.filter(i => i.category === filter)
  const available  = items.filter(i => i.available).length

  /* ── RENDER ── */
  return (
    <>
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-16px); }
          to   { opacity: 1; transform: translateY(0);     }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(200,169,110,.18); border-radius: 2px; }
        select option { background: ${t.inputBg}; color: ${t.text}; }
      `}</style>

      <div style={{
        display: 'flex',
        minHeight: '100vh',
        background: t.bg,
        color: t.text,
        fontFamily: 'Manrope,sans-serif',
        position: 'relative',
      }}>
        <Sidebar />

        <main style={{ flex: 1, padding: isMobile ? '20px 16px 84px' : '40px 48px 60px', overflowY: 'auto', position: 'relative', zIndex: 1 }}>

          {/* ── HEADER ── */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 36 }}>
            <div>
              <div style={{
                fontFamily: 'JetBrains Mono,monospace', fontSize: 10,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                color: 'rgba(200,169,110,.5)', marginBottom: 8,
              }}>Kitchen · Menu Management</div>
              <h1 style={{
                fontFamily: 'Syne,sans-serif',
                fontSize: 36, fontWeight: 800,
                letterSpacing: '-0.03em', lineHeight: 1,
                color: t.text, margin: 0,
              }}>Menu</h1>
              <div style={{
                display: 'flex', gap: 20, marginTop: 8,
                fontFamily: 'JetBrains Mono,monospace', fontSize: 11,
                color: t.muted, letterSpacing: '0.04em',
              }}>
                <span>{items.length} items</span>
                <span style={{ color: 'rgba(74,222,128,.6)' }}>◉ {available} live</span>
                <span style={{ color: t.muted }}>◌ {items.length - available} off</span>
              </div>
            </div>

            <button
              onClick={() => { setShowForm(s => !s); setError(null) }}
              style={{
                fontFamily: 'Manrope,sans-serif', fontSize: 12, fontWeight: 600,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                padding: '12px 26px', borderRadius: 4, cursor: 'pointer',
                background: showForm ? 'rgba(200,169,110,.15)' : '#c8a96e',
                color: showForm ? '#c8a96e' : '#0d0a06',
                border: showForm ? '1px solid rgba(200,169,110,.4)' : 'none',
                transition: 'all .18s',
              }}
              onMouseEnter={e => { if (!showForm) e.currentTarget.style.background = '#d4b87a' }}
              onMouseLeave={e => { if (!showForm) e.currentTarget.style.background = '#c8a96e' }}>
              {showForm ? '✕ Cancel' : '+ Add Item'}
            </button>
          </div>

          {/* ── FORM ── */}
          {showForm && (
            <AddItemForm
              form={form} setForm={setForm}
              imageFile={imageFile} setImageFile={setImageFile}
              imagePreview={imagePreview} setImagePreview={setImagePreview}
              fileInputRef={fileInputRef}
              saving={saving} error={error}
              onSave={addItem} onCancel={resetForm}
            />
          )}

          {/* ── CATEGORY RAIL ── */}
          <div style={{
            display: 'flex', gap: 2,
            marginBottom: 32,
            borderBottom: `1px solid ${t.border}`,
            paddingBottom: 0,
          }}>
            {CATEGORIES.map(c => {
              const active = filter === c
              const meta = CAT_META[c] ?? CAT_META.Mains
              const count = c === 'All' ? items.length : items.filter(i => i.category === c).length
              return (
                <button key={c} onClick={() => setFilter(c)} style={{
                  fontFamily: 'Manrope,sans-serif', fontSize: 12, fontWeight: active ? 500 : 400,
                  letterSpacing: '0.04em',
                  padding: '10px 18px',
                  cursor: 'pointer',
                  background: 'transparent',
                  color: active ? meta.accent : t.muted,
                  border: 'none',
                  borderBottom: active ? `2px solid ${meta.accent}` : '2px solid transparent',
                  marginBottom: -1,
                  transition: 'all .15s',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.color = t.text }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.color = t.muted }}>
                  <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, opacity: .7 }}>{meta.glyph}</span>
                  {c}
                  <span style={{
                    fontFamily: 'JetBrains Mono,monospace', fontSize: 10,
                    background: active ? `${meta.accent}22` : (t.isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)'),
                    color: active ? meta.accent : t.muted,
                    padding: '1px 6px', borderRadius: 2,
                  }}>{count}</span>
                </button>
              )
            })}
          </div>

          {/* ── LOADING ── */}
          {loading && (
            <div style={{ padding: '60px 0', fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: 'rgba(200,169,110,.4)', letterSpacing: '0.14em' }}>
              LOADING MENU…
            </div>
          )}

          {/* ── GRID ── */}
          {!loading && filtered.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
              gap: 16,
            }}>
              {filtered.map((item, i) => (
                <div key={item.id} style={{ animation: `cardIn .35s ${i * 35}ms both cubic-bezier(.23,1,.32,1)` }}>
                  <MenuCard
                    item={item}
                    onToggle={toggleAvailable}
                    onDelete={deleteItem}
                    onUploadImage={uploadImage}
                  />
                </div>
              ))}
            </div>
          )}

          {/* ── EMPTY ── */}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: '80px 0', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 60, opacity: .15, marginBottom: 16 }}>
                {CAT_META[filter]?.glyph ?? '◈'}
              </div>
              <p style={{ fontFamily: 'Manrope,sans-serif', fontSize: 14, color: t.muted, letterSpacing: '0.04em' }}>
                {items.length === 0 ? 'Add your first item to get started' : 'No items in this category'}
              </p>
            </div>
          )}

        </main>
      </div>
    </>
  )
}