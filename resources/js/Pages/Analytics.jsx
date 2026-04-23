import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Chart, registerables } from 'chart.js'
import Sidebar from '../Components/Sidebar'
import { useTheme } from '../Context/ThemeContext'
import { useIsMobile } from '../hooks/useIsMobile'
Chart.register(...registerables)

/* ─────────────────────────────────────────────────────────────
   FONT INJECTION
───────────────────────────────────────────────────────────── */
function injectFonts() {
  if (document.getElementById('an-fonts')) return
  const l = document.createElement('link')
  l.id = 'an-fonts'; l.rel = 'stylesheet'
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
    cardBg:  t.cardBg  ?? (dark ? 'rgba(255,255,255,.025)' : '#fff'),
    subBg:   t.subBg   ?? (dark ? 'rgba(255,255,255,.04)'  : '#f5f5f3'),
    border:  t.border  ?? (dark ? 'rgba(255,255,255,.08)'  : 'rgba(0,0,0,.09)'),
    dimSep:             dark ? 'rgba(255,255,255,.05)'  : 'rgba(0,0,0,.06)',
    text:    t.text    ?? (dark ? 'rgba(255,255,255,.88)'  : '#111'),
    muted:   t.muted   ?? (dark ? 'rgba(255,255,255,.32)'  : '#888'),
    faint:              dark ? 'rgba(255,255,255,.07)'  : 'rgba(0,0,0,.05)',
    gridCol:            dark ? 'rgba(255,255,255,.05)'  : 'rgba(0,0,0,.06)',
    tickCol:            dark ? 'rgba(255,255,255,.25)'  : 'rgba(0,0,0,.35)',
    hlText:  t.hlText  ?? '#4ade80',
  }
}

