import { useState, useEffect } from 'react'
import Sidebar from '../Components/Sidebar'
import { useTheme } from '../Context/ThemeContext'
import { useIsMobile } from '../hooks/useIsMobile'

/* ─────────────────────────────────────────────────────────────
   FONT INJECTION
───────────────────────────────────────────────────────────── */
function injectFonts() {
  if (document.getElementById('cust-fonts')) return
  const l = document.createElement('link')
  l.id = 'cust-fonts'; l.rel = 'stylesheet'
  l.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;500;600&family=Manrope:wght@300;400;500;600&display=swap'
  document.head.appendChild(l)
}

/* ─────────────────────────────────────────────────────────────
   CHROME HELPER — derives all surface values from theme prop
───────────────────────────────────────────────────────────── */
function chrome(t) {
  const dark = t.isDark
    ?? (typeof t.bg === 'string' && (t.bg.startsWith('#0') || t.bg === '#0a0a0a'))
  return {
    dark,
    cardBg:   t.cardBg   ?? (dark ? 'rgba(255,255,255,.025)' : '#ffffff'),
    subBg:    t.subBg    ?? (dark ? 'rgba(255,255,255,.04)'  : '#f5f5f3'),
    inputBg:  t.inputBg  ?? (dark ? 'rgba(255,255,255,.05)'  : '#ffffff'),
    rowHover: t.rowHover ?? (dark ? 'rgba(255,255,255,.04)'  : 'rgba(0,0,0,.035)'),
    border:   t.border   ?? (dark ? 'rgba(255,255,255,.08)'  : 'rgba(0,0,0,.09)'),
    dimSep:               dark ? 'rgba(255,255,255,.05)'  : 'rgba(0,0,0,.06)',
    text:     t.text     ?? (dark ? 'rgba(255,255,255,.88)'  : '#111'),
    muted:    t.muted    ?? (dark ? 'rgba(255,255,255,.32)'  : '#888'),
    faint:                dark ? 'rgba(255,255,255,.12)'  : 'rgba(0,0,0,.12)',
    hlText:   t.hlText   ?? '#4ade80',
    barTrack:             dark ? 'rgba(255,255,255,.07)'  : 'rgba(0,0,0,.07)',
  }
}

