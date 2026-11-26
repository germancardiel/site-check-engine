'use server'

import { confirmUrl } from '@/lib/next-path'
import { siteUrl } from '@/lib/site'
import { createClient } from '@/lib/supabase/server'
import { AUTH_MESSAGES, emailOnlySchema, firstIssueMessage, readTextField, type AuthFormState } from '@/lib/validation/auth'

/**
 * Sends the password reset email. The answer never reveals whether the account exists:
 * Supabase errors are only logged and the same message is always returned.
 */
export async function requestPasswordReset(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = readTextField(formData, 'email')
  const parsed = emailOnlySchema.safeParse({ email })
  if (!parsed.success) return { error: firstIssueMessage(parsed.error), values: { email } }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: confirmUrl(siteUrl(), '/nueva-contrasena'),
  })
  if (error) console.error('[requestPasswordReset]', error)

  return { message: AUTH_MESSAGES.recoverySent }
}
