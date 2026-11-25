import type { ThemeName } from './tokens'

export const THEME_STORAGE_KEY = 'sce-theme'

/** Parses a stored theme preference; returns `null` for unknown or missing values. */
export function parseStoredTheme(value: string | null | undefined): ThemeName | null {
  if (value === 'dark' || value === 'light') return value
  return null
}

/** Resolves the effective theme from stored preference or system `prefers-color-scheme: light`. */
export function resolveInitialTheme(stored: string | null | undefined, prefersLight: boolean): ThemeName {
  return parseStoredTheme(stored) ?? (prefersLight ? 'light' : 'dark')
}

/** Returns the opposite theme when the user clicks the toggle button. */
export function nextTheme(current: ThemeName): ThemeName {
  return current === 'dark' ? 'light' : 'dark'
}

/** Accessible `aria-label` describing what clicking the button will do. */
export function themeToggleAriaLabel(current: ThemeName): string {
  return current === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'
}

/** Short visible text on the toggle button showing the target or active mode. */
export function themeToggleText(current: ThemeName): string {
  return current === 'dark' ? 'Claro' : 'Oscuro'
}
