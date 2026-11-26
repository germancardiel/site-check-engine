import { describe, expect, it } from 'vitest'
import { SITE_NAME } from '@/lib/brand'
import { formatAbsoluteDate } from '@/lib/format'
import { auditPageTitle, sitePageTitle } from '@/lib/page-titles'

describe('títulos de pestaña (T21 CA7)', () => {
  it('el detalle de sitio lleva el nombre del sitio', () => {
    expect(sitePageTitle('Mi tienda')).toBe(`Mi tienda · ${SITE_NAME}`)
    expect(sitePageTitle(null)).toBe(`Sitio · ${SITE_NAME}`)
  })

  it('la auditoría lleva el nombre del sitio y la fecha', () => {
    const createdAt = '2026-11-25T10:30:00.000Z'
    expect(auditPageTitle('Mi tienda', createdAt)).toBe(
      `Auditoría de Mi tienda del ${formatAbsoluteDate(createdAt)} · ${SITE_NAME}`,
    )
    expect(auditPageTitle('Mi tienda', null)).toBe(`Auditoría de Mi tienda · ${SITE_NAME}`)
    expect(auditPageTitle(null, createdAt)).toBe(`Auditoría · ${SITE_NAME}`)
  })
})
