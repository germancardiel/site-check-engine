import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { AuthCard } from '@/components/auth/auth-card'
import { NewPasswordForm } from '@/components/auth/new-password-form'
import { SITE_NAME } from '@/lib/site'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: `Nueva contraseña · ${SITE_NAME}`,
}

/** Requires a session (the recovery link creates it in `/auth/confirm`). */
async function NewPasswordContent() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <NewPasswordForm />
}

export default function NewPasswordPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-12 sm:py-16">
      <AuthCard
        title="Nueva contraseña"
        intro="Elige la contraseña con la que entrarás a partir de ahora."
        alternate={{ question: '¿No quieres cambiarla?', href: '/sitios', label: 'Volver a tus sitios' }}
      >
        <Suspense fallback={<p className="text-sm text-ink-muted">Comprobando la sesión…</p>}>
          <NewPasswordContent />
        </Suspense>
      </AuthCard>
    </div>
  )
}
