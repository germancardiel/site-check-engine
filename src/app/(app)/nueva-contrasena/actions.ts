'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  AUTH_FIELDS,
  AUTH_MESSAGES,
  newPasswordSchema,
  readTextField,
  type AuthFormState,
} from '@/lib/validation/auth'
import { validationErrorState } from '@/lib/validation/form-state'

export async function updatePassword(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = newPasswordSchema.safeParse({ password: readTextField(formData, 'password') })
  if (!parsed.success) return validationErrorState(parsed.error, AUTH_FIELDS)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) {
    console.error('[updatePassword]', error)
    return { error: error.code === 'same_password' ? AUTH_MESSAGES.samePassword : AUTH_MESSAGES.updatePasswordError }
  }

  redirect('/sitios')
}
