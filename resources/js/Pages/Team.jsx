import { useState, useEffect } from 'react'
import Sidebar from '../Components/Sidebar'
import { useTheme } from '../Context/ThemeContext'
import { useIsMobile } from '../hooks/useIsMobile'

/* ─────────────────────────────────────────────────────────────
   FONT INJECTION
───────────────────────────────────────────────────────────── */
function injectFonts() {
  if (document.getElementById('team-fonts')) return
  const l = document.createElement('link')
  l.id = 'team-fonts'; l.rel = 'stylesheet'
  l.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;500;600&family=Manrope:wght@300;400;500;600&display=swap'
  document.head.appendChild(l)
}

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */
const ROLES = ['admin', 'driver', 'staff']
const EMPTY = { name: '', phone: '', role: 'staff', is_active: true, note: '' }
const ROLE_CONFIG = {
  admin:  { color: '#a78bfa', label: 'Admin'  },
  driver: { color: '#4ade80', label: 'Driver' },
  staff:  { color: '#94a3b8', label: 'Staff'  },
}
const PALETTE = ['#f59e0b','#3b82f6','#10b981','#a78bfa','#ef4444','#06b6d4','#f97316','#ec4899']

/* ─────────────────────────────────────────────────────────────
   CHROME HELPER
───────────────────────────────────────────────────────────── */
function chrome(t) {
  const dark = t.isDark ?? (typeof t.bg === 'string' && (t.bg.startsWith('#0') || t.bg === '#0a0a0a'))
  return {
    dark,
    cardBg:   t.cardBg   ?? (dark ? 'rgba(255,255,255,.025)' : '#fff'),
    subBg:    t.subBg    ?? (dark ? 'rgba(255,255,255,.04)'  : '#f5f5f3'),
    inputBg:  t.inputBg  ?? (dark ? 'rgba(255,255,255,.05)'  : '#fff'),
    rowHover: t.rowHover ?? (dark ? 'rgba(255,255,255,.04)'  : 'rgba(0,0,0,.035)'),
    border:   t.border   ?? (dark ? 'rgba(255,255,255,.08)'  : 'rgba(0,0,0,.09)'),
    dimSep:               dark ? 'rgba(255,255,255,.05)'  : 'rgba(0,0,0,.06)',
    text:     t.text     ?? (dark ? 'rgba(255,255,255,.88)'  : '#111'),
    muted:    t.muted    ?? (dark ? 'rgba(255,255,255,.32)'  : '#888'),
    faint:                dark ? 'rgba(255,255,255,.1)'   : 'rgba(0,0,0,.1)',
    modalBg:  t.bg       ?? (dark ? '#0d0d0d' : '#fff'),
  }
}

/* ─────────────────────────────────────────────────────────────
   AVATAR  — uses name initials (not phone digits)
───────────────────────────────────────────────────────────── */
function avatarColor(name = '') {
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return PALETTE[Math.abs(h) % PALETTE.length]
}
function Avatar({ name, sz = 36 }) {
  const col = avatarColor(name)
  const initials = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  return (
    <div style={{
      width: sz, height: sz, borderRadius: 4, flexShrink: 0,
      background: col + '18', color: col,
      border: '1.5px solid ' + col + '40',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'JetBrains Mono,monospace', fontWeight: 700,
      fontSize: sz * 0.33, userSelect: 'none', letterSpacing: '-0.01em',
    }}>
      {initials}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   ROLE BADGE
───────────────────────────────────────────────────────────── */
function RoleBadge({ role }) {
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.staff
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontFamily: 'JetBrains Mono,monospace', fontSize: 10,
      letterSpacing: '0.09em', textTransform: 'uppercase',
      color: cfg.color, background: cfg.color + '18',
      border: '1px solid ' + cfg.color + '35',
      padding: '3px 9px', borderRadius: 3,
    }}>
      {cfg.label}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────
   STAT TILE
───────────────────────────────────────────────────────────── */
function StatTile({ label, value, accent, c, index }) {
  return (
    <div style={{
      background: c.cardBg, border: '1px solid ' + c.border,
      borderRadius: 6, padding: '18px 22px',
      position: 'relative', overflow: 'hidden',
      animation: 'teamIn .4s ' + (index * 70) + 'ms both',
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: accent, borderRadius: '3px 0 0 3px', opacity: .6 }} />
      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: c.muted, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 26, fontWeight: 600, color: accent, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   ACTION BUTTON
───────────────────────────────────────────────────────────── */
function ActionBtn({ onClick, danger, c, children }) {
  const [hover, setHover] = useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        fontFamily: 'JetBrains Mono,monospace', fontSize: 9,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        padding: '5px 12px', borderRadius: 3, cursor: 'pointer', transition: 'all .15s',
        background: danger
          ? (hover ? 'rgba(239,68,68,.15)' : 'rgba(239,68,68,.07)')
          : (hover ? c.rowHover : 'transparent'),
        color: danger
          ? (hover ? '#ef4444' : 'rgba(239,68,68,.55)')
          : (hover ? c.text : c.muted),
        border: '1px solid ' + (danger
          ? (hover ? 'rgba(239,68,68,.4)' : 'rgba(239,68,68,.2)')
          : c.border),
      }}>
      {children}
    </button>
  )
}

