import type { Metadata } from 'next'
import { AuthCard } from '@/components/auth/auth-card'
import { LoginForm } from '@/components/auth/login-form'
import { SITE_NAME } from '@/lib/site'

export const metadata: Metadata = {
  title: `Iniciar sesión · ${SITE_NAME}`,
}

export default function LoginPage() {
  return (
    <AuthCard
      title="Iniciar sesión"
      intro="Entra para ver tus sitios, sus auditorías y su evolución."
      alternate={{ question: '¿No tienes cuenta?', href: '/registro', label: 'Crear cuenta' }}
    >
      <LoginForm />
    </AuthCard>
  )
}
