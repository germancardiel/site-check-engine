type FormFeedbackProps = {
  error?: string
  message?: string
}

/** Announces a form error or success message to assistive technology. */
export function FormFeedback({ error, message }: FormFeedbackProps) {
  return (
    <>
      <div role="alert" aria-live="assertive">
        {error ? (
          <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            {error}
          </p>
        ) : null}
      </div>
      <div role="status" aria-live="polite">
        {message ? (
          <p className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
            {message}
          </p>
        ) : null}
      </div>
    </>
  )
}
