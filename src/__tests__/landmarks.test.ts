import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// CA5: every page has a single `<main id="contenido">` (target of "Saltar al contenido").
// Group layouts own the `<main>`; pages, errors and not-found pages inside a group must not
// render another one. Root-level pages (landing, not-found, error) render their own.

const APP_DIR = fileURLToPath(new URL('../app', import.meta.url))
const COMPONENTS_DIR = fileURLToPath(new URL('../components', import.meta.url))

function listTsx(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : listTsx(path)
    return entry.name.endsWith('.tsx') ? [path] : []
  })
}

const read = (path: string) => readFileSync(path, 'utf8')
const mainCount = (source: string) => (source.match(/<main\b/g) ?? []).length

describe('landmarks', () => {
  it('los layouts de los grupos (app) y (auth) tienen un único <main id="contenido">', () => {
    for (const group of ['(app)', '(auth)']) {
      const source = read(join(APP_DIR, group, 'layout.tsx'))
      expect(mainCount(source)).toBe(1)
      expect(source).toContain('<main id="contenido"')
    }
  })

  it('ninguna página, error o not-found dentro de un grupo añade otro <main>', () => {
    const nested = listTsx(APP_DIR).filter(
      (file) => /\((app|auth)\)/.test(file) && !file.endsWith('layout.tsx'),
    )
    expect(nested.length).toBeGreaterThan(0)
    const offenders = nested.filter((file) => mainCount(read(file)) > 0).map((file) => relative(APP_DIR, file))
    expect(offenders).toEqual([])
  })

  it('los componentes compartidos no renderizan <main>', () => {
    const offenders = listTsx(COMPONENTS_DIR).filter((file) => mainCount(read(file)) > 0)
    expect(offenders).toEqual([])
  })

  it('las páginas de la raíz (landing, not-found, error, global-error) tienen su propio <main id="contenido">', () => {
    for (const file of ['page.tsx', 'not-found.tsx', 'error.tsx', 'global-error.tsx']) {
      const source = read(join(APP_DIR, file))
      expect(mainCount(source)).toBe(1)
      expect(source).toContain('<main id="contenido"')
    }
  })

  it('el layout raíz pone "Saltar al contenido" antes que cualquier otro contenido', () => {
    const layout = read(join(APP_DIR, 'layout.tsx'))
    expect(layout).toMatch(/<body[^>]*>\s*<SkipLink \/>/)
    expect(read(join(COMPONENTS_DIR, 'layout', 'skip-link.tsx'))).toContain('href="#contenido"')
  })
})
