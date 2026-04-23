import { useState, useEffect, useRef } from 'react'
import StatCards from '../Components/StatCards'
import OrdersTable from '../Components/OrdersTable'
import Sidebar from '../Components/Sidebar'
import { useTheme } from '../Context/ThemeContext'
import { useIsMobile } from '../hooks/useIsMobile'

/* ─────────────────────────────────────────────────────────────
   AUDIO BEEP
───────────────────────────────────────────────────────────── */
function playOrderBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    ;[0, 0.18].forEach(delay => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(1046, ctx.currentTime + delay)
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + delay + 0.1)
      gain.gain.setValueAtTime(0.18, ctx.currentTime + delay)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.28)
      osc.start(ctx.currentTime + delay)
      osc.stop(ctx.currentTime + delay + 0.28)
    })
  } catch {}
}

/* ─────────────────────────────────────────────────────────────
   FONT INJECTION
───────────────────────────────────────────────────────────── */
function injectFonts() {
  if (document.getElementById('dash-fonts')) return
  const l = document.createElement('link')
  l.id = 'dash-fonts'; l.rel = 'stylesheet'
  l.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;500;600&family=Manrope:wght@300;400;500;600&display=swap'
  document.head.appendChild(l)
}

/* ─────────────────────────────────────────────────────────────
   LIVE CLOCK
───────────────────────────────────────────────────────────── */
function LiveClock() {
  const [time, setTime] = useState(new Date())
  const { theme: t } = useTheme()
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  const hh = String(time.getHours()).padStart(2, '0')
  const mm = String(time.getMinutes()).padStart(2, '0')
  const ss = String(time.getSeconds()).padStart(2, '0')
  return (
    <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 13, letterSpacing: '0.06em', color: t.muted }}>
      {hh}<span style={{ opacity: 0.5, animation: 'blink 1s step-end infinite' }}>:</span>{mm}<span style={{ opacity: 0.5, animation: 'blink 1s step-end infinite' }}>:</span>{ss}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────
   ALERT STRIP (new order toast)
