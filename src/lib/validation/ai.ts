import { z } from 'zod'

const AUDIT_ERROR = 'La auditoría no es válida.'

/** Hidden fields of the "Generar plan" / "Generar resumen" forms. */
export const aiReportInputSchema = z.object({
  siteId: z.uuid({ error: AUDIT_ERROR }),
  auditId: z.uuid({ error: AUDIT_ERROR }),
})

export type AiReportInput = z.infer<typeof aiReportInputSchema>

/** State returned by the AI server actions to their forms. */
export type AiActionState = {
  error?: string
  message?: string
}
