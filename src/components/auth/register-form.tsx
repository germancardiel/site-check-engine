'use client'

import { useActionState } from 'react'
import { register } from '@/app/(auth)/registro/actions'
import { FormFeedback } from '@/components/ui/form-feedback'
import { SubmitButton } from '@/components/ui/submit-button'
import { TextField } from '@/components/ui/text-field'
import { PASSWORD_MIN_LENGTH, type AuthFormState } from '@/lib/validation/auth'

const INITIAL_STATE: AuthFormState = {}

export function RegisterForm() {
  const [state, formAction] = useActionState(register, INITIAL_STATE)

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <TextField id="email" name="email" type="email" label="Email" autoComplete="email" required />
      <TextField
        id="password"
        name="password"
        type="password"
        label="Contraseña"
        hint={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres.`}
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        required
      />
      <FormFeedback error={state.error} message={state.message} />
      <SubmitButton pendingLabel="Creando cuenta…" className="w-full">
        Crear cuenta
      </SubmitButton>
    </form>
  )
}
