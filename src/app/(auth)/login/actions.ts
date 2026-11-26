'use server'

import { redirect } from 'next/navigation'
import { safeNextPath } from '@/lib/next-path'
import { createClient } from '@/lib/supabase/server'
import {
  AUTH_FIELDS,
  AUTH_MESSAGES,
  AUTH_VALUE_FIELDS,
  loginSchema,
  nextFieldSchema,
  readAuthForm,
  readTextField,
  type AuthFormState,
} from '@/lib/validation/auth'
import { readFormValues, validationErrorState } from '@/lib/validation/form-state'

export async function login(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const fields = readAuthForm(formData)
  const values = readFormValues(formData, AUTH_VALUE_FIELDS)
  const parsed = loginSchema.safeParse(fields)
  if (!parsed.success) return { ...validationErrorState(parsed.error, AUTH_FIELDS), values }
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
