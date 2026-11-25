import { describe, expect, it } from 'vitest'
import { aiReportInputSchema } from '../ai'

const SITE_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7'
const AUDIT_ID = '0b3c4a9e-5d1f-4f7a-9c2b-8e6d1a2b3c4d'

describe('aiReportInputSchema', () => {
  it('acepta dos uuid', () => {
    expect(aiReportInputSchema.safeParse({ siteId: SITE_ID, auditId: AUDIT_ID }).success).toBe(true)
  })

  it('rechaza ids ausentes o que no son uuid con un mensaje en español', () => {
    const result = aiReportInputSchema.safeParse({ siteId: 'x', auditId: undefined })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('La auditoría no es válida.')
  })
})
