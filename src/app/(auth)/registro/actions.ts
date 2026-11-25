'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  firstIssueMessage,
  readAuthForm,
  registerSchema,
  type AuthFormState,
} from '@/lib/validation/auth'

export async function register(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse(readAuthForm(formData))
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp(parsed.data)
  if (error) {
    console.error('[register]', error)
    return { error: 'No se pudo crear la cuenta. Inténtalo de nuevo más tarde.' }
  }

  if (!data.session) return { message: 'Revisa tu correo para confirmar la cuenta' }

  redirect('/sitios')
}
