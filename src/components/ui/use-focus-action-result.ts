import { useEffect, useRef } from 'react'
import { focusActionResult, type ResultFocusState } from '@/lib/form-focus'

/**
 * Ref for the element that holds a form's feedback: every time the action state changes, an error
 * focuses the first error inside it and a success focuses `successSelector` in the page (D-UX-10).
 * The initial state has no result, so nothing is focused on mount.
 */
export function useFocusActionResult<E extends HTMLElement>(state: ResultFocusState, successSelector: string) {
  const ref = useRef<E>(null)

  useEffect(() => {
    const root = ref.current
    focusActionResult(
      root && { querySelector: (selector) => root.querySelector<HTMLElement>(selector) },
      { querySelector: (selector) => document.querySelector<HTMLElement>(selector) },
      state,
      successSelector,
    )
  }, [state, successSelector])

  return ref
}
