import { describe, expect, it } from 'vitest'
import { firstIssueMessage } from '@/lib/validation/auth'
import { normalizeSiteUrl, readTextField, siteIdSchema, siteSchema } from '@/lib/validation/site'

function parseUrl(url: unknown) {
  return siteSchema.safeParse({ url })
}

describe('siteSchema — casos válidos y normalización', () => {
  it.each([
    ['ejemplo.com', 'https://ejemplo.com'],
    ['  https://ejemplo.com/  ', 'https://ejemplo.com'],
    ['http://ejemplo.com', 'http://ejemplo.com'],
    ['HTTPS://WWW.Ejemplo.COM/Blog', 'https://www.ejemplo.com/Blog'],
    ['https://ejemplo.com/#inicio', 'https://ejemplo.com'],
    ['https://ejemplo.com/blog/#seccion', 'https://ejemplo.com/blog/'],
    ['https://ejemplo.com/?q=1#x', 'https://ejemplo.com?q=1'],
    ['https://ejemplo.com:443/', 'https://ejemplo.com'],
    ['ejemplo.com:8080/ruta', 'https://ejemplo.com:8080/ruta'],
  ])('normaliza %s → %s', (input, expected) => {
    const result = parseUrl(input)
    expect(result.success).toBe(true)
    expect(result.data?.url).toBe(expected)
  })

  it('acepta un nombre opcional, lo recorta y convierte el vacío en null', () => {
    expect(siteSchema.parse({ url: 'ejemplo.com', name: '  Mi web ' }).name).toBe('Mi web')
    expect(siteSchema.parse({ url: 'ejemplo.com', name: '   ' }).name).toBeNull()
    expect(siteSchema.parse({ url: 'ejemplo.com' }).name).toBeNull()
  })

  it('acepta un nombre de exactamente 80 caracteres', () => {
    expect(siteSchema.safeParse({ url: 'ejemplo.com', name: 'a'.repeat(80) }).success).toBe(true)
  })
})

describe('siteSchema — casos inválidos', () => {
  it.each([
    ['', 'Introduce una URL válida, por ejemplo https://ejemplo.com.'],
    ['   ', 'Introduce una URL válida, por ejemplo https://ejemplo.com.'],
    ['hola', 'Introduce una URL válida, por ejemplo https://ejemplo.com.'],
    ['https://', 'Introduce una URL válida, por ejemplo https://ejemplo.com.'],
    ['javascript:alert(1)', 'Introduce una URL válida, por ejemplo https://ejemplo.com.'],
    ['ftp://ejemplo.com', 'Solo se admiten direcciones http:// o https://.'],
    ['file:///etc/passwd', 'Solo se admiten direcciones http:// o https://.'],
    ['https://user:pass@ejemplo.com', 'La URL no puede incluir usuario ni contraseña.'],
    ['https://user@ejemplo.com', 'La URL no puede incluir usuario ni contraseña.'],
  ])('rechaza %j', (input, message) => {
    const result = parseUrl(input)
    expect(result.success).toBe(false)
    expect(firstIssueMessage(result.error!)).toBe(message)
  })

  it('rechaza una URL ausente o que no es texto', () => {
    expect(parseUrl(undefined).success).toBe(false)
    expect(parseUrl(42).success).toBe(false)
  })

  it('rechaza una URL demasiado larga', () => {
    expect(parseUrl(`https://ejemplo.com/${'a'.repeat(2100)}`).success).toBe(false)
  })

  it('rechaza un nombre de más de 80 caracteres con mensaje en español', () => {
    const result = siteSchema.safeParse({ url: 'ejemplo.com', name: 'a'.repeat(81) })
    expect(result.success).toBe(false)
    expect(firstIssueMessage(result.error!)).toBe('El nombre no puede superar 80 caracteres.')
  })
})

describe('normalizeSiteUrl', () => {
  it('acepta IPv6 entre corchetes (el fetcher decide si se puede auditar)', () => {
    expect(normalizeSiteUrl('https://[2001:db8::1]/')).toEqual({
      ok: true,
      url: 'https://[2001:db8::1]',
    })
  })
})

describe('siteIdSchema', () => {
  it('acepta un uuid', () => {
    expect(siteIdSchema.safeParse({ id: '3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e' }).success).toBe(true)
  })

  it('rechaza un id que no es uuid', () => {
    const result = siteIdSchema.safeParse({ id: '1; drop table sites' })
    expect(result.success).toBe(false)
    expect(firstIssueMessage(result.error!)).toBe('El sitio no es válido.')
  })
})

describe('readTextField', () => {
  it('lee texto y devuelve undefined si falta o no es texto', () => {
    const data = new FormData()
    data.set('url', 'ejemplo.com')
    data.set('file', new Blob(['x']))
    expect(readTextField(data, 'url')).toBe('ejemplo.com')
    expect(readTextField(data, 'file')).toBeUndefined()
    expect(readTextField(data, 'name')).toBeUndefined()
  })
})
