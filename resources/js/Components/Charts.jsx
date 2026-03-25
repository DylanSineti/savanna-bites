import { useEffect } from 'react'
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

export default function Charts({ stats }) {
  useEffect(() => {
    const t = new Chart(document.getElementById('typeChart'), {
      type: 'bar',
      data: {
        labels: ['Pickup', 'Delivery'],
        datasets: [{
          data: [stats.pickup ?? 0, stats.delivery ?? 0],
          backgroundColor: ['#14291a', '#0d1f33'],
          borderColor: ['#4ade80', '#60a5fa'],
          borderWidth: 1, borderRadius: 6,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: '#1a1a1a' }, ticks: { color: '#555' } },
          y: { grid: { color: '#1a1a1a' }, ticks: { color: '#555' } },
        }
      }
    })

    const s2 = new Chart(document.getElementById('statusChart'), {
      type: 'doughnut',
      data: {
        labels: ['Pending', 'Pickup', 'Delivery', 'Completed'],
        datasets: [{
          data: [stats.pending??0, stats.pickup??0, stats.delivery??0, stats.completed??0],
          backgroundColor: ['#2d2510','#0d1f12','#0d1420','#1a1a1a'],
          borderColor: ['#fbbf24','#4ade80','#60a5fa','#444'],
          borderWidth: 1,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        cutout: '70%',
      }
    })

    return () => { t.destroy(); s2.destroy() }
  }, [stats])

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
        <div className="text-[10px] tracking-widest uppercase text-[#444] mb-4" style={{fontFamily:'DM Mono,monospace'}}>Revenue by type</div>
        <div className="relative h-40"><canvas id="typeChart"></canvas></div>
      </div>
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
        <div className="text-[10px] tracking-widest uppercase text-[#444] mb-4" style={{fontFamily:'DM Mono,monospace'}}>Order status breakdown</div>
        <div className="relative h-40"><canvas id="statusChart"></canvas></div>
      </div>
    </div>
  )
}