import { describe, expect, it } from 'vitest'
import { formatAbsoluteDate, formatRelativeTime, formatShortDate, siteDisplayName } from '@/lib/format'

const NOW = new Date('2026-11-25T12:00:00.000Z')

function ago(seconds: number): Date {
  return new Date(NOW.getTime() - seconds * 1000)
}

describe('formatRelativeTime', () => {
  it('muestra "hace un momento" para menos de un minuto', () => {
    expect(formatRelativeTime(ago(30), NOW)).toBe('hace un momento')
  })

  it('formatea minutos y horas en español', () => {
    expect(formatRelativeTime(ago(5 * 60), NOW)).toBe('hace 5 minutos')
    expect(formatRelativeTime(ago(3 * 3600), NOW)).toBe('hace 3 horas')
  })

  it('usa "ayer" para un día y semanas, meses y años para más tiempo', () => {
    expect(formatRelativeTime(ago(26 * 3600), NOW)).toBe('ayer')
    expect(formatRelativeTime(ago(14 * 86400), NOW)).toBe('hace 2 semanas')
    expect(formatRelativeTime(ago(65 * 86400), NOW)).toBe('hace 2 meses')
    expect(formatRelativeTime(ago(800 * 86400), NOW)).toBe('hace 2 años')
  })

  it('acepta fechas ISO en texto', () => {
    expect(formatRelativeTime('2026-11-25T11:50:00.000Z', NOW)).toBe('hace 10 minutos')
  })

  it('devuelve una cadena vacía si la fecha no es válida', () => {
    expect(formatRelativeTime('no-es-fecha', NOW)).toBe('')
  })

  it('calcula la diferencia respecto a la hora que recibe, no la del sistema', () => {
    const date = '2026-11-25T11:00:00.000Z'
    expect(formatRelativeTime(date, NOW)).toBe('hace 1 hora')
    expect(formatRelativeTime(date, new Date('2026-11-25T11:00:30.000Z'))).toBe('hace un momento')
  })
})

describe('siteDisplayName', () => {
  it('usa el nombre si existe', () => {
    expect(siteDisplayName('Mi blog', 'https://ejemplo.com')).toBe('Mi blog')
  })

  it('usa el host si no hay nombre o está vacío', () => {
    expect(siteDisplayName(null, 'https://www.ejemplo.com/blog')).toBe('www.ejemplo.com')
    expect(siteDisplayName('  ', 'https://ejemplo.com:8080')).toBe('ejemplo.com:8080')
  })

  it('devuelve la URL tal cual si no se puede analizar', () => {
    expect(siteDisplayName(null, 'no es url')).toBe('no es url')
  })
})

describe('formatAbsoluteDate y formatShortDate', () => {
  it('formatean en español con la zona horaria de la app', () => {
    // 23:30 UTC is already the next day in Madrid (UTC+1 in November).
    const date = '2026-11-25T23:30:00.000Z'
    const absolute = formatAbsoluteDate(date)
    expect(absolute).toContain('26 nov 2026')
    expect(absolute).toContain('0:30')
    expect(formatShortDate(new Date(date))).toBe('26 nov')
  })

  it('devuelven cadena vacía con fechas inválidas', () => {
    expect(formatAbsoluteDate('no es una fecha')).toBe('')
    expect(formatShortDate('no es una fecha')).toBe('')
  })
})
