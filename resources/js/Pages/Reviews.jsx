import { useState, useEffect, useRef } from 'react'
import Sidebar from '../Components/Sidebar'
import { useTheme } from '../Context/ThemeContext'
import { useIsMobile } from '../hooks/useIsMobile'

/* ─────────────────────────────────────────────────────────────
   DESIGN SYSTEM
───────────────────────────────────────────────────────────── */
const SENTIMENT = {
  5: { label: 'Excellent', emoji: '✦',  accent: '#c8a96e', dim: 'rgba(200,169,110,.12)' },
  4: { label: 'Good',      emoji: '◈',  accent: '#7eb8a4', dim: 'rgba(126,184,164,.12)' },
  3: { label: 'Okay',      emoji: '◇',  accent: '#b4a87a', dim: 'rgba(180,168,122,.12)' },
  2: { label: 'Poor',      emoji: '▽',  accent: '#c98a6e', dim: 'rgba(201,138,110,.12)' },
  1: { label: 'Bad',       emoji: '◌',  accent: '#c96e6e', dim: 'rgba(201,110,110,.12)' },
}

/* ─────────────────────────────────────────────────────────────
   FONT INJECTION  (Playfair Display + DM Mono)
───────────────────────────────────────────────────────────── */
const FONT_LINK = 'https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;500;600&family=Manrope:wght@300;400;500;600&display=swap'

function injectFont() {
  if (document.getElementById('rev-font')) return
  const l = document.createElement('link')
  l.id = 'rev-font'; l.rel = 'stylesheet'; l.href = FONT_LINK
  document.head.appendChild(l)
}

/* ─────────────────────────────────────────────────────────────
   STAR RATING BAR (horizontal distribution strip)
───────────────────────────────────────────────────────────── */
function RatingStrip({ reviews }) {
  const total = reviews.length || 1
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 44 }}>
      {[5, 4, 3, 2, 1].map(n => {
        const count = reviews.filter(r => Number(r.rating) === n).length
        const pct = (count / total) * 100
        const s = SENTIMENT[n]
        return (
          <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 28,
              height: `${Math.max(pct * 0.36, pct > 0 ? 4 : 2)}px`,
              background: pct > 0 ? s.accent : 'rgba(255,255,255,.08)',
              borderRadius: 2,
              transition: 'height .6s cubic-bezier(.23,1,.32,1)',
              minHeight: 2,
            }} />
            <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: pct > 0 ? s.accent : 'rgba(255,255,255,.2)', letterSpacing: '0.05em' }}>{n}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   REVIEW CARD
