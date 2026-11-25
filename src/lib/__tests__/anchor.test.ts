import { describe, expect, it, vi } from 'vitest'
import { anchorIdFromHash, bindAnchorReveal, type AnchorEnv } from '@/lib/anchor'

describe('anchorIdFromHash', () => {
  it('quita la almohadilla y decodifica el id', () => {
    expect(anchorIdFromHash('#check-title')).toBe('check-title')
    expect(anchorIdFromHash('check-title')).toBe('check-title')
    expect(anchorIdFromHash('#check-t%C3%ADtulo')).toBe('check-título')
  })

  it('devuelve null sin ancla', () => {
    expect(anchorIdFromHash('')).toBeNull()
    expect(anchorIdFromHash('#')).toBeNull()
  })

  it('devuelve el texto tal cual si no se puede decodificar', () => {
    expect(anchorIdFromHash('#check-%E0%A4%A')).toBe('check-%E0%A4%A')
  })
})

/** Fake window/document (EventTarget, no DOM library): records scrolls and runs rAF at once. */
function fakeEnv(initialHash = '') {
  const win = new EventTarget()
  const doc = new EventTarget()
  const scrolled: string[] = []
  const env = {
    location: { hash: initialHash },
    addEventListener: (type: string, fn: () => void) => win.addEventListener(type, fn),
    removeEventListener: (type: string, fn: () => void) => win.removeEventListener(type, fn),
    document: {
      addEventListener: (type: string, fn: (e: { target: unknown }) => void) =>
        doc.addEventListener(type, fn as unknown as EventListener),
      removeEventListener: (type: string, fn: (e: { target: unknown }) => void) =>
        doc.removeEventListener(type, fn as unknown as EventListener),
      getElementById: (id: string) =>
        id === 'missing' ? null : { scrollIntoView: () => void scrolled.push(id) },
    },
    requestAnimationFrame: (cb: () => void) => cb(),
  } satisfies AnchorEnv
  const navigate = (hash: string) => {
    env.location.hash = hash
    win.dispatchEvent(new Event('hashchange'))
  }
  const click = (target: unknown) => {
    const event = new Event('click')
    Object.defineProperty(event, 'target', { value: target })
    doc.dispatchEvent(event)
  }
  return { env, scrolled, navigate, click }
}

const SECTIONS = new Map([
  ['check-crawl.noindex', 'crawl'],
  ['check-ai.llms', 'ai'],
  ['cat-onpage', 'onpage'],
  ['missing', 'url'],
])

describe('bindAnchorReveal (CA5: abrir el apartado al navegar a #check-<id>)', () => {
  it('al cargar con #check-<id> abre su apartado y hace scroll al check', () => {
    const { env, scrolled } = fakeEnv('#check-crawl.noindex')
    const reveal = vi.fn()
    bindAnchorReveal(env, (id) => SECTIONS.get(id), reveal)
    expect(reveal).toHaveBeenCalledWith('crawl')
    expect(scrolled).toEqual(['check-crawl.noindex'])
  })

  it('reacciona a hashchange y a clics en enlaces internos, e ignora anclas desconocidas', () => {
    const { env, scrolled, navigate, click } = fakeEnv()
    const reveal = vi.fn()
    bindAnchorReveal(env, (id) => SECTIONS.get(id), reveal)
    expect(reveal).not.toHaveBeenCalled()

    navigate('#check-ai.llms')
    click({ closest: () => ({ hash: '#cat-onpage' }) })
    click({ closest: () => null })
    click(null)
    navigate('#otra-cosa')
    navigate('#missing')

    expect(reveal.mock.calls.map(([section]) => section)).toEqual(['ai', 'onpage', 'url'])
    expect(scrolled).toEqual(['check-ai.llms', 'cat-onpage'])
  })

  it('la función de limpieza quita los listeners', () => {
    const { env, navigate, click } = fakeEnv()
    const reveal = vi.fn()
    const cleanup = bindAnchorReveal(env, (id) => SECTIONS.get(id), reveal)
    cleanup()
    navigate('#check-ai.llms')
    click({ closest: () => ({ hash: '#cat-onpage' }) })
    expect(reveal).not.toHaveBeenCalled()
  })
})
