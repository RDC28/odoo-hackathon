import { useEffect, useState } from 'react'

const STORAGE_KEY = 'carpool_theme'

function getInitialTheme() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  return (
    <button className="theme-toggle" onClick={toggle} aria-label="Toggle theme">
      <span className="material-symbols-rounded">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
      <span className="theme-toggle-label">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
    </button>
  )
}
