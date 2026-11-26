'use client'

import { useActionState } from 'react'
import { resendConfirmation } from '@/app/(auth)/registro/actions'
import { FormFeedback } from '@/components/ui/form-feedback'
import { SubmitButton } from '@/components/ui/submit-button'
import type { AuthFormState } from '@/lib/validation/auth'

const INITIAL_STATE: AuthFormState = {}

/** "Reenviar correo" button for the sign-up confirmation email of `email`. */
export function ResendConfirmationForm({ email }: { email: string }) {
  const [state, formAction] = useActionState(resendConfirmation, INITIAL_STATE)

  return (
    <form action={formAction} aria-label="Reenviar el correo de confirmación" className="flex flex-col gap-3">
      <input type="hidden" name="email" value={email} />
      <SubmitButton variant="secondary" pendingLabel="Reenviando…" className="w-full">
        Reenviar correo
      </SubmitButton>
      <FormFeedback error={state.error} message={state.message} />
    </form>
  )
}
