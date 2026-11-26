import { describe, expect, it, vi } from 'vitest'
import { NETWORK_ERROR, runSafely, withNetworkFallback } from '@/lib/action-safety'

type State = { error?: string; message?: string; values?: { url?: string } }

describe('runSafely', () => {
  it('devuelve el resultado de la función si no lanza', async () => {
    expect(await runSafely('scope', 'fallback', async () => 'ok')).toBe('ok')
  })

  it('si lanza registra el detalle y devuelve el valor genérico', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const boom = new Error('ECONNRESET')
    const result = await runSafely<State>('createSite', { error: 'genérico' }, async () => {
      throw boom
    })
    expect(result).toEqual({ error: 'genérico' })
    expect(log).toHaveBeenCalledWith('[createSite]', boom)
    log.mockRestore()
  })
})

describe('withNetworkFallback', () => {
  const form = () => {
    const data = new FormData()
    data.set('url', 'ejemplo.com')
    return data
  }
  const onError = (formData: FormData): State => ({ error: NETWORK_ERROR, values: { url: String(formData.get('url')) } })

  it('devuelve el estado de la action si responde', async () => {
    const action = vi.fn(async () => ({ message: 'Hecho' }))
    const wrapped = withNetworkFallback<State>(action, onError, () => {})
    expect(await wrapped({}, form())).toEqual({ message: 'Hecho' })
  })

  it('si la llamada falla por red devuelve un error recuperable y conserva lo escrito', async () => {
    const wrapped = withNetworkFallback<State>(
      async () => {
        throw new TypeError('Failed to fetch')
      },
      onError,
      () => {},
    )
    expect(await wrapped({}, form())).toEqual({
      error: 'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.',
      values: { url: 'ejemplo.com' },
    })
  })

  it('deja pasar los errores del framework (redirect) para que naveguen', async () => {
    const redirectError = new Error('NEXT_REDIRECT')
    const rethrow = (error: unknown) => {
      if (error === redirectError) throw error
    }
    const wrapped = withNetworkFallback<State>(
      async () => {
        throw redirectError
      },
      onError,
      rethrow,
    )
    await expect(wrapped({}, form())).rejects.toBe(redirectError)
  })
})
