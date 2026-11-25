'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  firstIssueMessage,
  loginSchema,
  readAuthForm,
  type AuthFormState,
} from '@/lib/validation/auth'

export async function login(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse(readAuthForm(formData))
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) {
    console.error('[login]', error)
    return { error: 'No se pudo iniciar sesión. Revisa el email y la contraseña.' }
  }

  redirect('/sitios')
}
