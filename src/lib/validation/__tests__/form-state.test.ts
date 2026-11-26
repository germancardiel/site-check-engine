import { z } from 'zod'
import { describe, expect, it } from 'vitest'
import { registerSchema } from '@/lib/validation/auth'
import { readFormValues, validationErrorState, zodFieldErrors } from '@/lib/validation/form-state'
import { siteSchema } from '@/lib/validation/site'

function errorOf(schema: z.ZodType, input: unknown): z.ZodError {
  const parsed = schema.safeParse(input)
  if (parsed.success) throw new Error('se esperaba un error de validación')
  return parsed.error
}

describe('zodFieldErrors', () => {
  it('devuelve el error de cada campo, no solo el primero', () => {
    const error = errorOf(registerSchema, { email: 'ana', password: '123' })
    expect(zodFieldErrors(error, ['email', 'password'])).toEqual({
      email: 'Introduce un email válido.',
      password: 'La contraseña debe tener al menos 8 caracteres.',
    })
  })

  it('se queda con el primer mensaje de un campo con varias incidencias', () => {
    const schema = z.object({ code: z.string().min(3, 'corto').regex(/^\d+$/, 'solo dígitos') })
    expect(zodFieldErrors(errorOf(schema, { code: 'a' }), ['code'])).toEqual({ code: 'corto' })
  })

  it('ignora las incidencias de campos que no son del formulario o sin ruta', () => {
    const schema = z.object({ a: z.string(), b: z.string() }).refine(() => false, 'general')
    expect(zodFieldErrors(errorOf(schema, { a: 1, b: 'x' }), ['b'])).toEqual({})
    expect(zodFieldErrors(errorOf(schema, { a: 'x', b: 'y' }), ['a', 'b'])).toEqual({})
  })
})

describe('validationErrorState', () => {
  it('con errores de campo devuelve solo fieldErrors', () => {
    const error = errorOf(siteSchema, { url: 'ftp://ejemplo.com', name: 'x'.repeat(81) })
    expect(validationErrorState(error, ['url', 'name'])).toEqual({
      fieldErrors: {
        url: 'Solo se admiten direcciones http:// o https://.',
        name: 'El nombre no puede superar 80 caracteres.',
      },
    })
  })

  it('sin errores de campo devuelve un error general con el primer mensaje', () => {
    const schema = z.object({ a: z.string() }).refine(() => false, 'general')
    expect(validationErrorState(errorOf(schema, { a: 'x' }), ['a'])).toEqual({ error: 'general' })
  })

  it('usa un mensaje genérico si zod no trae incidencias', () => {
    expect(validationErrorState(new z.ZodError([]), ['a'])).toEqual({ error: 'Revisa los datos del formulario.' })
  })
})

describe('readFormValues', () => {
  it('lee solo los campos pedidos y omite los ausentes o no textuales', () => {
    const data = new FormData()
    data.set('url', ' ejemplo.com ')
    data.set('password', 'secreto123')
    data.set('name', new Blob(['x']))
    expect(readFormValues(data, ['url', 'name', 'email'])).toEqual({ url: ' ejemplo.com ' })
  })
})
