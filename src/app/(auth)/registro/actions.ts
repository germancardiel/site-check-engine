'use server'

import { redirect } from 'next/navigation'
import { confirmUrl } from '@/lib/next-path'
import { siteUrl } from '@/lib/site'
import { createClient } from '@/lib/supabase/server'
import {
  AUTH_MESSAGES,
  emailOnlySchema,
  firstIssueMessage,
  readAuthForm,
  readTextField,
  registerSchema,
  type AuthFormState,
} from '@/lib/validation/auth'

export async function register(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const fields = readAuthForm(formData)
  const values = { email: typeof fields.email === 'string' ? fields.email : undefined }
  const parsed = registerSchema.safeParse(fields)
  if (!parsed.success) return { error: firstIssueMessage(parsed.error), values }

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
