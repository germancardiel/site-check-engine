'use client'

import { useEffect } from 'react'
import { anchorIdFromHash, closedDetailsAround } from '@/lib/anchor'

/** Opens the `<details>` that hide the element referenced by `hash` and returns that element. */
function revealHash(hash: string): Element | null {
  const id = anchorIdFromHash(hash)
  const target = id ? document.getElementById(id) : null
  if (!target) return null
  const closed = closedDetailsAround(target)
  for (const details of closed) details.open = true
  return closed.length > 0 ? target : null
}

/** For the current URL hash: the browser could not scroll to a hidden target, so scroll now. */
function revealCurrentHash() {
  revealHash(window.location.hash)?.scrollIntoView()
}

/**
 * Makes links to folded checks work: opens the `<details>` around the target on page load,
 * on `hashchange` and when clicking an in-page link (even if the hash did not change).
 */
export function DetailsAnchorOpener() {
  useEffect(() => {
    revealCurrentHash()

    function onClick(event: MouseEvent) {
      const link = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null
      if (link instanceof HTMLAnchorElement) revealHash(link.hash)
    }

    window.addEventListener('hashchange', revealCurrentHash)
    document.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('hashchange', revealCurrentHash)
      document.removeEventListener('click', onClick)
    }
  }, [])

  return null
}
