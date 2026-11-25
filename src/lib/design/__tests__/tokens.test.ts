import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { cssColor, THEMES, TOKEN_NAMES } from '@/lib/design/tokens'

const CSS = readFileSync(fileURLToPath(new URL('../../../app/globals.css', import.meta.url)), 'utf8')

/** Body of the first `{ … }` block that follows `marker` (no nested braces inside). */
function block(marker: string): string {
  const start = CSS.indexOf(marker)
  if (start === -1) throw new Error(`No se encuentra ${marker} en globals.css`)
  const body = CSS.slice(start).match(/\{([^{}]*)\}/)
  if (!body) throw new Error(`Bloque vacío tras ${marker}`)
  return body[1]
}

/** `--name: value;` declarations of a CSS block. */
function declarations(body: string): Map<string, string> {
  const result = new Map<string, string>()
  for (const match of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) result.set(match[1], match[2].trim())
  return result
}

const DARK = declarations(block('/* Colour tokens: dark theme'))
const LIGHT = declarations(block('@media (prefers-color-scheme: light)'))
const DATA_LIGHT = declarations(block(':root[data-theme="light"]'))
const DATA_DARK = declarations(block(':root[data-theme="dark"]'))

describe('tokens.ts y globals.css', () => {
  it.each(TOKEN_NAMES)('--color-%s tiene el mismo valor en el tema oscuro', (name) => {
    expect(DARK.get(`--color-${name}`)).toBe(cssColor(THEMES.dark[name]))
    expect(DATA_DARK.get(`--color-${name}`)).toBe(cssColor(THEMES.dark[name]))
  })

  it.each(TOKEN_NAMES)('--color-%s tiene el mismo valor en el tema claro', (name) => {
    expect(LIGHT.get(`--color-${name}`)).toBe(cssColor(THEMES.light[name]))
    expect(DATA_LIGHT.get(`--color-${name}`)).toBe(cssColor(THEMES.light[name]))
  })

  it('el tema claro se aplica con prefers-color-scheme y declara color-scheme', () => {
    expect(LIGHT.size).toBeGreaterThanOrEqual(TOKEN_NAMES.length)
    expect(CSS).toMatch(/@media \(prefers-color-scheme: light\)\s*\{\s*:root\s*\{\s*color-scheme: light;/)
  })

  it('no quedan las variables ni las fuentes de la plantilla anterior', () => {
    expect(CSS).not.toMatch(/--background|--foreground|geist/i)
  })

  it('usa la paleta azul turquesa como color de acento en oscuro y claro (CA12)', () => {
    expect(THEMES.dark.accent.hex).toBe('#14B8C4')
    expect(THEMES.dark['accent-hover'].hex).toBe('#38D0DC')
    expect(THEMES.dark['accent-text'].hex).toBe('#14B8C4')
    expect(THEMES.light.accent.hex).toBe('#14B8C4')
    expect(THEMES.light['accent-text'].hex).toBe('#0A6670')
    expect(CSS).not.toMatch(/#EE671B|#F2884A|#A93F08/i)
  })
})

describe('cssColor', () => {
  it('devuelve el hex si es opaco y rgb con porcentaje si es translúcido', () => {
    expect(cssColor({ hex: '#151519' })).toBe('#151519')
    expect(cssColor({ hex: '#151519', alpha: 1 })).toBe('#151519')
    expect(cssColor({ hex: '#F5F2EB', alpha: 0.18 })).toBe('rgb(245 242 235 / 18%)')
  })
})
