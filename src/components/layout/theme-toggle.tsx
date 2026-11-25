'use client'

import { useEffect, useState } from 'react'
import { buttonClass } from '@/components/ui/button-styles'
import {
  nextTheme,
  resolveInitialTheme,
  THEME_STORAGE_KEY,
  themeToggleAriaLabel,
  themeToggleText,
} from '@/lib/design/theme'
import type { ThemeName } from '@/lib/design/tokens'

function ThemeIcon({ theme }: { theme: ThemeName }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5 shrink-0"
    >
      {theme === 'dark' ? (
        <>
          <circle cx="8" cy="8" r="3" />
          <path d="M8 1.75v1.5M8 12.75v1.5M1.75 8h1.5M12.75 8h1.5M3.58 3.58l1.06 1.06M11.36 11.36l1.06 1.06M12.42 3.58l-1.06 1.06M4.64 11.36l-1.06 1.06" />
        </>
      ) : (
        <path d="M13.5 9.8A5.5 5.5 0 0 1 6.2 2.5a5.5 5.5 0 1 0 7.3 7.3Z" />
      )}
    </svg>
  )
}

/** Accessible button to toggle between light and dark themes (`data-theme` on `<html>`). */
export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeName>('dark')

  useEffect(() => {
    let stored: string | null = null
    try {
      stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    } catch {
      /* ignore storage errors */
    }
    const prefersLight =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: light)').matches
    const initial = resolveInitialTheme(stored, prefersLight)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(initial)
    if (stored === 'light' || stored === 'dark') {
      document.documentElement.dataset.theme = stored
    }
  }, [])

  function handleToggle() {
    const next = nextTheme(theme)
    setTheme(next)
    document.documentElement.dataset.theme = next
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      /* ignore storage errors */
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={themeToggleAriaLabel(theme)}
      className={buttonClass('secondary', 'min-h-8 gap-1.5 px-2.5 py-1 text-xs')}
    >
      <ThemeIcon theme={theme} />
      <span>{themeToggleText(theme)}</span>
    </button>
  )
}