/* ─────────────────────────────────────────────────────────────
   SPARKLINE
───────────────────────────────────────────────────────────── */
function Sparkline({ data, color }) {
  if (!data || data.length < 2) return null
  const w = 64, h = 24
  const max = Math.max(...data, 1)
  const min = Math.min(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 4) - 2
    return x + ',' + y
  }).join(' ')
  return (
    <svg width={w} height={h} style={{ display: 'block', opacity: 0.75 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   DELTA BADGE
───────────────────────────────────────────────────────────── */
function Delta({ value }) {
  if (value === null || value === undefined || isNaN(value)) return null
  const up  = value >= 0
  const col = up ? '#4ade80' : '#f87171'
  return (
    <span style={{
      fontFamily: 'JetBrains Mono,monospace', fontSize: 9,
      color: col,
      background: up ? 'rgba(74,222,128,.1)' : 'rgba(248,113,113,.1)',
      border: '1px solid ' + (up ? 'rgba(74,222,128,.25)' : 'rgba(248,113,113,.25)'),
      borderRadius: 3, padding: '2px 6px', letterSpacing: '0.06em', whiteSpace: 'nowrap',
    }}>
      {up ? '▲' : '▼'} {Math.abs(value).toFixed(1)}%
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────
   KPI TILE
───────────────────────────────────────────────────────────── */
function KpiTile({ label, value, accent, sub, delta, sparkData, index, c }) {
  return (
    <div style={{
      background: c.cardBg, border: '1px solid ' + c.border,
      borderRadius: 8, padding: '18px 20px',
      position: 'relative', overflow: 'hidden',
      animation: 'anIn .4s ' + (index * 60) + 'ms both',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      minHeight: 116,
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: accent, borderRadius: '8px 0 0 8px', opacity: .7 }} />
      <div>
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: c.muted, marginBottom: 10 }}>
          {label}
        </div>
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 28, fontWeight: 600, color: accent, letterSpacing: '-0.03em', lineHeight: 1 }}>
          {value}
        </div>
        {sub && (
          <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 11, color: c.muted, marginTop: 5 }}>
            {sub}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 12 }}>
        {delta !== undefined ? <Delta value={delta} /> : <span />}
        {sparkData && <Sparkline data={sparkData} color={accent} />}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   ORDER ACTIVITY HEATMAP  (day-of-week × hour)
───────────────────────────────────────────────────────────── */
function HourHeatmap({ orders, c }) {
  const [tip, setTip] = useState(null) // { x, y, label }

  const grid = Array.from({ length: 7 }, () => new Array(24).fill(0))
  orders.forEach(o => {
    const d   = new Date(o.created_at)
    const dow = (d.getDay() + 6) % 7
    const hr  = d.getHours()
    grid[dow][hr]++
  })
  const max  = Math.max(1, ...grid.flat())
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const rgb  = c.dark ? '56,189,248' : '14,165,233'

  const handleEnter = (e, di, hi, count) => {
    const rect  = e.currentTarget.getBoundingClientRect()
    const label = days[di] + ' ' + String(hi).padStart(2, '0') + ':00 — ' + count + ' order' + (count !== 1 ? 's' : '')
    setTip({ x: rect.left + rect.width / 2, y: rect.top - 8, label })
  }

  const tooltipEl = tip && createPortal(
    <div style={{
      position: 'fixed',
      left: tip.x,
      top: tip.y,
      transform: 'translate(-50%, -100%)',
      background: c.dark ? '#1e293b' : '#0f172a',
      color: '#f8fafc',
      fontFamily: 'JetBrains Mono,monospace',
      fontSize: 11,
      padding: '4px 9px',
      borderRadius: 5,
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      zIndex: 9999,
      boxShadow: '0 2px 8px rgba(0,0,0,.35)',
    }}>
      {tip.label}
      <div style={{
        position: 'absolute',
        bottom: -4,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent',
        borderTop: '5px solid ' + (c.dark ? '#1e293b' : '#0f172a'),
      }} />
    </div>,
    document.body
  )

  return (
    <div style={{ overflowX: 'auto', position: 'relative' }}>
      {tooltipEl}
      <div style={{ display: 'flex', gap: 2, marginBottom: 4, paddingLeft: 30 }}>
        {[...Array(24)].map((_, h) => (
          h % 4 === 0
            ? <div key={h} style={{ width: 18, flexShrink: 0, fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: c.muted, textAlign: 'center' }}>{h}</div>
            : <div key={h} style={{ width: 18, flexShrink: 0 }} />
        ))}
      </div>
      {grid.map((row, di) => (
        <div key={di} style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 2 }}>
          <div style={{ width: 26, fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: c.muted, flexShrink: 0 }}>
            {days[di]}
          </div>
          {row.map((count, hi) => (
            <div
              key={hi}
              onMouseEnter={e => handleEnter(e, di, hi, count)}
              onMouseLeave={() => setTip(null)}
              style={{
                width: 18, height: 14, borderRadius: 2, flexShrink: 0,
                cursor: count > 0 ? 'default' : 'default',
                background: count === 0
                  ? c.faint
                  : 'rgba(' + rgb + ',' + (0.12 + (count / max) * 0.88) + ')',
                transition: 'background .2s, outline .1s',
                outline: tip && tip.label.startsWith(days[di] + ' ' + String(hi).padStart(2, '0'))
                  ? '1.5px solid rgba(' + rgb + ',0.9)'
                  : 'none',
              }}
            />
          ))}
        </div>
      ))}
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 5, paddingLeft: 30 }}>
        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: c.muted }}>0</span>
        {[0.12, 0.35, 0.58, 0.78, 1.0].map((op, i) => (
          <div key={i} style={{ width: 14, height: 10, borderRadius: 1.5, background: 'rgba(' + rgb + ',' + op + ')' }} />
        ))}
        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: c.muted }}>max</span>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   ITEM BAR ROW
───────────────────────────────────────────────────────────── */
function ItemRow({ name, count, max, rank, c }) {
  const pct        = (count / max) * 100
  const rankColors = ['#fbbf24', '#94a3b8', '#fb923c', '#4ade80', '#38bdf8', '#a78bfa']
  const accent     = rankColors[rank] ?? c.muted
  const medals     = ['🥇', '🥈', '🥉']
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: '0 12px', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid ' + c.dimSep }}>
      <div style={{ textAlign: 'center', fontSize: rank < 3 ? 14 : 11, fontFamily: 'JetBrains Mono,monospace', color: accent, fontWeight: 700 }}>
        {rank < 3 ? medals[rank] : rank + 1}
      </div>
      <div>
        <span style={{ fontFamily: 'Manrope,sans-serif', fontSize: 13, fontWeight: 500, color: c.text }}>{name}</span>
        <div style={{ height: 4, background: c.faint, borderRadius: 2, overflow: 'hidden', marginTop: 6 }}>
          <div style={{ height: '100%', width: pct + '%', background: accent, borderRadius: 2, transition: 'width 1s cubic-bezier(.23,1,.32,1)' }} />
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 12, fontWeight: 600, color: accent }}>{count}</div>
        <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 10, color: c.muted }}>orders</div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   DONUT CHART
