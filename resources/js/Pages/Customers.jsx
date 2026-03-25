import { useState, useEffect } from 'react'
import Sidebar from '../Components/Sidebar'
import { useTheme } from '../Context/ThemeContext'

export default function Customers() {
  const [orders,   setOrders]   = useState([])
  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState(null)
  const { theme: t } = useTheme()

  useEffect(() => {
    fetch('/api/orders').then(r => r.json()).then(setOrders)
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

  const filtered = customers.filter(c => c.phone.includes(search))

  return (
    <div className="flex min-h-screen" style={{background: t.bg, color: t.text, fontFamily:"'DM Sans',sans-serif", transition:'all .2s'}}>
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">

        {/* HEADER */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-xl font-medium tracking-tight">Customers</h1>
            <p className="text-sm mt-1" style={{color: t.muted}}>{customers.length} unique customers</p>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by phone..."
            className="rounded-lg px-4 py-2 text-sm focus:outline-none w-56"
            style={{background: t.inputBg, border:`1px solid ${t.border}`, color: t.text}} />
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Customers', value: customers.length },
            { label: 'Total Orders',    value: orders.length },
            { label: 'Avg Order Value', value: `$${orders.length ? (orders.reduce((s,o) => s + Number(o.total), 0) / orders.length).toFixed(2) : '0.00'}` },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-5" style={{background: t.cardBg, border:`1px solid ${t.cardBorder}`}}>
              <div className="text-[10px] tracking-widest uppercase" style={{color: t.muted, fontFamily:'DM Mono,monospace'}}>{s.label}</div>
              <div className="text-3xl font-medium tracking-tight my-2" style={{color: t.text}}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">

          {/* CUSTOMER LIST */}
          <div className="rounded-xl overflow-hidden" style={{background: t.cardBg, border:`1px solid ${t.cardBorder}`}}>
            <div className="px-4 py-3" style={{borderBottom:`1px solid ${t.border}`}}>
              <div className="text-[10px] tracking-widest uppercase" style={{color: t.muted, fontFamily:'DM Mono,monospace'}}>All Customers</div>
            </div>
            {filtered.length === 0 ? (
              <div className="text-center py-10 text-sm" style={{color: t.muted}}>No customers yet</div>
            ) : filtered.map(c => (
              <div key={c.phone} onClick={() => setSelected(c)}
                className="flex items-center justify-between px-4 py-3 cursor-pointer transition-all"
                style={{
                  borderBottom:`1px solid ${t.border}`,
                  background: selected?.phone === c.phone ? t.rowHover : 'transparent',
                }}
                onMouseEnter={e => e.currentTarget.style.background = t.rowHover}
                onMouseLeave={e => e.currentTarget.style.background = selected?.phone === c.phone ? t.rowHover : 'transparent'}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs"
                    style={{background: t.subBg, border:`1px solid ${t.border}`, color: t.muted, fontFamily:'DM Mono,monospace'}}>
                    {c.phone.slice(-2)}
                  </div>
                  <div>
                    <div className="text-sm" style={{color: t.text, fontFamily:'DM Mono,monospace'}}>+{c.phone}</div>
                    <div className="text-xs" style={{color: t.muted}}>{c.orders.length} orders</div>
                  </div>
                </div>
                <div className="text-sm" style={{color: t.hlText, fontFamily:'DM Mono,monospace'}}>${c.total.toFixed(2)}</div>
              </div>
            ))}
          </div>

          {/* CUSTOMER DETAIL */}
          <div className="rounded-xl p-5" style={{background: t.cardBg, border:`1px solid ${t.cardBorder}`}}>
            {!selected ? (
              <div className="flex items-center justify-center h-full text-sm" style={{color: t.muted}}>
                Select a customer to view details
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-6 pb-5" style={{borderBottom:`1px solid ${t.border}`}}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm"
                    style={{background: t.subBg, border:`1px solid ${t.border}`, color: t.muted, fontFamily:'DM Mono,monospace'}}>
                    {selected.phone.slice(-2)}
                  </div>
                  <div>
                    <div className="text-base font-medium" style={{fontFamily:'DM Mono,monospace', color: t.text}}>+{selected.phone}</div>
                    <div className="text-xs mt-1" style={{color: t.muted}}>
                      Customer since {new Date(selected.orders[selected.orders.length-1]?.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  {[
                    { label: 'Total Orders', value: selected.orders.length },
                    { label: 'Total Spent',  value: `$${selected.total.toFixed(2)}` },
                    { label: 'Avg Order',    value: `$${(selected.total / selected.orders.length).toFixed(2)}` },
                    { label: 'Last Order',   value: new Date(selected.last_order).toLocaleDateString() },
                  ].map(s => (
                    <div key={s.label} className="rounded-lg p-3" style={{background: t.subBg}}>
                      <div className="text-[10px] tracking-widest uppercase" style={{color: t.muted, fontFamily:'DM Mono,monospace'}}>{s.label}</div>
                      <div className="text-lg font-medium mt-1" style={{color: t.text}}>{s.value}</div>
                    </div>
                  ))}
                </div>

                <div className="text-[10px] tracking-widest uppercase mb-3" style={{color: t.muted, fontFamily:'DM Mono,monospace'}}>Order History</div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selected.orders.map(o => (
                    <div key={o.id} className="flex items-center justify-between rounded-lg px-3 py-2"
                      style={{background: t.subBg}}>
                      <div>
                        <div className="text-xs" style={{color: t.text}}>{o.order_text}</div>
                        <div className="text-[10px] mt-0.5" style={{color: t.muted}}>{new Date(o.created_at).toLocaleString()}</div>
                      </div>
                      <div className="text-xs" style={{color: t.hlText, fontFamily:'DM Mono,monospace'}}>${Number(o.total).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}