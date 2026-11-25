import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { parseHtml } from '@/lib/audit/parse'
import { AmbientGlow } from '../ambient-glow'

const COMPONENT_SRC = readFileSync(fileURLToPath(new URL('../ambient-glow.tsx', import.meta.url)), 'utf8')
const LAYOUT_SRC = readFileSync(fileURLToPath(new URL('../../../app/layout.tsx', import.meta.url)), 'utf8')
const CSS_SRC = readFileSync(fileURLToPath(new URL('../../../app/globals.css', import.meta.url)), 'utf8')

describe('AmbientGlow (CA11)', () => {
  it('renderiza los dos resplandores y la onda como elemento decorativo sin controles enfocables', () => {
    const html = renderToStaticMarkup(<AmbientGlow />)
    const $ = parseHtml(html)
    const root = $('.ambient-glow')

    expect(root).toHaveLength(1)
    expect(root.attr('aria-hidden')).toBe('true')
    expect(root.attr('class')).toContain('pointer-events-none')
    expect(root.find('.glow-a')).toHaveLength(1)
    expect(root.find('.glow-b')).toHaveLength(1)
    expect(root.find('.glow-wave svg[focusable="false"]')).toHaveLength(1)
    expect(root.find('.glow-wave path.wave-band')).toHaveLength(1)
    expect(root.find('.glow-wave path.wave-line')).toHaveLength(1)
    expect(root.find('a, button, input, select, textarea, [tabindex]')).toHaveLength(0)
  })

  it('es un Server Component puro y se monta en RootLayout detrás del contenido (z-10)', () => {
    expect(COMPONENT_SRC).not.toMatch(/['"]use client['"]/)
    expect(LAYOUT_SRC).toMatch(/<SkipLink \/>\s*<AmbientGlow \/>\s*<div className="relative z-10[^"]*">\{children\}<\/div>/)
  })

  it('usa variables de tema, se adapta a claro/oscuro y respeta prefers-reduced-motion en globals.css', () => {
    for (const keyframe of ['glowDriftA', 'glowDriftB', 'waveTravel', 'waveSlide']) {
      expect(CSS_SRC).toContain(`@keyframes ${keyframe}`)
    }
    expect(CSS_SRC).toMatch(/\.ambient-glow \.glow-a\s*\{[^}]*background:\s*var\(--color-accent\)/)
    expect(CSS_SRC).toMatch(/\.ambient-glow \.glow-b\s*\{[^}]*background:\s*var\(--color-glow-secondary\)/)
    expect(CSS_SRC).toMatch(/\.ambient-glow \.glow-wave path\s*\{[^}]*stroke:\s*var\(--color-accent\)/)
    expect(CSS_SRC).toMatch(/@media \(prefers-color-scheme: light\)\s*\{\s*:root:not\(\[data-theme="dark"\]\) \.ambient-glow/)
    expect(CSS_SRC).toMatch(/:root\[data-theme="light"\] \.ambient-glow/)

    const reducedMotionBlock = CSS_SRC.slice(CSS_SRC.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(reducedMotionBlock).toMatch(/\.ambient-glow span\s*\{\s*animation:\s*none;/)
    expect(reducedMotionBlock).toMatch(/\.ambient-glow \.glow-wave[^{]*\{[^}]*display:\s*none;/)
  })
})
