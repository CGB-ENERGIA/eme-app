export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'eme-theme'

export function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') return stored
    // migra chave antiga
    const legacy = localStorage.getItem('theme')
    if (legacy === 'dark' || legacy === 'light') return legacy
  } catch {
    /* private mode / storage indisponível */
  }
  return 'light'
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try {
    localStorage.setItem(STORAGE_KEY, theme)
    localStorage.removeItem('theme')
  } catch {
    /* ignore */
  }
}
