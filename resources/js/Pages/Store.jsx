import { useState, useEffect, useRef } from 'react'

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER ?? '263719144087'

function injectFonts() {
  if (document.getElementById('app-fonts')) return
  const l = document.createElement('link')
  l.id = 'app-fonts'; l.rel = 'stylesheet'
  l.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;500;600&family=Manrope:wght@300;400;500;600&display=swap'
  document.head.appendChild(l)
}

const CATEGORY_EMOJI = {
  Mains: '🍽️', Drinks: '🥤', Sides: '🍟', Desserts: '🍰', All: '🛍️',
}

export default function Store() {
  const [items, setItems]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('All')
  const [cart, setCart]           = useState({})   // { id: qty }
  const [deliveryType, setDelivery] = useState('pickup')
  const [showCart, setShowCart]   = useState(false)

  useEffect(() => { injectFonts() }, [])
  const cartRef = useRef(null)

  useEffect(() => {
    fetch('/api/store/menu')
      .then(r => r.json())
      .then(data => { setItems(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (cartRef.current && !cartRef.current.contains(e.target)) setShowCart(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const categories = ['All', ...new Set(items.map(i => i.category))]
  const filtered   = filter === 'All' ? items.filter(i => i.available) : items.filter(i => i.available && i.category === filter)

  const addToCart  = (id) => setCart(c => ({ ...c, [id]: (c[id] ?? 0) + 1 }))
  const removeOne  = (id) => setCart(c => { const n = { ...c }; if (n[id] > 1) n[id]--; else delete n[id]; return n })
  const clearCart  = ()   => setCart({})

  const cartItems  = items.filter(i => cart[i.id] > 0)
  const cartCount  = Object.values(cart).reduce((s, v) => s + v, 0)
  const cartTotal  = cartItems.reduce((s, i) => s + i.price * cart[i.id], 0)

  const buildWhatsAppMessage = () => {
    const lines = cartItems.map(i => `• ${cart[i.id]}x ${i.name} — $${(i.price * cart[i.id]).toFixed(2)}`)
    const typeLabel = deliveryType === 'delivery' ? '🚗 Delivery' : '🏃 Pickup'
    const msg = [
      'Hi! I\'d like to place an order from Savanna Bites 🍽️',
      '',
      '*My Order:*',
      ...lines,
      '',
      `*Total: $${cartTotal.toFixed(2)}*`,
      `*Type: ${typeLabel}*`,
    ].join('\n')
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', color: '#f0ede6', fontFamily: 'Manrope,sans-serif' }}>

      {/* NAV */}
      <nav style={{ background: '#111', borderBottom: '1px solid #1a1a1a', position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontWeight: 600, letterSpacing: '-0.02em', fontSize: 17 }}>🌿 Savanna Bites</span>
          </div>
          <button onClick={() => setShowCart(v => !v)} style={{
            position: 'relative', background: cartCount > 0 ? '#e8d5a3' : '#1a1a1a',
            border: '1px solid ' + (cartCount > 0 ? '#c9a227' : '#2a2a2a'),
            color: cartCount > 0 ? '#0a0a0a' : '#888',
            borderRadius: 10, padding: '7px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, transition: 'all .2s',
          }}>
            🛒
            {cartCount > 0 && <span style={{ fontWeight: 600 }}>{cartCount} item{cartCount !== 1 ? 's' : ''} — ${cartTotal.toFixed(2)}</span>}
            {cartCount === 0 && <span>Cart</span>}
          </button>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ background: 'linear-gradient(135deg,#161208 0%,#0d0d0d 100%)', padding: '48px 20px 36px', textAlign: 'center', borderBottom: '1px solid #1a1a1a' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, fontFamily: 'Syne,sans-serif', letterSpacing: '-0.03em', margin: '0 0 10px', lineHeight: 1.1 }}>
            Fresh food, fast delivery 🌿
          </h1>
          <p style={{ color: '#888', fontSize: 15, margin: '0 0 24px' }}>
            Browse our menu, add to cart, and order via WhatsApp in seconds.
          </p>
          {/* Delivery toggle */}
          <div style={{ display: 'inline-flex', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 4, gap: 4 }}>
            {['pickup', 'delivery'].map(type => (
              <button key={type} onClick={() => setDelivery(type)} style={{
                padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                background: deliveryType === type ? '#e8d5a3' : 'transparent',
                color: deliveryType === type ? '#0a0a0a' : '#666',
                transition: 'all .2s',
              }}>
                {type === 'pickup' ? '🏃 Pickup' : '🚗 Delivery'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 20px' }}>

        {/* CATEGORY TABS */}
        <div style={{ display: 'flex', gap: 8, padding: '20px 0', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)} style={{
              flexShrink: 0, padding: '6px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
              border: `1px solid ${filter === cat ? '#e8d5a3' : '#2a2a2a'}`,
              background: filter === cat ? '#e8d5a3' : '#1a1a1a',
              color: filter === cat ? '#0a0a0a' : '#888',
              fontWeight: filter === cat ? 600 : 400,
              transition: 'all .15s',
            }}>
              {CATEGORY_EMOJI[cat] ?? '🍴'} {cat}
            </button>
          ))}
        </div>

        {/* MENU GRID */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#444' }}>Loading menu…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#444' }}>No items available</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, paddingBottom: 120 }}>
            {filtered.map(item => {
              const qty = cart[item.id] ?? 0
              return (
                <div key={item.id} style={{
                  background: '#111', border: `1px solid ${qty > 0 ? '#c9a227' : '#1e1e1e'}`,
                  borderRadius: 16, overflow: 'hidden', transition: 'border-color .2s',
                }}>
                  {/* Image / emoji */}
                  <div style={{ height: 160, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 56 }}>{item.emoji}</span>
                    )}
                    {qty > 0 && (
                      <div style={{ position: 'absolute', top: 10, right: 10, background: '#e8d5a3', color: '#0a0a0a', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                        {qty}
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '14px 16px 16px' }}>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{item.name}</div>
                    {item.description && (
                      <div style={{ fontSize: 12, color: '#666', marginBottom: 10, lineHeight: 1.5 }}>{item.description}</div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 16, color: '#e8d5a3', fontFamily: 'DM Mono,monospace' }}>
                        ${Number(item.price).toFixed(2)}
                      </span>
                      {qty === 0 ? (
                        <button onClick={() => addToCart(item.id)} style={{
                          background: '#e8d5a3', color: '#0a0a0a', border: 'none',
                          borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600,
                          cursor: 'pointer', transition: 'opacity .15s',
                        }}>
                          Add
                        </button>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button onClick={() => removeOne(item.id)} style={{
                            width: 30, height: 30, borderRadius: 8, background: '#1a1a1a', border: '1px solid #2a2a2a',
                            color: '#aaa', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>−</button>
                          <span style={{ fontSize: 14, fontWeight: 600, minWidth: 16, textAlign: 'center' }}>{qty}</span>
                          <button onClick={() => addToCart(item.id)} style={{
                            width: 30, height: 30, borderRadius: 8, background: '#e8d5a3', border: 'none',
                            color: '#0a0a0a', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>+</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* FLOATING ORDER BUTTON */}
      {cartCount > 0 && (
        <div style={{ position: 'fixed', bottom: 24, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 20, padding: '0 20px' }}>
          <a href={buildWhatsAppMessage()} target="_blank" rel="noopener noreferrer" style={{
            background: '#25D366', color: '#fff', textDecoration: 'none',
            borderRadius: 50, padding: '16px 32px', fontSize: 15, fontWeight: 700,
            boxShadow: '0 8px 32px rgba(37,211,102,0.35)', display: 'flex', alignItems: 'center', gap: 10,
            transition: 'opacity .2s',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Order via WhatsApp — ${cartTotal.toFixed(2)}
          </a>
        </div>
      )}

      {/* CART DRAWER */}
      {showCart && (
        <div ref={cartRef} style={{
          position: 'fixed', top: 0, right: 0, width: 340, height: '100%', zIndex: 50,
          background: '#111', borderLeft: '1px solid #1e1e1e', display: 'flex', flexDirection: 'column',
          fontFamily: "'DM Sans',sans-serif",
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 16px', borderBottom: '1px solid #1a1a1a' }}>
            <span style={{ fontWeight: 600, fontSize: 16 }}>Your Cart</span>
            <button onClick={() => setShowCart(false)} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', color: '#888', fontSize: 14 }}>✕</button>
          </div>

          {cartCount === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: 14 }}>
              Cart is empty
            </div>
          ) : (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                {cartItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: '#666', fontFamily: 'DM Mono,monospace' }}>
                        ${item.price.toFixed(2)} × {cart[item.id]} = ${(item.price * cart[item.id]).toFixed(2)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => removeOne(item.id)} style={{ width: 26, height: 26, borderRadius: 6, background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#aaa', fontSize: 16, cursor: 'pointer' }}>−</button>
                      <span style={{ fontSize: 13, fontWeight: 600, minWidth: 14, textAlign: 'center' }}>{cart[item.id]}</span>
                      <button onClick={() => addToCart(item.id)} style={{ width: 26, height: 26, borderRadius: 6, background: '#e8d5a3', border: 'none', color: '#0a0a0a', fontSize: 16, cursor: 'pointer' }}>+</button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ padding: '16px 20px', borderTop: '1px solid #1a1a1a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#888' }}>
                  <span>Subtotal</span>
                  <span style={{ fontFamily: 'DM Mono,monospace' }}>${cartTotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 15, fontWeight: 700 }}>
                  <span>Total</span>
                  <span style={{ color: '#e8d5a3', fontFamily: 'DM Mono,monospace' }}>${cartTotal.toFixed(2)}</span>
                </div>

                {/* Delivery toggle inside cart */}
                <div style={{ display: 'flex', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, padding: 3, gap: 3, marginBottom: 14 }}>
                  {['pickup', 'delivery'].map(type => (
                    <button key={type} onClick={() => setDelivery(type)} style={{
                      flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                      background: deliveryType === type ? '#e8d5a3' : 'transparent',
                      color: deliveryType === type ? '#0a0a0a' : '#666',
                      transition: 'all .15s',
                    }}>
                      {type === 'pickup' ? '🏃 Pickup' : '🚗 Delivery'}
                    </button>
                  ))}
                </div>

                <a href={buildWhatsAppMessage()} target="_blank" rel="noopener noreferrer"
                  onClick={() => { setShowCart(false); clearCart() }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: '#25D366', color: '#fff', textDecoration: 'none',
                    borderRadius: 12, padding: '13px 0', fontSize: 14, fontWeight: 700, width: '100%',
                  }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Order via WhatsApp
                </a>
              </div>
            </>
          )}
        </div>
      )}

    </div>
  )
}
