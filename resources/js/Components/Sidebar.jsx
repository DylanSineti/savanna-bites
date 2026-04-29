import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, usePage, router } from '@inertiajs/react'
import { useTheme } from '../Context/ThemeContext'
import { useIsMobile } from '../hooks/useIsMobile'

const SECTIONS = [
  {
    label: 'Overview',
    items: [
      {
        label: 'Orders', href: '/dashboard',
        icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" /><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" /><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" /><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" /></svg>
      },
      {
        label: 'Menu', href: '/menu',
        icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M5 8h6M5 5h6M5 11h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
      },
      {
        label: 'Customers', href: '/customers',
        icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" /><path d="M1 13c0-2.76 2.24-5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><circle cx="12" cy="11" r="3" stroke="currentColor" strokeWidth="1.5" /></svg>
      },
      {
        label: 'Order', href: '/pos',
        icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="5" height="5" rx="1" fill="currentColor" />
          <rect x="9" y="2" width="5" height="5" rx="1" fill="currentColor" />
          <rect x="2" y="9" width="5" height="5" rx="1" fill="currentColor" />
          <rect x="9" y="9" width="5" height="5" rx="1" fill="currentColor" />
        </svg>
      },
    ]
  },
  {
    label: 'Insights',
    items: [
      {
        label: 'Analytics', href: '/analytics',
        icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 12l4-4 3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      },
      {
        label: 'Reviews', href: '/reviews',
        icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2l1.5 3 3.5.5-2.5 2.5.6 3.5L8 10l-3.1 1.5.6-3.5L3 5.5 6.5 5 8 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
      },
      {
        label: 'Team', href: '/team',
        icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="5.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M1 13c0-2.49 2.01-4.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="11.5" cy="7" r="2" stroke="currentColor" strokeWidth="1.5"/><path d="M8.5 13c0-1.66 1.34-3 3-3s3 1.34 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      },
      {
        label: 'Broadcast', href: '/broadcast',
        icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 5.5C2 4.12 3.12 3 4.5 3h7C12.88 3 14 4.12 14 5.5v4C14 10.88 12.88 12 11.5 12H9l-2.5 2v-2H4.5C3.12 12 2 10.88 2 9.5v-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M5 7h6M5 9.5h3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
      },
    ]
  },
]

const SunSVG = ({ color }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <circle cx="6" cy="6" r="2.2" fill={color} />
    <path d="M6 1v1.5M6 9.5V11M1 6h1.5M9.5 6H11M2.6 2.6l1.1 1.1M8.3 8.3l1.1 1.1M2.6 9.4l1.1-1.1M8.3 3.7l1.1-1.1"
      stroke={color} strokeWidth="1.1" strokeLinecap="round" />
  </svg>
)

const MoonSVG = ({ color }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M9.5 6.8A4 4 0 115.2 2.5a3 3 0 004.3 4.3z" fill={color} />
  </svg>
)

const Toggle = ({ dark }) => (
  <div style={{
    width: '44px', height: '24px', borderRadius: '12px',
    background: dark ? '#3f3f46' : '#e8d5a3',
    border: `1px solid ${dark ? '#52525b' : '#d4a853'}`,
    position: 'relative', flexShrink: 0,
    display: 'flex', alignItems: 'center',
    padding: '0 4px', justifyContent: 'space-between',
    transition: 'background .25s, border-color .25s',
  }}>
    <div style={{
      width: '12px', height: '12px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1, transition: 'opacity .2s',
      opacity: dark ? 0.25 : 1,
    }}>
      <SunSVG color={dark ? '#71717a' : '#92600a'} />
    </div>
    <div style={{
      width: '18px', height: '18px', borderRadius: '50%',
      background: dark ? '#a1a1aa' : '#fff',
      position: 'absolute', top: '2px',
      left: dark ? '24px' : '2px',
      transition: 'left .25s cubic-bezier(.4,0,.2,1), background .25s',
      zIndex: 2,
    }} />
    <div style={{
      width: '12px', height: '12px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1, transition: 'opacity .2s',
      opacity: dark ? 1 : 0.25,
    }}>
      <MoonSVG color={dark ? '#a1a1aa' : '#92600a'} />
    </div>
  </div>
)

