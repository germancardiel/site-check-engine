'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { login } from '@/app/(auth)/login/actions'
import { FormFeedback } from '@/components/ui/form-feedback'
import { SubmitButton } from '@/components/ui/submit-button'
import { TextField } from '@/components/ui/text-field'
import type { AuthFormState } from '@/lib/validation/auth'
import { ResendConfirmationForm } from './resend-confirmation-form'

const INITIAL_STATE: AuthFormState = {}

const AUTH_LINK_CLASS =
  'rounded-sm font-semibold text-ink underline decoration-line-strong hover:decoration-ink'

type LoginFormProps = {
  /** Internal path to return to after signing in (already validated, D-SEC-14). */
  next?: string
  /** Notice shown before submitting (e.g. an invalid or expired email link). */
  notice?: string
}

type LoginFormViewProps = LoginFormProps & {
  state: AuthFormState
  formAction: (formData: FormData) => void
}

export function LoginFormView({ state, formAction, next, notice }: LoginFormViewProps) {
  return (
    <div className="flex flex-col gap-5">
      <form action={formAction} className="flex flex-col gap-5" noValidate>
        {next ? <input type="hidden" name="next" value={next} /> : null}
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
        <div className="flex flex-col gap-2">
          <TextField
            id="password"
            name="password"
            type="password"
            label="Contraseña"
            autoComplete="current-password"
            required
          />
          <Link href="/recuperar" className={`self-start text-sm ${AUTH_LINK_CLASS}`}>
            ¿Has olvidado tu contraseña?
          </Link>
        </div>
        <FormFeedback error={state.error ?? notice} />
        <SubmitButton pendingLabel="Entrando…" className="w-full">
          Entrar
        </SubmitButton>
      </form>
      {state.unconfirmedEmail ? <ResendConfirmationForm email={state.unconfirmedEmail} /> : null}
    </div>
  )
}

export function LoginForm({ next, notice }: LoginFormProps) {
  const [state, formAction] = useActionState(login, INITIAL_STATE)
  return <LoginFormView state={state} formAction={formAction} next={next} notice={notice} />
}
