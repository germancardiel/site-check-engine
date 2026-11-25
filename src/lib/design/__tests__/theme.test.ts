import { describe, expect, it } from 'vitest'
import {
  nextTheme,
  parseStoredTheme,
  resolveInitialTheme,
  THEME_STORAGE_KEY,
  themeToggleAriaLabel,
  themeToggleText,
} from '../theme'

describe('theme utilities (CA10)', () => {
  it('THEME_STORAGE_KEY es sce-theme', () => {
    expect(THEME_STORAGE_KEY).toBe('sce-theme')
  })

  it('parseStoredTheme acepta solo dark o light y devuelve null para otros valores', () => {
    expect(parseStoredTheme('dark')).toBe('dark')
    expect(parseStoredTheme('light')).toBe('light')
    expect(parseStoredTheme('system')).toBeNull()
    expect(parseStoredTheme('')).toBeNull()
    expect(parseStoredTheme(null)).toBeNull()
    expect(parseStoredTheme(undefined)).toBeNull()
  })

  it('resolveInitialTheme prioriza el valor guardado y si no usa prefers-color-scheme', () => {
    expect(resolveInitialTheme('light', false)).toBe('light')
    expect(resolveInitialTheme('dark', true)).toBe('dark')
    expect(resolveInitialTheme(null, true)).toBe('light')
    expect(resolveInitialTheme(null, false)).toBe('dark')
  })

  it('nextTheme alterna entre dark y light, y las etiquetas accesibles corresponden al cambio', () => {
    expect(nextTheme('dark')).toBe('light')
    expect(nextTheme('light')).toBe('dark')
    expect(themeToggleAriaLabel('dark')).toBe('Cambiar a tema claro')
    expect(themeToggleAriaLabel('light')).toBe('Cambiar a tema oscuro')
    expect(themeToggleText('dark')).toBe('Claro')
    expect(themeToggleText('light')).toBe('Oscuro')
  })
})
