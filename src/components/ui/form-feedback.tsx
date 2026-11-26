import { StatusIcon } from './status-icon'

type FormFeedbackProps = {
  error?: string
  message?: string
}

const BOX = 'flex items-start gap-2 rounded-md border px-3 py-2 text-sm text-ink'

/**
 * Announces a form error (`role="alert"`) or a success message (`role="status"`) once: each role
 * already implies its live region, so there is no extra `aria-live`. The error can receive focus
 * (`tabIndex={-1}`) when it is not tied to a field (D-UX-09, D-UX-10).
 */
export function FormFeedback({ error, message }: FormFeedbackProps) {
  return (
    <>
      <div role="alert">
        {error ? (
          <p tabIndex={-1} data-form-error="" className={`${BOX} border-fail`}>
            <StatusIcon status="fail" className="mt-0.5" />
            <span className="min-w-0 break-words">{error}</span>
          </p>
        ) : null}
      </div>
      <div role="status">
        {message ? (
          <p className={`${BOX} border-pass`}>
            <StatusIcon status="pass" className="mt-0.5" />
            <span className="min-w-0 break-words">{message}</span>
          </p>
        ) : null}
      </div>
    </>
  )
}
