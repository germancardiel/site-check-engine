'use server'

import { confirmUrl } from '@/lib/next-path'
import { siteUrl } from '@/lib/site'
import { createClient } from '@/lib/supabase/server'
import {
  AUTH_FIELDS,
  AUTH_MESSAGES,
  AUTH_VALUE_FIELDS,
  emailOnlySchema,
  readTextField,
  type AuthFormState,
} from '@/lib/validation/auth'
import { readFormValues, validationErrorState } from '@/lib/validation/form-state'

/**
 * Sends the password reset email. The answer never reveals whether the account exists:
 * Supabase errors are only logged and the same message is always returned.
 */
export async function requestPasswordReset(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = emailOnlySchema.safeParse({ email: readTextField(formData, 'email') })
  if (!parsed.success) {
    return { ...validationErrorState(parsed.error, AUTH_FIELDS), values: readFormValues(formData, AUTH_VALUE_FIELDS) }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: confirmUrl(siteUrl(), '/nueva-contrasena'),
  })
  if (error) console.error('[requestPasswordReset]', error)

  return { message: AUTH_MESSAGES.recoverySent }
}
