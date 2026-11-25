import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// T13 CA2: the interface only uses the design tokens (both themes) and the new fonts.
// Test and smoke folders (`__*`) are skipped.

const SRC = fileURLToPath(new URL('..', import.meta.url))

function listFiles(dir: string, extensions: string[]): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name.startsWith('__') ? [] : listFiles(path, extensions)
    return extensions.some((extension) => entry.name.endsWith(extension)) ? [path] : []
  })
}

const UI_FILES = [...listFiles(join(SRC, 'app'), ['.tsx']), ...listFiles(join(SRC, 'components'), ['.tsx', '.ts'])]
const offenders = (pattern: RegExp, files = UI_FILES) =>
  files.filter((file) => pattern.test(readFileSync(file, 'utf8'))).map((file) => relative(SRC, file))

describe('sistema de diseño', () => {
  it('no quedan clases de las paletas de Tailwind ni variantes dark: manuales', () => {
    expect(offenders(/\b(?:zinc|gray|slate|neutral|stone|red|green|amber|blue|orange)-\d{2,3}\b/)).toEqual([])
    expect(offenders(/\bdark:/)).toEqual([])
  })

  it('no hay colores hex sueltos en componentes ni rutas (salvo la imagen OG)', () => {
    const files = UI_FILES.filter((file) => !file.endsWith('opengraph-image.tsx'))
    expect(offenders(/#[0-9A-Fa-f]{6}\b/, files)).toEqual([])
  })

  it('no se usa Geist en src/', () => {
    expect(offenders(/geist/i, listFiles(SRC, ['.ts', '.tsx', '.css']))).toEqual([])
  })

  it('la animación del informe de ejemplo respeta prefers-reduced-motion', () => {
    const css = readFileSync(join(SRC, 'app', 'globals.css'), 'utf8')
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.specimen-pending\s*\{\s*display: none;/)
    expect(css).toMatch(/\.specimen-resolved\s*\{\s*animation: none;/)
  })
})
