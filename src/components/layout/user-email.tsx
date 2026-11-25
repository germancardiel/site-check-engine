import { createClient } from '@/lib/supabase/server'

/** Email of the signed-in user (rendered inside `<Suspense>`: it reads the session cookies). */
export async function UserEmail() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return null

  return (
    <p className="min-w-0 truncate font-mono text-xs text-ink-muted" title={user.email}>
      <span className="sr-only">Has iniciado sesión como </span>
      {user.email}
    </p>
  )
}
