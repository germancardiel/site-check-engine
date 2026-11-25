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

/** Landing CTAs: sign-up and login for visitors, "Ir a tus sitios" for signed-in users. */
export function LandingCtas() {
  return (
    <Suspense fallback={<GuestCtas />}>
      <SessionCtas />
    </Suspense>
  )
}
