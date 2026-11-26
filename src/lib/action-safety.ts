/**
 * Helpers so a form never ends in `error.tsx` (D-UX-12): server actions turn any exception into a
 * generic state, and the client turns a failed call (network, server down) into a recoverable error.
 */

/** Generic message when the browser could not reach the server action. */
export const NETWORK_ERROR = 'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.'

/**
 * Server side: runs `fn` and, if it throws, logs the detail (D-SEC-08) and returns `fallback`.
 * Call `redirect()` outside `fn`: it works by throwing, and it would be swallowed here.
 */
export async function runSafely<T>(scope: string, fallback: T, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    console.error(`[${scope}]`, error)
    return fallback
  }
}

type FormAction<S> = (state: S, formData: FormData) => Promise<S>

/**
 * Client side: wraps a server action for `useActionState`. If the call rejects, `onError` builds
 * the state to show (for example, the error plus what the user typed). `rethrow` must throw the
 * framework's own errors (pass `unstable_rethrow`), so a server `redirect()` still navigates.
 */
export function withNetworkFallback<S>(
  action: FormAction<S>,
  onError: (formData: FormData, previous: S) => S,
  rethrow: (error: unknown) => void,
): FormAction<S> {
  return async (state, formData) => {
    try {
      return await action(state, formData)
    } catch (error) {
      rethrow(error)
      return onError(formData, state)
    }
  }
}
