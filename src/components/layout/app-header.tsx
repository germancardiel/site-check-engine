import { Suspense } from 'react'
import { logout } from '@/app/(app)/sitios/actions'
import { SubmitButton } from '@/components/ui/submit-button'
import { BrandLink } from './brand-link'
import { MainNav, NavLinks } from './main-nav'
import { UserEmail } from './user-email'

/** Header of the private area: wordmark, navigation, user email and "Cerrar sesión". */
export function AppHeader() {
  return (
    <header className="w-full border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <BrandLink href="/sitios" />
          <nav aria-label="Principal">
            <Suspense fallback={<NavLinks pathname={null} />}>
              <MainNav />
            </Suspense>
          </nav>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
          <Suspense fallback={<p className="text-sm text-zinc-700 dark:text-zinc-300">Cargando usuario…</p>}>
            <UserEmail />
          </Suspense>
          <form action={logout}>
            <SubmitButton variant="secondary" pendingLabel="Cerrando sesión…">
              Cerrar sesión
            </SubmitButton>
          </form>
        </div>
      </div>
    </header>
  )
}
