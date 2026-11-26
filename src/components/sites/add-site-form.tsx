'use client'

import { unstable_rethrow } from 'next/navigation'
import { useActionState } from 'react'
import { createSite } from '@/app/(app)/sitios/actions'
import { FormFeedback } from '@/components/ui/form-feedback'
import { SubmitButton } from '@/components/ui/submit-button'
import { TextField } from '@/components/ui/text-field'
import { useFocusFirstError } from '@/components/ui/use-focus-first-error'
import { NETWORK_ERROR, withNetworkFallback } from '@/lib/action-safety'
import { readFormValues } from '@/lib/validation/form-state'
import { SITE_FIELDS, SITE_NAME_MAX_LENGTH, type SiteActionState } from '@/lib/validation/site'

const INITIAL_STATE: SiteActionState = {}

// A failed call keeps what was typed and shows a recoverable error (D-UX-08, D-UX-12).
// On success the action redirects to the new site, whose empty state offers "Auditar ahora".
const safeCreateSite = withNetworkFallback<SiteActionState>(
  createSite,
  (formData) => ({ error: NETWORK_ERROR, values: readFormValues(formData, SITE_FIELDS) }),
  unstable_rethrow,
)

type AddSiteFormViewProps = {
  state: SiteActionState
  formAction: (formData: FormData) => void
}

/**
 * Inline form to add a site: URL, optional name and "Añadir" on one line (stacked on mobile).
 * After an error it keeps what was typed and focuses the first error.
 */
export function AddSiteFormView({ state, formAction }: AddSiteFormViewProps) {
  const formRef = useFocusFirstError(state)

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate
      aria-labelledby="add-site-title"
      className="flex flex-col gap-3 rounded-md border border-line bg-panel p-4 sm:p-5"
    >
      <h2 id="add-site-title" className="text-base font-semibold">
        Añadir un sitio
      </h2>
      <div className="grid items-start gap-3 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto]">
        <TextField
          key={`url-${state.values?.url ?? ''}`}
          id="site-url"
          name="url"
          type="text"
          inputMode="url"
          label="URL"
          placeholder="ejemplo.com"
          aria-describedby="site-url-hint"
          autoComplete="url"
          defaultValue={state.values?.url}
          error={state.fieldErrors?.url}
          required
        />
        <TextField
          key={`name-${state.values?.name ?? ''}`}
          id="site-name"
          name="name"
          type="text"
          label="Nombre (opcional)"
          maxLength={SITE_NAME_MAX_LENGTH}
          autoComplete="off"
          defaultValue={state.values?.name}
          error={state.fieldErrors?.name}
        />
        {/* Label height (20px) + gap (6px): keeps the button level with the inputs on wide screens. */}
        <SubmitButton pendingLabel="Añadiendo…" className="w-full sm:mt-6.5 sm:w-auto">
          Añadir
        </SubmitButton>
      </div>
      <p id="site-url-hint" className="text-sm text-ink-muted">
        Si no indicas el protocolo, se usará https://.
      </p>
      <FormFeedback error={state.error} message={state.message} />
    </form>
  )
}

export function AddSiteForm() {
  const [state, formAction] = useActionState(safeCreateSite, INITIAL_STATE)
  return <AddSiteFormView state={state} formAction={formAction} />
}
