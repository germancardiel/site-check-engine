/** Fields marked as invalid by `TextField` (`aria-invalid="true"`). */
export const FIELD_ERROR_SELECTOR = '[aria-invalid="true"]'
/** General error message rendered by `FormFeedback` (`data-form-error`, focusable with `tabIndex={-1}`). */
export const FORM_ERROR_SELECTOR = '[data-form-error]'

type Focusable = { focus: () => void }

/** The part of a form element this module needs (a fake one is enough in tests). */
export type FocusRoot = { querySelector: (selector: string) => Focusable | null }

/** The parts of a form state that decide where the focus goes. */
export type ErrorFocusState = {
  error?: string
  fieldErrors?: Partial<Record<string, string>>
}

function hasFieldErrors(state: ErrorFocusState): boolean {
  return Object.values(state.fieldErrors ?? {}).some((message) => Boolean(message))
}

/**
 * After an action, moves the focus to the first field with an error (document order) or, if the
 * error is general, to the error message (D-UX-09). Returns whether something received focus.
 */
export function focusFirstError(root: FocusRoot | null, state: ErrorFocusState): boolean {
  if (!root) return false
  const selector = hasFieldErrors(state) ? FIELD_ERROR_SELECTOR : state.error ? FORM_ERROR_SELECTOR : null
  if (!selector) return false
  const target = root.querySelector(selector)
  if (!target) return false
  target.focus()
  return true
}

/** A form state that can also carry a success message. */
export type ResultFocusState = ErrorFocusState & { message?: string }

/**
 * After an action that changes the page (D-UX-10): an error focuses the first error inside `root`
 * (as `focusFirstError`); a success focuses `successSelector` in `page` (e.g. the heading of what
 * was created or of the list that changed). Returns whether something received focus.
 */
export function focusActionResult(
  root: FocusRoot | null,
  page: FocusRoot | null,
  state: ResultFocusState,
  successSelector: string,
): boolean {
  if (state.error || hasFieldErrors(state)) return focusFirstError(root, state)
  if (!state.message || !page) return false
  const target = page.querySelector(successSelector)
  if (!target) return false
  target.focus()
  return true
}
