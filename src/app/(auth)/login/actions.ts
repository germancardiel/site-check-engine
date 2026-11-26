'use server'

import { redirect } from 'next/navigation'
import { safeNextPath } from '@/lib/next-path'
import { createClient } from '@/lib/supabase/server'
import {
  AUTH_MESSAGES,
  firstIssueMessage,
  loginSchema,
  nextFieldSchema,
  readAuthForm,
  readTextField,
  type AuthFormState,
} from '@/lib/validation/auth'

export async function login(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const fields = readAuthForm(formData)
  const values = { email: typeof fields.email === 'string' ? fields.email : undefined }
  const parsed = loginSchema.safeParse(fields)
  if (!parsed.success) return { error: firstIssueMessage(parsed.error), values }
  const nextField = nextFieldSchema.safeParse(readTextField(formData, 'next'))
  // D-SEC-14: only internal paths; anything else goes to /sitios.
  const next = safeNextPath(nextField.success ? nextField.data : undefined)

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) {
    console.error('[login]', error)
    if (error.code === 'email_not_confirmed') {
      return { error: AUTH_MESSAGES.unconfirmed, values, unconfirmedEmail: parsed.data.email }
    }
    return { error: AUTH_MESSAGES.loginError, values }
  }

  redirect(next)
}
