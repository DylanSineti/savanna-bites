import { useState, useEffect } from 'react'
import { Chart, registerables } from 'chart.js'
import Sidebar from '../Components/Sidebar'
import { useTheme } from '../Context/ThemeContext'
Chart.register(...registerables)

export default function Analytics() {
  const [orders, setOrders] = useState([])
  const [stats,  setStats]  = useState({})
  const { theme: t } = useTheme()

  useEffect(() => {
    Promise.all([
      fetch('/api/orders').then(r => r.json()),
      fetch('/api/orders/stats').then(r => r.json()),
    ]).then(([o, s]) => { setOrders(o); setStats(s) })
  }, [])

  useEffect(() => {
    if (!orders.length) return

    const gridColor = t.isDark ? '#1a1a1a' : '#eeeeea'
    const tickColor = t.isDark ? '#555' : '#aaa'

    const days = [...Array(7)].map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return d.toLocaleDateString('en', { weekday: 'short' })
    })
    const revenue = [...Array(7)].map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return orders
        .filter(o => new Date(o.created_at).toDateString() === d.toDateString())
        .reduce((s, o) => s + Number(o.total), 0)
    })

    const revenueChart = new Chart(document.getElementById('revenueChart'), {
      type: 'line',
      data: {
        labels: days,
        datasets: [{
          data: revenue,
          borderColor: t.hlText,
          backgroundColor: t.isDark ? 'rgba(232,213,163,0.05)' : 'rgba(146,96,10,0.05)',
          borderWidth: 2,
          pointBackgroundColor: t.hlText,
          pointRadius: 4,
          tension: 0.4,
          fill: true,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: tickColor } },
          y: { grid: { color: gridColor }, ticks: { color: tickColor, callback: v => '$' + v } },
        }
      }
    })

    const hours = [...Array(24)].map((_, i) => i)
    const hourCounts = hours.map(h =>
      orders.filter(o => new Date(o.created_at).getHours() === h).length
    )

    const hourChart = new Chart(document.getElementById('hourChart'), {
      type: 'bar',
      data: {
        labels: hours.map(h => h + ':00'),
        datasets: [{
          data: hourCounts,
          backgroundColor: t.isDark ? '#1a2a1a' : '#f0fdf4',
          borderColor: '#4ade80',
          borderWidth: 1,
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: tickColor, maxRotation: 45 } },
          y: { grid: { color: gridColor }, ticks: { color: tickColor } },
        }
      }
    })

    return () => { revenueChart.destroy(); hourChart.destroy() }
  }, [orders, t])

  const itemCounts = orders.reduce((acc, o) => {
    const text = o.order_text.toLowerCase()
    if (text.includes('burger'))  acc['Burger Combo']    = (acc['Burger Combo']    || 0) + 1
    if (text.includes('chicken')) acc['Chicken & Chips'] = (acc['Chicken & Chips'] || 0) + 1
    if (text.includes('mazoe'))   acc['Mazoe']           = (acc['Mazoe']           || 0) + 1
    if (text.includes('water'))   acc['Water']           = (acc['Water']           || 0) + 1
    return acc
  }, {})

  const topItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])
  const maxCount = topItems[0]?.[1] || 1

  return (
    <div className="flex min-h-screen" style={{background: t.bg, color: t.text, fontFamily:"'DM Sans',sans-serif", transition:'all .2s'}}>
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">

        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-xl font-medium tracking-tight">Analytics</h1>
          <p className="text-sm mt-1" style={{color: t.muted}}>Performance overview and insights</p>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Orders',  value: stats.total_orders ?? 0 },
            { label: 'Total Revenue', value: `$${Number(stats.total_revenue ?? 0).toFixed(2)}`, highlight: true },
            { label: 'Completed',     value: stats.completed ?? 0 },
            { label: 'Delivery Rate', value: `${stats.total_orders ? Math.round((stats.delivery / stats.total_orders) * 100) : 0}%` },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-5" style={{
              background: s.highlight ? t.highlight : t.cardBg,
              border: `1px solid ${s.highlight ? t.hlBorder : t.cardBorder}`
            }}>
              <div className="text-[10px] tracking-widest uppercase" style={{color: t.muted, fontFamily:'DM Mono,monospace'}}>{s.label}</div>
              <div className="text-3xl font-medium tracking-tight my-2" style={{color: s.highlight ? t.hlText : t.text}}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* CHARTS ROW */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="rounded-xl p-5" style={{background: t.cardBg, border:`1px solid ${t.cardBorder}`}}>
            <div className="text-[10px] tracking-widest uppercase mb-4" style={{color: t.muted, fontFamily:'DM Mono,monospace'}}>Revenue — last 7 days</div>
            <div className="relative h-48"><canvas id="revenueChart"></canvas></div>
          </div>
          <div className="rounded-xl p-5" style={{background: t.cardBg, border:`1px solid ${t.cardBorder}`}}>
            <div className="text-[10px] tracking-widest uppercase mb-4" style={{color: t.muted, fontFamily:'DM Mono,monospace'}}>Orders by hour</div>
            <div className="relative h-48"><canvas id="hourChart"></canvas></div>
          </div>
        </div>

        {/* TOP ITEMS */}
        <div className="rounded-xl p-5" style={{background: t.cardBg, border:`1px solid ${t.cardBorder}`}}>
          <div className="text-[10px] tracking-widest uppercase mb-5" style={{color: t.muted, fontFamily:'DM Mono,monospace'}}>Top selling items</div>
          <div className="space-y-4">
            {topItems.map(([name, count]) => (
              <div key={name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm" style={{color: t.text}}>{name}</span>
                  <span className="text-xs" style={{color: t.muted, fontFamily:'DM Mono,monospace'}}>{count} orders</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{background: t.subBg}}>
                  <div className="h-full rounded-full transition-all" style={{width:`${(count/maxCount)*100}%`, background: t.hlText}}></div>
                </div>
              </div>
            ))}
            {topItems.length === 0 && (
              <div className="text-center text-sm py-4" style={{color: t.muted}}>No data yet</div>
            )}
          </div>
        </div>

      </main>
    </div>
  )
}