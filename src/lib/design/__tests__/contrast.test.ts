import { describe, expect, it } from 'vitest'
import { composite, contrastRatio, parseHex, relativeLuminance } from '@/lib/design/contrast'
import { CONTRAST_PAIRS, THEMES, type ThemeName } from '@/lib/design/tokens'

describe('contrastRatio', () => {
  it('da 21:1 entre negro y blanco y 1:1 entre colores iguales', () => {
    expect(contrastRatio({ hex: '#000000' }, { hex: '#FFFFFF' })).toBeCloseTo(21, 5)
    expect(contrastRatio({ hex: '#FFFFFF' }, { hex: '#000000' })).toBeCloseTo(21, 5)
    expect(contrastRatio({ hex: '#777777' }, { hex: '#777777' })).toBe(1)
  })

  it('coincide con valores de referencia de WCAG', () => {
    // #767676 on white is the classic 4.54:1 limit grey.
    expect(contrastRatio({ hex: '#767676' }, { hex: '#FFFFFF' })).toBeCloseTo(4.54, 2)
    expect(contrastRatio({ hex: '#EE671B' }, { hex: '#F5F2EB' })).toBeCloseTo(2.85, 2)
  })

  it('mezcla la opacidad del primer plano con el fondo', () => {
    const half = contrastRatio({ hex: '#FFFFFF', alpha: 0.5 }, { hex: '#000000' })
    expect(half).toBeGreaterThan(1)
    expect(half).toBeLessThan(21)
    expect(contrastRatio({ hex: '#FFFFFF', alpha: 0 }, { hex: '#000000' })).toBe(1)
  })

  it('pinta un fondo translúcido sobre la base antes de medir', () => {
    const overBlack = contrastRatio({ hex: '#FFFFFF' }, { hex: '#FFFFFF', alpha: 0.5 }, { hex: '#000000' })
    expect(overBlack).toBeGreaterThan(1)
    expect(overBlack).toBeLessThan(21)
  })
})

describe('utilidades de color', () => {
  it('parseHex lee #RRGGBB y rechaza otros formatos', () => {
    expect(parseHex('#EE671B')).toEqual({ r: 238, g: 103, b: 27 })
    expect(() => parseHex('#FFF')).toThrow()
    expect(() => parseHex('red')).toThrow()
  })

  it('composite mezcla canal a canal y valida la opacidad', () => {
    expect(composite({ hex: '#FFFFFF', alpha: 0.5 }, { r: 0, g: 0, b: 0 })).toEqual({ r: 127.5, g: 127.5, b: 127.5 })
    expect(composite({ hex: '#102030' }, { r: 0, g: 0, b: 0 })).toEqual({ r: 16, g: 32, b: 48 })
    expect(() => composite({ hex: '#FFFFFF', alpha: 2 }, { r: 0, g: 0, b: 0 })).toThrow()
  })

  it('relativeLuminance va de 0 (negro) a 1 (blanco)', () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBe(0)
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 10)
  })
})

describe('D-UX-04: pares de tokens en uso', () => {
  const themes: ThemeName[] = ['dark', 'light']
  const cases = themes.flatMap((theme) =>
    CONTRAST_PAIRS.map((pair) => ({ theme, ...pair, label: `${theme} · ${pair.foreground} sobre ${pair.background} (${pair.use})` })),
  )

  it.each(cases)('$label cumple su mínimo', ({ theme, foreground, background, min }) => {
    const palette = THEMES[theme]
    const ratio = contrastRatio(palette[foreground], palette[background], palette.ground)
    expect(ratio, `${ratio.toFixed(2)}:1 < ${min}:1`).toBeGreaterThanOrEqual(min)
  })

  it('cubre texto, texto secundario, acento, estados, botón primario, inputs y foco', () => {
    const covered = new Set(CONTRAST_PAIRS.map((pair) => pair.foreground))
    for (const token of ['ink', 'ink-muted', 'accent-text', 'pass', 'warn', 'fail', 'on-accent', 'line-strong', 'focus']) {
      expect(covered.has(token as never), token).toBe(true)
    }
  })
})
