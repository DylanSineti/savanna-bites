import { useState, useEffect } from 'react'
import StatCards from '../Components/StatCards'
import OrdersTable from '../Components/OrdersTable'
import Sidebar from '../Components/Sidebar'
import { useTheme } from '../Context/ThemeContext'

export default function Dashboard() {
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState({})
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const { theme: t } = useTheme()

  const fetchData = async () => {
    const csrf = document.querySelector('meta[name="csrf-token"]')?.content

    const [o, s] = await Promise.all([
      fetch('/api/orders', {
        headers: { 'X-CSRF-TOKEN': csrf, 'Accept': 'application/json' }
      }).then(r => r.json()),
      fetch('/api/orders/stats', {
        headers: { 'X-CSRF-TOKEN': csrf, 'Accept': 'application/json' }
      }).then(r => r.json()),
    ])

    setOrders(Array.isArray(o) ? o : [])   // ← guard against non-array
    setStats(s && typeof s === 'object' ? s : {})
    setLoading(false)
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
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrf,
        'Accept': 'application/json',
      },
      body: JSON.stringify({ status })
    })
    fetchData()
  }

  return (
    <div className="flex min-h-screen" style={{ background: t.bg, color: t.text, fontFamily: "'DM Sans',sans-serif", transition: 'all .2s' }}>
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">

        {/* TOPBAR */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-xl font-medium tracking-tight">Orders</h1>
            <p className="text-sm mt-1" style={{ color: t.muted }}>Manage and track all incoming orders</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
              style={{ background: t.cardBg, border: `1px solid ${t.border}`, color: t.muted }}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
              Live updates
            </div>
            <button onClick={fetchData} className="px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{ background: t.cardBg, border: `1px solid ${t.border}`, color: t.muted }}>
              Refresh
            </button>
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-4 gap-4 mb-7">
          {[
            { label: "Today's Orders", value: stats.today_orders ?? '—', note: 'orders today' },
            { label: "Today's Revenue", value: `$${Number(stats.today_revenue ?? 0).toFixed(2)}`, note: 'live total', highlight: true },
            { label: 'Pending', value: stats.pending ?? '—', note: 'awaiting action' },
            { label: 'Total Revenue', value: `$${Number(stats.total_revenue ?? 0).toFixed(2)}`, note: 'all time' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-5" style={{
              background: s.highlight ? t.highlight : t.cardBg,
              border: `1px solid ${s.highlight ? t.hlBorder : t.cardBorder}`
            }}>
              <div className="text-[10px] tracking-widest uppercase" style={{ color: t.muted, fontFamily: 'DM Mono,monospace' }}>{s.label}</div>
              <div className="text-3xl font-medium tracking-tight my-2" style={{ color: s.highlight ? t.hlText : t.text }}>{s.value}</div>
              <div className="text-xs" style={{ color: t.muted }}>{s.note}</div>
            </div>
          ))}
        </div>

        {/* ORDERS TABLE */}
        <OrdersTable
          orders={orders}
          filter={filter}
          setFilter={setFilter}
          updateStatus={updateStatus}
          loading={loading}
          theme={t}
        />

      </main>
    </div>
  )
}