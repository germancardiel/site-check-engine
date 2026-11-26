import { describe, expect, it } from 'vitest'
import {
  confirmParamsSchema,
  emailOnlySchema,
  firstIssueMessage,
  loginSchema,
  loginSearchSchema,
  newPasswordSchema,
  nextFieldSchema,
  readAuthForm,
  readTextField,
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

describe('emailOnlySchema', () => {
  it('normaliza un email válido y rechaza uno inválido', () => {
    expect(emailOnlySchema.safeParse({ email: ' Ana@Example.com ' }).data).toEqual({ email: 'ana@example.com' })
    const result = emailOnlySchema.safeParse({ email: 'ana@' })
    expect(result.success).toBe(false)
    expect(firstIssueMessage(result.error!)).toBe('Introduce un email válido.')
  })
})

describe('newPasswordSchema', () => {
  it('aplica las mismas reglas de longitud que el registro', () => {
    expect(newPasswordSchema.safeParse({ password: '12345678' }).success).toBe(true)
    expect(firstIssueMessage(newPasswordSchema.safeParse({ password: '1234567' }).error!)).toBe(
      'La contraseña debe tener al menos 8 caracteres.',
    )
    expect(firstIssueMessage(newPasswordSchema.safeParse({ password: 'a'.repeat(73) }).error!)).toBe(
      'La contraseña no puede superar 72 caracteres.',
    )
  })
})

describe('nextFieldSchema', () => {
  it('acepta texto o ausencia y rechaza otros tipos o textos enormes', () => {
    expect(nextFieldSchema.safeParse('/sitios').success).toBe(true)
    expect(nextFieldSchema.safeParse(undefined).success).toBe(true)
    expect(nextFieldSchema.safeParse(42).success).toBe(false)
    expect(nextFieldSchema.safeParse('/'.repeat(4097)).success).toBe(false)
  })
})

describe('confirmParamsSchema', () => {
  it('acepta token_hash + type y descarta parámetros desconocidos', () => {
    expect(confirmParamsSchema.safeParse({ token_hash: 'abc', type: 'recovery', next: '/x', extra: '1' }).data).toEqual({
      token_hash: 'abc',
      type: 'recovery',
      next: '/x',
    })
  })

  it('acepta un code PKCE', () => {
    expect(confirmParamsSchema.safeParse({ code: 'c' }).data).toEqual({ code: 'c' })
  })

  it('rechaza token_hash sin type, type desconocido, valores vacíos o demasiado largos', () => {
    for (const params of [
      {},
      { token_hash: 'abc' },
      { token_hash: 'abc', type: 'sms' },
      { token_hash: '', type: 'signup' },
      { code: '' },
      { code: 'c'.repeat(1025) },
    ]) {
      expect(confirmParamsSchema.safeParse(params).success, JSON.stringify(params)).toBe(false)
    }
  })
})

describe('loginSearchSchema', () => {
  it('lee next y error=enlace e ignora valores no válidos', () => {
    expect(loginSearchSchema.parse({ next: '/sitios/abc', error: 'enlace', otro: 'x' })).toEqual({
      next: '/sitios/abc',
      error: 'enlace',
    })
    expect(loginSearchSchema.parse({ next: ['/a', '/b'], error: 'otro' })).toEqual({
      next: undefined,
      error: undefined,
    })
  })
})

describe('readTextField', () => {
  it('devuelve el texto o undefined si falta o no es texto', () => {
    const data = form({ email: 'ana@example.com', file: new Blob(['x']) })
    expect(readTextField(data, 'email')).toBe('ana@example.com')
    expect(readTextField(data, 'file')).toBeUndefined()
    expect(readTextField(data, 'nada')).toBeUndefined()
  })
})
