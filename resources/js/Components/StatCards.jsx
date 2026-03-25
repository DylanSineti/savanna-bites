export default function StatCards({ stats }) {
  return (
    <div className="grid grid-cols-4 gap-4 mb-7">
      {[
        { label: "Today's Orders",  value: stats.today_orders ?? '—',                       note: 'orders today' },
        { label: "Today's Revenue", value: `$${Number(stats.today_revenue??0).toFixed(2)}`, note: 'live total', highlight: true },
        { label: 'Pending',         value: stats.pending ?? '—',                            note: 'awaiting action' },
        { label: 'Total Revenue',   value: `$${Number(stats.total_revenue??0).toFixed(2)}`, note: 'all time' },
      ].map(s => (
        <div key={s.label} className={`rounded-xl p-5 border ${s.highlight ? 'bg-[#1a1505] border-[#2d2510]' : 'bg-[#111] border-[#1e1e1e]'}`}>
          <div className="text-[10px] tracking-widest uppercase text-[#444]" style={{fontFamily:'DM Mono,monospace'}}>{s.label}</div>
          <div className={`text-3xl font-medium tracking-tight my-2 ${s.highlight ? 'text-[#e8d5a3]' : ''}`}>{s.value}</div>
          <div className="text-xs text-[#555]">{s.note}</div>
        </div>
      ))}
    </div>
  )
}