import type { Metadata } from 'next'
import { AuthCard } from '@/components/auth/auth-card'
import { PasswordResetForm } from '@/components/auth/password-reset-form'
import { SITE_NAME } from '@/lib/site'

export const metadata: Metadata = {
  title: `Recuperar la contraseña · ${SITE_NAME}`,
}

export default function RecoverPage() {
  return (
    <AuthCard
      title="Recuperar la contraseña"
      intro="Escribe el email de tu cuenta y te enviaremos un enlace para elegir una contraseña nueva."
      alternate={{ question: '¿Ya la recuerdas?', href: '/login', label: 'Entrar' }}
    >
      <PasswordResetForm />
    </AuthCard>
  )
}
