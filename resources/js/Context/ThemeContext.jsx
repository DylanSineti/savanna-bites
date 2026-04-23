import { createContext, useContext, useState } from 'react'

const ThemeContext = createContext()

export const themes = {
  dark: {
    bg:         '#0a0a0a',
    sidebar:    '#111',
    border:     '#1e1e1e',
    text:       '#f0ede6',
    muted:      '#555',
    cardBg:     '#111',
    cardBorder: '#1e1e1e',
    highlight:  '#1a1505',
    hlBorder:   '#2d2510',
    hlText:     '#e8d5a3',
    rowHover:   '#141414',
    inputBg:    '#1a1a1a',
    selectBg:   '#1a1a1a',
    navActive:  '#1a1a1a',
    dot:        '#e8d5a3',
    dotMuted:   '#2a2a2a',
    subBg:      '#161616',
    isDark:     true,
  },
  light: {
    bg:         '#f5f5f0',
    sidebar:    '#ffffff',
    border:     '#e5e5e0',
    text:       '#1a1a1a',
    muted:      '#888',
    cardBg:     '#ffffff',
    cardBorder: '#e5e5e0',
    highlight:  '#fef9ec',
    hlBorder:   '#f0d980',
    hlText:     '#92600a',
    rowHover:   '#fafaf8',
    inputBg:    '#f5f5f0',
    selectBg:   '#f0f0ec',
    navActive:  '#f0f0ec',
    dot:        '#92600a',
    dotMuted:   '#d5d5ce',
    subBg:      '#f0f0ec',
    isDark:     false,
  }
}

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(true)
  const theme = dark ? themes.dark : themes.light
  const toggle = () => setDark(d => !d)
  return (
    <ThemeContext.Provider value={{ theme, dark, toggle }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        opacity: dark ? 0.018 : 0.012,
      }} />
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
