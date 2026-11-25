import { createClient } from '@/lib/supabase/server'

/** Email of the signed-in user (rendered inside `<Suspense>`: it reads the session cookies). */
export async function UserEmail() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return null

  return (
    <p className="min-w-0 text-sm break-all text-zinc-700 dark:text-zinc-300">
      <span className="sr-only">Has iniciado sesión como </span>
      {user.email}
    </p>
  )
}
