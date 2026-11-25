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

export const registerSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.` })
    .min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`)
    .max(PASSWORD_MAX_LENGTH, `La contraseña no puede superar ${PASSWORD_MAX_LENGTH} caracteres.`),
})

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

/** State returned by the auth server actions to their forms. */
export type AuthFormState = {
  error?: string
  message?: string
}
