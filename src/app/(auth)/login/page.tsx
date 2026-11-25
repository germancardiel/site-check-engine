import type { Metadata } from 'next'
import Link from 'next/link'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Iniciar sesión · Faro',
}

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
      <LoginForm />
      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        ¿No tienes cuenta?{' '}
        <Link
          href="/registro"
          className="font-medium underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Crear cuenta
        </Link>
      </p>
    </div>
  )
}
