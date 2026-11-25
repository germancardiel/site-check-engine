import { z } from 'zod'

export const IMPACT_LEVELS = ['alto', 'medio', 'bajo'] as const
export const EFFORT_LEVELS = ['bajo', 'medio', 'alto'] as const

export const actionSchema = z.object({
  title: z.string().min(1).max(120),
  why: z.string().min(1),
  how: z.string().min(1),
  impact: z.enum(IMPACT_LEVELS),
  effort: z.enum(EFFORT_LEVELS),
  checkIds: z.array(z.string()),
})

/** AI action plan stored in `ai_reports.content` for `kind = 'plan'`. */
export const actionPlanSchema = z.object({
  summary: z.string().min(1).max(600),
  actions: z.array(actionSchema).min(3).max(8),
})

/** AI summary of the changes versus the previous audit (`kind = 'changes'`). */
export const changeSummarySchema = z.object({
  summary: z.string().min(1).max(600),
  highlights: z.array(z.string().min(1)).min(1).max(5),
})

export type Impact = (typeof IMPACT_LEVELS)[number]
export type Effort = (typeof EFFORT_LEVELS)[number]
export type PlanAction = z.infer<typeof actionSchema>
export type ActionPlan = z.infer<typeof actionPlanSchema>
export type ChangeSummary = z.infer<typeof changeSummarySchema>
