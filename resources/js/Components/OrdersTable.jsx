import { useState, useEffect } from 'react'

/* ─────────────────────────────────────────────────────────────
   STATUS / PAYMENT CONFIG  (semantic colors — same in any theme)
───────────────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  pickup:           { label: 'Pickup',           color: '#4ade80', bg: 'rgba(74,222,128,.1)',   border: 'rgba(74,222,128,.25)' },
  delivery:         { label: 'Delivery',         color: '#38bdf8', bg: 'rgba(56,189,248,.1)',   border: 'rgba(56,189,248,.25)' },
  pending:          { label: 'Pending',          color: '#fbbf24', bg: 'rgba(251,191,36,.1)',   border: 'rgba(251,191,36,.25)' },
  preparing:        { label: 'Preparing',        color: '#fb923c', bg: 'rgba(251,146,60,.1)',   border: 'rgba(251,146,60,.25)' },
  ready:            { label: 'Ready',            color: '#a78bfa', bg: 'rgba(167,139,250,.1)',  border: 'rgba(167,139,250,.25)' },
  out_for_delivery: { label: 'Out for Delivery', color: '#c084fc', bg: 'rgba(192,132,252,.1)',  border: 'rgba(192,132,252,.25)' },
  completed:        { label: 'Completed',        color: '#94a3b8', bg: 'rgba(148,163,184,.08)', border: 'rgba(148,163,184,.2)'  },
}

const PAYMENT_CONFIG = {
  paid:    { label: '✓ Paid',    color: '#4ade80', bg: 'rgba(74,222,128,.1)',   border: 'rgba(74,222,128,.25)',  pulse: false },
  failed:  { label: '✕ Failed',  color: '#f87171', bg: 'rgba(248,113,113,.1)',  border: 'rgba(248,113,113,.25)', pulse: false },
  manual:  { label: '⚠ Verify',  color: '#fbbf24', bg: 'rgba(251,191,36,.1)',   border: 'rgba(251,191,36,.3)',   pulse: true  },
  pending: { label: '· Pending', color: '#94a3b8', bg: 'rgba(148,163,184,.08)', border: 'rgba(148,163,184,.18)', pulse: false },
}

const PER_PAGE = 10

/* ─────────────────────────────────────────────────────────────
   CHROME HELPER — derives all theme-aware values from t
   Works with any ThemeContext shape: uses t.isDark if present,
   otherwise infers from t.bg.
───────────────────────────────────────────────────────────── */
function chrome(t) {
  const dark = t.isDark
    ?? (typeof t.bg === 'string' && (t.bg.startsWith('#0') || t.bg.startsWith('#08') || t.bg.startsWith('#0d') || t.bg === '#0a0a0a'))

  return {
    dark,
    // chrome surfaces — use theme values, fall back to mode-appropriate defaults
    cardBg:   t.cardBg   ?? (dark ? 'rgba(255,255,255,.025)' : '#ffffff'),
    subBg:    t.subBg    ?? (dark ? 'rgba(255,255,255,.03)'  : '#f7f7f5'),
    inputBg:  t.inputBg  ?? (dark ? 'rgba(255,255,255,.04)'  : '#ffffff'),
    panelBg:  t.bg       ?? (dark ? '#0a0e18' : '#ffffff'),
    rowHover: t.rowHover ?? (dark ? 'rgba(255,255,255,.03)'  : 'rgba(0,0,0,.03)'),
    // borders & separators
    border:   t.border   ?? (dark ? 'rgba(255,255,255,.07)'  : 'rgba(0,0,0,.09)'),
    dimSep:               dark ? 'rgba(255,255,255,.05)'  : 'rgba(0,0,0,.06)',
    // text
    text:     t.text     ?? (dark ? 'rgba(255,255,255,.85)'  : '#111111'),
    muted:    t.muted    ?? (dark ? 'rgba(255,255,255,.3)'   : '#888888'),
    faint:                dark ? 'rgba(255,255,255,.12)'  : 'rgba(0,0,0,.15)',
    secLabel:             dark ? 'rgba(255,255,255,.2)'   : 'rgba(0,0,0,.3)',
    // accent
    hlText:   t.hlText   ?? '#4ade80',
    // shadow for slide panel
    panelShadow: dark ? '-20px 0 60px rgba(0,0,0,.5)' : '-8px 0 32px rgba(0,0,0,.12)',
    backdropBg:  dark ? 'rgba(0,0,0,.6)' : 'rgba(0,0,0,.3)',
  }
}

