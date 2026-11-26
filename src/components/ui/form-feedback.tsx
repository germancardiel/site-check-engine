import { StatusIcon } from './status-icon'

type FormFeedbackProps = {
  error?: string
  /** Id of the error message, so a disabled button can point to it with `aria-describedby`. */
  errorId?: string
  message?: string
  /**
   * While the action runs: announced once through the same `role="status"` (screen readers only),
   * replacing the previous result, so the form never has two status regions (D-UX-10).
   */
  pending?: string
}

const BOX = 'flex items-start gap-2 rounded-md border px-3 py-2 text-sm text-ink'

/**
 * Announces a form error (`role="alert"`) or a success message (`role="status"`) once: each role
 * already implies its live region, so there is no extra `aria-live`. The error can receive focus
 * (`tabIndex={-1}`) when it is not tied to a field (D-UX-09, D-UX-10).
 */
export function FormFeedback({ error, errorId, message, pending }: FormFeedbackProps) {
  const showResult = !pending
  return (
    <>
      <div role="alert">
        {showResult && error ? (
          <p id={errorId} tabIndex={-1} data-form-error="" className={`${BOX} border-fail`}>
            <StatusIcon status="fail" className="mt-0.5" />
            <span className="min-w-0 break-words">{error}</span>
          </p>
        ) : null}
      </div>
      <div role="status">
        {pending ? <p className="sr-only">{pending}</p> : null}
        {showResult && message ? (
          <p className={`${BOX} border-pass`}>
            <StatusIcon status="pass" className="mt-0.5" />
            <span className="min-w-0 break-words">{message}</span>
          </p>
        ) : null}
      </div>
    </>
  )
}
