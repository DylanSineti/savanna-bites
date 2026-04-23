import { useState, useEffect } from 'react'
import Sidebar from '../Components/Sidebar'
import { useTheme } from '../Context/ThemeContext'
import { useIsMobile } from '../hooks/useIsMobile'

/* ─────────────────────────────────────────────────────────────
   FONT INJECTION
───────────────────────────────────────────────────────────── */
function injectFonts() {
  if (document.getElementById('bc-fonts')) return
  const l = document.createElement('link')
  l.id = 'bc-fonts'; l.rel = 'stylesheet'
  l.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;500;600&family=Manrope:wght@300;400;500;600&display=swap'
  document.head.appendChild(l)
}

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
  }
}

/* ─────────────────────────────────────────────────────────────
   RECIPIENT ROW
───────────────────────────────────────────────────────────── */
function RecipientRow({ p, checked, onToggle, c }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 20px',
        borderBottom: '1px solid ' + c.dimSep,
        cursor: 'pointer',
        background: checked
          ? (c.dark ? 'rgba(37,211,102,.07)' : 'rgba(37,211,102,.05)')
          : hover ? c.rowHover : 'transparent',
        borderLeft: '3px solid ' + (checked ? '#25D366' : 'transparent'),
        transition: 'all .12s',
      }}>
      {/* checkbox */}
      <div style={{
        width: 15, height: 15, borderRadius: 3, flexShrink: 0,
        border: '1.5px solid ' + (checked ? '#25D366' : c.border),
        background: checked ? '#25D366' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .15s',
      }}>
        {checked && <span style={{ color: '#fff', fontSize: 9, fontWeight: 700, lineHeight: 1 }}>✓</span>}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 12, color: c.text, letterSpacing: '0.03em' }}>
          +{p.phone}
        </div>
        <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 10, color: c.muted, marginTop: 1 }}>
          {p.order_count} order{p.order_count !== 1 ? 's' : ''}
        </div>
      </div>

      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: c.faint, flexShrink: 0 }}>
        {new Date(p.last_order).toLocaleDateString([], { day: 'numeric', month: 'short' })}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   CHAR METER
───────────────────────────────────────────────────────────── */
function CharMeter({ count, c }) {
  const pct   = Math.min((count / 1000) * 100, 100)
  const color = count > 800 ? '#f87171' : count > 500 ? '#fbbf24' : '#4ade80'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 2, background: c.border, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 2, transition: 'width .2s, background .2s' }} />
      </div>
      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: count > 0 ? color : c.faint, letterSpacing: '0.06em', flexShrink: 0, minWidth: 28, textAlign: 'right' }}>
        {count}
      </span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   WHATSAPP BUBBLE
───────────────────────────────────────────────────────────── */
function WaBubble({ message, c }) {
  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid ' + c.dimSep }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(37,211,102,.15)', border: '1px solid rgba(37,211,102,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
          🛒
        </div>
        <div>
          <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 12, fontWeight: 600, color: c.text }}>Your Restaurant</div>
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: '#25D366', letterSpacing: '0.08em', marginTop: 1 }}>WHATSAPP</div>
        </div>
      </div>
      <div style={{
        background: c.dark ? '#1a2e1a' : '#dcf8c6',
        borderRadius: '2px 12px 12px 12px',
        padding: '10px 14px 8px',
        display: 'inline-block', maxWidth: '85%',
        boxShadow: c.dark ? 'none' : '0 1px 2px rgba(0,0,0,.1)',
      }}>
        <p style={{ margin: 0, fontFamily: 'Manrope,sans-serif', fontSize: 13, lineHeight: 1.65, color: c.dark ? '#b8e6b0' : '#111', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {message}
        </p>
        <div style={{ textAlign: 'right', marginTop: 5, fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: c.dark ? '#4a7a44' : '#aaa' }}>
          now ✓✓
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   RESULT BANNER
───────────────────────────────────────────────────────────── */
function ResultBanner({ result, c }) {
  const isErr = result.error || (result.failed > 0 && result.sent === 0)
  const col   = isErr ? '#f87171' : '#4ade80'
  return (
    <div style={{
      padding: '12px 16px', borderRadius: 4,
      background: isErr ? 'rgba(248,113,113,.08)' : 'rgba(74,222,128,.08)',
      border: '1px solid ' + (isErr ? 'rgba(248,113,113,.3)' : 'rgba(74,222,128,.3)'),
      borderLeft: '3px solid ' + col,
      animation: 'bcIn .3s ease',
      maxHeight: 120, overflowY: 'auto',
    }}>
      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: col, letterSpacing: '0.06em', marginBottom: result.errors?.length ? 8 : 0 }}>
        {result.error
          ? '✕ ' + result.error
          : result.sent > 0
            ? `✓ Sent to ${result.sent} customer${result.sent !== 1 ? 's' : ''}${result.failed > 0 ? ` · ${result.failed} failed` : ''}`
            : `✕ All ${result.failed} failed to send`}
      </div>
      {result.errors?.slice(0, 4).map((e, i) => (
        <div key={i} style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: c.muted, marginTop: 3 }}>
          +{e.phone}: {e.reason}
        </div>
      ))}
      {result.errors?.length > 4 && (
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: c.faint, marginTop: 2 }}>
          …and {result.errors.length - 4} more
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PANEL HEADER
───────────────────────────────────────────────────────────── */
function PanelHeader({ label, right, c }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '13px 20px',
      borderBottom: '1px solid ' + c.border,
      background: c.subBg, flexShrink: 0,
    }}>
      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: c.muted }}>
        {label}
      </div>
      {right}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   MAIN