/* ─────────────────────────────────────────────────────────────
   TEXT HELPERS
───────────────────────────────────────────────────────────── */
function humanize(text) {
  if (text == null) return text
  return String(text).replace(/_/g, ' ')
}

/* ─────────────────────────────────────────────────────────────
   STATUS BADGE
───────────────────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontFamily: 'JetBrains Mono,monospace',
      fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
      color: cfg.color, background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      padding: '3px 9px', borderRadius: 3, whiteSpace: 'nowrap',
    }}>{cfg.label}</span>
  )
}

/* ─────────────────────────────────────────────────────────────
   PAYMENT BADGE
───────────────────────────────────────────────────────────── */
function PaymentBadge({ ps }) {
  const cfg = PAYMENT_CONFIG[ps] ?? PAYMENT_CONFIG.pending
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: 'JetBrains Mono,monospace',
      fontSize: 10, letterSpacing: '0.08em',
      color: cfg.color, background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      padding: '3px 9px', borderRadius: 3,
    }}>
      {cfg.pulse && (
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: cfg.color, display: 'inline-block', flexShrink: 0,
          animation: 'pingDot 1s ease infinite',
        }} />
      )}
      {cfg.label}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────
   PANEL ROW
───────────────────────────────────────────────────────────── */
function PanelRow({ label, value, mono, highlight, c }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'flex-start', gap: 16,
      padding: '8px 0', borderBottom: `1px solid ${c.dimSep}`,
    }}>
      <span style={{ fontFamily: 'Manrope,sans-serif', fontSize: 11, color: c.muted, flexShrink: 0, paddingTop: 1 }}>
        {label}
      </span>
      <span style={{
        fontFamily: mono ? 'JetBrains Mono,monospace' : 'Manrope,sans-serif',
        fontSize: 12,
        color: highlight ? c.hlText : c.text,
        textAlign: 'right', wordBreak: 'break-word',
      }}>{value}</span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   SECTION LABEL
───────────────────────────────────────────────────────────── */
function SectionLabel({ children, c }) {
  return (
    <div style={{
      fontFamily: 'JetBrains Mono,monospace',
      fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
      color: c.secLabel,
      padding: '20px 0 8px',
      borderBottom: `1px solid ${c.dimSep}`,
      marginBottom: 2,
    }}>{children}</div>
  )
}

/* ─────────────────────────────────────────────────────────────
   ACTION BUTTON
───────────────────────────────────────────────────────────── */
function ActionBtn({ onClick, variant, children }) {
  const [hover, setHover] = useState(false)
  const s = variant === 'confirm'
    ? { base: { background: 'rgba(74,222,128,.1)',   color: '#4ade80', border: '1px solid rgba(74,222,128,.3)'  },
        hov:  { background: 'rgba(74,222,128,.2)',   border: '1px solid rgba(74,222,128,.5)'  } }
    : { base: { background: 'rgba(248,113,113,.08)', color: '#f87171', border: '1px solid rgba(248,113,113,.25)' },
        hov:  { background: 'rgba(248,113,113,.18)', border: '1px solid rgba(248,113,113,.45)' } }
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        flex: 1, padding: '10px 0',
        fontFamily: 'JetBrains Mono,monospace',
        fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
        borderRadius: 4, cursor: 'pointer', transition: 'all .15s',
        ...s.base, ...(hover ? s.hov : {}),
      }}>{children}</button>
  )
}

