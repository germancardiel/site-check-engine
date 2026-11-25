import type { Metadata } from 'next'
import { AuthCard } from '@/components/auth/auth-card'
import { RegisterForm } from '@/components/auth/register-form'
import { SITE_NAME } from '@/lib/site'

export const metadata: Metadata = {
  title: `Crear cuenta · ${SITE_NAME}`,
}

export default function RegisterPage() {
  return (
    <AuthCard
      title="Crear cuenta"
      intro="Es gratis y solo necesitas un email. Después podrás añadir tu primer sitio y auditarlo."
      alternate={{ question: '¿Ya tienes cuenta?', href: '/login', label: 'Entrar' }}
    >
      <RegisterForm />
    </AuthCard>
  )
}
