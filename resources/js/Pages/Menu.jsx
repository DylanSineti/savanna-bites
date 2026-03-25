import { useState, useEffect, useRef } from 'react'
import Sidebar from '../Components/Sidebar'
import { useTheme } from '../Context/ThemeContext'

const EMPTY_FORM = { name: '', slug: '', category: 'Mains', price: '', description: '', emoji: '🍽️', sort_order: 0 }

const CATEGORY_EMOJIS = { Mains: '🍽️', Drinks: '🥤', Sides: '🍟', Desserts: '🍰' }

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

  const categories = ['All', 'Mains', 'Drinks', 'Sides', 'Desserts']
  const filtered   = filter === 'All' ? items : items.filter(i => i.category === filter)
  const available  = items.filter(i => i.available).length

  useEffect(() => { fetchItems() }, [])

  async function fetchItems() {
    setLoading(true)
    try {
      const res = await fetch('/api/menu-items', {
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setItems(await res.json())
    } catch (e) {
      setError('Could not load menu items.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function resetForm() {
    setForm(EMPTY_FORM)
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setShowForm(false)
    setError(null)
  }

  function handleNameChange(name) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    setForm(f => ({ ...f, name, slug }))
  }

  function csrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.content ?? ''
  }

  async function apiRequest(url, options = {}) {
    const res = await fetch(url, {
      credentials: 'same-origin',
      headers: { 'X-CSRF-TOKEN': csrfToken(), 'Accept': 'application/json', ...(options.headers ?? {}) },
      ...options,
    })
    const contentType = res.headers.get('content-type') ?? ''
    const isJson = contentType.includes('application/json')
    const body = isJson ? await res.json() : await res.text()
    return { ok: res.ok, status: res.status, data: isJson ? body : null, raw: isJson ? null : body }
  }

  async function addItem() {
    if (!form.name || !form.price || !form.slug) { setError('Name, slug and price are required.'); return }
    setSaving(true); setError(null)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v !== null && v !== undefined) fd.append(k, v) })
      if (imageFile) fd.append('image', imageFile)
      const { ok, status, data, raw } = await apiRequest('/api/menu-items', { method: 'POST', body: fd })
      if (!ok) {
        if (status === 401) { setError('Session expired — please refresh the page and log in.'); return }
        setError(data ? (Object.values(data.errors ?? {}).flat().join(' ') || data.message || 'Failed to save.') : `Server error (${status}).`)
        return
      }
      setItems(prev => [...prev, data])
      resetForm()
    } catch (e) {
      setError('Could not reach server. Check your connection.')
      console.error(e)
    } finally { setSaving(false) }
  }

  async function toggleAvailable(item) {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, available: !i.available } : i))
    const fd = new FormData()
    fd.append('available', item.available ? '0' : '1')
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
      if (ok && data) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, image_url: data.image_url } : i))
      }
    }
    input.click()
  }

  return (
    <div className="flex min-h-screen" style={{background: t.bg, color: t.text, fontFamily:"'DM Sans',sans-serif", transition:'all .2s'}}>
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">

        {/* HEADER */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-xl font-medium tracking-tight">Menu</h1>
            <p className="text-sm mt-1" style={{color: t.muted}}>{items.length} items · {available} available</p>
          </div>
          <button onClick={() => { setShowForm(!showForm); setError(null) }}
            style={{background: t.hlText, color: '#0a0a0a'}}
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-all">
            + Add Item
          </button>
        </div>

        {/* ADD FORM */}
        {showForm && (
          <div className="rounded-xl p-6 mb-6" style={{background: t.cardBg, border:`1px solid ${t.cardBorder}`}}>
            <div className="text-[10px] tracking-widest uppercase mb-4" style={{color: t.muted, fontFamily:'DM Mono,monospace'}}>New Menu Item</div>
            {error && <div className="text-xs text-red-400 mb-3">{error}</div>}

            {/* Image Upload */}
            <div className="mb-4">
              <label className="text-xs mb-1 block" style={{color: t.muted}}>Photo (shown in WhatsApp bot)</label>
              <div className="flex items-center gap-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-xl flex items-center justify-center cursor-pointer overflow-hidden"
                  style={{background: t.subBg, border:`2px dashed ${t.border}`}}>
                  {imagePreview
                    ? <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                    : <span className="text-3xl select-none">{form.emoji || '🍽️'}</span>}
                </div>
                <div>
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="block text-xs px-3 py-1.5 rounded-lg mb-1"
                    style={{background: t.subBg, border:`1px solid ${t.border}`, color: t.text}}>
                    Choose Photo
                  </button>
                  <p className="text-[10px]" style={{color: t.muted}}>JPG / PNG / WebP · max 2 MB</p>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange} className="hidden" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs mb-1 block" style={{color: t.muted}}>Emoji</label>
                <input value={form.emoji} onChange={e => setForm({...form, emoji: e.target.value})}
                  className="w-full rounded-lg px-3 py-2 text-xl text-center focus:outline-none"
                  style={{background: t.inputBg, border:`1px solid ${t.border}`, color: t.text}} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{color: t.muted}}>Name</label>
                <input value={form.name} onChange={e => handleNameChange(e.target.value)}
                  placeholder="e.g. Chicken & Chips"
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{background: t.inputBg, border:`1px solid ${t.border}`, color: t.text}} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{color: t.muted}}>Slug <span style={{opacity:0.6}}>(bot key)</span></label>
                <input value={form.slug} onChange={e => setForm({...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,'')})}
                  placeholder="e.g. chicken"
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none font-mono"
                  style={{background: t.inputBg, border:`1px solid ${t.border}`, color: t.text}} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{color: t.muted}}>Category</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{background: t.inputBg, border:`1px solid ${t.border}`, color: t.text}}>
                  {categories.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{color: t.muted}}>Price ($)</label>
                <input value={form.price} onChange={e => setForm({...form, price: e.target.value})}
                  placeholder="0.00" type="number" step="0.01"
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{background: t.inputBg, border:`1px solid ${t.border}`, color: t.text}} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{color: t.muted}}>Description (bot text)</label>
                <input value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  placeholder="e.g. Crispy golden chicken with chips"
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{background: t.inputBg, border:`1px solid ${t.border}`, color: t.text}} />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={addItem} disabled={saving}
                className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{background: t.hlText, color: '#0a0a0a', opacity: saving ? 0.6 : 1}}>
                {saving ? 'Saving…' : 'Save Item'}
              </button>
              <button onClick={resetForm}
                className="px-4 py-2 rounded-lg text-xs transition-all"
                style={{background: t.subBg, color: t.muted, border:`1px solid ${t.border}`}}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* CATEGORY FILTERS */}
        <div className="flex gap-2 mb-6">
          {categories.map(c => (
            <button key={c} onClick={() => setFilter(c)}
              className="px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{
                background: filter===c ? t.navActive : 'transparent',
                color: filter===c ? t.text : t.muted,
                border: `1px solid ${filter===c ? (t.isDark ? '#333' : '#ccc') : t.border}`,
              }}>
              {CATEGORY_EMOJIS[c] ?? ''} {c}
            </button>
          ))}
        </div>

        {/* LOADING */}
        {loading && (
          <div className="text-center py-20" style={{color: t.muted}}>
            <p className="text-sm">Loading menu…</p>
          </div>
        )}

        {/* MENU GRID */}
        {!loading && (
          <div className="grid grid-cols-4 gap-4">
            {filtered.map(item => (
              <div key={item.id} className="rounded-2xl overflow-hidden transition-all"
                style={{
                  background: t.cardBg,
                  border: `1px solid ${t.cardBorder}`,
                  opacity: item.available ? 1 : 0.45,
                }}>

                {/* IMAGE AREA */}
                <div className="h-36 flex items-center justify-center relative overflow-hidden"
                  style={{background: t.subBg}}>
                  {item.image_url
                    ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    : <span style={{fontSize:'56px', lineHeight:1}}>{item.emoji}</span>}

                  {/* Upload overlay */}
                  <button onClick={() => uploadImage(item)}
                    className="absolute inset-0 flex items-end justify-center pb-2 opacity-0 hover:opacity-100 transition-opacity"
                    style={{background:'rgba(0,0,0,0.45)'}}
                    title="Change photo">
                    <span className="text-[10px] text-white bg-black/60 px-2 py-0.5 rounded-full">📷 Change photo</span>
                  </button>

                  {/* Available badge */}
                  <div className="absolute top-2.5 right-2.5 text-[10px] px-2 py-0.5 rounded-full border font-medium"
                    style={item.available
                      ? {background:'#0d1f12', color:'#4ade80', border:'1px solid #1a3d22'}
                      : {background: t.subBg, color: t.muted, border:`1px solid ${t.border}`}}>
                    {item.available ? 'Available' : 'Off'}
                  </div>
                </div>

                {/* INFO */}
                <div className="p-4">
                  <div className="text-sm font-medium" style={{color: t.text}}>{item.name}</div>
                  <div className="text-[10px] tracking-widest uppercase mt-1 mb-1"
                    style={{color: t.muted, fontFamily:'DM Mono,monospace'}}>
                    {CATEGORY_EMOJIS[item.category]} {item.category}
                  </div>
                  {item.description && (
                    <div className="text-[11px] mb-2 leading-snug" style={{color: t.muted}}>{item.description}</div>
                  )}
                  <div className="text-lg font-medium mb-3"
                    style={{color: t.hlText, fontFamily:'DM Mono,monospace'}}>
                    ${Number(item.price).toFixed(2)}
                  </div>

                  {/* ACTIONS */}
                  <div className="flex gap-2 pt-3" style={{borderTop:`1px solid ${t.border}`}}>
                    <button onClick={() => toggleAvailable(item)}
                      className="flex-1 text-xs py-2 rounded-lg transition-all"
                      style={item.available
                        ? {background:'#0d1f12', color:'#4ade80', border:'1px solid #1a3d22'}
                        : {background: t.subBg, color: t.muted, border:`1px solid ${t.border}`}}>
                      {item.available ? 'Mark Unavailable' : 'Mark Available'}
                    </button>
                    <button onClick={() => deleteItem(item.id)}
                      className="px-3 py-2 text-xs rounded-lg transition-all"
                      style={{color: t.muted, border:`1px solid ${t.border}`}}
                      onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = '#7f1d1d' }}
                      onMouseLeave={e => { e.currentTarget.style.color = t.muted; e.currentTarget.style.borderColor = t.border }}>
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20" style={{color: t.muted}}>
            <div style={{fontSize:'48px'}}>🍽️</div>
            <p className="text-sm mt-3">No items in this category</p>
            {items.length === 0 && (
              <p className="text-xs mt-1">Add your first menu item using the button above</p>
            )}
          </div>
        )}

      </main>
    </div>
  )
}
