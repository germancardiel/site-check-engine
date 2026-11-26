import { useEffect, useRef } from 'react'
import { focusFirstError, type ErrorFocusState } from '@/lib/form-focus'

/**
 * Ref for a `<form>`: every time the action state changes, the focus moves to the first field
 * with an error or to the general error message (D-UX-09). The initial state has no errors,
 * so nothing is focused on mount.
 */
export function useFocusFirstError(state: ErrorFocusState) {
  const ref = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const form = ref.current
    focusFirstError(form && { querySelector: (selector) => form.querySelector<HTMLElement>(selector) }, state)
  }, [state])

  return ref
}
