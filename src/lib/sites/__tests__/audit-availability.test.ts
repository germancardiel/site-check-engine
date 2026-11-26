import { describe, expect, it } from 'vitest'
import {
  AUDIT_COOLDOWN_MS,
  auditBlockReason,
  auditCooldown,
  auditQuotaLabel,
  cooldownLabel,
  remainingAudits,
} from '@/lib/sites/audit-availability'

const NOW = new Date('2026-11-26T10:00:20.000Z')

describe('auditCooldown', () => {
  it('con la última auditoría hace 20 s quedan 40 s hasta las 10:01:00', () => {
    expect(auditCooldown('2026-11-26T10:00:00.000Z', NOW)).toEqual({
      availableAt: '2026-11-26T10:01:00.000Z',
      secondsLeft: 40,
    })
  })

  it('sin auditorías, con fecha inválida o pasado el minuto no hay espera', () => {
    expect(auditCooldown(null, NOW)).toBeNull()
    expect(auditCooldown('no-es-fecha', NOW)).toBeNull()
    expect(auditCooldown('2026-11-26T09:59:20.000Z', NOW)).toBeNull()
    expect(AUDIT_COOLDOWN_MS).toBe(60_000)
  })
})

describe('remainingAudits', () => {
  it('resta lo usado del límite diario (15) y lo acota entre 0 y el límite', () => {
    expect(remainingAudits(undefined)).toBe(15)
    expect(remainingAudits(null)).toBe(15)
    expect(remainingAudits(4)).toBe(11)
    expect(remainingAudits(15)).toBe(0)
    expect(remainingAudits(20)).toBe(0)
    expect(remainingAudits(-3)).toBe(15)
  })
})

describe('textos', () => {
  it('auditQuotaLabel distingue singular y plural', () => {
    expect(auditQuotaLabel(1)).toBe('Te queda 1 auditoría hoy.')
    expect(auditQuotaLabel(7)).toBe('Te quedan 7 auditorías hoy.')
  })

  it('cooldownLabel muestra la cuenta atrás', () => {
    expect(cooldownLabel(42)).toBe(
      'Disponible en 0:42. Hay que esperar un minuto entre dos auditorías del mismo sitio.',
    )
  })
})

describe('auditBlockReason', () => {
  it('con 0 auditorías restantes bloquea con el motivo de la cuota, aunque no haya espera', () => {
    expect(auditBlockReason(0, 0)).toBe('Has alcanzado el límite de 15 auditorías por hoy. Vuelve mañana.')
    expect(auditBlockReason(0, 30)).toBe('Has alcanzado el límite de 15 auditorías por hoy. Vuelve mañana.')
  })

  it('durante la espera bloquea con la cuenta atrás', () => {
    expect(auditBlockReason(5, 42)).toContain('Disponible en 0:42')
    expect(auditBlockReason(null, 1)).toContain('Disponible en 0:01')
  })

  it('sin espera y con cuota (o cuota desconocida) no bloquea', () => {
    expect(auditBlockReason(5, 0)).toBeNull()
    expect(auditBlockReason(null, 0)).toBeNull()
  })
})