───────────────────────────────────────────────────────────── */
function AlertStrip({ count, onDismiss }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: 'linear-gradient(90deg, #052e16 0%, #14532d 50%, #052e16 100%)',
      borderBottom: '1px solid #16a34a',
      padding: '11px 28px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      animation: 'stripDrop .22s cubic-bezier(.23,1,.32,1)',
      boxShadow: '0 0 40px rgba(22,163,74,.35)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', background: '#4ade80',
          boxShadow: '0 0 8px #4ade80',
          animation: 'pulse 1s ease infinite',
        }} />
        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 12, letterSpacing: '0.1em', color: '#86efac', textTransform: 'uppercase' }}>
          INBOUND · {count} NEW ORDER{count !== 1 ? 'S' : ''} RECEIVED
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <span style={{ fontFamily: 'Manrope,sans-serif', fontSize: 11, color: 'rgba(134,239,172,.6)' }}>
          Scroll down to review
        </span>
        <button onClick={onDismiss} style={{
          fontFamily: 'JetBrains Mono,monospace', fontSize: 10,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: '#4ade80', background: 'rgba(74,222,128,.1)',
          border: '1px solid rgba(74,222,128,.3)',
          padding: '4px 12px', borderRadius: 3, cursor: 'pointer',
        }}>
          Dismiss
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   STAT TILE
───────────────────────────────────────────────────────────── */
function StatTile({ label, value, sub, accent, flash, index }) {
  const [lit, setLit] = useState(false)
  const { theme: t } = useTheme()
  const dark = t.isDark
  useEffect(() => {
    if (flash) { setLit(true); const timer = setTimeout(() => setLit(false), 800); return () => clearTimeout(timer) }
  }, [flash, value])

  return (
    <div style={{
      background: lit
        ? `rgba(${accent === 'emerald' ? '74,222,128' : accent === 'sky' ? '56,189,248' : accent === 'amber' ? '251,191,36' : '148,163,184'},.09)`
        : (dark ? 'rgba(255,255,255,.045)' : t.cardBg),
      border: `1px solid ${lit ? (accent === 'emerald' ? 'rgba(74,222,128,.4)' : accent === 'sky' ? 'rgba(56,189,248,.4)' : accent === 'amber' ? 'rgba(251,191,36,.4)' : 'rgba(148,163,184,.25)') : (dark ? 'rgba(255,255,255,.1)' : t.cardBorder)}`,
      borderRadius: 8,
      padding: '22px 24px',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all .4s ease',
      boxShadow: lit ? 'none' : (dark ? '0 1px 0 rgba(255,255,255,.07) inset, 0 6px 28px rgba(0,0,0,.45)' : '0 1px 3px rgba(0,0,0,.08)'),
      animation: `tileIn .4s ${index * 80}ms both`,
    }}>
      {/* accent bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: accent === 'emerald' ? '#4ade80'
          : accent === 'sky' ? '#38bdf8'
          : accent === 'amber' ? '#fbbf24'
          : 'rgba(255,255,255,.15)',
        borderRadius: '3px 0 0 3px',
        opacity: lit ? 1 : 0.5,
        transition: 'opacity .4s',
      }} />

      <div style={{
        fontFamily: 'JetBrains Mono,monospace', fontSize: 10,
        letterSpacing: '0.14em', textTransform: 'uppercase',
        color: t.muted, marginBottom: 12,
      }}>{label}</div>

      <div style={{
        fontFamily: 'JetBrains Mono,monospace',
        fontSize: 30, fontWeight: 600,
        letterSpacing: '-0.02em',
        color: accent === 'emerald' ? '#4ade80'
          : accent === 'sky' ? '#38bdf8'
          : accent === 'amber' ? '#fbbf24'
          : t.text,
        lineHeight: 1,
        marginBottom: 8,
        transition: 'color .3s',
      }}>{value}</div>

      <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 11, color: t.muted, letterSpacing: '0.01em' }}>
        {sub}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   FILTER TABS
───────────────────────────────────────────────────────────── */
const FILTERS = [
  { key: 'all',       label: 'All Orders' },
  { key: 'pending',   label: 'Pending',   dot: '#fbbf24' },
  { key: 'confirmed', label: 'Confirmed', dot: '#38bdf8' },
  { key: 'ready',     label: 'Ready',     dot: '#a78bfa' },
  { key: 'delivered', label: 'Delivered', dot: '#4ade80' },
]

function FilterTabs({ filter, setFilter, orders }) {
  const { theme: t } = useTheme()
  const dark = t.isDark
  const countFor = key => key === 'all' ? orders.length : orders.filter(o => o.status === key).length
  return (
    <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${t.border}`, marginBottom: 20 }}>
      {FILTERS.map(f => {
        const active = filter === f.key
        const count = countFor(f.key)
        return (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            fontFamily: 'Manrope,sans-serif', fontSize: 12, fontWeight: active ? 600 : 400,
            padding: '9px 16px',
            background: 'transparent', border: 'none',
            borderBottom: active ? `2px solid ${t.text}` : '2px solid transparent',
            marginBottom: -1,
            color: active ? t.text : t.muted,
            cursor: 'pointer', transition: 'all .15s',
            display: 'flex', alignItems: 'center', gap: 7,
          }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.color = t.text }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.color = t.muted }}>
            {f.dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: f.dot, display: 'inline-block', flexShrink: 0 }} />}
            {f.label}
            <span style={{
              fontFamily: 'JetBrains Mono,monospace', fontSize: 10,
              background: active ? (dark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.08)') : (dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.04)'),
              color: active ? t.text : t.muted,
              padding: '1px 7px', borderRadius: 2,
              transition: 'all .15s',
            }}>{count}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   MAIN DASHBOARD
───────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const [orders, setOrders]           = useState([])
  const [stats, setStats]             = useState({})
  const [filter, setFilter]           = useState('all')
  const [loading, setLoading]         = useState(true)
  const [newOrderToast, setNewOrderToast] = useState(null)
  const [flashRevenue, setFlashRevenue]   = useState(false)
  const [lastRefresh, setLastRefresh]     = useState(null)
  const knownIdsRef   = useRef(null)
  const toastTimerRef = useRef(null)
  const { theme: t }  = useTheme()

  useEffect(() => { injectFonts() }, [])

  const fetchData = async () => {
    const csrf = document.querySelector('meta[name="csrf-token"]')?.content
    try {
      const [o, s] = await Promise.all([
        fetch('/api/orders',       { headers: { 'X-CSRF-TOKEN': csrf, Accept: 'application/json' } }).then(r => r.json()),
        fetch('/api/orders/stats', { headers: { 'X-CSRF-TOKEN': csrf, Accept: 'application/json' } }).then(r => r.json()),
      ])
      const freshOrders = Array.isArray(o) ? o : []
      const freshIds    = new Set(freshOrders.map(ord => ord.id))

      if (knownIdsRef.current === null) {
        knownIdsRef.current = freshIds
      } else {
        const newCount = [...freshIds].filter(id => !knownIdsRef.current.has(id)).length
        if (newCount > 0) {
          playOrderBeep()
          setNewOrderToast({ count: newCount, ts: Date.now() })
          setFlashRevenue(true)
          clearTimeout(toastTimerRef.current)
          toastTimerRef.current = setTimeout(() => setNewOrderToast(null), 7000)
          knownIdsRef.current = freshIds
        }
      }
      setOrders(freshOrders)
      setStats(s && typeof s === 'object' ? s : {})
      setLastRefresh(new Date())
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [])

  const updateStatus = async (id, status) => {
    const csrf = document.querySelector('meta[name="csrf-token"]')?.content
    await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf, Accept: 'application/json' },
      body: JSON.stringify({ status }),
    })
    fetchData()
  }

  const confirmPayment = async (id, paymentStatus, extra = {}) => {
    const csrf = document.querySelector('meta[name="csrf-token"]')?.content
    await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf, Accept: 'application/json' },
      body: JSON.stringify({ payment_status: paymentStatus, ...extra }),
    })
    fetchData()
  }

  const TILES = [
    { label: "Today's Orders",  value: stats.today_orders    ?? '—',  sub: 'orders placed today',    accent: 'sky',     flash: false },
    { label: "Today's Revenue", value: `$${Number(stats.today_revenue   ?? 0).toFixed(2)}`, sub: 'revenue today',  accent: 'emerald', flash: flashRevenue },
    { label: 'Pending',         value: stats.pending         ?? '—',  sub: 'awaiting action',        accent: 'amber',   flash: false },
    { label: 'Total Revenue',   value: `$${Number(stats.total_revenue   ?? 0).toFixed(2)}`, sub: 'all-time total', accent: 'muted',   flash: false },
  ]
  const isMobile = useIsMobile()

  /* ── RENDER ── */
  return (
    <>
      <style>{`
        @keyframes stripDrop { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes tileIn    { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @keyframes pulse     { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes blink     { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${t.isDark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.15)'}; border-radius: 2px; }
      `}</style>

      {/* ALERT STRIP */}
      {newOrderToast && <AlertStrip count={newOrderToast.count} onDismiss={() => setNewOrderToast(null)} />}

      <div style={{
        display: 'flex', minHeight: '100vh',
        background: t.bg,
        color: t.text,
        fontFamily: 'Manrope,sans-serif',
        paddingTop: newOrderToast ? 44 : 0,
        transition: 'padding-top .22s',
      }}>

        <Sidebar />

        <main style={{ flex: 1, padding: isMobile ? '20px 16px 84px' : '36px 44px 60px', overflowY: 'auto', position: 'relative', zIndex: 1 }}>

          {/* ── TOP BAR ── */}
          <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'flex-start', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', gap: isMobile ? 16 : 0, marginBottom: 36 }}>
            <div>
              {/* eyebrow */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
              }}>
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: '#4ade80', boxShadow: '0 0 8px #4ade80',
                  animation: 'pulse 2s ease infinite',
                }} />
                <span style={{
                  fontFamily: 'JetBrains Mono,monospace', fontSize: 10,
                  letterSpacing: '0.16em', textTransform: 'uppercase',
                  color: t.muted,
                }}>Live · Auto-refresh every 15s</span>
              </div>

              <h1 style={{
                fontFamily: 'Syne,sans-serif',
                fontSize: 40, fontWeight: 800,
                letterSpacing: '-0.03em', lineHeight: 1,
                color: t.text, margin: 0,
              }}>Orders</h1>

              <p style={{
                fontFamily: 'Manrope,sans-serif', fontSize: 13, fontWeight: 300,
                color: t.muted, margin: '6px 0 0',
                letterSpacing: '0.01em',
              }}>Manage and track all incoming orders</p>
            </div>

            {/* top-right controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <LiveClock />
              {lastRefresh && (
                <span style={{
                  fontFamily: 'JetBrains Mono,monospace', fontSize: 10,
                  color: t.muted, letterSpacing: '0.06em',
                }}>
                  SYNCED {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
              <button onClick={fetchData} style={{
                fontFamily: 'JetBrains Mono,monospace', fontSize: 10,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                padding: '8px 16px', borderRadius: 4, cursor: 'pointer',
                background: t.cardBg,
                color: t.muted,
                border: `1px solid ${t.border}`,
                transition: 'all .15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = t.rowHover; e.currentTarget.style.color = t.text }}
                onMouseLeave={e => { e.currentTarget.style.background = t.cardBg; e.currentTarget.style.color = t.muted }}>
                ↻ Refresh
              </button>
            </div>
          </div>

          {/* ── STAT TILES ── */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12, marginBottom: 36 }}>
            {TILES.map((tile, i) => (
              <StatTile key={tile.label} {...tile} index={i} />
            ))}
          </div>

          {/* ── ORDERS SECTION ── */}
          <div style={{
            background: t.isDark ? 'rgba(255,255,255,.038)' : t.cardBg,
            border: `1px solid ${t.isDark ? 'rgba(255,255,255,.095)' : t.cardBorder}`,
            borderRadius: 8,
            padding: '24px 24px 8px',
            boxShadow: t.isDark ? '0 1px 0 rgba(255,255,255,.05) inset, 0 8px 40px rgba(0,0,0,.4)' : '0 1px 3px rgba(0,0,0,.08)',
          }}>
            {/* section header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{
                fontFamily: 'Syne,sans-serif', fontSize: 16, fontWeight: 700,
                letterSpacing: '-0.01em', color: t.text,
              }}>Order Queue</span>
              <span style={{
                fontFamily: 'JetBrains Mono,monospace', fontSize: 10,
                letterSpacing: '0.1em', color: t.muted,
              }}>
                {orders.length} TOTAL
              </span>
            </div>

            {/* filter tabs */}
            <FilterTabs filter={filter} setFilter={setFilter} orders={orders} />

            {/* loading */}
            {loading ? (
              <div style={{ padding: '48px 0', fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: t.muted, letterSpacing: '0.12em' }}>
                LOADING ORDERS…
              </div>
            ) : (
              <OrdersTable
                orders={orders}
                filter={filter}
                setFilter={setFilter}
                updateStatus={updateStatus}
                confirmPayment={confirmPayment}
                loading={loading}
                theme={t}
              />
            )}
          </div>

        </main>
      </div>
    </>
  )
}