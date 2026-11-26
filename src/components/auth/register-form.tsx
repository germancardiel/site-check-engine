'use client'

import { useActionState } from 'react'
import { register } from '@/app/(auth)/registro/actions'
import { FormFeedback } from '@/components/ui/form-feedback'
import { SubmitButton } from '@/components/ui/submit-button'
import { TextField } from '@/components/ui/text-field'
import { PASSWORD_MIN_LENGTH, type AuthFormState } from '@/lib/validation/auth'
import { ResendConfirmationForm } from './resend-confirmation-form'

const INITIAL_STATE: AuthFormState = {}

type RegisterFormViewProps = {
  state: AuthFormState
  formAction: (formData: FormData) => void
}

/** Confirmation pending: repeats the address and offers to send the email again. */
function RegisterSent({ email }: { email: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div role="status" className="flex flex-col gap-2">
        <p className="font-semibold text-ink">Revisa tu correo</p>
        <p className="break-words text-ink-muted">
          Te hemos enviado un enlace a <strong className="font-semibold text-ink">{email}</strong>. Ábrelo
          para confirmar tu cuenta y entrar.
        </p>
      </div>
      <p className="text-sm text-ink-muted">¿No te ha llegado? Mira en la carpeta de spam o pide otro.</p>
      <ResendConfirmationForm email={email} />
    </div>
  )
}

/** Sign-up form, replaced by the "check your inbox" message once the account is created. */
export function RegisterFormView({ state, formAction }: RegisterFormViewProps) {
  if (state.sentTo) return <RegisterSent email={state.sentTo} />

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <TextField
        key={`email-${state.values?.email ?? ''}`}
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        defaultValue={state.values?.email}
        required
      />
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

export function RegisterForm() {
  const [state, formAction] = useActionState(register, INITIAL_STATE)
  return <RegisterFormView state={state} formAction={formAction} />
}
