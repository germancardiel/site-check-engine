import { describe, expect, it } from 'vitest'
import { buildHistory, formatScoreDelta, HISTORY_LIMIT, type HistoryAudit } from '../history'

let counter = 0
function audit(score: number | null, status: HistoryAudit['status'] = 'ok'): HistoryAudit {
  counter += 1
  return {
    id: `audit-${counter}`,
    status,
    score: status === 'ok' ? score : null,
    seo_score: status === 'ok' ? score : null,
    ai_score: status === 'ok' ? score : null,
    error: status === 'error' ? 'La página tardó demasiado en responder.' : null,
    created_at: new Date(Date.UTC(2026, 10, 1, 0, counter)).toISOString(),
  }
}

/** Builds audits from oldest to newest and returns them newest first, as the query does. */
function newestFirst(...audits: HistoryAudit[]): HistoryAudit[] {
  return [...audits].reverse()
}

describe('buildHistory', () => {
  it('calcula la variación respecto a la auditoría ok anterior', () => {
    const history = buildHistory(newestFirst(audit(50), audit(57), audit(54)))
    expect(history.map((entry) => entry.scoreDelta)).toEqual([-3, 7, null])
  })

  it('ignora las auditorías error intercaladas y les asigna variación null', () => {
    const history = buildHistory(newestFirst(audit(50), audit(null, 'error'), audit(null, 'error'), audit(62)))
    expect(history.map((entry) => [entry.status, entry.scoreDelta])).toEqual([
      ['ok', 12],
      ['error', null],
      ['error', null],
      ['ok', null],
    ])
    expect(history[1].error).toBe('La página tardó demasiado en responder.')
  })

  it('no calcula variación si la primera auditoría es error o una ok no tiene nota', () => {
    const history = buildHistory(newestFirst(audit(null, 'error'), audit(40), audit(null), audit(45)))
    expect(history.map((entry) => entry.scoreDelta)).toEqual([5, null, null, null])
  })

  it('usa la fila extra para la variación de la más antigua y recorta al límite', () => {
    const rows = newestFirst(...Array.from({ length: HISTORY_LIMIT + 1 }, (_, index) => audit(index)))
    const history = buildHistory(rows)
    expect(history).toHaveLength(HISTORY_LIMIT)
    expect(history[HISTORY_LIMIT - 1].scoreDelta).toBe(1)
    expect(history[0].id).toBe(rows[0].id)
  })

  it('devuelve una lista vacía sin auditorías', () => {
    expect(buildHistory([])).toEqual([])
  })
})

describe('formatScoreDelta', () => {
  it('formatea subidas con "+" y texto accesible', () => {
    expect(formatScoreDelta(7)).toEqual({ text: '+7', label: 'sube 7 puntos', trend: 'up' })
    expect(formatScoreDelta(1)?.label).toBe('sube 1 punto')
  })

  it('formatea bajadas con el signo menos tipográfico', () => {
    expect(formatScoreDelta(-3)).toEqual({ text: '−3', label: 'baja 3 puntos', trend: 'down' })
  })

  it('formatea cero y null', () => {
    expect(formatScoreDelta(0)).toEqual({ text: '0', label: 'sin cambios', trend: 'same' })
    expect(formatScoreDelta(null)).toBeNull()
  })
})
