'use client'

import { useActionState } from 'react'
import { requestPasswordReset } from '@/app/(auth)/recuperar/actions'
import { FormFeedback } from '@/components/ui/form-feedback'
import { SubmitButton } from '@/components/ui/submit-button'
import { TextField } from '@/components/ui/text-field'
import { useFocusFirstError } from '@/components/ui/use-focus-first-error'
import type { AuthFormState } from '@/lib/validation/auth'

const INITIAL_STATE: AuthFormState = {}

type PasswordResetFormViewProps = {
  state: AuthFormState
  formAction: (formData: FormData) => void
}

/** Asks for the email that will receive the password reset link (keeps it after an error). */
export function PasswordResetFormView({ state, formAction }: PasswordResetFormViewProps) {
  const formRef = useFocusFirstError(state)

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-5" noValidate>
      <TextField
        key={`email-${state.values?.email ?? ''}`}
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
        required
      />
      <FormFeedback error={state.error} message={state.message} />
      <SubmitButton pendingLabel="Enviando…" className="w-full">
        Enviar enlace
      </SubmitButton>
    </form>
  )
}

export function PasswordResetForm() {
  const [state, formAction] = useActionState(requestPasswordReset, INITIAL_STATE)
  return <PasswordResetFormView state={state} formAction={formAction} />
}
