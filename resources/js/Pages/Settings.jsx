import { useState, useEffect } from 'react'
import Sidebar from '../Components/Sidebar'
import { useTheme } from '../Context/ThemeContext'
import { useIsMobile } from '../hooks/useIsMobile'

function injectFonts() {
  if (document.getElementById('app-fonts')) return
  const l = document.createElement('link')
  l.id = 'app-fonts'; l.rel = 'stylesheet'
  l.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;500;600&family=Manrope:wght@300;400;500;600&display=swap'
  document.head.appendChild(l)
}

export default function Settings() {
  const { theme: t } = useTheme()
  const isMobile = useIsMobile()
  const [form,    setForm]    = useState({
    restaurant_name: '', tagline: '',
    whatsapp_phone_id: '', whatsapp_token: '', admin_whatsapp: '',
    contact_phone: '', business_hours: '',
    paynow_integration_id: '', paynow_integration_key: '', paynow_auth_email: '',
  })
  const [msg,     setMsg]     = useState('')
  const [loading, setLoading] = useState(false)
  const [show,    setShow]    = useState(false)

  useEffect(() => { injectFonts() }, [])

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(setForm)
  }, [])

  const save = async () => {
    setLoading(true)
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content
      },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    setMsg(data.message || 'Saved!')
    setTimeout(() => setMsg(''), 3000)
  }

  const input = (label, key, type = 'text', hint = null) => (
    <div style={{marginBottom: '16px'}}>
      <label style={{
        display: 'block', fontSize: '11px', color: t.muted,
        letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px',
      }}>
        {label}
      </label>
      <input
        type={type}
        value={form[key] || ''}
        onChange={e => setForm(f => ({...f, [key]: e.target.value}))}
        style={{
          width: '100%', padding: '9px 12px', borderRadius: '8px',
          background: t.inputBg, border: `1px solid ${t.border}`,
          color: t.text, fontSize: '13px', outline: 'none',
        }}/>
      {hint && <p style={{fontSize: '11px', color: t.muted, marginTop: '4px'}}>{hint}</p>}
    </div>
  )

  const card = (title, subtitle, children) => (
    <div style={{
      background: t.cardBg, border: `1px solid ${t.cardBorder}`,
      borderRadius: '12px', padding: '24px', marginBottom: '20px',
    }}>
      <div style={{marginBottom: '20px'}}>
        <div style={{fontSize: '14px', fontWeight: 600, color: t.text}}>{title}</div>
        {subtitle && <div style={{fontSize: '12px', color: t.muted, marginTop: '3px'}}>{subtitle}</div>}
      </div>
      {children}
    </div>
  )

  return (
    <div style={{display:'flex', height:'100vh', overflow:'hidden', background: t.bg, color: t.text, fontFamily:'Manrope,sans-serif', transition:'background .2s'}}>
      <Sidebar />
      <main style={{flex: 1, padding: isMobile ? '20px 16px 84px' : '28px 36px 56px', overflowY: 'auto'}}>

        {/* HEADER */}
        <div style={{marginBottom: '32px'}}>
          <div style={{fontFamily:'JetBrains Mono,monospace', fontSize:10, letterSpacing:'0.2em', textTransform:'uppercase', color:t.muted, marginBottom:8}}>Configuration</div>
          <h1 style={{fontFamily:'Syne,sans-serif', fontSize:36, fontWeight:800, letterSpacing:'-0.03em', lineHeight:1, color:t.text, margin:0}}>Settings</h1>
          <p style={{fontFamily:'Manrope,sans-serif', fontSize:13, fontWeight:300, color:t.muted, marginTop:5}}>Configure your restaurant and WhatsApp bot</p>
        </div>

        {/* RESTAURANT */}
        {card('Restaurant', 'Your restaurant details shown to customers', (
          <>
            {input('Restaurant Name', 'restaurant_name', 'text', 'This appears in WhatsApp welcome messages')}
            {input('Tagline', 'tagline', 'text', 'Short description shown to customers')}
            {input('Contact Phone', 'contact_phone', 'text', 'Customer-facing phone number e.g. 263771234567')}
            {input('Business Hours', 'business_hours', 'text', 'e.g. Mon–Sun 9am–9pm')}
          </>
        ))}

        {/* WHATSAPP */}
        {card('WhatsApp Credentials', 'Your Meta WhatsApp API credentials', (
          <>
            {input('Phone Number ID', 'whatsapp_phone_id', 'text', 'Found in Meta Developer → WhatsApp → API Setup')}
            <div style={{marginBottom: '16px'}}>
              <label style={{
                display: 'block', fontSize: '11px', color: t.muted,
                letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px',
              }}>
                Access Token
              </label>
              <div style={{position: 'relative'}}>
                <input
                  type={show ? 'text' : 'password'}
                  value={form.whatsapp_token || ''}
                  onChange={e => setForm(f => ({...f, whatsapp_token: e.target.value}))}
                  style={{
                    width: '100%', padding: '9px 40px 9px 12px', borderRadius: '8px',
                    background: t.inputBg, border: `1px solid ${t.border}`,
                    color: t.text, fontSize: '13px', outline: 'none',
                  }}/>
                <button onClick={() => setShow(!show)} style={{
                  position: 'absolute', right: '10px', top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  cursor: 'pointer', color: t.muted, padding: 0,
                }}>
                  {show
                    ? <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.5"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/></svg>
                    : <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M6.5 6.5A2 2 0 0010 10M4 4.5C2.5 5.8 1 8 1 8s3 5 7 5c1.5 0 2.9-.5 4-1.3M7 3.1C7.3 3 7.7 3 8 3c4 0 7 5 7 5s-.8 1.4-2 2.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  }
                </button>
              </div>
              <p style={{fontSize: '11px', color: t.muted, marginTop: '4px'}}>Leave blank to keep existing token</p>
            </div>
            {input('Admin WhatsApp Number', 'admin_whatsapp', 'text', 'Receives order notifications e.g. 263771234567')}
          </>
        ))}

        {/* PAYNOW */}
        {card('Paynow Payments', 'Your Paynow integration credentials for online payments', (
          <>
            {input('Integration ID', 'paynow_integration_id', 'text', 'From your Paynow merchant dashboard')}
            {input('Integration Key', 'paynow_integration_key', 'password', 'Leave blank to keep existing key')}
            {input('Auth Email', 'paynow_auth_email', 'email', 'Email registered with Paynow')}
          </>
        ))}

        {/* WEBHOOK SETUP */}
        {card('Webhook Setup', 'Use these in your Meta Developer dashboard under WhatsApp → Configuration', (
          <>
            <div style={{marginBottom: '16px'}}>
              <label style={{display:'block',fontSize:'11px',color:t.muted,letterSpacing:'1px',textTransform:'uppercase',marginBottom:'6px'}}>Webhook URL</label>
              <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',borderRadius:'8px',background:t.subBg,border:`1px solid ${t.border}`}}>
                <code style={{fontSize:'12px',color:t.hlText,flex:1,wordBreak:'break-all'}}>{window.location.origin}/api/webhook</code>
                <button onClick={()=>navigator.clipboard.writeText(`${window.location.origin}/api/webhook`)} style={{padding:'5px 10px',borderRadius:'6px',fontSize:'11px',background:t.navActive,border:`1px solid ${t.border}`,color:t.muted,cursor:'pointer',flexShrink:0}}>Copy</button>
              </div>
            </div>
            <div>
              <label style={{display:'block',fontSize:'11px',color:t.muted,letterSpacing:'1px',textTransform:'uppercase',marginBottom:'6px'}}>Verify Token</label>
              <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',borderRadius:'8px',background:t.subBg,border:`1px solid ${t.border}`}}>
                <code style={{fontSize:'12px',color:t.hlText,flex:1,wordBreak:'break-all'}}>{form.verify_token}</code>
                <button onClick={()=>navigator.clipboard.writeText(form.verify_token||'')} style={{padding:'5px 10px',borderRadius:'6px',fontSize:'11px',background:t.navActive,border:`1px solid ${t.border}`,color:t.muted,cursor:'pointer',flexShrink:0}}>Copy</button>
              </div>
              <p style={{fontSize:'11px',color:t.muted,marginTop:'4px'}}>Paste this as the Verify Token when subscribing in Meta Developer</p>
            </div>
          </>
        ))}

        {/* SAVE BUTTON */}
        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
          <button onClick={save} disabled={loading} style={{
            padding: '10px 24px', borderRadius: '8px',
            background: t.hlText, color: '#0a0a0a',
            border: 'none', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer', opacity: loading ? 0.6 : 1,
          }}>
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
          {msg && (
            <span style={{fontSize: '12px', color: '#4ade80'}}>✅ {msg}</span>
          )}
        </div>

      </main>
    </div>
  )
}