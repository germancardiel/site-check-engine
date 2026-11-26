import { z } from 'zod'

const EMAIL_ERROR = 'Introduce un email válido.'
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 72

const emailSchema = z
  .string({ error: EMAIL_ERROR })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: EMAIL_ERROR }))

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ error: 'Introduce tu contraseña.' }).min(1, 'Introduce tu contraseña.'),
})

const newPassword = z
  .string({ error: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.` })
  .min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`)
  .max(PASSWORD_MAX_LENGTH, `La contraseña no puede superar ${PASSWORD_MAX_LENGTH} caracteres.`)

export const registerSchema = z.object({
  email: emailSchema,
  password: newPassword,
})

/** Password reset request and confirmation-email resend: only the email. */
export const emailOnlySchema = z.object({ email: emailSchema })

/** New password after a recovery link: same rules as the sign-up password. */
export const newPasswordSchema = z.object({ password: newPassword })

/** Optional `next` sent by the login form; it is validated as an internal path afterwards (D-SEC-14). */
export const nextFieldSchema = z.string().max(4096).optional()

export const EMAIL_OTP_TYPES = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'] as const
const TOKEN_MAX_LENGTH = 1024

/** Query of `/auth/confirm`: an email OTP (`token_hash` + `type`) or a PKCE `code`. */
export const confirmParamsSchema = z.union([
  z.object({
    token_hash: z.string().min(1).max(TOKEN_MAX_LENGTH),
    type: z.enum(EMAIL_OTP_TYPES),
    next: nextFieldSchema,
  }),
  z.object({
    code: z.string().min(1).max(TOKEN_MAX_LENGTH),
    next: nextFieldSchema,
  }),
])

export type ConfirmParams = z.infer<typeof confirmParamsSchema>

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>

/** Returns the first validation message, to show a single error in the form. */
export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Revisa los datos del formulario.'
}

/** Reads the auth fields from a form, keeping `undefined` for missing or non-text values. */
export function readAuthForm(formData: FormData): { email: unknown; password: unknown } {
  const email = formData.get('email')
  const password = formData.get('password')
  return {
    email: typeof email === 'string' ? email : undefined,
    password: typeof password === 'string' ? password : undefined,
  }
}

/** Reads an optional text field, keeping `undefined` for missing or non-text values. */
export function readTextField(formData: FormData, name: string): string | undefined {
  const value = formData.get(name)
  return typeof value === 'string' ? value : undefined
}

/** State returned by the auth server actions to their forms. */
export type AuthFormState = {
  error?: string
  message?: string
  /** Non-sensitive values to refill the form after an error (never the password). */
  values?: { email?: string }
  /** Sign-up without session: address the confirmation email was sent to. */
  sentTo?: string
  /** Login rejected because the email is not confirmed yet: address to resend the email to. */
  unconfirmedEmail?: string
}

/** User-facing messages of the auth flows (generic: never Supabase's own text, D-SEC-08). */
export const AUTH_MESSAGES = {
  loginError: 'No se pudo iniciar sesión. Revisa el email y la contraseña.',
  unconfirmed: 'Confirma tu email antes de entrar.',
  registerError: 'No se pudo crear la cuenta. Inténtalo de nuevo más tarde.',
  resendOk: 'Te hemos enviado otro correo. Puede tardar unos minutos en llegar.',
  resendError: 'No se pudo reenviar el correo. Espera un minuto e inténtalo de nuevo.',
  recoverySent: 'Si existe una cuenta con ese email, te hemos enviado un enlace.',
  updatePasswordError: 'No se pudo cambiar la contraseña. Inténtalo de nuevo.',
  samePassword: 'La nueva contraseña debe ser distinta de la anterior.',
  invalidLink: 'El enlace no es válido o ha caducado. Pide uno nuevo.',
} as const

/** Query of `/login`: `next` (validated later as an internal path) and `error=enlace`. Anything else is ignored. */
export const loginSearchSchema = z.object({
  next: z.string().optional().catch(undefined),
  error: z.literal('enlace').optional().catch(undefined),
})
