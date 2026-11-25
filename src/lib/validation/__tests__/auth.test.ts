import { describe, expect, it } from 'vitest'
import {
  firstIssueMessage,
  loginSchema,
  readAuthForm,
  registerSchema,
} from '@/lib/validation/auth'

function form(entries: Record<string, string | Blob>): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries(entries)) data.append(key, value)
  return data
}

describe('loginSchema', () => {
  it('acepta un email y una contraseña', () => {
    const result = loginSchema.safeParse({ email: ' Ana@Example.com ', password: 'x' })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ email: 'ana@example.com', password: 'x' })
  })

  it('rechaza un email inválido con mensaje en español', () => {
    const result = loginSchema.safeParse({ email: 'no-es-email', password: 'secreto123' })
    expect(result.success).toBe(false)
    expect(firstIssueMessage(result.error!)).toBe('Introduce un email válido.')
  })

  it('rechaza un email ausente', () => {
    const result = loginSchema.safeParse({ email: undefined, password: 'secreto123' })
    expect(result.success).toBe(false)
    expect(firstIssueMessage(result.error!)).toBe('Introduce un email válido.')
  })

  it('rechaza una contraseña vacía', () => {
    const result = loginSchema.safeParse({ email: 'ana@example.com', password: '' })
    expect(result.success).toBe(false)
    expect(firstIssueMessage(result.error!)).toBe('Introduce tu contraseña.')
  })
})

describe('registerSchema', () => {
  it('acepta una contraseña de 8 caracteres', () => {
    expect(registerSchema.safeParse({ email: 'ana@example.com', password: '12345678' }).success).toBe(
      true,
    )
  })

  it('rechaza una contraseña de 7 caracteres', () => {
    const result = registerSchema.safeParse({ email: 'ana@example.com', password: '1234567' })
    expect(result.success).toBe(false)
    expect(firstIssueMessage(result.error!)).toBe(
      'La contraseña debe tener al menos 8 caracteres.',
    )
  })

  it('rechaza una contraseña de más de 72 caracteres', () => {
    const result = registerSchema.safeParse({ email: 'ana@example.com', password: 'a'.repeat(73) })
    expect(result.success).toBe(false)
    expect(firstIssueMessage(result.error!)).toBe('La contraseña no puede superar 72 caracteres.')
  })

  it('rechaza un email inválido', () => {
    const result = registerSchema.safeParse({ email: 'ana@', password: '12345678' })
    expect(result.success).toBe(false)
    expect(firstIssueMessage(result.error!)).toBe('Introduce un email válido.')
  })

  it('rechaza una contraseña ausente', () => {
    const result = registerSchema.safeParse({ email: 'ana@example.com' })
    expect(result.success).toBe(false)
    expect(firstIssueMessage(result.error!)).toBe(
      'La contraseña debe tener al menos 8 caracteres.',
    )
  })
})

describe('firstIssueMessage', () => {
  it('usa un mensaje genérico si no hay issues', () => {
    const empty = registerSchema.safeParse({ email: 'ana@example.com', password: '12345678' })
    expect(empty.success).toBe(true)
    const fake = { issues: [] } as unknown as Parameters<typeof firstIssueMessage>[0]
    expect(firstIssueMessage(fake)).toBe('Revisa los datos del formulario.')
  })
})

describe('readAuthForm', () => {
  it('lee email y contraseña de texto', () => {
    expect(readAuthForm(form({ email: 'ana@example.com', password: 'x' }))).toEqual({
      email: 'ana@example.com',
      password: 'x',
    })
  })

  it('devuelve undefined para campos ausentes o que no son texto', () => {
    expect(readAuthForm(form({ password: new Blob(['x']) }))).toEqual({
      email: undefined,
      password: undefined,
    })
  })
})
