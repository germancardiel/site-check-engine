import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { smokeCredentials, smokeGet, type SmokeCredentials } from './env'
import { firstSiteId, signIn, signOut, type SmokeSession } from './session'

/** Texts of the `error.tsx` boundaries that must never show up on a healthy page. */
const ERROR_TEXTS = [
  'No se pudieron cargar tus sitios.',
  'No se pudo cargar el sitio.',
  'Ha ocurrido un error inesperado.',
]

const { credentials, missing } = smokeCredentials()

const title = credentials
  ? 'smoke con sesión (usuario demo, solo lectura)'
  : `smoke con sesión OMITIDO: faltan ${missing.join(', ')} en .env.local`

function assertNoErrorBoundary(html: string): void {
  const shown = ERROR_TEXTS.filter((text) => html.includes(text))
  expect(shown, 'La página muestra el estado de error').toEqual([])
}

describe.skipIf(!credentials)(title, () => {
  let session: SmokeSession | null = null

  beforeAll(async () => {
    if (credentials) session = await signIn(credentials)
  })

  afterAll(async () => {
    if (credentials && session) await signOut(credentials, session)
  })

  function current(): { credentials: SmokeCredentials; session: SmokeSession } {
    if (!credentials || !session) throw new Error('No hay sesión de smoke.')
    return { credentials, session }
  }

  it('GET /sitios → 200 con el email del demo y sin estado de error', async () => {
    const { credentials: demo, session: active } = current()
    const response = await smokeGet('/sitios', active.cookie)
    const html = await response.text()
    expect(response.status).toBe(200)
    expect(html.includes(demo.email), 'El HTML de /sitios no contiene el email del demo').toBe(true)
    assertNoErrorBoundary(html)
  })

  it('GET del primer sitio del demo → 200 (si tiene alguno)', async () => {
    const { credentials: demo, session: active } = current()
    const siteId = await firstSiteId(demo, active)
    if (!siteId) {
      console.warn('[smoke] El usuario demo no tiene sitios: se omite la página de detalle.')
      return
    }
    const response = await smokeGet(`/sitios/${siteId}`, active.cookie)
    const html = await response.text()
    expect(response.status).toBe(200)
    assertNoErrorBoundary(html)
  })
})
