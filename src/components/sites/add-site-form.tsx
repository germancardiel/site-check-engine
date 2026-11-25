'use client'

import { useActionState } from 'react'
import { createSite } from '@/app/(app)/sitios/actions'
import { FormFeedback } from '@/components/ui/form-feedback'
import { SubmitButton } from '@/components/ui/submit-button'
import { TextField } from '@/components/ui/text-field'
import { SITE_NAME_MAX_LENGTH, type SiteActionState } from '@/lib/validation/site'

const INITIAL_STATE: SiteActionState = {}

/** Inline form to add a site: URL, optional name and "Añadir" on one line (stacked on mobile). */
export function AddSiteForm() {
  const [state, formAction] = useActionState(createSite, INITIAL_STATE)

  return (
    <form
      action={formAction}
      noValidate
      aria-labelledby="add-site-title"
      className="flex flex-col gap-3 rounded-md border border-line bg-panel p-4 sm:p-5"
    >
      <h2 id="add-site-title" className="text-base font-semibold">
        Añadir un sitio
      </h2>
      <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto]">
        <TextField
          id="site-url"
          name="url"
          type="text"
          inputMode="url"
          label="URL"
          placeholder="ejemplo.com"
          aria-describedby="site-url-hint"
          autoComplete="url"
          required
        />
        <TextField
          id="site-name"
          name="name"
          type="text"
          label="Nombre (opcional)"
          maxLength={SITE_NAME_MAX_LENGTH}
          autoComplete="off"
        />
        <SubmitButton pendingLabel="Añadiendo…" className="w-full sm:w-auto">
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