export default function Sidebar() {
  const { url } = usePage()
  const { theme: t, dark, toggle } = useTheme()
  const [col, setCol] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const profileRef = useRef(null)
  const isMobile = useIsMobile()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const menuItem = (icon, label, onClick, danger = false) => (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '9px 14px', cursor: 'pointer',
      transition: 'background .15s',
      color: danger ? '#f87171' : t.text,
      fontSize: '13px',
    }}
      onMouseEnter={e => e.currentTarget.style.background = t.rowHover}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <div style={{
        width: '16px', height: '16px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, color: danger ? '#f87171' : t.muted,
      }}>
        {icon}
      </div>
      {label}
    </div>
  )

  /* ─── MOBILE BOTTOM NAV ─────────────────────────────────────── */
  if (isMobile) {
    const allItems = SECTIONS.flatMap(s => s.items)
    const primary  = allItems.slice(0, 4) // Orders, Menu, Customers, POS
    const secondary = allItems.slice(4)   // Analytics, Reviews, Team, Broadcast

    return createPortal(
      <>
        {/* Fixed bottom bar */}
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
          display: 'flex', alignItems: 'stretch',
          background: dark ? '#1a1a1a' : '#ffffff',
          borderTop: `1px solid ${dark ? '#2e2e2e' : '#e0e0da'}`,
          boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {primary.map(item => {
            const active = url === item.href
            return (
              <Link key={item.label} href={item.href}
                onClick={() => setMoreOpen(false)}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 3,
                  padding: '10px 0',
                  color: active ? (dark ? '#e8d5a3' : '#92600a') : (dark ? '#aaaaaa' : '#555555'),
                  textDecoration: 'none',
                  background: active ? (dark ? 'rgba(232,213,163,.08)' : 'rgba(146,96,10,.06)') : 'transparent',
                  transition: 'color .15s, background .15s',
                  fontSize: 10,
                  fontWeight: active ? 700 : 500,
                  fontFamily: 'Manrope,sans-serif',
                  letterSpacing: '0.03em',
                  minHeight: 56,
                }}>
                <div style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.icon}
                </div>
                {item.label}
              </Link>
            )
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(o => !o)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 3,
              padding: '10px 0', minHeight: 56,
              color: moreOpen ? (dark ? '#e8d5a3' : '#92600a') : (dark ? '#aaaaaa' : '#555555'),
              background: moreOpen ? (dark ? 'rgba(232,213,163,.08)' : 'rgba(146,96,10,.06)') : 'transparent',
              border: 'none', cursor: 'pointer', transition: 'color .15s, background .15s',
              fontSize: 10, fontWeight: moreOpen ? 700 : 500,
              fontFamily: 'Manrope,sans-serif', letterSpacing: '0.03em',
            }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="4.5" cy="9" r="1.5" fill="currentColor" />
              <circle cx="9" cy="9" r="1.5" fill="currentColor" />
              <circle cx="13.5" cy="9" r="1.5" fill="currentColor" />
            </svg>
            More
          </button>
        </nav>

        {/* More drawer (slide up) */}
        {moreOpen && (
          <div
            onClick={() => setMoreOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 199,
              background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(2px)',
            }}
          />
        )}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9998,
          background: dark ? '#1a1a1a' : '#ffffff',
          borderTop: `1px solid ${dark ? '#2e2e2e' : '#e0e0da'}`,
          borderRadius: '16px 16px 0 0',
          transform: moreOpen ? 'translateY(0)' : 'translateY(calc(100% - env(safe-area-inset-bottom, 0px)))',
          transition: 'transform .3s cubic-bezier(.4,0,.2,1)',
          padding: '16px 0 8px',
          paddingBottom: 'calc(56px + env(safe-area-inset-bottom))',
          boxShadow: '0 -8px 40px rgba(0,0,0,.35)',
        }}>
          {/* Drag handle */}
          <div style={{ width: 36, height: 4, borderRadius: 2, background: t.border, margin: '0 auto 16px' }} />

          {/* Secondary nav items */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: '0 12px 12px' }}>
            {secondary.map(item => {
              const active = url === item.href
              return (
                <Link key={item.label} href={item.href}
                  onClick={() => setMoreOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px', borderRadius: 10,
                    textDecoration: 'none',
                    background: active ? (dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.06)') : (dark ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.02)'),
                    border: `1px solid ${active ? t.hlText + '30' : t.border}`,
                    color: active ? t.hlText : t.muted,
                  }}>
                  <div style={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <span style={{ fontSize: 13, fontFamily: 'Manrope,sans-serif', fontWeight: active ? 600 : 400 }}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>

          <div style={{ height: 1, background: t.border, margin: '0 12px 12px' }} />

          {/* Theme + Settings + Profile + Logout */}
          <div style={{ padding: '0 12px' }}>
            <div onClick={toggle}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, cursor: 'pointer', marginBottom: 4 }}
              onMouseEnter={e => e.currentTarget.style.background = t.rowHover}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {dark ? <MoonSVG color={t.muted} /> : <SunSVG color={t.muted} />}
              </div>
              <span style={{ flex: 1, fontSize: 13, fontFamily: 'Manrope,sans-serif', color: t.muted }}>{dark ? 'Dark mode' : 'Light mode'}</span>
              <Toggle dark={dark} />
            </div>

            <div onClick={() => { setMoreOpen(false); router.visit('/settings') }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, cursor: 'pointer', marginBottom: 4 }}
              onMouseEnter={e => e.currentTarget.style.background = t.rowHover}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none" style={{ color: t.muted }}>
                <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" />
                <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.9 2.9l1.06 1.06M10.04 10.04l1.06 1.06M2.9 11.1l1.06-1.06M10.04 3.96l1.06-1.06" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <span style={{ fontSize: 13, fontFamily: 'Manrope,sans-serif', color: t.muted }}>Settings</span>
            </div>

            <div onClick={() => { setMoreOpen(false); router.post('/logout') }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, cursor: 'pointer', marginBottom: 4 }}
              onMouseEnter={e => e.currentTarget.style.background = t.rowHover}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none" style={{ color: '#f87171' }}>
                <path d="M5 2H3a1 1 0 00-1 1v8a1 1 0 001 1h2M9 10l4-3-4-3M13 7H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontSize: 13, fontFamily: 'Manrope,sans-serif', color: '#f87171' }}>Log out</span>
            </div>
          </div>
        </div>
      </>,
      document.body
    )
  }

  return (
    <aside style={{
      width: col ? '64px' : '260px',
      minWidth: col ? '64px' : '260px',
      background: t.sidebar,
      borderRight: `1px solid ${t.border}`,
      display: 'flex', flexDirection: 'column',
      transition: 'width .25s cubic-bezier(.4,0,.2,1), min-width .25s cubic-bezier(.4,0,.2,1)',
      overflow: 'hidden', flexShrink: 0,
      position: 'relative', zIndex: 2,
    }}>

      {/* ── TOP ── */}
      <div style={{
        height: '64px', padding: '0 14px',
        display: 'flex', alignItems: 'center', gap: '10px',
        borderBottom: `1px solid ${t.border}`, flexShrink: 0,
      }}>
        <div style={{
          width: '34px', height: '34px', borderRadius: '8px',
          background: t.hlText, color: '#0a0a0a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 700, flexShrink: 0, letterSpacing: '-.3px',
        }}>SB</div>

        {!col && (
          <div style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: t.text, letterSpacing: '-.2px' }}>
              Savanna Bites
            </div>
            <div style={{ fontSize: '10px', color: t.muted, marginTop: '1px' }}>
              Admin Panel
            </div>
          </div>
        )}

        <button onClick={() => setCol(!col)} style={{
          width: '22px', height: '22px', borderRadius: '6px',
          border: `1px solid ${t.border}`, background: 'transparent',
          color: t.muted, cursor: 'pointer', flexShrink: 0, padding: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .15s',
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d={col ? 'M4 2L8 6L4 10' : 'M8 2L4 6L8 10'}
              stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* ── NAV ── */}
      <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        {SECTIONS.map((section, si) => (
          <div key={section.label}>
            {si > 0 && (
              <div style={{
                height: '1px', background: t.border,
                margin: col ? '6px 0' : '6px 14px',
              }} />
            )}

            {!col && (
              <div style={{
                padding: '6px 14px 4px', fontSize: '10px',
                color: t.isDark ? '#333' : '#bbb',
                letterSpacing: '1.5px', textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}>
                {section.label}
              </div>
            )}

            {section.items.map(item => {
              const active = url === item.href
              return (
                <Link key={item.label} href={item.href}
                  title={col ? item.label : ''}
                  style={{
                    display: 'flex', alignItems: 'center',
                    height: '40px', padding: '0 14px', gap: '10px',
                    justifyContent: col ? 'center' : 'flex-start',
                    textDecoration: 'none',
                    background: active ? t.navActive : 'transparent',
                    transition: 'background .15s', position: 'relative',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = t.rowHover }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>

                  <div style={{
                    width: '18px', height: '18px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    color: active ? t.hlText : t.muted,
                    transition: 'color .15s',
                  }}>
                    {item.icon}
                  </div>

                  {!col && (
                    <span style={{
                      fontSize: '13px',
                      color: active ? t.text : t.muted,
                      fontWeight: active ? 500 : 400,
                      flex: 1, whiteSpace: 'nowrap',
                    }}>
                      {item.label}
                    </span>
                  )}

                  {active && !col && (
                    <div style={{
                      width: '3px', height: '20px',
                      background: t.hlText, borderRadius: '2px',
                      position: 'absolute', right: 0,
                      top: '50%', transform: 'translateY(-50%)',
                    }} />
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* ── BOTTOM ── */}
      <div style={{ borderTop: `1px solid ${t.border}`, flexShrink: 0 }}>

        {/* THEME ROW */}
        <div onClick={toggle} style={{
          height: '44px', padding: '0 14px',
          display: 'flex', alignItems: 'center', gap: '10px',
          borderBottom: `1px solid ${t.border}`,
          cursor: 'pointer', transition: 'background .15s',
          justifyContent: col ? 'center' : 'flex-start',
        }}
          onMouseEnter={e => e.currentTarget.style.background = t.rowHover}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

          {col ? (
            <Toggle dark={dark} />
          ) : (
            <>
              <div style={{
                width: '16px', height: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {dark ? <MoonSVG color={t.muted} /> : <SunSVG color={t.muted} />}
              </div>
              <span style={{ fontSize: '12px', color: t.muted, flex: 1, whiteSpace: 'nowrap' }}>
                {dark ? 'Dark mode' : 'Light mode'}
              </span>
              <Toggle dark={dark} />
            </>
          )}
        </div>

        {/* USER ROW */}
        <div ref={profileRef} style={{ position: 'relative' }}>

          {/* PROFILE DROPDOWN */}
          {showProfile && (
            <div style={{
              position: 'absolute',
              bottom: '68px',
              left: col ? '70px' : '8px',
              right: col ? 'auto' : '8px',
              width: col ? '200px' : 'auto',
              background: t.sidebar,
              border: `1px solid ${t.border}`,
              borderRadius: '10px',
              overflow: 'hidden',
              zIndex: 50,
              boxShadow: dark
                ? '0 -4px 20px rgba(0,0,0,0.4)'
                : '0 -4px 20px rgba(0,0,0,0.1)',
            }}>

              {/* PROFILE HEADER */}
              <div style={{
                padding: '14px',
                borderBottom: `1px solid ${t.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: '#1e3a1e',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 600, color: '#4ade80',
                    border: '1px solid #2a4a2a', flexShrink: 0,
                  }}>LT</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: t.text }}>Dylan Sineti</div>
                    <div style={{ fontSize: '11px', color: t.muted, marginTop: '1px' }}>
                      admin@savannabites.com
                    </div>
                  </div>
                </div>
              </div>

              {/* MENU ITEMS */}
              {menuItem(
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="5" r="3" stroke="currentColor" strokeWidth="1.3" /><path d="M1 13c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>,
                'View Profile',
                () => { setShowProfile(false); router.visit('/profile') }
              )}

              {menuItem(
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" /><path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.9 2.9l1.06 1.06M10.04 10.04l1.06 1.06M2.9 11.1l1.06-1.06M10.04 3.96l1.06-1.06" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>,
                'Settings',
                () => { setShowProfile(false); router.visit('/settings') }
              )}

              {/* DIVIDER */}
              <div style={{ height: '1px', background: t.border }} />

              {menuItem(
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M5 2H3a1 1 0 00-1 1v8a1 1 0 001 1h2M9 10l4-3-4-3M13 7H5"
                    stroke="currentColor" strokeWidth="1.3"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>,
                'Log out',
                () => {
                  setShowProfile(false)
                  router.post('/logout')
                },
                true
              )}
            </div>
          )}

          {/* USER BUTTON */}
          <div
            onClick={() => setShowProfile(!showProfile)}
            style={{
              height: '60px', padding: '0 14px',
              display: 'flex', alignItems: 'center', gap: '10px',
              justifyContent: col ? 'center' : 'flex-start',
              cursor: 'pointer', transition: 'background .15s',
              background: showProfile ? t.rowHover : 'transparent',
            }}
            onMouseEnter={e => e.currentTarget.style.background = t.rowHover}
            onMouseLeave={e => {
              if (!showProfile) e.currentTarget.style.background = 'transparent'
            }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: '#1e3a1e',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 600, color: '#4ade80',
              flexShrink: 0, border: '1px solid #2a4a2a',
            }}>Dy</div>
            {!col && (
              <>
                <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: t.text }}>Dylan</div>
                  <div style={{ fontSize: '11px', color: t.muted, marginTop: '1px' }}>
                    admin@savannabites.com
                  </div>
                </div>
                {/* CHEVRON UP/DOWN */}
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, color: t.muted, transition: 'transform .2s', transform: showProfile ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}