import { describe, expect, it } from 'vitest'
import { smokeBaseUrl, smokeGet } from './env'

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/registro',
  '/robots.txt',
  '/sitemap.xml',
  '/llms.txt',
  '/opengraph-image',
]

describe(`smoke público (${smokeBaseUrl()})`, () => {
  it.each(PUBLIC_PATHS)('GET %s → 200', async (path) => {
    const response = await smokeGet(path)
    await response.body?.cancel()
    expect(response.status).toBe(200)
  })

  it('GET /no-existe-xyz → 404 con la página "no encontrada" raíz', async () => {
    const response = await smokeGet('/no-existe-xyz')
    const html = await response.text()
    expect(response.status).toBe(404)
    expect(html.includes('Página no encontrada'), 'Falta el not-found raíz').toBe(true)
  })

  it('GET /sitios sin sesión → 307 a /login', async () => {
    const response = await smokeGet('/sitios')
    await response.body?.cancel()
    expect(response.status).toBe(307)
    const location = response.headers.get('location') ?? ''
    expect(new URL(location, smokeBaseUrl()).pathname).toBe('/login')
  })
})
