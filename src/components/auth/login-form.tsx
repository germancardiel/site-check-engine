'use client'

import { useActionState } from 'react'
import { login } from '@/app/(auth)/login/actions'
import { FormFeedback } from '@/components/ui/form-feedback'
import { SubmitButton } from '@/components/ui/submit-button'
import { TextField } from '@/components/ui/text-field'
import type { AuthFormState } from '@/lib/validation/auth'

const INITIAL_STATE: AuthFormState = {}

export function LoginForm() {
  const [state, formAction] = useActionState(login, INITIAL_STATE)

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <TextField id="email" name="email" type="email" label="Email" autoComplete="email" required />
      <TextField
        id="password"
        name="password"
        type="password"
        label="Contraseña"
        autoComplete="current-password"
        required
      />
      <FormFeedback error={state.error} />
      <SubmitButton pendingLabel="Entrando…">Entrar</SubmitButton>
    </form>
  )
}
