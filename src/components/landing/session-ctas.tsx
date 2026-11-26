import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { ButtonLink } from '@/components/ui/button-link'
import { createClient } from '@/lib/supabase/server'

const ROW = 'flex flex-wrap items-center gap-x-5 gap-y-3'

function GuestCtas() {
  return (
    <div className={ROW}>
      <ButtonLink href="/registro" className="min-h-11 px-5">
        Crear cuenta gratis
      </ButtonLink>
      <Link
        href="/login"
        className="rounded-sm text-sm font-semibold text-ink underline decoration-line-strong transition-colors duration-200 ease-out hover:decoration-ink"
      >
        Entrar
      </Link>
    </div>
  )
}

async function hasSession(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return Boolean(user)
  } catch (error) {
    console.error('[LandingCtas]', error)
    return false
  }
}

export async function SessionCtas() {
  // Per-request part of an otherwise static page: only this hole reads the session.
  await connection()
  if (!(await hasSession())) return <GuestCtas />
  return (
    <div className={ROW}>
      <ButtonLink href="/sitios">Ir a tus sitios</ButtonLink>
    </div>
  )
}

const HEADER_LINK =
  'inline-flex min-h-10 items-center rounded-sm text-sm font-semibold text-ink underline decoration-line-strong transition-colors duration-200 ease-out hover:decoration-ink'

function HeaderLoginLink() {
  return (
    <Link href="/login" className={HEADER_LINK}>
      Entrar
    </Link>
  )
}

/** Header access link: "Entrar" for visitors, "Ir a mis sitios" for signed-in users. */
export async function HeaderSessionLink() {
  await connection()
  if (!(await hasSession())) return <HeaderLoginLink />
  return (
    <Link href="/sitios" className={HEADER_LINK}>
      Ir a mis sitios
    </Link>
  )
}

/** The header link inside its own `<Suspense>`: the static shell shows "Entrar". */
export function LandingHeaderAccess() {
  return (
    <Suspense fallback={<HeaderLoginLink />}>
      <HeaderSessionLink />
    </Suspense>
  )
}

/** Landing CTAs: sign-up and login for visitors, "Ir a tus sitios" for signed-in users. */
export function LandingCtas() {
  return (
    <Suspense fallback={<GuestCtas />}>
      <SessionCtas />
    </Suspense>
  )
}
