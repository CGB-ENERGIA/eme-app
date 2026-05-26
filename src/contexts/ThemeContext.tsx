import { createContext, useContext, useEffect, useState } from 'react'
import { applyTheme, getStoredTheme, type Theme } from '../utils/theme'

interface ThemeContextValue {
  theme: Theme
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'light', toggle: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = getStoredTheme()
    applyTheme(stored)
    return stored
  })

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Sincroniza se o tema mudar em outra aba
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'eme-theme' && e.key !== 'theme') return
      const next = getStoredTheme()
      setTheme(next)
      applyTheme(next)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const toggle = () => setTheme(t => (t === 'light' ? 'dark' : 'light'))

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