/* ─────────────────────────────────────────────────────────────
   ORDER DETAIL PANEL
───────────────────────────────────────────────────────────── */
function OrderPanel({ order, updateStatus, confirmPayment, onClose, t }) {
  const [activities, setActivities] = useState([])
  const c = chrome(t)

  useEffect(() => {
    fetch(`/api/orders/${order.id}/activities`, { headers: { Accept: 'application/json' } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setActivities(Array.isArray(data) ? data : []))
      .catch(() => setActivities([]))
  }, [order.id])

  const ps   = order.payment_status ?? 'pending'
  const sCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 40,
        background: c.backdropBg,
        backdropFilter: 'blur(2px)',
        animation: 'fadeIn .18s ease',
      }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 50,
        width: 400,
        background: c.panelBg,
        borderLeft: `1px solid ${c.border}`,
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
        fontFamily: 'Manrope,sans-serif',
        animation: 'slideInRight .24s cubic-bezier(.23,1,.32,1)',
        boxShadow: c.panelShadow,
      }}>

        {/* Header */}
        <div style={{
          padding: '24px 28px 20px',
          borderBottom: `1px solid ${c.border}`,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          flexShrink: 0,
          background: c.subBg,
        }}>
          <div>
            <div style={{
              fontFamily: 'JetBrains Mono,monospace', fontSize: 10,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              color: c.muted, marginBottom: 6,
            }}>Order Details</div>
            <div style={{
              fontFamily: 'JetBrains Mono,monospace', fontSize: 22,
              fontWeight: 600, color: c.text, letterSpacing: '-0.01em',
            }}>#{String(order.id).padStart(4, '0')}</div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <StatusBadge status={order.status} />
              <PaymentBadge ps={ps} />
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 4,
            background: c.rowHover, border: `1px solid ${c.border}`,
            color: c.muted, cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = c.text }}
            onMouseLeave={e => { e.currentTarget.style.color = c.muted }}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 28px 36px' }}>

          {/* Cash alert */}
          {order.payment_method === 'cash' && ps !== 'paid' && (
            <div style={{
              margin: '20px 0 0', padding: '16px 18px',
              background: 'rgba(251,191,36,.06)',
              border: '1px solid rgba(251,191,36,.25)',
              borderRadius: 6, borderLeft: '3px solid #fbbf24',
            }}>
              <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fbbf24', marginBottom: 8 }}>
                💵 {order.order_type === 'pickup' ? 'Cash on Pickup' : 'Cash on Delivery'}
              </div>
              <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 12, color: 'rgba(251,191,36,.75)', lineHeight: 1.5, marginBottom: 14 }}>
                Collect <strong style={{ color: '#fbbf24' }}>${Number(order.total).toFixed(2)}</strong> cash before confirming.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <ActionBtn variant="confirm" onClick={() => { confirmPayment(order.id, 'paid', { amount_paid: order.total }); onClose() }}>✓ Cash Received</ActionBtn>
                <ActionBtn variant="deny"    onClick={() => { confirmPayment(order.id, 'failed'); onClose() }}>✕ Not Collected</ActionBtn>
              </div>
            </div>
          )}

          {/* EcoCash alert */}
          {ps === 'manual' && (
            <div style={{
              margin: '20px 0 0', padding: '16px 18px',
              background: 'rgba(251,191,36,.06)',
              border: '1px solid rgba(251,191,36,.25)',
              borderRadius: 6, borderLeft: '3px solid #fbbf24',
            }}>
              <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fbbf24', marginBottom: 8 }}>
                ⚠ EcoCash — Awaiting Verification
              </div>
              <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 12, color: 'rgba(251,191,36,.75)', lineHeight: 1.5, marginBottom: 14 }}>
                Customer claims they sent <strong style={{ color: '#fbbf24' }}>${Number(order.total).toFixed(2)}</strong> via EcoCash. Check your account before confirming.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <ActionBtn variant="confirm" onClick={() => { confirmPayment(order.id, 'paid'); onClose() }}>✓ Confirm Received</ActionBtn>
                <ActionBtn variant="deny"    onClick={() => { confirmPayment(order.id, 'failed'); onClose() }}>✕ Not Received</ActionBtn>
              </div>
            </div>
          )}

          {/* Order info */}
          <SectionLabel c={c}>Order Info</SectionLabel>
          <PanelRow c={c} label="Customer" value={`+${order.phone}`}                                                                           mono />
          <PanelRow c={c} label="Items"    value={humanize(order.order_text)} />
          <PanelRow c={c} label="Total"    value={`$${Number(order.total).toFixed(2)}`}                                                        mono highlight />
          <PanelRow c={c} label="Type"     value={order.order_type === 'pickup' ? '🏃 Pickup' : '🚗 Delivery'} />
          <PanelRow c={c} label="Method"   value={order.payment_method ?? '—'}                                                                 mono />
          <PanelRow c={c} label="Placed"   value={new Date(order.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} mono />
          {order.rating && <PanelRow c={c} label="Rating" value={'⭐'.repeat(order.rating)} />}

          {/* Status control */}
          <SectionLabel c={c}>Update Status</SectionLabel>
          <div style={{ paddingTop: 4 }}>
            <select
              value={order.status}
              onChange={e => updateStatus(order.id, e.target.value)}
              style={{
                width: '100%',
                fontFamily: 'JetBrains Mono,monospace', fontSize: 12,
                padding: '10px 14px',
                background: c.inputBg,
                border: `1px solid ${sCfg.border}`,
                borderRadius: 4, cursor: 'pointer',
                color: sCfg.color,
                outline: 'none', appearance: 'none',
                transition: 'border-color .15s',
              }}>
              <option value="pending">Pending</option>
              <option value="pickup">Pickup</option>
              <option value="delivery">Delivery</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready for Pickup</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Activity log */}
          <SectionLabel c={c}>Change History</SectionLabel>
          {activities.length === 0 ? (
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: c.faint, padding: '12px 0', letterSpacing: '0.06em' }}>
              NO HISTORY YET
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {activities.map((a, i) => (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '10px 0',
                  borderBottom: `1px solid ${c.dimSep}`,
                  animation: `tileIn .3s ${i * 30}ms both`,
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3, flexShrink: 0 }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: a.field === 'payment_status' ? '#fbbf24' : '#38bdf8',
                    }} />
                    {i < activities.length - 1 && (
                      <div style={{ width: 1, flex: 1, minHeight: 16, background: c.dimSep, marginTop: 4 }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Manrope,sans-serif', fontSize: 12, color: c.text, lineHeight: 1.4 }}>
                      <span style={{ color: c.muted, textTransform: 'capitalize' }}>{a.field.replace('_', ' ')}</span>
                      {' '}
                      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: c.faint }}>{a.old_value ?? '—'}</span>
                      {' → '}
                      <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: c.text, fontWeight: 600 }}>{a.new_value ?? '—'}</span>
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: c.muted, marginTop: 3, letterSpacing: '0.04em' }}>
                      {a.changed_by} · {new Date(a.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/* ─────────────────────────────────────────────────────────────
   PAGINATION BUTTON
───────────────────────────────────────────────────────────── */
function PagBtn({ onClick, disabled, active, c, children }) {
  const [hover, setHover] = useState(false)
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        fontFamily: 'JetBrains Mono,monospace', fontSize: 10,
        letterSpacing: '0.08em',
        padding: '5px 10px', borderRadius: 3,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: active ? c.rowHover : (hover && !disabled) ? c.rowHover : 'transparent',
        color: active ? c.text : disabled ? c.faint : c.muted,
        border: `1px solid ${active ? c.border : c.border}`,
        fontWeight: active ? 600 : 400,
        transition: 'all .12s', minWidth: 32,
        opacity: disabled ? 0.4 : 1,
      }}>
      {children}
    </button>
  )
}

