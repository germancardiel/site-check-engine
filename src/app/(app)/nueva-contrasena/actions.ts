'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  AUTH_MESSAGES,
  firstIssueMessage,
  newPasswordSchema,
  readTextField,
  type AuthFormState,
} from '@/lib/validation/auth'

export async function updatePassword(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = newPasswordSchema.safeParse({ password: readTextField(formData, 'password') })
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) }

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
