'use client'

import { useActionState } from 'react'
import { updatePassword } from '@/app/(app)/nueva-contrasena/actions'
import { FormFeedback } from '@/components/ui/form-feedback'
import { SubmitButton } from '@/components/ui/submit-button'
import { TextField } from '@/components/ui/text-field'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, type AuthFormState } from '@/lib/validation/auth'

const INITIAL_STATE: AuthFormState = {}

/** New password after following a recovery link (same rules as the sign-up password). */
export function NewPasswordForm() {
  const [state, formAction] = useActionState(updatePassword, INITIAL_STATE)

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <TextField
        id="password"
        name="password"
        type="password"
        label="Nueva contraseña"
        hint={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres.`}
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        maxLength={PASSWORD_MAX_LENGTH}
        required
      />
      <FormFeedback error={state.error} />
      <SubmitButton pendingLabel="Guardando…" className="w-full">
        Guardar contraseña
      </SubmitButton>
    </form>
  )
}
