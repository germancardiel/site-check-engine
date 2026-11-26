import { describe, expect, it, vi } from 'vitest'
import {
  anchorIdFromHash,
  bindAnchorReveal,
  jumpToAnchor,
  REDUCED_MOTION_QUERY,
  scrollBehaviorFor,
  type AnchorEnv,
  type JumpEnv,
} from '@/lib/anchor'

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

/** Fake document whose elements record scrolls and move `activeElement` when focused. */
function fakeDocument(missing: string[] = ['missing']) {
  const scrolled: string[] = []
  const behaviors: ScrollBehavior[] = []
  const state = { activeElement: null as string | null }
  const getElementById = (id: string) =>
    missing.includes(id)
      ? null
      : {
          scrollIntoView: (options: ScrollIntoViewOptions) => {
            scrolled.push(id)
            if (options.behavior) behaviors.push(options.behavior)
          },
          focus: () => {
            state.activeElement = id
          },
        }
  return { getElementById, scrolled, behaviors, state }
}

/** Fake window/document (EventTarget, no DOM library): records scrolls and runs rAF at once. */
function fakeEnv(initialHash = '') {
  const win = new EventTarget()
  const doc = new EventTarget()
  const { getElementById, scrolled, state } = fakeDocument()
  const env = {
    location: { hash: initialHash },
    addEventListener: (type: string, fn: () => void) => win.addEventListener(type, fn),
    removeEventListener: (type: string, fn: () => void) => win.removeEventListener(type, fn),
    document: {
      addEventListener: (type: string, fn: (e: { target: unknown }) => void) =>
        doc.addEventListener(type, fn as unknown as EventListener),
      removeEventListener: (type: string, fn: (e: { target: unknown }) => void) =>
        doc.removeEventListener(type, fn as unknown as EventListener),
      getElementById,
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
  return { env, scrolled, state, navigate, click }
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

describe('jumpToAnchor (T21 CA1: el foco sigue al salto)', () => {
  function env(reduced: boolean | null) {
    const doc = fakeDocument()
    const queries: string[] = []
    const jumpEnv: JumpEnv = {
      document: { getElementById: doc.getElementById },
      ...(reduced === null
        ? {}
        : {
            matchMedia: (query: string) => {
              queries.push(query)
              return { matches: reduced }
            },
          }),
    }
    return { jumpEnv, doc, queries }
  }

  it('desplaza y deja document.activeElement en el destino', () => {
    const { jumpEnv, doc } = env(false)
    expect(jumpToAnchor(jumpEnv, 'cat-crawl')).toBe(true)
    expect(doc.scrolled).toEqual(['cat-crawl'])
    expect(doc.state.activeElement).toBe('cat-crawl')
    expect(doc.behaviors).toEqual(['smooth'])
  })

  it("con prefers-reduced-motion: reduce usa behavior: 'auto'", () => {
    const { jumpEnv, doc, queries } = env(true)
    jumpToAnchor(jumpEnv, 'check-crawl-noindex')
    expect(queries).toEqual([REDUCED_MOTION_QUERY])
    expect(doc.behaviors).toEqual(['auto'])
    expect(doc.state.activeElement).toBe('check-crawl-noindex')
  })

  it("sin matchMedia usa 'smooth'; un destino inexistente no hace nada", () => {
    const { jumpEnv, doc } = env(null)
    expect(scrollBehaviorFor(jumpEnv)).toBe('smooth')
    expect(jumpToAnchor(jumpEnv, 'missing')).toBe(false)
    expect(doc.state.activeElement).toBeNull()
  })

  it('bindAnchorReveal enfoca el destino y acepta anclas conocidas sin apartado que abrir (null)', () => {
    const { env: anchorEnv, state, navigate } = fakeEnv()
    const reveal = vi.fn()
    const sections = new Map<string, string | null>([...SECTIONS, ['plan-de-accion', null]])
    bindAnchorReveal(anchorEnv, (id) => sections.get(id), reveal)
    navigate('#check-ai.llms')
    expect(state.activeElement).toBe('check-ai.llms')
    navigate('#plan-de-accion')
    expect(state.activeElement).toBe('plan-de-accion')
    expect(reveal.mock.calls.map(([section]) => section)).toEqual(['ai'])
  })
})
