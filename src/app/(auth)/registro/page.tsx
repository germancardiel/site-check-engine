import type { Metadata } from 'next'
import Link from 'next/link'
import { RegisterForm } from '@/components/auth/register-form'

export const metadata: Metadata = {
  title: 'Crear cuenta · Faro',
}

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Crear cuenta</h1>
      <RegisterForm />
      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        ¿Ya tienes cuenta?{' '}
        <Link
          href="/login"
          className="font-medium underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Inicia sesión
        </Link>
      </p>
    </div>
  )
}
