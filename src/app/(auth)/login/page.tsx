import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AuthCard } from '@/components/auth/auth-card'
import { LoginForm } from '@/components/auth/login-form'
import { safeNextPath } from '@/lib/next-path'
import { SITE_NAME } from '@/lib/site'
import { AUTH_MESSAGES, loginSearchSchema } from '@/lib/validation/auth'

export const metadata: Metadata = {
  title: `Iniciar sesión · ${SITE_NAME}`,
}

type LoginPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> }

/** Reads `?next=` and `?error=enlace` (request-time data, so it streams inside `<Suspense>`). */
async function LoginWithParams({ searchParams }: LoginPageProps) {
  const parsed = loginSearchSchema.safeParse(await searchParams)
  const params = parsed.success ? parsed.data : {}
  const next = safeNextPath(params.next, '') || undefined
  const notice = params.error === 'enlace' ? AUTH_MESSAGES.invalidLink : undefined
  return <LoginForm next={next} notice={notice} />
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <AuthCard
      title="Iniciar sesión"
      intro="Entra para ver tus sitios, sus auditorías y su evolución."
      alternate={{ question: '¿No tienes cuenta?', href: '/registro', label: 'Crear cuenta' }}
    >
      <Suspense fallback={<LoginForm />}>
        <LoginWithParams searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  )
}