───────────────────────────────────────────────────────────── */
function DonutChart({ segments, c, size = 100 }) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  if (!total) return (
    <div style={{ padding: '20px 0', textAlign: 'center', fontFamily: 'Manrope,sans-serif', fontSize: 12, color: c.muted }}>No data</div>
  )
  let cum = 0
  const r     = Math.round(size * 0.36)
  const cx    = size / 2, cy = size / 2, sw = 12
  const circ  = 2 * Math.PI * r
  const arcs  = segments.map(seg => {
    const pct    = seg.value / total
    const dash   = pct * circ
    const offset = circ - cum * circ
    cum += pct
    return { ...seg, dash, offset, pct }
  })
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <svg width={size} height={size} style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={c.faint} strokeWidth={sw} />
        {arcs.map((a, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={a.color} strokeWidth={sw}
            strokeDasharray={a.dash + ' ' + circ}
            strokeDashoffset={a.offset}
            style={{ transform: 'rotate(-90deg)', transformOrigin: cx + 'px ' + cy + 'px' }}
          />
        ))}
        <text x={cx} y={cy - 5} textAnchor="middle" style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 13, fontWeight: 700, fill: c.text }}>{total}</text>
        <text x={cx} y={cy + 9} textAnchor="middle" style={{ fontFamily: 'Manrope,sans-serif', fontSize: 8, fill: c.muted }}>total</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
        {arcs.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 7, height: 7, borderRadius: 1.5, background: a.color, flexShrink: 0 }} />
              <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 12, color: c.text }}>{a.label}</div>
            </div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: a.color }}>{Math.round(a.pct * 100)}%</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   FUNNEL ROW
───────────────────────────────────────────────────────────── */
function FunnelRow({ label, count, total, color, c }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontFamily: 'Manrope,sans-serif', fontSize: 12, color: c.muted }}>{label}</span>
        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color }}>
          {count} <span style={{ color: c.muted }}>({Math.round(pct)}%)</span>
        </span>
      </div>
      <div style={{ height: 4, background: c.faint, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 2, transition: 'width .8s cubic-bezier(.23,1,.32,1)' }} />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   CARD HEADER
───────────────────────────────────────────────────────────── */
function CardHead({ label, sub, right, c }) {
  return (
    <div style={{
      padding: '13px 18px 11px', borderBottom: '1px solid ' + c.dimSep,
      background: c.subBg, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div>
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: c.muted }}>{label}</div>
        {sub && <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 11, color: c.muted, marginTop: 2 }}>{sub}</div>}
      </div>
      {right}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   MAIN
