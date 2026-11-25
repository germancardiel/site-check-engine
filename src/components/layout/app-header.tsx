import { Suspense } from 'react'
import { logout } from '@/app/(app)/sitios/actions'
import { SubmitButton } from '@/components/ui/submit-button'
import { BrandLink } from './brand-link'
import { MainNav, NavLinks } from './main-nav'
import { UserEmail } from './user-email'

/** Thin header of the private area: wordmark, navigation, user email and "Cerrar sesión". */
export function AppHeader() {
  return (
    <header className="w-full border-b border-line">
      <div className="mx-auto flex min-h-14 w-full max-w-app flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <BrandLink href="/sitios" />
          <nav aria-label="Principal">
            <Suspense fallback={<NavLinks pathname={null} />}>
              <MainNav />
            </Suspense>
          </nav>
        </div>
        <div className="flex min-w-0 max-w-full items-center gap-x-4">
          <Suspense fallback={<p className="text-xs text-ink-muted">Cargando usuario…</p>}>
            <UserEmail />
          </Suspense>
          <form action={logout} className="shrink-0">
            <SubmitButton variant="quiet" pendingLabel="Cerrando sesión…" className="min-h-8 px-0">
              Cerrar sesión
            </SubmitButton>
          </form>
        </div>
      </div>
    </header>
  )
}