───────────────────────────────────────────────────────────── */
export default function Broadcast() {
  const [phones, setPhones]     = useState([])
  const [selected, setSelected] = useState(new Set())
  const [message, setMessage]   = useState('')
  const [sending, setSending]   = useState(false)
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const { theme: t } = useTheme()
  const isMobile = useIsMobile()
  const c = chrome(t)

  useEffect(() => { injectFonts() }, [])

  useEffect(() => {
    const csrf = document.querySelector('meta[name="csrf-token"]')?.content
    fetch('/api/broadcast/recipients', { headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrf } })
      .then(r => r.json())
      .then(data => { setPhones(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const toggleAll = () => selected.size === phones.length
    ? setSelected(new Set())
    : setSelected(new Set(phones.map(p => p.phone)))

  const toggle = (phone) => {
    const next = new Set(selected)
    next.has(phone) ? next.delete(phone) : next.add(phone)
    setSelected(next)
  }

  const send = async () => {
    if (!message.trim() || selected.size === 0) return
    setSending(true); setResult(null)
    const csrf = document.querySelector('meta[name="csrf-token"]')?.content
    try {
      const res = await fetch('/api/broadcast/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrf },
        body: JSON.stringify({ phones: [...selected], message: message.trim() }),
      })
      const data = await res.json()
      setResult(data)
      if (res.ok) setMessage('')
    } catch { setResult({ error: 'Network error.' }) }
    finally { setSending(false) }
  }

  const canSend    = message.trim().length > 0 && selected.size > 0 && !sending
  const allSelected = phones.length > 0 && selected.size === phones.length

  const btnLabel = sending            ? 'Sending…'
    : selected.size === 0             ? 'Select recipients first'
    : !message.trim()                 ? 'Write a message first'
    : `Send to ${selected.size} customer${selected.size !== 1 ? 's' : ''}`

  return (
    <>
      <style>{`
        @keyframes bcIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${c.faint}; border-radius: 2px; }
        textarea:focus { outline: none; border-color: rgba(37,211,102,.4) !important; }
      `}</style>

      <div style={{
        display: 'flex', height: isMobile ? 'auto' : '100vh', minHeight: isMobile ? '100vh' : undefined, overflow: isMobile ? 'auto' : 'hidden',
        background: t.bg,
        color: c.text, fontFamily: 'Manrope,sans-serif',
        transition: 'background .2s, color .2s',
      }}>
        <Sidebar />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* ── PAGE HEADER ── */}
          <div style={{ flexShrink: 0, padding: '28px 36px 22px', borderBottom: '1px solid ' + c.border }}>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: c.muted, marginBottom: 6 }}>
              Marketing · WhatsApp
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
                <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, color: c.text, margin: 0 }}>
                  Broadcast
                </h1>
                <p style={{ fontFamily: 'Manrope,sans-serif', fontSize: 13, fontWeight: 300, color: c.muted, margin: '5px 0 0' }}>
                  Send a WhatsApp message to your customers all at once
                </p>
              </div>

              {/* live stats */}
              <div style={{ display: 'flex', gap: 28, alignItems: 'flex-end' }}>
                {[
                  { label: 'Recipients',    value: selected.size,    color: selected.size > 0 ? '#25D366' : c.faint },
                  { label: 'Characters',    value: message.length,   color: message.length > 800 ? '#f87171' : message.length > 0 ? c.text : c.faint },
                  { label: 'Est. Messages', value: message.length > 0 ? Math.ceil(message.length / 160) : 0, color: c.muted },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: c.muted, marginBottom: 3 }}>{s.label}</div>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 22, fontWeight: 600, color: s.color, letterSpacing: '-0.02em', lineHeight: 1, transition: 'color .2s' }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── 50/50 SPLIT ── */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', overflow: isMobile ? 'visible' : 'hidden' }}>

            {/* ── LEFT: RECIPIENTS ── */}
            <div style={{ borderRight: '1px solid ' + c.border, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <PanelHeader
                label={`${selected.size} of ${phones.length} selected`}
                c={c}
                right={
                  <button onClick={toggleAll} style={{
                    fontFamily: 'JetBrains Mono,monospace', fontSize: 9,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    padding: '5px 10px', borderRadius: 3, cursor: 'pointer',
                    background: allSelected ? 'rgba(37,211,102,.1)' : 'transparent',
                    color: allSelected ? '#25D366' : c.muted,
                    border: '1px solid ' + (allSelected ? 'rgba(37,211,102,.3)' : c.border),
                    transition: 'all .15s',
                  }}>
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </button>
                }
              />
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {loading ? (
                  <div style={{ padding: '48px 20px', textAlign: 'center', fontFamily: 'JetBrains Mono,monospace', fontSize: 10, letterSpacing: '0.12em', color: c.faint }}>
                    LOADING…
                  </div>
                ) : phones.length === 0 ? (
                  <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 32, color: c.faint, marginBottom: 12 }}>◌</div>
                    <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 13, color: c.muted }}>No customers yet</div>
                  </div>
                ) : phones.map(p => (
                  <RecipientRow key={p.phone} p={p} checked={selected.has(p.phone)} onToggle={() => toggle(p.phone)} c={c} />
                ))}
              </div>
            </div>

            {/* ── RIGHT: COMPOSE + PREVIEW (stacked) ── */}
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              {/* Compose — top half */}
              <div style={{ flex: '0 0 auto', maxHeight: '60%', borderBottom: '1px solid ' + c.border, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <PanelHeader label="Compose Message" c={c} />
                <div style={{ padding: '16px 20px 14px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder={'Hey! 👋 We\'ve got a special deal today —\n20% off all mains!\n\nReply here to order 👇'}
                    rows={6}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '12px 14px',
                      borderRadius: 4, border: '1px solid ' + c.border,
                      background: c.inputBg, color: c.text,
                      fontFamily: 'Manrope,sans-serif', fontSize: 13,
                      lineHeight: 1.7, resize: 'none',
                      transition: 'border-color .15s',
                    }}
                  />
                  <CharMeter count={message.length} c={c} />
                  {result && <ResultBanner result={result} c={c} />}
                  <button
                    onClick={send}
                    disabled={!canSend}
                    style={{
                      width: '100%', padding: '13px',
                      borderRadius: 4, border: 'none',
                      background: canSend ? '#25D366' : c.faint,
                      color: canSend ? '#fff' : c.muted,
                      fontFamily: 'JetBrains Mono,monospace', fontSize: 11,
                      letterSpacing: '0.12em', textTransform: 'uppercase',
                      fontWeight: 700, cursor: canSend ? 'pointer' : 'not-allowed',
                      transition: 'all .2s',
                      boxShadow: canSend ? '0 4px 20px rgba(37,211,102,.35)' : 'none',
                    }}
                    onMouseEnter={e => { if (canSend) e.currentTarget.style.boxShadow = '0 4px 28px rgba(37,211,102,.55)' }}
                    onMouseLeave={e => { if (canSend) e.currentTarget.style.boxShadow = '0 4px 20px rgba(37,211,102,.35)' }}>
                    {btnLabel}
                  </button>
                </div>
              </div>

              {/* Preview — bottom half */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
                <PanelHeader label="WhatsApp Preview" c={c} />
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {message.trim() ? (
                    <WaBubble message={message} c={c} />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, padding: 24 }}>
                      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 28, color: c.faint }}>◇</div>
                      <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 12, color: c.muted, textAlign: 'center', lineHeight: 1.5 }}>
                        Your message will appear here as a WhatsApp bubble
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  )
}