/** Minimal DOM shape needed to walk up from an anchor target (an `Element` satisfies it). */
export type AnchorNode = {
  tagName: string
  parentElement: AnchorNode | null
  open?: boolean
}

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

/** Closed `<details>` that contain `target` (itself included), from the innermost outwards. */
export function closedDetailsAround(target: AnchorNode): AnchorNode[] {
  const closed: AnchorNode[] = []
  for (let node: AnchorNode | null = target; node; node = node.parentElement) {
    if (node.tagName.toUpperCase() === 'DETAILS' && !node.open) closed.push(node)
  }
  return closed
}
