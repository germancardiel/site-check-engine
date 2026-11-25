import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { SubmitButton } from '@/components/ui/submit-button'
import { createClient } from '@/lib/supabase/server'
import { logout } from './actions'

export const metadata: Metadata = {
  title: 'Sitios · Faro',
}

async function CurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <p className="text-zinc-700 dark:text-zinc-300">
      Has iniciado sesión como{' '}
      <span className="font-medium break-all text-zinc-900 dark:text-zinc-100">{user.email}</span>
    </p>
  )
}

export default function SitesPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Tus sitios</h1>
        <form action={logout}>
          <SubmitButton variant="secondary" pendingLabel="Cerrando sesión…">
            Cerrar sesión
          </SubmitButton>
        </form>
      </div>
      <Suspense fallback={<p className="text-zinc-700 dark:text-zinc-300">Cargando tu cuenta…</p>}>
        <CurrentUser />
      </Suspense>
    </main>
  )
}
