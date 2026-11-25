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

/** Minimal browser surface used by `bindAnchorReveal` (the real `window`/`document` satisfy it). */
export type AnchorEnv = {
  location: { hash: string }
  addEventListener(type: 'hashchange', listener: () => void): void
  removeEventListener(type: 'hashchange', listener: () => void): void
  document: {
    addEventListener(type: 'click', listener: (event: { target: unknown }) => void): void
    removeEventListener(type: 'click', listener: (event: { target: unknown }) => void): void
    getElementById(id: string): { scrollIntoView(options: ScrollIntoViewOptions): void } | null
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
 * Opens the section that owns the anchor in the URL hash (`#check-<id>` or `#cat-<id>`) and
 * scrolls to it: on load, on `hashchange` and on clicks on in-page links. Returns the cleanup.
 */
export function bindAnchorReveal(
  env: AnchorEnv,
  sectionOf: (anchorId: string) => string | undefined,
  reveal: (section: string) => void,
): () => void {
  function revealHash(hash: string) {
    const id = anchorIdFromHash(hash)
    const section = id ? sectionOf(id) : undefined
    if (!id || !section) return
    reveal(section)
    env.requestAnimationFrame(() => {
      env.document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
