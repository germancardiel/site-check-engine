import { describe, expect, it } from 'vitest'
import { buildChartData, CHART_SIZE, type ChartSize } from '../chart'
import type { HistoryAudit } from '../history'

function row(day: number, score: number | null, seo: number | null, ai: number | null, status: HistoryAudit['status'] = 'ok'): HistoryAudit {
  return {
    id: `audit-${day}`,
    status,
    score,
    seo_score: seo,
    ai_score: ai,
    error: status === 'error' ? 'Error' : null,
    created_at: new Date(Date.UTC(2026, 10, day, 10)).toISOString(),
  }
}

const SIZE: ChartSize = { width: 200, height: 120, padding: { top: 10, right: 10, bottom: 10, left: 10 } }

describe('buildChartData', () => {
  it('devuelve null con menos de dos auditorías ok', () => {
    expect(buildChartData([])).toBeNull()
    expect(buildChartData([row(1, 50, 60, 40)])).toBeNull()
    expect(buildChartData([row(2, null, null, null, 'error'), row(1, 50, 60, 40)])).toBeNull()
  })

  it('ordena cronológicamente, descarta errores y escala de 0 a 100', () => {
    // Input newest first, as returned by the history query.
    const data = buildChartData([row(3, 100, 90, 80), row(2, null, null, null, 'error'), row(1, 0, 50, 25)], SIZE)
    expect(data).not.toBeNull()
    if (!data) return
    const total = data.series.find((series) => series.key === 'score')
    expect(total?.points).toEqual([
      { x: 10, y: 110, value: 0, date: row(1, 0, 0, 0).created_at },
      { x: 190, y: 10, value: 100, date: row(3, 0, 0, 0).created_at },
    ])
    expect(total?.polyline).toBe('10,110 190,10')
    const seo = data.series.find((series) => series.key === 'seo')
    expect(seo?.points.map((point) => point.y)).toEqual([60, 20])
    expect(data.series.map((series) => series.label)).toEqual(['Nota total', 'SEO', 'IA'])
  })

  it('reparte los puntos en x de forma uniforme', () => {
    const data = buildChartData([row(1, 10, 10, 10), row(2, 20, 20, 20), row(3, 30, 30, 30)], SIZE)
    expect(data?.series[0].points.map((point) => point.x)).toEqual([10, 100, 190])
  })

  it('limita valores fuera de rango al eje', () => {
    const data = buildChartData([row(1, -5, 0, 0), row(2, 120, 0, 0)], SIZE)
    expect(data?.series[0].points.map((point) => point.y)).toEqual([110, 10])
  })

  it('omite auditorías ok sin alguna de las notas', () => {
    expect(buildChartData([row(1, 50, null, 40), row(2, 60, 70, 50)])).toBeNull()
  })

  it('resume la tendencia en el aria-label', () => {
    const data = buildChartData([row(6, 78, 80, 75), row(5, 70, 72, 60), row(1, 54, 60, 48), row(2, 58, 60, 50), row(3, 60, 61, 55), row(4, 65, 66, 58)])
    expect(data?.ariaLabel).toBe('Nota total de 54 a 78 en 6 auditorías. SEO de 60 a 80. IA de 48 a 75.')
  })

  it('genera las marcas del eje y y las fechas extremas', () => {
    const data = buildChartData([row(1, 50, 50, 50), row(20, 60, 60, 60)])
    expect(data?.width).toBe(CHART_SIZE.width)
    expect(data?.plot).toEqual({ left: CHART_SIZE.padding.left, right: CHART_SIZE.width - CHART_SIZE.padding.right })
    expect(data?.yTicks.map((tick) => tick.value)).toEqual([0, 25, 50, 75, 100])
    const { top, bottom } = CHART_SIZE.padding
    expect(data?.yTicks[0].y).toBe(CHART_SIZE.height - bottom)
    expect(data?.yTicks[4].y).toBe(top)
    expect(data?.xLabels).toEqual([
      { x: CHART_SIZE.padding.left, text: '1 nov', anchor: 'start' },
      { x: CHART_SIZE.width - CHART_SIZE.padding.right, text: '20 nov', anchor: 'end' },
    ])
  })
})
