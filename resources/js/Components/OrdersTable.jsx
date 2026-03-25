import { useState } from 'react'

const STATUS_BADGE = {
  pickup:           'bg-emerald-950 text-emerald-400 border border-emerald-900',
  delivery:         'bg-blue-950 text-blue-400 border border-blue-900',
  pending:          'bg-amber-950 text-amber-400 border border-amber-900',
  preparing:        'bg-orange-950 text-orange-400 border border-orange-900',
  ready:            'bg-teal-950 text-teal-400 border border-teal-900',
  out_for_delivery: 'bg-violet-950 text-violet-400 border border-violet-900',
  completed:        'bg-zinc-800 text-zinc-500 border border-zinc-700',
}

const STATUS_BADGE_LIGHT = {
  pickup:           { background:'#f0fdf4', color:'#15803d', border:'1px solid #bbf7d0' },
  delivery:         { background:'#eff6ff', color:'#1d4ed8', border:'1px solid #bfdbfe' },
  pending:          { background:'#fffbeb', color:'#b45309', border:'1px solid #fde68a' },
  preparing:        { background:'#fff7ed', color:'#c2410c', border:'1px solid #fed7aa' },
  ready:            { background:'#f0fdfa', color:'#0f766e', border:'1px solid #99f6e4' },
  out_for_delivery: { background:'#f5f3ff', color:'#6d28d9', border:'1px solid #ddd6fe' },
  completed:        { background:'#f5f5f4', color:'#78716c', border:'1px solid #e7e5e4' },
}

const STATUS_LABEL = {
  pickup:           'Pickup',
  delivery:         'Delivery',
  pending:          'Pending',
  preparing:        'Preparing',
  ready:            'Ready',
  out_for_delivery: 'Out for Delivery',
  completed:        'Completed',
}

const PER_PAGE = 10

export default function OrdersTable({ orders, filter, setFilter, updateStatus, loading, theme }) {
  const [page, setPage] = useState(1)

  const t = theme || {
    bg: '#0a0a0a', cardBg: '#111', border: '#1e1e1e',
    text: '#f0ede6', muted: '#555', rowHover: '#141414',
    inputBg: '#1a1a1a', selectBg: '#1a1a1a',
    navActive: '#1a1a1a', dot: '#e8d5a3',
  }
  const dark = t.bg === '#0a0a0a' || t.bg?.includes('0a')

  const filtered   = filter === 'all' ? orders : orders.filter(o => o.status === filter)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const handleFilter = (f) => { setFilter(f); setPage(1) }

  return (
    <>
      {/* FILTERS */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] tracking-widest uppercase" style={{color: t.muted, fontFamily:'DM Mono,monospace'}}>
          {filtered.length} orders
        </div>
        <div className="flex gap-2">
          {['all','pending','pickup','delivery','completed'].map(f => (
            <button key={f} onClick={() => handleFilter(f)}
              className="px-3 py-1 text-xs capitalize transition-all rounded-md"
              style={{
                background: filter===f ? t.navActive : 'transparent',
                color: filter===f ? t.text : t.muted,
                border: `1px solid ${filter===f ? (dark ? '#333' : '#ccc') : t.border}`,
              }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div className="mb-4 overflow-x-auto rounded-xl" style={{background: t.cardBg, border:`1px solid ${t.border}`}}>
        <table className="w-full">
          <thead>
            <tr style={{borderBottom:`1px solid ${dark ? '#1a1a1a' : '#eeeeea'}`}}>
              {['Order','Customer','Items','Total','Type','Rating','Time','Action'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] tracking-widest uppercase"
                  style={{color: t.muted, fontFamily:'DM Mono,monospace'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="py-10 text-sm text-center" style={{color: dark ? '#333' : '#aaa'}}>Loading orders...</td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={8} className="py-10 text-sm text-center" style={{color: dark ? '#333' : '#aaa'}}>No orders found</td></tr>
            ) : paginated.map(order => (
              <tr key={order.id} className="transition-all"
                style={{borderBottom:`1px solid ${dark ? '#161616' : '#f0f0ec'}`}}
                onMouseEnter={e => e.currentTarget.style.background = t.rowHover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td className="px-4 py-3 text-xs" style={{color: t.muted, fontFamily:'DM Mono,monospace'}}>#{order.id}</td>
                <td className="px-4 py-3 text-xs" style={{color: t.muted, fontFamily:'DM Mono,monospace'}}>+{order.phone}</td>
                <td className="px-4 py-3 text-sm font-medium" style={{color: t.text}}>{order.order_text}</td>
                <td className="px-4 py-3 text-sm" style={{color: t.hlText ?? '#e8d5a3', fontFamily:'DM Mono,monospace'}}>${Number(order.total).toFixed(2)}</td>
                <td className="px-4 py-3">
                  {dark ? (
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-medium ${STATUS_BADGE[order.status] || STATUS_BADGE.pending}`}>
                      {STATUS_LABEL[order.status] ?? order.status}
                    </span>
                  ) : (
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                      style={STATUS_BADGE_LIGHT[order.status] || STATUS_BADGE_LIGHT.pending}>
                      {STATUS_LABEL[order.status] ?? order.status}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs" style={{fontFamily:'DM Mono,monospace'}}>
                  {order.rating
                    ? <span title={`${order.rating}/5`}>{'⭐'.repeat(order.rating)}</span>
                    : <span style={{color: dark ? '#333' : '#ccc'}}>—</span>}
                </td>
                <td className="px-4 py-3 text-xs" style={{color: dark ? '#444' : '#aaa', fontFamily:'DM Mono,monospace'}}>
                  {new Date(order.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                </td>
                <td className="px-4 py-3">
                  <select value={order.status} onChange={e => updateStatus(order.id, e.target.value)}
                    className="px-2 py-1 text-xs rounded-md focus:outline-none"
                    style={{background: t.selectBg, border:`1px solid ${dark ? '#2a2a2a' : '#ddd'}`, color: t.muted}}>
                    <option value="pending">Pending</option>
                    <option value="pickup">Pickup</option>
                    <option value="delivery">Delivery</option>
                    <option value="preparing">Preparing</option>
                    <option value="ready">Ready for Pickup</option>
                    <option value="out_for_delivery">Out for Delivery</option>
                    <option value="completed">Completed</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-xs" style={{color: dark ? '#444' : '#aaa', fontFamily:'DM Mono,monospace'}}>
            Showing {((page-1)*PER_PAGE)+1}–{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
              className="px-3 py-1.5 text-xs rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{border:`1px solid ${t.border}`, color: t.muted, background:'transparent'}}>
              ← Prev
            </button>
            {[...Array(totalPages)].map((_, i) => {
              const p = i + 1
              if (p===1 || p===totalPages || Math.abs(p-page)<=1) return (
                <button key={p} onClick={() => setPage(p)}
                  className="w-8 h-8 text-xs transition-all rounded-lg"
                  style={{
                    background: page===p ? t.dot : 'transparent',
                    color: page===p ? '#0a0a0a' : t.muted,
                    border: `1px solid ${page===p ? t.dot : t.border}`,
                    fontWeight: page===p ? 600 : 400,
                  }}>
                  {p}
                </button>
              )
              if (Math.abs(p-page)===2) return <span key={p} className="px-1 text-xs" style={{color: dark ? '#333' : '#ccc'}}>...</span>
              return null
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
              className="px-3 py-1.5 text-xs rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{border:`1px solid ${t.border}`, color: t.muted, background:'transparent'}}>
              Next →
            </button>
          </div>
        </div>
      )}
    </>
  )
}