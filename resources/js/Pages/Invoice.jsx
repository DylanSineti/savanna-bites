import { useEffect, useState } from 'react'
import { usePage } from '@inertiajs/react'

export default function Invoice() {
  const { id } = usePage().props
  const [order, setOrder]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    fetch(`/api/invoice/${id}`)
      .then(r => { if (!r.ok) throw new Error('Not found'); return r.json() })
      .then(data => { setOrder(data); setLoading(false) })
      .catch(() => { setError('Order not found.'); setLoading(false) })
  }, [id])

  const STATUS_COLOR = {
    completed: '#4ade80', preparing: '#fb923c', ready: '#34d399',
    out_for_delivery: '#a78bfa', pending: '#fbbf24', pickup: '#60a5fa', delivery: '#60a5fa',
  }
  const PAYMENT_COLOR = { paid: '#4ade80', failed: '#f87171', manual: '#fbbf24', pending: '#888' }
  const PAYMENT_LABEL = { paid: 'Paid ✓', failed: 'Not Verified', manual: 'Awaiting Verification', pending: 'Pending' }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontFamily: "'DM Sans',sans-serif" }}>
      Loading…
    </div>
  )

  if (error || !order) return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ fontSize: 40 }}>404</div>
      <div style={{ color: '#555' }}>{error ?? 'Order not found.'}</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', fontFamily: "'DM Sans',sans-serif", padding: '40px 20px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🌿</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f0ede6', margin: 0 }}>Savanna Bites</h1>
          <p style={{ color: '#555', fontSize: 13, margin: '6px 0 0' }}>Order Invoice</p>
        </div>

        {/* Card */}
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 20, overflow: 'hidden' }}>

          {/* Order ID + status */}
          <div style={{ background: '#161616', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e1e1e' }}>
            <div>
              <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'DM Mono,monospace' }}>Order</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#f0ede6', marginTop: 2 }}>#{order.id}</div>
            </div>
            <span style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              background: (STATUS_COLOR[order.status] ?? '#888') + '22',
              color: STATUS_COLOR[order.status] ?? '#888',
              border: `1px solid ${(STATUS_COLOR[order.status] ?? '#888')}44`,
              textTransform: 'capitalize',
            }}>
              {order.status?.replace('_', ' ') ?? 'Pending'}
            </span>
          </div>

          <div style={{ padding: '20px 24px' }}>

            {/* Items */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'DM Mono,monospace', marginBottom: 12 }}>Items</div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, color: '#a0a0a0', lineHeight: 1.7, background: '#1a1a1a', borderRadius: 10, padding: '12px 14px', fontFamily: 'DM Mono,monospace', fontSize: 13 }}>
                {order.order_text}
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px solid #1e1e1e', margin: '16px 0' }} />

            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 14, color: '#888' }}>Total</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#e8d5a3', fontFamily: 'DM Mono,monospace' }}>${Number(order.total).toFixed(2)}</span>
            </div>

            {/* Payment */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 14, color: '#888' }}>Payment</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: PAYMENT_COLOR[order.payment_status] ?? '#888' }}>
                {PAYMENT_LABEL[order.payment_status] ?? 'Pending'}
              </span>
            </div>

            {/* Type */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 14, color: '#888' }}>Type</span>
              <span style={{ fontSize: 13, color: '#f0ede6' }}>
                {order.status === 'delivery' ? '🚗 Delivery' : '🏃 Pickup'}
              </span>
            </div>

            {/* Date */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: '#888' }}>Date</span>
              <span style={{ fontSize: 13, color: '#666', fontFamily: 'DM Mono,monospace' }}>
                {new Date(order.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 28, color: '#444', fontSize: 12 }}>
          Thank you for ordering from Savanna Bites 🙏
        </div>

      </div>
    </div>
  )
}
