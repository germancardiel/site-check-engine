import { StatusIcon } from './status-icon'

type FormFeedbackProps = {
  error?: string
  message?: string
}

const BOX = 'flex items-start gap-2 rounded-md border px-3 py-2 text-sm text-ink'

/** Announces a form error or success message to assistive technology. */
export function FormFeedback({ error, message }: FormFeedbackProps) {
  return (
    <>
      <div role="alert" aria-live="assertive">
        {error ? (
          <p className={`${BOX} border-fail`}>
            <StatusIcon status="fail" className="mt-0.5" />
            <span className="min-w-0 break-words">{error}</span>
          </p>
        ) : null}
      </div>
      <div role="status" aria-live="polite">
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