/* ─────────────────────────────────────────────────────────────
   SPEND BAR
───────────────────────────────────────────────────────────── */
function SpendBar({ value, max, c, active }) {
  const pct = max > 0 ? Math.max(3, (value / max) * 100) : 3
  return (
    <div style={{ height: 2, background: c.barTrack, borderRadius: 2, overflow: 'hidden', marginTop: 6 }}>
      <div style={{
        height: '100%',
        width: `${pct}%`,
        background: active ? '#4ade80' : c.faint,
        borderRadius: 2,
        transition: 'width .6s cubic-bezier(.23,1,.32,1), background .2s',
      }} />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   STAT TILE
───────────────────────────────────────────────────────────── */
function StatTile({ label, value, accent, c, index }) {
  return (
    <div style={{
      background: c.cardBg,
      border: `1px solid ${c.border}`,
      borderRadius: 6,
      padding: '20px 22px',
      position: 'relative',
      overflow: 'hidden',
      animation: `custIn .4s ${index * 70}ms both`,
    }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: accent, borderRadius: '3px 0 0 3px', opacity: .65,
      }} />
      <div style={{
        fontFamily: 'JetBrains Mono,monospace', fontSize: 9,
        letterSpacing: '0.16em', textTransform: 'uppercase',
        color: c.muted, marginBottom: 10,
      }}>{label}</div>
      <div style={{
        fontFamily: 'JetBrains Mono,monospace', fontSize: 28,
        fontWeight: 600, color: accent,
        letterSpacing: '-0.02em', lineHeight: 1,
      }}>{value}</div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   RANK GLYPH
───────────────────────────────────────────────────────────── */
function rankGlyph(rank) {
  if (rank === 1) return { glyph: '①', color: '#fbbf24' }
  if (rank === 2) return { glyph: '②', color: '#94a3b8' }
  if (rank === 3) return { glyph: '③', color: '#fb923c' }
  return { glyph: String(rank).padStart(2, ' '), color: null }
}

/* ─────────────────────────────────────────────────────────────
   CUSTOMER ROW
───────────────────────────────────────────────────────────── */
function CustomerRow({ customer, rank, selected, maxSpend, onClick, c }) {
  const [hover, setHover] = useState(false)
  const isActive = selected?.phone === customer.phone
  const rg = rankGlyph(rank)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '11px 20px',
        borderBottom: `1px solid ${c.dimSep}`,
        cursor: 'pointer',
        background: isActive
          ? (c.dark ? 'rgba(74,222,128,.07)' : 'rgba(74,222,128,.05)')
          : hover ? c.rowHover : 'transparent',
        borderLeft: `3px solid ${isActive ? '#4ade80' : 'transparent'}`,
        transition: 'all .13s',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
          {/* rank */}
          <span style={{
            fontFamily: 'JetBrains Mono,monospace', fontSize: 11,
            color: rg.color ?? c.muted,
            flexShrink: 0, width: 20, textAlign: 'center',
            fontWeight: rank <= 3 ? 600 : 400,
          }}>{rg.glyph}</span>
          {/* phone */}
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: 'JetBrains Mono,monospace', fontSize: 12,
              color: isActive ? c.text : c.text,
              letterSpacing: '0.03em',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>+{customer.phone}</div>
            <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 10, color: c.muted, marginTop: 1 }}>
              {customer.orders.length} order{customer.orders.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        {/* spend */}
        <div style={{
          fontFamily: 'JetBrains Mono,monospace', fontSize: 13, fontWeight: 600,
          color: isActive ? c.hlText : (hover ? c.hlText : c.muted),
          flexShrink: 0, transition: 'color .13s',
        }}>
          ${customer.total.toFixed(2)}
        </div>
      </div>
      <SpendBar value={customer.total} max={maxSpend} c={c} active={isActive || hover} />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   ORDER HISTORY ITEM
───────────────────────────────────────────────────────────── */
function OrderItem({ order, c, index }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '10px 0',
      borderBottom: `1px solid ${c.dimSep}`,
      animation: `custIn .3s ${index * 30}ms both`,
    }}>
      <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
        <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 12, color: c.text, lineHeight: 1.4 }}>
          {order.order_text}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
          <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: c.muted, letterSpacing: '0.04em' }}>
            {new Date(order.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
          {order.order_type && (
            <span style={{ fontSize: 11 }}>{order.order_type === 'pickup' ? '🏃' : '🚗'}</span>
          )}
        </div>
      </div>
      <div style={{
        fontFamily: 'JetBrains Mono,monospace', fontSize: 12, fontWeight: 600,
        color: c.hlText, flexShrink: 0,
      }}>
        ${Number(order.total).toFixed(2)}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   CUSTOMER DETAIL PANEL
───────────────────────────────────────────────────────────── */
function CustomerDetail({ customer, c }) {
  if (!customer) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100%', gap: 14,
        padding: 40,
      }}>
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 40, color: c.faint, lineHeight: 1 }}>◈</div>
        <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 13, color: c.muted, letterSpacing: '0.02em', textAlign: 'center' }}>
          Select a customer from the leaderboard<br />to view their full profile
        </div>
      </div>
    )
  }

  const avgOrder   = customer.total / customer.orders.length
  const firstOrder = customer.orders[customer.orders.length - 1]
  const sortedOrders = [...customer.orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', animation: 'custIn .25s ease' }}>

      {/* Profile header */}
      <div style={{ padding: '20px 24px 18px', borderBottom: `1px solid ${c.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          {/* Avatar */}
          <div style={{
            width: 46, height: 46, borderRadius: 6,
            background: c.dark ? 'rgba(74,222,128,.1)' : 'rgba(74,222,128,.1)',
            border: '1px solid rgba(74,222,128,.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'JetBrains Mono,monospace', fontSize: 15, fontWeight: 600,
            color: '#4ade80', flexShrink: 0,
          }}>
            {customer.phone.slice(-2)}
          </div>
          <div>
            <div style={{
              fontFamily: 'JetBrains Mono,monospace', fontSize: 15, fontWeight: 600,
              color: c.text, letterSpacing: '0.02em',
            }}>+{customer.phone}</div>
            <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 11, color: c.muted, marginTop: 3 }}>
              Customer since {new Date(firstOrder?.created_at).toLocaleDateString([], { month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* 4 mini stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'Total Orders', value: customer.orders.length },
            { label: 'Total Spent',  value: `$${customer.total.toFixed(2)}`,  accent: true },
            { label: 'Avg Order',    value: `$${avgOrder.toFixed(2)}` },
            { label: 'Last Order',   value: new Date(customer.last_order).toLocaleDateString([], { day: '2-digit', month: 'short' }) },
          ].map(s => (
            <div key={s.label} style={{
              background: c.subBg,
              border: `1px solid ${c.border}`,
              borderRadius: 5, padding: '10px 12px',
            }}>
              <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: c.muted, marginBottom: 5 }}>
                {s.label}
              </div>
              <div style={{
                fontFamily: 'JetBrains Mono,monospace', fontSize: 18, fontWeight: 600,
                color: s.accent ? c.hlText : c.text,
                letterSpacing: '-0.01em',
              }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Order history */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 20px' }}>
        <div style={{
          fontFamily: 'JetBrains Mono,monospace', fontSize: 9,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          color: c.muted,
          padding: '16px 0 10px',
          borderBottom: `1px solid ${c.dimSep}`,
          marginBottom: 2,
        }}>
          Order History · {customer.orders.length}
        </div>
        {sortedOrders.map((o, i) => (
          <OrderItem key={o.id} order={o} c={c} index={i} />
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
export default function Customers() {
  const [orders,   setOrders]   = useState([])
  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState(null)
  const { theme: t } = useTheme()
  const isMobile = useIsMobile()
  const c = chrome(t)

  useEffect(() => { injectFonts() }, [])

  useEffect(() => {
    fetch('/api/orders', { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(data => setOrders(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const customers = Object.values(
    orders.reduce((acc, order) => {
      const phone = order.phone
      if (!acc[phone]) acc[phone] = { phone, orders: [], total: 0, last_order: order.created_at }
      acc[phone].orders.push(order)
      acc[phone].total += Number(order.total)
      if (new Date(order.created_at) > new Date(acc[phone].last_order)) acc[phone].last_order = order.created_at
      return acc
    }, {})
  ).sort((a, b) => b.total - a.total)

  const filtered = customers.filter(cu => cu.phone.includes(search.replace(/^\+/, '')))
  const maxSpend = customers[0]?.total ?? 0
  const avgOrder = orders.length ? orders.reduce((s, o) => s + Number(o.total), 0) / orders.length : 0

  return (
    <>
      <style>{`
        @keyframes custIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: none; }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${c.faint}; border-radius: 2px; }
      `}</style>

      <div style={{
        display: 'flex', minHeight: '100vh',
        background: t.bg,       /* ← exactly as theme provides, never overridden */
        color: t.text,
        fontFamily: 'Manrope,sans-serif',
        transition: 'background .2s, color .2s',
      }}>
        <Sidebar />

        <main style={{ flex: 1, padding: isMobile ? '20px 16px 84px' : '36px 44px 60px', overflowY: 'auto' }}>

          {/* ── HEADER ── */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
            <div>
              <div style={{
                fontFamily: 'JetBrains Mono,monospace', fontSize: 10,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                color: c.muted, marginBottom: 8,
              }}>CRM · Customer Intelligence</div>
              <h1 style={{
                fontFamily: 'Syne,sans-serif', fontSize: 40,
                fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1,
                color: c.text, margin: 0,
              }}>Customers</h1>
              <p style={{
                fontFamily: 'Manrope,sans-serif', fontSize: 13, fontWeight: 300,
                color: c.muted, margin: '6px 0 0', letterSpacing: '0.01em',
              }}>
                {customers.length} unique customer{customers.length !== 1 ? 's' : ''} · ranked by lifetime spend
              </p>
            </div>

            {/* Search input */}
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                fontFamily: 'JetBrains Mono,monospace', fontSize: 12, color: c.muted,
                pointerEvents: 'none', userSelect: 'none',
              }}>+</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search phone…"
                style={{
                  fontFamily: 'JetBrains Mono,monospace', fontSize: 12,
                  padding: '9px 14px 9px 24px',
                  background: c.inputBg,
                  border: `1px solid ${c.border}`,
                  borderRadius: 4, color: c.text,
                  outline: 'none', width: 200,
                  transition: 'border-color .15s',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(74,222,128,.45)'}
                onBlur={e => e.target.style.borderColor = c.border}
              />
            </div>
          </div>

          {/* ── STAT TILES ── */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
            <StatTile label="Unique Customers" value={customers.length}           accent="#38bdf8" c={c} index={0} />
            <StatTile label="Total Orders"      value={orders.length}             accent="#a78bfa" c={c} index={1} />
            <StatTile label="Avg Order Value"   value={`$${avgOrder.toFixed(2)}`} accent="#4ade80" c={c} index={2} />
          </div>

          {/* ── SPLIT LAYOUT ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '340px 1fr',
            gap: 12,
            alignItems: 'stretch',
            minHeight: isMobile ? 'auto' : 'calc(100vh - 260px)',
          }}>

            {/* ── LEADERBOARD LIST ── */}
            <div style={{
              background: c.cardBg,
              border: `1px solid ${c.border}`,
              borderRadius: 6,
              overflow: 'hidden',
              animation: 'custIn .4s .12s both',
              display: 'flex',
              flexDirection: 'column',
            }}>
              {/* header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '13px 20px',
                borderBottom: `1px solid ${c.border}`,
                background: c.subBg,
              }}>
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: c.muted }}>
                  Leaderboard
                </div>
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: c.faint }}>
                  {filtered.length} shown
                </div>
              </div>

              {/* rows */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {filtered.length === 0 ? (
                  <div style={{ padding: '48px 20px', textAlign: 'center', fontFamily: 'JetBrains Mono,monospace', fontSize: 11, letterSpacing: '0.1em', color: c.faint }}>
                    NO CUSTOMERS FOUND
                  </div>
                ) : filtered.map((cu, i) => (
                  <CustomerRow
                    key={cu.phone}
                    customer={cu}
                    rank={i + 1}
                    selected={selected}
                    maxSpend={maxSpend}
                    onClick={() => setSelected(cu)}
                    c={c}
                  />
                ))}
              </div>
            </div>

            {/* ── DETAIL PANEL ── */}
            <div style={{
              background: c.cardBg,
              border: `1px solid ${c.border}`,
              borderRadius: 6,
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
              animation: 'custIn .4s .22s both',
            }}>
              {/* panel header */}
              <div style={{
                padding: '13px 24px',
                borderBottom: `1px solid ${c.border}`,
                background: c.subBg, flexShrink: 0,
              }}>
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: c.muted }}>
                  {selected ? 'Customer Profile' : 'Profile'}
                </div>
              </div>

              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <CustomerDetail customer={selected} c={c} />
              </div>
            </div>

          </div>
        </main>
      </div>
    </>
  )
}