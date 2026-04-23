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

export default function Profile() {
  const { theme: t } = useTheme()
  const isMobile = useIsMobile()
  const [user,    setUser]    = useState({ name: '', email: '' })
  const [pass,    setPass]    = useState({ current_password: '', password: '', password_confirmation: '' })
  const [msg,     setMsg]     = useState({ profile: '', password: '' })
  const [loading, setLoading] = useState({ profile: false, password: false })

  useEffect(() => { injectFonts() }, [])

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(setUser)
  }, [])

  const notify = (key, text) => {
    setMsg(m => ({ ...m, [key]: text }))
    setTimeout(() => setMsg(m => ({ ...m, [key]: '' })), 3000)
  }

  const saveProfile = async () => {
    setLoading(l => ({ ...l, profile: true }))
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content },
      body: JSON.stringify(user),
    })
    const data = await res.json()
    setLoading(l => ({ ...l, profile: false }))
    notify('profile', data.message || 'Saved!')
  }

  const savePassword = async () => {
    setLoading(l => ({ ...l, password: true }))
    const res = await fetch('/api/profile/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content },
      body: JSON.stringify(pass),
    })
    const data = await res.json()
    setLoading(l => ({ ...l, password: false }))
    if (res.ok) {
      setPass({ current_password: '', password: '', password_confirmation: '' })
      notify('password', data.message || 'Password updated!')
    } else {
      notify('password', data.message || 'Error updating password')
    }
  }

  const input = (label, value, onChange, type = 'text') => (
    <div style={{marginBottom: '16px'}}>
      <label style={{display: 'block', fontSize: '11px', color: t.muted, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px'}}>
        {label}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '9px 12px', borderRadius: '8px',
          background: t.inputBg, border: `1px solid ${t.border}`,
          color: t.text, fontSize: '13px', outline: 'none',
        }}/>
    </div>
  )

  const card = (title, children, msgKey) => (
    <div style={{
      background: t.cardBg, border: `1px solid ${t.cardBorder}`,
      borderRadius: '12px', padding: '24px', marginBottom: '20px',
    }}>
      <div style={{fontSize: '14px', fontWeight: 600, color: t.text, marginBottom: '20px'}}>{title}</div>
      {children}
      {msg[msgKey] && (
        <div style={{
          marginTop: '12px', padding: '8px 12px', borderRadius: '8px',
          background: t.highlight, border: `1px solid ${t.hlBorder}`,
          color: t.hlText, fontSize: '12px',
        }}>
          ✅ {msg[msgKey]}
        </div>
      )}
    </div>
  )

  return (
    <div style={{display:'flex', height:'100vh', overflow:'hidden', background: t.bg, color: t.text, fontFamily:'Manrope,sans-serif', transition:'background .2s'}}>
      <Sidebar />
      <main style={{flex: 1, padding: isMobile ? '20px 16px 84px' : '28px 36px 56px', overflowY: 'auto'}}>

        {/* HEADER */}
        <div style={{marginBottom: '32px'}}>
          <div style={{fontFamily:'JetBrains Mono,monospace', fontSize:10, letterSpacing:'0.2em', textTransform:'uppercase', color:t.muted, marginBottom:8}}>Account</div>
          <h1 style={{fontFamily:'Syne,sans-serif', fontSize:36, fontWeight:800, letterSpacing:'-0.03em', lineHeight:1, color:t.text, margin:0}}>Profile</h1>
          <p style={{fontFamily:'Manrope,sans-serif', fontSize:13, fontWeight:300, color:t.muted, marginTop:5}}>Manage your personal information</p>
        </div>

        {/* AVATAR */}
        <div style={{
          background: t.cardBg, border: `1px solid ${t.cardBorder}`,
          borderRadius: '12px', padding: '24px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '16px',
        }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: '#1e3a1e', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '18px', fontWeight: 700,
            color: '#4ade80', border: '2px solid #2a4a2a', flexShrink: 0,
          }}>
            {user.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <div style={{fontSize: '15px', fontWeight: 600, color: t.text}}>{user.name}</div>
            <div style={{fontSize: '12px', color: t.muted, marginTop: '2px'}}>{user.email}</div>
            <div style={{
              display: 'inline-block', marginTop: '6px',
              fontSize: '10px', padding: '2px 8px', borderRadius: '20px',
              background: t.highlight, color: t.hlText,
              border: `1px solid ${t.hlBorder}`,
            }}>Administrator</div>
          </div>
        </div>

        {/* PROFILE INFO */}
        {card('Personal Information', (
          <>
            {input('Full Name',     user.name,  v => setUser(u => ({...u, name: v})))}
            {input('Email Address', user.email, v => setUser(u => ({...u, email: v})), 'email')}
            <button onClick={saveProfile} disabled={loading.profile} style={{
              padding: '9px 20px', borderRadius: '8px',
              background: t.hlText, color: '#0a0a0a',
              border: 'none', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', opacity: loading.profile ? 0.6 : 1,
            }}>
              {loading.profile ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        ), 'profile')}

        {/* CHANGE PASSWORD */}
        {card('Change Password', (
          <>
            {input('Current Password', pass.current_password, v => setPass(p => ({...p, current_password: v})), 'password')}
            {input('New Password',     pass.password,         v => setPass(p => ({...p, password: v})),         'password')}
            {input('Confirm Password', pass.password_confirmation, v => setPass(p => ({...p, password_confirmation: v})), 'password')}
            <button onClick={savePassword} disabled={loading.password} style={{
              padding: '9px 20px', borderRadius: '8px',
              background: t.hlText, color: '#0a0a0a',
              border: 'none', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', opacity: loading.password ? 0.6 : 1,
            }}>
              {loading.password ? 'Updating...' : 'Update Password'}
            </button>
          </>
        ), 'password')}

      </main>
    </div>
  )
}