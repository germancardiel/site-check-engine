import { connection } from 'next/server'
import { Suspense } from 'react'
import { ButtonLink } from '@/components/ui/button-link'
import { createClient } from '@/lib/supabase/server'

const ROW = 'flex flex-wrap items-center gap-3'

function GuestCtas() {
  return (
    <div className={ROW}>
      <ButtonLink href="/registro">Crear cuenta gratis</ButtonLink>
      <ButtonLink href="/login" variant="secondary">
        Entrar
      </ButtonLink>
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
