'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/** Signs the current user out. Takes no input, so there is nothing to validate. */
export async function logout(): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { error } = await supabase.auth.signOut()
    if (error) console.error('[logout]', error)
  }

  redirect('/login')
}
