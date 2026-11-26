'use server'

import { redirect } from 'next/navigation'
import { confirmUrl } from '@/lib/next-path'
import { siteUrl } from '@/lib/site'
import { createClient } from '@/lib/supabase/server'
import {
  AUTH_FIELDS,
  AUTH_MESSAGES,
  AUTH_VALUE_FIELDS,
  emailOnlySchema,
  firstIssueMessage,
  readAuthForm,
  readTextField,
  registerSchema,
  type AuthFormState,
} from '@/lib/validation/auth'
import { readFormValues, validationErrorState } from '@/lib/validation/form-state'

export async function register(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const fields = readAuthForm(formData)
  const values = readFormValues(formData, AUTH_VALUE_FIELDS)
  const parsed = registerSchema.safeParse(fields)
  if (!parsed.success) return { ...validationErrorState(parsed.error, AUTH_FIELDS), values }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: confirmUrl(siteUrl()) },
  })
  if (error) {
    console.error('[register]', error)
    return { error: AUTH_MESSAGES.registerError, values }
  }

  if (!data.session) return { sentTo: parsed.data.email }

  redirect('/sitios')
}

/** Sends the sign-up confirmation email again (from the sign-up card or from the login form). */
export async function resendConfirmation(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = emailOnlySchema.safeParse({ email: readTextField(formData, 'email') })
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) }

  const supabase = await createClient()
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: parsed.data.email,
    options: { emailRedirectTo: confirmUrl(siteUrl()) },
  })
  if (error) {
    console.error('[resendConfirmation]', error)
    return { error: AUTH_MESSAGES.resendError }
  }
  return { message: AUTH_MESSAGES.resendOk }
}