───────────────────────────────────────────────────────────── */
function ReviewCard({ r, t }) {
  const isMobile = useIsMobile()
  const s = SENTIMENT[r.rating] ?? SENTIMENT[3]
  const date = new Date(r.updated_at)
  const dateStr = date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
  const isLight = !t.isDark

  return (
    <div style={{
      borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.07)'}`,
      padding: '28px 0',
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr auto',
      gap: '24px 40px',
      animation: 'fadeUp .45s ease both',
    }}>
      {/* LEFT */}
      <div>
        {/* meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
          {/* sentiment badge */}
          <span style={{
            fontFamily: 'JetBrains Mono,monospace',
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: s.accent,
            background: s.dim,
            border: `1px solid ${s.accent}30`,
            borderRadius: 3,
            padding: '3px 9px',
          }}>
            {s.emoji} {s.label}
          </span>
          {/* phone */}
          <span style={{
            fontFamily: 'JetBrains Mono,monospace',
            fontSize: 12,
            color: isLight ? '#555' : 'rgba(255,255,255,.55)',
            letterSpacing: '0.04em',
          }}>+{r.phone}</span>
          {/* order info */}
          <span style={{
            fontFamily: 'JetBrains Mono,monospace',
            fontSize: 11,
            color: isLight ? '#888' : 'rgba(255,255,255,.3)',
          }}>
            #{String(r.id).padStart(4,'0')} · {r.order_type === 'pickup' ? 'Pickup' : 'Delivery'} · ${Number(r.total).toFixed(2)}
          </span>
        </div>

        {/* review text */}
        {r.review ? (
          <p style={{
            fontFamily: 'Manrope,sans-serif',
            fontStyle: 'italic',
            fontSize: 15,
            lineHeight: 1.7,
            color: isLight ? '#1a1a1a' : 'rgba(255,255,255,.88)',
            margin: '0 0 12px',
            maxWidth: 620,
          }}>
            &ldquo;{r.review}&rdquo;
          </p>
        ) : (
          <p style={{
            fontFamily: 'Manrope,sans-serif',
            fontSize: 13,
            color: isLight ? '#bbb' : 'rgba(255,255,255,.2)',
            margin: '0 0 12px',
            fontStyle: 'italic',
          }}>No written review</p>
        )}

        {/* items */}
        {r.order_text && (
          <p style={{
            fontFamily: 'Manrope,sans-serif',
            fontSize: 12,
            color: isLight ? '#999' : 'rgba(255,255,255,.3)',
            letterSpacing: '0.02em',
            margin: 0,
          }}>{r.order_text}</p>
        )}
      </div>

      {/* RIGHT: rating + date */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', minWidth: 64 }}>
        <span style={{
          fontFamily: 'Syne,sans-serif',
          fontSize: 42,
          fontWeight: 700,
          lineHeight: 1,
          color: s.accent,
          letterSpacing: '-0.02em',
        }}>{r.rating}</span>
        <span style={{
          fontFamily: 'JetBrains Mono,monospace',
          fontSize: 10,
          letterSpacing: '0.1em',
          color: isLight ? '#bbb' : 'rgba(255,255,255,.25)',
          textAlign: 'right',
          whiteSpace: 'nowrap',
        }}>{dateStr}</span>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   FILTER PILL
───────────────────────────────────────────────────────────── */
function FilterPill({ label, active, onClick, t }) {
  const isLight = !t.isDark
  return (
    <button onClick={onClick} style={{
      fontFamily: 'JetBrains Mono,monospace',
      fontSize: 11,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      padding: '6px 14px',
      borderRadius: 2,
      cursor: 'pointer',
      border: active
        ? `1px solid ${isLight ? '#1a1a1a' : 'rgba(255,255,255,.7)'}`
        : `1px solid ${isLight ? 'rgba(0,0,0,.1)' : 'rgba(255,255,255,.1)'}`,
      background: active
        ? (isLight ? '#1a1a1a' : 'rgba(255,255,255,.08)')
        : 'transparent',
      color: active
        ? (isLight ? '#fff' : 'rgba(255,255,255,.9)')
        : (isLight ? '#888' : 'rgba(255,255,255,.35)'),
      transition: 'all .18s ease',
    }}>{label}</button>
  )
}

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
export default function Reviews() {
  const [reviews, setReviews] = useState([])
  const [filter,  setFilter]  = useState('all')
  const [loading, setLoading] = useState(true)
  const { theme: t } = useTheme()
  const isMobile = useIsMobile()
  const isLight = !t.isDark

  useEffect(() => { injectFont() }, [])

  useEffect(() => {
    fetch('/api/reviews', { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(data => { setReviews(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? reviews : reviews.filter(r => String(r.rating) === filter)
  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + Number(r.rating), 0) / reviews.length).toFixed(1)
    : '—'

  const panelBg = isLight ? '#faf9f6' : t.bg

  return (
    <>
      {/* keyframes */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(128,128,128,.18); border-radius: 2px; }
      `}</style>

      <div style={{
        display: 'flex',
        height: isMobile ? 'auto' : '100vh',
        minHeight: isMobile ? '100vh' : undefined,
        overflow: isMobile ? 'auto' : 'hidden',
        background: panelBg,
        color: t.text,
        transition: 'all .2s',
      }}>
        <Sidebar />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: isMobile ? 'auto' : '100vh', overflow: isMobile ? 'visible' : 'hidden' }}>

          {/* ── HEADER PANEL ── */}
          <div style={{
            flexShrink: 0,
            padding: isMobile ? '20px 16px 16px' : '28px 36px 24px',
            borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.07)'}`,
            background: panelBg,
          }}>
            {/* eyebrow */}
            <div style={{
              fontFamily: 'JetBrains Mono,monospace',
              fontSize: 10,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: isLight ? '#bbb' : 'rgba(255,255,255,.3)',
              marginBottom: 10,
            }}>Customer Feedback</div>

            {/* title + stats row */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, marginBottom: 32 }}>
              <div>
                <h1 style={{
                  fontFamily: 'Syne,sans-serif',
                  fontSize: 36,
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                  margin: 0,
                  color: isLight ? '#0f0f0f' : '#fff',
                }}>Reviews</h1>
                <p style={{
                  fontFamily: 'Manrope,sans-serif',
                  fontSize: 14,
                  fontWeight: 300,
                  color: isLight ? '#999' : 'rgba(255,255,255,.4)',
                  margin: '6px 0 0',
                  letterSpacing: '0.01em',
                }}>
                  {reviews.length} review{reviews.length !== 1 ? 's' : ''} collected
                </p>
              </div>

              {/* avg + distribution */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24 }}>
                <RatingStrip reviews={reviews} />
                <div style={{ paddingBottom: 4 }}>
                  <div style={{
                    fontFamily: 'Syne,sans-serif',
                    fontSize: 54,
                    fontWeight: 700,
                    lineHeight: 1,
                    letterSpacing: '-0.03em',
                    color: isLight ? '#0f0f0f' : '#fff',
                  }}>{avg}</div>
                  <div style={{
                    fontFamily: 'JetBrains Mono,monospace',
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    color: isLight ? '#bbb' : 'rgba(255,255,255,.3)',
                    marginTop: 4,
                  }}>OUT OF 5</div>
                </div>
              </div>
            </div>

            {/* sentiment stat strip */}
            <div style={{
              display: 'flex',
              gap: 0,
              marginBottom: 28,
              border: `1px solid ${isLight ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.07)'}`,
              borderRadius: 6,
              overflow: 'hidden',
            }}>
              {[5, 4, 3, 2, 1].map((n, i) => {
                const s = SENTIMENT[n]
                const count = reviews.filter(r => Number(r.rating) === n).length
                return (
                  <div key={n} style={{
                    flex: 1,
                    padding: '14px 16px',
                    borderRight: i < 4 ? `1px solid ${isLight ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.07)'}` : 'none',
                    background: isLight ? '#fff' : t.cardBg,
                  }}>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, letterSpacing: '0.12em', color: s.accent, marginBottom: 6 }}>
                      {s.emoji} {s.label.toUpperCase()}
                    </div>
                    <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 26, fontWeight: 700, color: s.accent, lineHeight: 1 }}>{count}</div>
                  </div>
                )
              })}
            </div>

            {/* filter pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <FilterPill label={`All · ${reviews.length}`} active={filter === 'all'} onClick={() => setFilter('all')} t={t} />
              {[5,4,3,2,1].map(n => (
                <FilterPill
                  key={n}
                  label={`${n}★ · ${reviews.filter(r=>Number(r.rating)===n).length}`}
                  active={filter === String(n)}
                  onClick={() => setFilter(String(n))}
                  t={t}
                />
              ))}
            </div>
          </div>

          {/* ── SCROLLABLE LIST ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '0 16px 80px' : '0 36px 48px' }}>
            {loading ? (
              <div style={{ padding: '60px 0', fontFamily: 'JetBrains Mono,monospace', fontSize: 12, color: isLight ? '#bbb' : 'rgba(255,255,255,.2)', letterSpacing: '0.1em' }}>
                LOADING…
              </div>
            ) : filtered.length === 0 ? (
              <div style={{
                padding: '80px 0',
                textAlign: 'center',
              }}>
                <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 48, marginBottom: 12, opacity: .25 }}>✦</div>
                <p style={{ fontFamily: 'Manrope,sans-serif', fontSize: 14, color: isLight ? '#bbb' : 'rgba(255,255,255,.25)', letterSpacing: '0.04em' }}>
                  No reviews in this category
                </p>
              </div>
            ) : (
              filtered.map((r, i) => (
                <div key={r.id} style={{ animationDelay: `${i * 40}ms` }}>
                  <ReviewCard r={r} t={t} />
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </>
  )
}