/* ─────────────────────────────────────────────────────────────
   FIELD WRAPPER
───────────────────────────────────────────────────────────── */
function Field({ label, c, children }) {
  return (
    <div>
      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: c.muted, marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  )
}
const iStyle = (c) => ({
  width: '100%', boxSizing: 'border-box', padding: '9px 12px',
  borderRadius: 4, border: '1px solid ' + c.border,
  background: c.inputBg, color: c.text,
  fontFamily: 'Manrope,sans-serif', fontSize: 13,
  outline: 'none', transition: 'border-color .15s',
})

/* ─────────────────────────────────────────────────────────────
   MODAL
───────────────────────────────────────────────────────────── */
function MemberModal({ editing, form, setForm, saving, error, onSave, onClose, c }) {
  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 40,
        background: c.dark ? 'rgba(0,0,0,.65)' : 'rgba(0,0,0,.3)',
        backdropFilter: 'blur(2px)', animation: 'fadeIn .18s ease',
      }} />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, pointerEvents: 'none',
      }}>
        <div style={{
          width: '100%', maxWidth: 440,
          background: c.modalBg, border: '1px solid ' + c.border,
          borderRadius: 8, pointerEvents: 'all',
          animation: 'modalUp .24s cubic-bezier(.23,1,.32,1)',
          boxShadow: c.dark ? '0 24px 80px rgba(0,0,0,.7)' : '0 8px 40px rgba(0,0,0,.15)',
        }}>

          {/* Modal header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 18px', borderBottom: '1px solid ' + c.border, background: c.subBg }}>
            <div>
              <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: c.muted, marginBottom: 4 }}>
                {editing ? 'Edit Member' : 'New Member'}
              </div>
              <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 18, fontWeight: 700, color: c.text, letterSpacing: '-0.02em' }}>
                {editing ? editing.name : 'Add to Team'}
              </div>
            </div>
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: 4,
              background: c.rowHover, border: '1px solid ' + c.border,
              color: c.muted, cursor: 'pointer', fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s',
            }}
              onMouseEnter={e => e.currentTarget.style.color = c.text}
              onMouseLeave={e => e.currentTarget.style.color = c.muted}>
              ✕
            </button>
          </div>

          {/* Modal body */}
          <div style={{ padding: '20px 24px 24px' }}>
            {error && (
              <div style={{
                marginBottom: 16, padding: '10px 14px', borderRadius: 4,
                borderLeft: '3px solid #ef4444',
                background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)',
                fontFamily: 'Manrope,sans-serif', fontSize: 12, color: '#ef4444',
              }}>{error}</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Full Name" c={c}>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Tinashe Moyo" style={iStyle(c)}
                  onFocus={e => e.target.style.borderColor = 'rgba(56,189,248,.45)'}
                  onBlur={e => e.target.style.borderColor = c.border} />
              </Field>

              <Field label="Phone" c={c}>
                <input required value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="e.g. 0771234567"
                  style={{ ...iStyle(c), fontFamily: 'JetBrains Mono,monospace', fontSize: 13 }}
                  onFocus={e => e.target.style.borderColor = 'rgba(56,189,248,.45)'}
                  onBlur={e => e.target.style.borderColor = c.border} />
              </Field>

              <Field label="Role" c={c}>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  style={{ ...iStyle(c), cursor: 'pointer', appearance: 'none' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(56,189,248,.45)'}
                  onBlur={e => e.target.style.borderColor = c.border}>
                  {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </Field>

              <Field label="Note" c={c}>
                <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="e.g. Covers northern zone" style={iStyle(c)}
                  onFocus={e => e.target.style.borderColor = 'rgba(56,189,248,.45)'}
                  onBlur={e => e.target.style.borderColor = c.border} />
              </Field>

              {/* Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 2 }}>
                <div onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))} style={{
                  width: 36, height: 20, borderRadius: 10, cursor: 'pointer',
                  background: form.is_active ? '#4ade80' : '#ef4444',
                  position: 'relative', transition: 'background .2s', flexShrink: 0,
                }}>
                  <div style={{
                    position: 'absolute', top: 3, left: form.is_active ? 19 : 3,
                    width: 14, height: 14, borderRadius: '50%', background: '#fff',
                    transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)',
                  }} />
                </div>
                <span style={{ fontFamily: 'Manrope,sans-serif', fontSize: 13, color: c.text }}>
                  {form.is_active ? 'Active member' : 'Inactive'}
                </span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, paddingTop: 8, borderTop: '1px solid ' + c.dimSep, marginTop: 2 }}>
                <button onClick={onClose} style={{
                  flex: 1, padding: '10px 0', borderRadius: 4,
                  border: '1px solid ' + c.border, background: 'transparent', color: c.muted,
                  fontFamily: 'JetBrains Mono,monospace', fontSize: 10,
                  letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all .15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.color = c.text}
                  onMouseLeave={e => e.currentTarget.style.color = c.muted}>
                  Cancel
                </button>
                <button onClick={onSave} disabled={saving} style={{
                  flex: 1, padding: '10px 0', borderRadius: 4, border: 'none',
                  background: saving ? c.faint : '#4ade80',
                  color: saving ? c.muted : '#0a0a0a',
                  fontFamily: 'JetBrains Mono,monospace', fontSize: 10,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', transition: 'all .15s',
                  boxShadow: saving ? 'none' : '0 4px 16px rgba(74,222,128,.3)',
                }}>
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Member'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
export default function Team() {
  const [members, setMembers]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [editing, setEditing]       = useState(null)
  const [form, setForm]             = useState(EMPTY)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState(null)
  const [hoveredRow, setHoveredRow] = useState(null)
  const { theme: t } = useTheme()
  const isMobile = useIsMobile()
  const c = chrome(t)

  useEffect(() => { injectFonts() }, [])
  useEffect(() => { fetchMembers() }, [])

  async function fetchMembers() {
    setLoading(true)
    const csrf = document.querySelector('meta[name="csrf-token"]')?.content
    try {
      const res = await fetch('/api/team', { headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrf } })
      const data = await res.json()
      setMembers(Array.isArray(data) ? data : [])
    } catch { setMembers([]) }
    finally { setLoading(false) }
  }

  function openAdd()  { setEditing(null); setForm(EMPTY); setError(null); setShowForm(true) }
  function openEdit(m) { setEditing(m); setForm({ name: m.name, phone: m.phone, role: m.role, is_active: m.is_active, note: m.note ?? '' }); setError(null); setShowForm(true) }

  async function save() {
    if (!form.name || !form.phone) { setError('Name and phone are required.'); return }
    setSaving(true); setError(null)
    const csrf = document.querySelector('meta[name="csrf-token"]')?.content
    const url = editing ? `/api/team/${editing.id}` : '/api/team'
    try {
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrf },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) setError(data.errors ? Object.values(data.errors).flat().join(' ') : (data.message ?? 'Error saving.'))
      else { setShowForm(false); fetchMembers() }
    } catch { setError('Network error. Please try again.') }
    finally { setSaving(false) }
  }

  async function toggleActive(m) {
    const csrf = document.querySelector('meta[name="csrf-token"]')?.content
    await fetch(`/api/team/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrf },
      body: JSON.stringify({ is_active: !m.is_active }),
    })
    fetchMembers()
  }

  async function remove(m) {
    if (!confirm(`Remove ${m.name} from the team?`)) return
    const csrf = document.querySelector('meta[name="csrf-token"]')?.content
    await fetch(`/api/team/${m.id}`, { method: 'DELETE', headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrf } })
    fetchMembers()
  }

  const active   = members.filter(m => m.is_active).length
  const inactive = members.length - active
  const COLS = ['Member', 'Phone', 'Role', 'Status', 'Note', 'Actions']

  return (
    <>
      <style>{`
        @keyframes teamIn  { from { opacity:0; transform:translateY(8px); }  to { opacity:1; transform:none; } }
        @keyframes fadeIn  { from { opacity:0; }                              to { opacity:1; } }
        @keyframes modalUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
        select option { background: ${c.dark ? '#0d0d0d' : '#fff'}; color: ${c.text}; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${c.faint}; border-radius: 2px; }
      `}</style>

      <div style={{
        display: 'flex', minHeight: '100vh',
        background: t.bg,   /* ← untouched */
        color: c.text, fontFamily: 'Manrope,sans-serif',
        transition: 'background .2s, color .2s',
      }}>
        <Sidebar />

        <main style={{ flex: 1, padding: isMobile ? '20px 16px 84px' : '36px 44px 60px', overflowY: 'auto' }}>

          {/* ── HEADER ── */}
          <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'flex-end', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', marginBottom: 32, gap: isMobile ? 16 : 0 }}>
            <div>
              <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: c.muted, marginBottom: 8 }}>
                Operations · Team Roster
              </div>
              <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, color: c.text, margin: 0 }}>
                Team
              </h1>
              <p style={{ fontFamily: 'Manrope,sans-serif', fontSize: 13, fontWeight: 300, color: c.muted, margin: '6px 0 0' }}>
                Manage your sales force and delivery team
              </p>
            </div>

            <button onClick={openAdd} style={{
              fontFamily: 'JetBrains Mono,monospace', fontSize: 10,
              letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700,
              padding: '11px 24px', borderRadius: 4, border: 'none',
              background: '#4ade80', color: '#0a0a0a', cursor: 'pointer',
              transition: 'box-shadow .15s',
              boxShadow: '0 4px 16px rgba(74,222,128,.3)',
            }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 24px rgba(74,222,128,.5)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(74,222,128,.3)'}>
              + Add Member
            </button>
          </div>

          {/* ── STAT TILES ── */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 10, marginBottom: 28 }}>
            <StatTile label="Total Members" value={members.length} accent="#38bdf8" c={c} index={0} />
            <StatTile label="Active"        value={active}         accent="#4ade80" c={c} index={1} />
            <StatTile label="Inactive"      value={inactive}       accent="#ef4444" c={c} index={2} />
          </div>

          {/* ── TABLE ── */}
          <div style={{ background: c.cardBg, border: '1px solid ' + c.border, borderRadius: 6, overflow: 'hidden', animation: 'teamIn .4s .15s both' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid ' + c.border, background: c.subBg }}>
                  {COLS.map(h => (
                    <th key={h} style={{
                      padding: '12px 18px', textAlign: 'left',
                      fontFamily: 'JetBrains Mono,monospace',
                      fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase',
                      color: c.muted, fontWeight: 500, whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '48px 20px', textAlign: 'center', fontFamily: 'JetBrains Mono,monospace', fontSize: 11, letterSpacing: '0.12em', color: c.faint }}>
                      LOADING TEAM…
                    </td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '64px 20px', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 32, color: c.faint, marginBottom: 12 }}>◌</div>
                      <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 13, color: c.muted }}>No team members yet</div>
                    </td>
                  </tr>
                ) : members.map((m, i) => {
                  const isHovered = hoveredRow === m.id
                  const roleCfg = ROLE_CONFIG[m.role] ?? ROLE_CONFIG.staff
                  return (
                    <tr key={m.id}
                      onMouseEnter={() => setHoveredRow(m.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{
                        borderBottom: '1px solid ' + c.dimSep,
                        background: isHovered ? c.rowHover : 'transparent',
                        transition: 'background .12s',
                        animation: 'teamIn .3s ' + (i * 35) + 'ms both',
                        borderLeft: '3px solid ' + (isHovered ? roleCfg.color + '80' : 'transparent'),
                      }}>

                      {/* Member */}
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Avatar name={m.name} sz={34} />
                          <div>
                            <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 13, fontWeight: 600, color: c.text }}>{m.name}</div>
                            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: c.muted, marginTop: 2, letterSpacing: '0.04em' }}>
                              ID #{String(m.id).padStart(3, '0')}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td style={{ padding: '12px 18px', fontFamily: 'JetBrains Mono,monospace', fontSize: 12, color: c.muted, letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
                        {m.phone}
                      </td>

                      {/* Role */}
                      <td style={{ padding: '12px 18px' }}>
                        <RoleBadge role={m.role} />
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 18px' }}>
                        <button onClick={() => toggleActive(m)} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          fontFamily: 'JetBrains Mono,monospace', fontSize: 10,
                          letterSpacing: '0.08em', textTransform: 'uppercase',
                          padding: '3px 10px', borderRadius: 3, cursor: 'pointer',
                          background: m.is_active ? 'rgba(74,222,128,.1)' : 'rgba(239,68,68,.1)',
                          color: m.is_active ? '#4ade80' : '#ef4444',
                          border: '1px solid ' + (m.is_active ? 'rgba(74,222,128,.3)' : 'rgba(239,68,68,.3)'),
                          transition: 'all .15s',
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.is_active ? '#4ade80' : '#ef4444', boxShadow: m.is_active ? '0 0 5px #4ade80' : '0 0 5px #ef4444' }} />
                          {m.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      {/* Note */}
                      <td style={{ padding: '12px 18px', fontFamily: 'Manrope,sans-serif', fontSize: 12, color: c.muted, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.note || <span style={{ color: c.faint }}>—</span>}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {/* Edit */}
                          <button onClick={() => openEdit(m)} title="Edit member"
                            style={{
                              width: 30, height: 30, borderRadius: 4, border: '1px solid ' + c.border,
                              background: 'transparent', cursor: 'pointer', transition: 'all .15s',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.muted,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = c.rowHover; e.currentTarget.style.color = c.text; e.currentTarget.style.borderColor = c.border }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = c.muted; e.currentTarget.style.borderColor = c.border }}
                          >
                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11.5 2.5a1.414 1.414 0 0 1 2 2L5 13H3v-2L11.5 2.5z"/>
                            </svg>
                          </button>
                          {/* Delete */}
                          <button onClick={() => remove(m)} title="Remove member"
                            style={{
                              width: 30, height: 30, borderRadius: 4, border: '1px solid rgba(239,68,68,.2)',
                              background: 'rgba(239,68,68,.07)', cursor: 'pointer', transition: 'all .15s',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(239,68,68,.55)',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,.15)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,.4)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,.07)'; e.currentTarget.style.color = 'rgba(239,68,68,.55)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,.2)' }}
                          >
                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="2 4 14 4"/>
                              <path d="M6 4V2h4v2"/>
                              <path d="M3 4l1 9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-9"/>
                              <line x1="6" y1="7" x2="6" y2="11"/>
                              <line x1="10" y1="7" x2="10" y2="11"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

        </main>
      </div>

      {/* ── MODAL ── */}
      {showForm && (
        <MemberModal
          editing={editing} form={form} setForm={setForm}
          saving={saving} error={error}
          onSave={save} onClose={() => setShowForm(false)}
          c={c}
        />
      )}
    </>
  )
}