import { describe, expect, it } from 'vitest'
import { AUDIT_DAILY_LIMIT, AUDIT_LIMIT_MESSAGE, MAX_SITES, SITE_LIMIT_MESSAGE } from '@/lib/limits'

describe('limits', () => {
  it('coinciden con los topes fijos de la BD (D-SEC-10)', () => {
    expect(MAX_SITES).toBe(10)
    expect(AUDIT_DAILY_LIMIT).toBe(15)
  })

  it('los mensajes citan cada límite', () => {
    expect(SITE_LIMIT_MESSAGE).toBe('Has llegado al máximo de 10 sitios. Borra uno para añadir otro.')
    expect(AUDIT_LIMIT_MESSAGE).toBe('Has alcanzado el límite de 15 auditorías por hoy. Vuelve mañana.')
  })
})
