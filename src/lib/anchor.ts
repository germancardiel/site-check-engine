/** Element id referenced by a URL hash (`#check-title` → `check-title`), or null. */
export function anchorIdFromHash(hash: string): string | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw) return null
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

/** Element a jump lands on: it must be focusable (`tabIndex={-1}`) so the focus can follow. */
export type JumpTarget = {
  scrollIntoView(options: ScrollIntoViewOptions): void
  focus(options?: FocusOptions): void
}

/** Minimal browser surface used by `jumpToAnchor` (the real `window` satisfies it). */
export type JumpEnv = {
  document: { getElementById(id: string): JumpTarget | null }
  matchMedia?: (query: string) => { matches: boolean }
}

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/** `'auto'` (instant) when the user asks for reduced motion, `'smooth'` otherwise. */
export function scrollBehaviorFor(env: Pick<JumpEnv, 'matchMedia'>): ScrollBehavior {
  return typeof env.matchMedia === 'function' && env.matchMedia(REDUCED_MOTION_QUERY).matches ? 'auto' : 'smooth'
}

/**
 * Scrolls to the element with `id` and moves the focus to it, so keyboard and screen reader
 * users continue from the destination. Returns whether the element exists.
 */
export function jumpToAnchor(env: JumpEnv, id: string): boolean {
  const target = env.document.getElementById(id)
  if (!target) return false
  target.scrollIntoView({ behavior: scrollBehaviorFor(env), block: 'start' })
  target.focus({ preventScroll: true })
  return true
}

/** Minimal browser surface used by `bindAnchorReveal` (the real `window`/`document` satisfy it). */
export type AnchorEnv = JumpEnv & {
  location: { hash: string }
  addEventListener(type: 'hashchange', listener: () => void): void
  removeEventListener(type: 'hashchange', listener: () => void): void
  document: JumpEnv['document'] & {
    addEventListener(type: 'click', listener: (event: { target: unknown }) => void): void
    removeEventListener(type: 'click', listener: (event: { target: unknown }) => void): void
  }
  requestAnimationFrame(callback: () => void): unknown
}

type ClosestTarget = { closest(selector: string): { hash?: unknown } | null }

function hashOfClickedLink(target: unknown): string | null {
  if (!target || typeof (target as ClosestTarget).closest !== 'function') return null
  const link = (target as ClosestTarget).closest('a[href^="#"]')
  return link && typeof link.hash === 'string' ? link.hash : null
}

/**
 * Handles the anchors of a page (on load, on `hashchange` and on clicks on in-page links):
 * `sectionOf` returns the collapsible section that owns the anchor (opened with `reveal`), `null`
 * for a known anchor with nothing to open, or `undefined` to ignore it. Known anchors are then
 * scrolled to and focused (`jumpToAnchor`). Returns the cleanup.
 */
export function bindAnchorReveal(
  env: AnchorEnv,
  sectionOf: (anchorId: string) => string | null | undefined,
  reveal: (section: string) => void,
): () => void {
  function revealHash(hash: string) {
    const id = anchorIdFromHash(hash)
    const section = id ? sectionOf(id) : undefined
    if (!id || section === undefined) return
    if (section !== null) reveal(section)
    env.requestAnimationFrame(() => {
      jumpToAnchor(env, id)
    })
  }

  const onHashChange = () => revealHash(env.location.hash)
  const onClick = (event: { target: unknown }) => {
    const hash = hashOfClickedLink(event.target)
    if (hash) revealHash(hash)
  }

  revealHash(env.location.hash)
  env.addEventListener('hashchange', onHashChange)
  env.document.addEventListener('click', onClick)
  return () => {
    env.removeEventListener('hashchange', onHashChange)
    env.document.removeEventListener('click', onClick)
  }
}