───────────────────────────────────────────────────────────── */
export default function Analytics() {
  const [orders,    setOrders]    = useState([])
  const [stats,     setStats]     = useState({})
  const [menuItems, setMenuItems] = useState([])
  const [range,     setRange]     = useState('7D')
  const { theme: t } = useTheme()
  const c = chrome(t)
  const isMobile = useIsMobile()

  const revenueRef   = useRef(null)
  const revenueChart = useRef(null)

  useEffect(() => { injectFonts() }, [])

  useEffect(() => {
    const h = { Accept: 'application/json' }
    Promise.all([
      fetch('/api/orders',       { headers: h }).then(r => r.json()),
      fetch('/api/orders/stats', { headers: h }).then(r => r.json()),
      fetch('/api/menu-items',   { headers: h }).then(r => r.json()),
    ]).then(([o, s, m]) => {
      setOrders(Array.isArray(o) ? o : [])
      setStats(s && typeof s === 'object' ? s : {})
      setMenuItems(Array.isArray(m) ? m : [])
    }).catch(() => {})
  }, [])

  /* ── FILTERED ORDERS ── */
  const filtered = useMemo(() => {
    if (range === 'All') return orders
    const now = new Date()
    if (range === 'Today') {
      const start = new Date(now); start.setHours(0, 0, 0, 0)
      return orders.filter(o => new Date(o.created_at) >= start)
    }
    const days = range === '7D' ? 7 : 30
    const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - days)
    return orders.filter(o => new Date(o.created_at) >= cutoff)
  }, [orders, range])

  /* ── PREVIOUS PERIOD (for delta badges) ── */
  const prevPeriod = useMemo(() => {
    if (range === 'All' || range === 'Today') return []
    const days = range === '7D' ? 7 : 30
    const now   = new Date()
    const end   = new Date(now); end.setDate(end.getDate() - days)
    const start = new Date(end); start.setDate(start.getDate() - days)
    return orders.filter(o => { const d = new Date(o.created_at); return d >= start && d < end })
  }, [orders, range])

  /* ── REVENUE CHART ── */
  useEffect(() => {
    if (!revenueRef.current) return
    revenueChart.current?.destroy()
    if (!filtered.length) return

    let labels = [], data = []

    if (range === 'Today') {
      labels = [...Array(24)].map((_, h) => h + ':00')
      data   = [...Array(24)].map((_, h) =>
        filtered.filter(o => new Date(o.created_at).getHours() === h)
                .reduce((s, o) => s + Number(o.total), 0)
      )
    } else if (range === '7D') {
      labels = [...Array(7)].map((_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i))
        return d.toLocaleDateString('en', { weekday: 'short', day: 'numeric' })
      })
      data = [...Array(7)].map((_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i))
        return filtered.filter(o => new Date(o.created_at).toDateString() === d.toDateString())
                       .reduce((s, o) => s + Number(o.total), 0)
      })
    } else if (range === '30D') {
      labels = [...Array(30)].map((_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (29 - i))
        return d.getDate() + '/' + (d.getMonth() + 1)
      })
      data = [...Array(30)].map((_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (29 - i))
        return filtered.filter(o => new Date(o.created_at).toDateString() === d.toDateString())
                       .reduce((s, o) => s + Number(o.total), 0)
      })
    } else {
      const monthly = {}
      filtered.forEach(o => {
        const d   = new Date(o.created_at)
        const key = d.toLocaleDateString('en', { month: 'short', year: '2-digit' })
        monthly[key] = (monthly[key] || 0) + Number(o.total)
      })
      labels = Object.keys(monthly)
      data   = Object.values(monthly)
    }

    const ctx      = revenueRef.current.getContext('2d')
    const gradient = ctx.createLinearGradient(0, 0, 0, 220)
    gradient.addColorStop(0, c.dark ? 'rgba(74,222,128,.22)' : 'rgba(74,222,128,.15)')
    gradient.addColorStop(1, 'rgba(74,222,128,0)')

    const isBar = range === 'Today'

    revenueChart.current = new Chart(revenueRef.current, {
      type: isBar ? 'bar' : 'line',
      data: {
        labels,
        datasets: [{
          data,
          borderColor: '#4ade80',
          backgroundColor: isBar ? (c.dark ? 'rgba(74,222,128,.18)' : 'rgba(74,222,128,.14)') : gradient,
          borderWidth: 2,
          pointBackgroundColor: '#4ade80',
          pointBorderColor: c.dark ? '#0a0a0a' : '#fff',
          pointBorderWidth: 2,
          pointRadius: (range === '30D' || range === 'All') ? 0 : 4,
          pointHoverRadius: 6,
          tension: 0.4,
          fill: true,
          borderRadius: isBar ? 3 : 0,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: c.dark ? '#1a1a1a' : '#fff',
            titleColor: c.muted, bodyColor: c.text,
            borderColor: c.border, borderWidth: 1,
            padding: 10, cornerRadius: 6,
            callbacks: { label: ctx => ' $' + ctx.parsed.y.toFixed(2) },
          },
        },
        scales: {
          x: {
            grid: { color: c.gridCol },
            ticks: { color: c.tickCol, font: { family: 'JetBrains Mono', size: 9 }, maxTicksLimit: 10, maxRotation: 0 },
            border: { color: c.border },
          },
          y: {
            grid: { color: c.gridCol },
            ticks: { color: c.tickCol, font: { family: 'JetBrains Mono', size: 10 }, callback: v => '$' + v },
            border: { color: c.border },
          },
        },
      },
    })

    return () => { revenueChart.current?.destroy() }
  }, [filtered, range, t])

  /* ── DERIVED METRICS ── */
  const revenue    = filtered.reduce((s, o) => s + Number(o.total), 0)
  const prevRevenue = prevPeriod.reduce((s, o) => s + Number(o.total), 0)
  const revDelta   = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : null

  const orderCount  = filtered.length
  const prevCount   = prevPeriod.length
  const orderDelta  = prevCount > 0 ? ((orderCount - prevCount) / prevCount) * 100 : null

  const avgOrder   = orderCount > 0 ? revenue / orderCount : 0
  const prevAvg    = prevCount  > 0 ? prevRevenue / prevCount : 0
  const avgDelta   = prevAvg   > 0 ? ((avgOrder - prevAvg) / prevAvg) * 100 : null

  const completedCount     = filtered.filter(o => o.status === 'completed').length
  const completionRate     = orderCount > 0 ? Math.round((completedCount / orderCount) * 100) : 0
  const prevCompleted      = prevPeriod.filter(o => o.status === 'completed').length
  const prevCompletionRate = prevCount  > 0 ? Math.round((prevCompleted / prevCount) * 100) : 0
  const completionDelta    = prevCount  > 0 ? completionRate - prevCompletionRate : null

  /* Sparklines — always last 7 days regardless of selected range */
  const sparkRevenue = [...Array(7)].map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    return orders.filter(o => new Date(o.created_at).toDateString() === d.toDateString())
                 .reduce((s, o) => s + Number(o.total), 0)
  })
  const sparkOrders = [...Array(7)].map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    return orders.filter(o => new Date(o.created_at).toDateString() === d.toDateString()).length
  })

  /* Top items — word-level matching so 'Burger Combo' matches on 'burger' */
  const itemCounts = {}
  filtered.forEach(o => {
    const txt = (o.order_text ?? '').toLowerCase()
    if (menuItems.length > 0) {
      menuItems.forEach(item => {
        const words = item.name.toLowerCase().split(/[\s&,+]+/).filter(w => w.length > 2)
        if (words.some(w => txt.includes(w)))
          itemCounts[item.name] = (itemCounts[item.name] || 0) + 1
      })
    } else {
      if (txt.includes('burger'))  itemCounts['Burger Combo']    = (itemCounts['Burger Combo']    || 0) + 1
      if (txt.includes('chicken')) itemCounts['Chicken & Chips'] = (itemCounts['Chicken & Chips'] || 0) + 1
      if (txt.includes('mazoe'))   itemCounts['Mazoe']           = (itemCounts['Mazoe']           || 0) + 1
      if (txt.includes('water'))   itemCounts['Water']           = (itemCounts['Water']           || 0) + 1
      if (txt.includes('chips'))   itemCounts['Chips Only']      = (itemCounts['Chips Only']      || 0) + 1
    }
  })
  const topItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const maxCount = topItems[0]?.[1] || 1

  /* Payment & type breakdowns */
  const cashOrders    = filtered.filter(o => o.payment_method === 'cash')
  const ecocashOrders = filtered.filter(o => o.payment_method === 'ecocash')
  const cashCount     = cashOrders.length
  const ecocashCount  = ecocashOrders.length
  const cashRevenue   = cashOrders.reduce((s, o) => s + Number(o.total), 0)
  const ecocashRevenue = ecocashOrders.reduce((s, o) => s + Number(o.total), 0)
  const pickupCount  = filtered.filter(o => o.order_type === 'pickup').length
  const delivCount   = filtered.filter(o => o.order_type === 'delivery').length

  /* Status funnel */
  const pendingCount  = filtered.filter(o => o.status === 'pending').length
  const activeCount   = filtered.filter(o => ['confirmed', 'pickup', 'delivery', 'ready'].includes(o.status)).length

  /* Auto-insights */
  const hourCounts = [...Array(24)].map((_, h) =>
    filtered.filter(o => new Date(o.created_at).getHours() === h).length
  )
  const peakHour  = hourCounts.indexOf(Math.max(...hourCounts))
  const dayNames  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dayCounts = [...Array(7)].map((_, i) =>
    filtered.filter(o => new Date(o.created_at).getDay() === i).length
  )
  const peakDay     = dayCounts.indexOf(Math.max(...dayCounts))
  const ratedOrders = filtered.filter(o => o.rating)
  const avgRating   = ratedOrders.length > 0
    ? (ratedOrders.reduce((s, o) => s + Number(o.rating), 0) / ratedOrders.length).toFixed(1)
    : null

  const insights = [
    filtered.length > 0 && hourCounts[peakHour] > 0 && { icon: '⏰', text: 'Peak: ' + peakHour + ':00–' + (peakHour + 1) + ':00' },
    filtered.length > 0 && dayCounts[peakDay]  > 0 && { icon: '📅', text: 'Busiest: ' + dayNames[peakDay] },
    topItems[0]  && { icon: '🏆', text: 'Top item: ' + topItems[0][0] },
    avgRating    && { icon: '⭐', text: 'Avg rating: ' + avgRating },
    orderCount > 0 && delivCount > 0 && { icon: '🛵', text: Math.round((delivCount / orderCount) * 100) + '% delivery' },
    orderCount > 0 && { icon: '✅', text: completionRate + '% completed' },
  ].filter(Boolean)

  const RANGES = ['Today', '7D', '30D', 'All']

  return (
    <>
      <style>{`
        @keyframes anIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${c.faint}; border-radius: 2px; }
      `}</style>

      <div style={{
        display: 'flex', height: '100vh', overflow: 'hidden',
        background: t.bg, color: c.text,
        fontFamily: 'Manrope,sans-serif', transition: 'background .2s',
      }}>
        <Sidebar />

        <main style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '20px 16px 84px' : '28px 36px 56px' }}>

          {/* ── HEADER ── */}
          <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'flex-start', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', gap: isMobile ? 12 : 0, marginBottom: 18 }}>
            <div>
              <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: c.muted, marginBottom: 6 }}>
                Business Intelligence
              </div>
              <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, color: c.text, margin: 0 }}>
                Analytics
              </h1>
              <p style={{ fontFamily: 'Manrope,sans-serif', fontSize: 13, fontWeight: 300, color: c.muted, margin: '5px 0 0' }}>
                {orderCount === 0
                  ? 'No orders in this period yet'
                  : orderCount + ' order' + (orderCount !== 1 ? 's' : '') + ' · $' + revenue.toFixed(2) + ' revenue'}
              </p>
            </div>

            {/* Range selector */}
            <div style={{ display: 'flex', gap: 4, background: c.subBg, border: '1px solid ' + c.border, borderRadius: 8, padding: 4 }}>
              {RANGES.map(r => (
                <button key={r} onClick={() => setRange(r)} style={{
                  fontFamily: 'JetBrains Mono,monospace', fontSize: 10, letterSpacing: '0.08em',
                  padding: '6px 14px', borderRadius: 5, border: 'none',
                  background: range === r ? (c.dark ? 'rgba(255,255,255,.1)' : '#fff') : 'transparent',
                  color: range === r ? c.text : c.muted,
                  boxShadow: range === r && !c.dark ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
                  cursor: 'pointer', transition: 'all .15s',
                  fontWeight: range === r ? 600 : 400,
                }}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* ── INSIGHT CHIPS ── */}
          {insights.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
              {insights.map((ins, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px',
                  background: c.subBg, border: '1px solid ' + c.border,
                  borderRadius: 20, animation: 'anIn .3s ' + (i * 40) + 'ms both',
                }}>
                  <span style={{ fontSize: 11 }}>{ins.icon}</span>
                  <span style={{ fontFamily: 'Manrope,sans-serif', fontSize: 11, color: c.muted }}>{ins.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── KPI TILES ── */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
            <KpiTile label="Revenue"    value={'$' + revenue.toFixed(2)}  accent="#4ade80" sub={'last ' + range}          delta={revDelta}        sparkData={sparkRevenue} index={0} c={c} />
            <KpiTile label="Orders"     value={orderCount}                accent="#38bdf8" sub={'last ' + range}          delta={orderDelta}       sparkData={sparkOrders}  index={1} c={c} />
            <KpiTile label="Completion" value={completionRate + '%'}      accent="#fbbf24" sub={completedCount + ' done'} delta={completionDelta}                           index={3} c={c} />
            <KpiTile label="Today"      value={stats.today_orders ?? '—'} accent="#f472b6" sub={'$' + Number(stats.today_revenue ?? 0).toFixed(2) + ' revenue'}             index={4} c={c} />
          </div>

          {/* ── CHARTS ROW ── */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '3fr 2fr', gap: 12, marginBottom: 12 }}>

            {/* Revenue trend */}
            <div style={{ background: c.cardBg, border: '1px solid ' + c.border, borderRadius: 8, overflow: 'hidden', animation: 'anIn .4s .1s both', display: 'flex', flexDirection: 'column' }}>
              <CardHead
                label="Revenue"
                sub={range === 'Today' ? 'Hourly breakdown' : range === '7D' ? 'Last 7 days' : range === '30D' ? 'Last 30 days' : 'All time — monthly trend'}
                right={revDelta !== null ? <Delta value={revDelta} /> : null}
                c={c}
              />
              <div style={{ padding: '16px 18px 18px', flex: 1 }}>
                <div style={{ position: 'relative', height: 210 }}>
                  {!filtered.length && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, pointerEvents: 'none' }}>
                      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 24, color: c.faint }}>◌</div>
                      <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 12, color: c.muted }}>No data for this period</div>
                    </div>
                  )}
                  <canvas ref={revenueRef} />
                </div>
              </div>
            </div>

            {/* Heatmap */}
            <div style={{ background: c.cardBg, border: '1px solid ' + c.border, borderRadius: 8, overflow: 'hidden', animation: 'anIn .4s .16s both', display: 'flex', flexDirection: 'column' }}>
              <CardHead label="Order Activity" sub="Day × Hour heatmap" c={c} />
              <div style={{ padding: '16px 18px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {filtered.length === 0 ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 24, color: c.faint }}>◌</div>
                    <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 12, color: c.muted, marginTop: 8 }}>No data yet</div>
                  </div>
                ) : (
                  <HourHeatmap orders={filtered} c={c} />
                )}
              </div>
            </div>
          </div>

          {/* ── BOTTOM ROW ── */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr', gap: 12 }}>

            {/* Top items */}
            <div style={{ background: c.cardBg, border: '1px solid ' + c.border, borderRadius: 8, overflow: 'hidden', animation: 'anIn .4s .22s both' }}>
              <CardHead label="Top Selling Items" c={c} />
              <div style={{ padding: '4px 18px 10px' }}>
                {topItems.length === 0 ? (
                  <div style={{ padding: '28px 0', textAlign: 'center', fontFamily: 'Manrope,sans-serif', fontSize: 12, color: c.muted }}>No data yet</div>
                ) : topItems.map(([name, count], i) => (
                  <ItemRow key={name} name={name} count={count} max={maxCount} rank={i} c={c} />
                ))}
              </div>
            </div>

            {/* Payment Method  */}
            <div style={{ background: c.cardBg, border: '1px solid ' + c.border, borderRadius: 8, overflow: 'hidden', animation: 'anIn .4s .28s both', display: 'flex', flexDirection: 'column' }}>
              <CardHead label="Payment Method" c={c} />
              <div style={{ padding: '14px 16px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                {(cashCount + ecocashCount) === 0 ? (
                  <div style={{ padding: '28px 0', textAlign: 'center', fontFamily: 'Manrope,sans-serif', fontSize: 12, color: c.muted }}>No data yet</div>
                ) : (
                  <>
                    {/* Split bar */}
                    <div style={{ display: 'flex', height: 7, borderRadius: 4, overflow: 'hidden', marginBottom: 16 }}>
                      <div style={{ width: (ecocashCount / (cashCount + ecocashCount) * 100) + '%', background: '#a78bfa', transition: 'width .8s cubic-bezier(.23,1,.32,1)' }} />
                      <div style={{ flex: 1, background: '#fbbf24' }} />
                    </div>
                    {[
                      { label: 'EcoCash', count: ecocashCount, revenue: ecocashRevenue, color: '#a78bfa', icon: '📱' },
                      { label: 'Cash',    count: cashCount,    revenue: cashRevenue,    color: '#fbbf24', icon: '💵' },
                    ].map(m => {
                      const pct = Math.round((m.count / (cashCount + ecocashCount)) * 100)
                      return (
                        <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 6, background: c.faint, marginBottom: 8, border: '1px solid ' + c.border }}>
                          <div style={{ width: 30, height: 30, borderRadius: 7, background: m.color + '18', border: '1px solid ' + m.color + '30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>{m.icon}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                              <span style={{ fontFamily: 'Manrope,sans-serif', fontSize: 12, fontWeight: 500, color: c.text }}>{m.label}</span>
                              <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: m.color, background: m.color + '15', border: '1px solid ' + m.color + '30', padding: '2px 5px', borderRadius: 3 }}>{pct}%</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 15, fontWeight: 600, color: m.color }}>${m.revenue.toFixed(2)}</span>
                              <span style={{ fontFamily: 'Manrope,sans-serif', fontSize: 10, color: c.muted }}>{m.count} order{m.count !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {stats.cash_pending > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', borderRadius: 6, background: 'rgba(251,191,36,.06)', border: '1px solid rgba(251,191,36,.2)', marginTop: 2 }}>
                        <span style={{ fontSize: 10 }}>⚠️</span>
                        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: '#fbbf24', letterSpacing: '0.03em' }}>{stats.cash_pending} cash orders pending</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Fulfilment + funnel */}
            <div style={{ background: c.cardBg, border: '1px solid ' + c.border, borderRadius: 8, overflow: 'hidden', animation: 'anIn .4s .34s both', display: 'flex', flexDirection: 'column' }}>
              <CardHead label="Order Types" c={c} />
              <div style={{ padding: '14px 16px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                {(delivCount + pickupCount) > 0 ? (
                  <>
                    {/* Split bar */}
                    <div style={{ display: 'flex', height: 7, borderRadius: 4, overflow: 'hidden', marginBottom: 16 }}>
                      <div style={{ width: (delivCount / (delivCount + pickupCount) * 100) + '%', background: '#38bdf8', transition: 'width .8s cubic-bezier(.23,1,.32,1)' }} />
                      <div style={{ flex: 1, background: '#4ade80' }} />
                    </div>
                    {[
                      { label: 'Delivery', count: delivCount,  color: '#38bdf8', icon: '🛵' },
                      { label: 'Pickup',   count: pickupCount, color: '#4ade80', icon: '🏃' },
                    ].map(m => {
                      const pct = Math.round((m.count / (delivCount + pickupCount)) * 100)
                      return (
                        <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 6, background: c.faint, marginBottom: 8, border: '1px solid ' + c.border }}>
                          <div style={{ width: 30, height: 30, borderRadius: 7, background: m.color + '18', border: '1px solid ' + m.color + '30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>{m.icon}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                              <span style={{ fontFamily: 'Manrope,sans-serif', fontSize: 12, fontWeight: 500, color: c.text }}>{m.label}</span>
                              <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: m.color, background: m.color + '15', border: '1px solid ' + m.color + '30', padding: '2px 5px', borderRadius: 3 }}>{pct}%</span>
                            </div>
                            <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 16, fontWeight: 600, color: m.color }}>{m.count}</span>
                            <span style={{ fontFamily: 'Manrope,sans-serif', fontSize: 10, color: c.muted, marginLeft: 4 }}>orders</span>
                          </div>
                        </div>
                      )
                    })}
                  </>
                ) : (
                  <div style={{ padding: '16px 0', textAlign: 'center', fontFamily: 'Manrope,sans-serif', fontSize: 12, color: c.muted }}>No data yet</div>
                )}
                <div style={{ borderTop: '1px solid ' + c.dimSep, paddingTop: 12, marginTop: 8 }}>
                  <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: c.muted, marginBottom: 10 }}>
                    Status funnel
                  </div>
                  <FunnelRow label="Pending"   count={pendingCount}   total={orderCount} color="#fbbf24" c={c} />
                  <FunnelRow label="Active"    count={activeCount}    total={orderCount} color="#38bdf8" c={c} />
                  <FunnelRow label="Completed" count={completedCount} total={orderCount} color="#4ade80" c={c} />
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </>
  )
}