/* ─────────────────────────────────────────────────────────────
   MAIN TABLE
───────────────────────────────────────────────────────────── */
export default function OrdersTable({ orders, filter, setFilter, updateStatus, confirmPayment, loading, theme }) {
  const [page, setPage]             = useState(1)
  const [selected, setSelected]     = useState(null)
  const [hoveredRow, setHoveredRow] = useState(null)

  const t = theme ?? { isDark: true }
  const c = chrome(t)

  const filtered     = filter === 'all' ? orders : orders.filter(o => o.status === filter)
  const totalPages   = Math.ceil(filtered.length / PER_PAGE)
  const paginated    = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const liveSelected = selected ? (orders.find(o => o.id === selected.id) ?? selected) : null

  const COLS = ['#', 'Customer', 'Items', 'Total', 'Status', 'Payment', 'Rating', 'Time']

  return (
    <>
      <style>{`
        @keyframes fadeIn       { from { opacity:0; }                             to { opacity:1; } }
        @keyframes slideInRight { from { transform:translateX(40px); opacity:0; } to { transform:none; opacity:1; } }
        @keyframes tileIn       { from { opacity:0; transform:translateY(6px); }  to { opacity:1; transform:none; } }
        @keyframes pingDot      { 0%,100%{ opacity:1; transform:scale(1); } 50%{ opacity:.4; transform:scale(1.5); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${c.faint}; border-radius: 2px; }
      `}</style>

      {/* ── TABLE ── */}
      <div style={{
        overflowX: 'auto', borderRadius: 8,
        border: `1px solid ${c.border}`,
        background: c.cardBg,
        boxShadow: c.dark ? '0 1px 0 rgba(255,255,255,.04) inset' : '0 1px 3px rgba(0,0,0,.06)',
        marginBottom: 16,
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${c.border}`, background: c.dark ? 'rgba(255,255,255,.025)' : 'rgba(0,0,0,.02)' }}>
              {COLS.map(h => (
                <th key={h} style={{
                  padding: '12px 16px', textAlign: 'left',
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
                <td colSpan={8} style={{ padding: '48px 20px', textAlign: 'center', fontFamily: 'JetBrains Mono,monospace', fontSize: 11, letterSpacing: '0.12em', color: c.faint }}>
                  LOADING ORDERS…
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '48px 20px', textAlign: 'center', fontFamily: 'JetBrains Mono,monospace', fontSize: 11, letterSpacing: '0.12em', color: c.faint }}>
                  NO ORDERS FOUND
                </td>
              </tr>
            ) : paginated.map((order, i) => {
              const ps        = order.payment_status ?? 'pending'
              const sCfg      = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending
              const needsAction = ps === 'manual' || (order.payment_method === 'cash' && ps !== 'paid')

              return (
                <tr key={order.id}
                  onClick={() => setSelected(order)}
                  onMouseEnter={() => setHoveredRow(order.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{
                    borderBottom: `1px solid ${c.dimSep}`,
                    cursor: 'pointer',
                    background: hoveredRow === order.id ? c.rowHover : 'transparent',
                    transition: 'background .12s',
                    animation: `tileIn .3s ${i * 25}ms both`,
                  }}>

                  {/* # — coloured left border shows status at a glance */}
                  <td style={{
                    padding: '13px 16px',
                    fontFamily: 'JetBrains Mono,monospace', fontSize: 12,
                    color: c.muted, letterSpacing: '0.04em',
                    boxShadow: `inset 3px 0 0 ${sCfg.color}`,
                  }}>
                    {String(order.id).padStart(4, '0')}
                  </td>

                  <td style={{ padding: '13px 16px', fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: c.muted, letterSpacing: '0.03em' }}>
                    +{order.phone}
                  </td>

                  <td style={{ padding: '13px 16px', fontFamily: 'Manrope,sans-serif', fontSize: 12, color: c.text, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {humanize(order.order_text)}
                  </td>

                  <td style={{ padding: '13px 16px', fontFamily: 'JetBrains Mono,monospace', fontSize: 13, fontWeight: 600, color: '#4ade80', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                    ${Number(order.total).toFixed(2)}
                  </td>

                  <td style={{ padding: '13px 16px' }}>
                    <StatusBadge status={order.status} />
                  </td>

                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <PaymentBadge ps={ps} />
                      {needsAction && (
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fbbf24', display: 'inline-block', animation: 'pingDot 1.5s ease infinite', flexShrink: 0 }} />
                      )}
                    </span>
                  </td>

                  <td style={{ padding: '13px 16px', fontFamily: 'JetBrains Mono,monospace', fontSize: 12, color: c.text }}>
                    {order.rating
                      ? <span title={`${order.rating}/5`}>
                          {'★'.repeat(order.rating)}
                          <span style={{ color: c.faint }}>{'★'.repeat(5 - order.rating)}</span>
                        </span>
                      : <span style={{ color: c.faint }}>— — —</span>}
                  </td>

                  <td style={{ padding: '13px 16px', fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: c.muted, whiteSpace: 'nowrap' }}>
                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── PAGINATION ── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px' }}>
          <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: c.muted, letterSpacing: '0.08em' }}>
            {((page - 1) * PER_PAGE) + 1}–{Math.min(page * PER_PAGE, filtered.length)} OF {filtered.length}
          </span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <PagBtn c={c} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← PREV</PagBtn>
            {[...Array(totalPages)].map((_, i) => {
              const p = i + 1
              if (p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                return <PagBtn key={p} c={c} onClick={() => setPage(p)} active={page === p}>{p}</PagBtn>
              if (Math.abs(p - page) === 2)
                return <span key={p} style={{ padding: '0 2px', fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: c.faint }}>…</span>
              return null
            })}
            <PagBtn c={c} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>NEXT →</PagBtn>
          </div>
        </div>
      )}

      {/* ── DETAIL PANEL ── */}
      {liveSelected && (
        <OrderPanel
          order={liveSelected}
          updateStatus={updateStatus}
          confirmPayment={confirmPayment}
          onClose={() => setSelected(null)}
          t={t}
        />
      )}
    </>
  )
}