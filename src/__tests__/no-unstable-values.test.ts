import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// D-QA-08: with `cacheComponents`, a Server Component that reads the current time or a
// random value must call `await connection()` (from `next/server`) before doing so.

const SRC_DIR = fileURLToPath(new URL('..', import.meta.url))
const SCANNED_DIRS = ['app', 'components'].map((dir) => join(SRC_DIR, dir))

const UNSTABLE_VALUE = /new Date\(\)|Date\.now\(\)|Math\.random\(\)|randomUUID\(\)/
const USE_CLIENT = /^\s*(?:\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*['"]use client['"]/
const CONNECTION_IMPORT = /import\s*\{[^}]*\bconnection\b[^}]*\}\s*from\s*['"]next\/server['"]/
const CONNECTION_CALL = /await\s+connection\(\)/

/** Returns why `source` breaks D-QA-08, or null if it complies. */
function unstableValueViolation(source: string): string | null {
  if (USE_CLIENT.test(source)) return null
  const unstable = UNSTABLE_VALUE.exec(source)
  if (!unstable) return null
  if (!CONNECTION_IMPORT.test(source)) return `usa ${unstable[0]} sin importar connection de next/server`
  const call = CONNECTION_CALL.exec(source)
  if (!call) return `usa ${unstable[0]} sin llamar a await connection()`
  if (call.index > unstable.index) return `usa ${unstable[0]} antes de await connection()`
  return null
}

function listTsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : listTsxFiles(path)
    return entry.name.endsWith('.tsx') ? [path] : []
  })
}

describe('unstableValueViolation', () => {
  it('rechaza un Server Component que lee la hora sin connection()', () => {
    const source = `export async function List() {\n  return <Items now={new Date()} />\n}\n`
    expect(unstableValueViolation(source)).toMatch(/sin importar connection/)
  })

  it('rechaza Date.now(), Math.random() y randomUUID() sin connection()', () => {
    for (const call of ['Date.now()', 'Math.random()', 'crypto.randomUUID()']) {
      expect(unstableValueViolation(`const value = ${call}\n`)).not.toBeNull()
    }
  })

  it('rechaza importar connection sin llamarla', () => {
    const source = `import { connection } from 'next/server'\nconst now = new Date()\n`
    expect(unstableValueViolation(source)).toMatch(/sin llamar/)
  })

  it('rechaza llamar a connection() después de leer la hora', () => {
    const source = `import { connection } from 'next/server'\nasync function A() {\n  const now = new Date()\n  await connection()\n}\n`
    expect(unstableValueViolation(source)).toMatch(/antes de await connection/)
  })

  it('acepta un Server Component que llama antes a await connection()', () => {
    const source = `import { connection } from 'next/server'\nasync function A() {\n  await connection()\n  const now = new Date()\n}\n`
    expect(unstableValueViolation(source)).toBeNull()
  })

  it('ignora los Client Components y los archivos sin valores no deterministas', () => {
    expect(unstableValueViolation(`'use client'\nconst now = Date.now()\n`)).toBeNull()
    expect(unstableValueViolation(`const date = new Date(value)\n`)).toBeNull()
  })
})

describe('D-QA-08 en src/app y src/components', () => {
  it('ningún Server Component lee valores no deterministas sin await connection()', () => {
    const files = SCANNED_DIRS.flatMap(listTsxFiles)
    expect(files.length).toBeGreaterThan(0)

    const violations = files.flatMap((file) => {
      const reason = unstableValueViolation(readFileSync(file, 'utf8'))
      return reason ? [`${relative(SRC_DIR, file)}: ${reason}`] : []
    })
    expect(violations).toEqual([])
  })
})
