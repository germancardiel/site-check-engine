'use client'

import { useActionState } from 'react'
import { updatePassword } from '@/app/(app)/nueva-contrasena/actions'
import { FormFeedback } from '@/components/ui/form-feedback'
import { PasswordField } from '@/components/ui/password-field'
import { SubmitButton } from '@/components/ui/submit-button'
import { useFocusFirstError } from '@/components/ui/use-focus-first-error'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, type AuthFormState } from '@/lib/validation/auth'

const INITIAL_STATE: AuthFormState = {}

type NewPasswordFormViewProps = {
  state: AuthFormState
  formAction: (formData: FormData) => void
}

/** New password after following a recovery link (same rules as the sign-up password). */
export function NewPasswordFormView({ state, formAction }: NewPasswordFormViewProps) {
  const formRef = useFocusFirstError(state)

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-5" noValidate>
      <PasswordField
        id="password"
        name="password"
        label="Nueva contraseña"
        hint={`Entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres.`}
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        maxLength={PASSWORD_MAX_LENGTH}
        error={state.fieldErrors?.password}
        required
      />
      <FormFeedback error={state.error} />
      <SubmitButton pendingLabel="Guardando…" className="w-full">
        Guardar contraseña
      </SubmitButton>
    </form>
  )
}

export function NewPasswordForm() {
  const [state, formAction] = useActionState(updatePassword, INITIAL_STATE)
  return <NewPasswordFormView state={state} formAction={formAction} />
}
