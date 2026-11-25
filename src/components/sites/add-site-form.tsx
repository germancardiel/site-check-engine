'use client'

import { useActionState } from 'react'
import { createSite } from '@/app/(app)/sitios/actions'
import { FormFeedback } from '@/components/ui/form-feedback'
import { SubmitButton } from '@/components/ui/submit-button'
import { TextField } from '@/components/ui/text-field'
import { SITE_NAME_MAX_LENGTH, type SiteActionState } from '@/lib/validation/site'

const INITIAL_STATE: SiteActionState = {}

export function AddSiteForm() {
  const [state, formAction] = useActionState(createSite, INITIAL_STATE)

  return (
    <form
      action={formAction}
      noValidate
      aria-labelledby="add-site-title"
      className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
    >
      <h2 id="add-site-title" className="text-lg font-semibold">
        Añadir un sitio
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="site-url"
          name="url"
          type="text"
          inputMode="url"
          label="URL"
          placeholder="ejemplo.com"
          hint="Si no indicas el protocolo, se usará https://."
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
      </div>
      <FormFeedback error={state.error} message={state.message} />
      <SubmitButton pendingLabel="Añadiendo…" className="self-start">
        Añadir
      </SubmitButton>
    </form>
  )
}
