import { useState, useEffect } from 'react'
import Sidebar from '../Components/Sidebar'
import { useTheme } from '../Context/ThemeContext'

export default function Profile() {
  const { theme: t } = useTheme()
  const [user,    setUser]    = useState({ name: '', email: '' })
  const [pass,    setPass]    = useState({ current_password: '', password: '', password_confirmation: '' })
  const [msg,     setMsg]     = useState({ profile: '', password: '' })
  const [loading, setLoading] = useState({ profile: false, password: false })

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
    <div className="flex min-h-screen" style={{background: t.bg, color: t.text, fontFamily:"'DM Sans',sans-serif", transition:'all .2s'}}>
      <Sidebar />
      <main style={{flex: 1, padding: '32px', overflowY: 'auto', maxWidth: '640px'}}>

        {/* HEADER */}
        <div style={{marginBottom: '32px'}}>
          <h1 style={{fontSize: '20px', fontWeight: 500, letterSpacing: '-.4px'}}>Profile</h1>
          <p style={{fontSize: '13px', color: t.muted, marginTop: '4px'}}>Manage your personal information</p>
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