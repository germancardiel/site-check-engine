import { generateText, NoObjectGeneratedError, NoOutputGeneratedError, Output, type LanguageModel } from 'ai'
import type { z } from 'zod'
import type { AuditDiff } from '@/lib/audit/diff'
import { AI_MODEL, AI_TIMEOUT_MS } from './config'
import { buildChangesPrompt, buildPlanPrompt, type BuiltPrompt, type PromptAudit } from './prompts'
import { actionPlanSchema, changeSummarySchema, type ActionPlan, type ChangeSummary } from './schemas'

export type AiErrorReason = 'model' | 'invalid_output'

/** Typed error thrown when the model call fails or its output does not match the schema. */
export class AiGenerationError extends Error {
  readonly reason: AiErrorReason

  constructor(reason: AiErrorReason, options?: { cause?: unknown }) {
    super(reason === 'model' ? 'The AI model call failed.' : 'The AI model returned an invalid output.', options)
    this.name = 'AiGenerationError'
    this.reason = reason
  }
}

export type GenerateDeps = {
  /** Model to call. Defaults to the AI Gateway string `AI_MODEL`; tests inject a mock model. */
  model?: LanguageModel
  timeoutMs?: number
}

async function generateStructured<T>(schema: z.ZodType<T>, built: BuiltPrompt, deps: GenerateDeps): Promise<T> {
  let output: unknown
  try {
    const result = await generateText({
      model: deps.model ?? AI_MODEL,
      instructions: built.instructions,
      prompt: built.prompt,
      output: Output.object({ schema }),
      abortSignal: AbortSignal.timeout(deps.timeoutMs ?? AI_TIMEOUT_MS),
    })
    output = result.output
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error) || NoOutputGeneratedError.isInstance(error)) {
      throw new AiGenerationError('invalid_output', { cause: error })
    }
    throw new AiGenerationError('model', { cause: error })
  }
  // Defensive re-validation: never trust the model output without the zod schema.
  const parsed = schema.safeParse(output)
  if (!parsed.success) throw new AiGenerationError('invalid_output', { cause: parsed.error })
  return parsed.data
}

/** Generates the prioritised action plan of an audit. Throws `AiGenerationError` on failure. */
export function generateActionPlan(audit: PromptAudit, deps: GenerateDeps = {}): Promise<ActionPlan> {
  return generateStructured(actionPlanSchema, buildPlanPrompt(audit), deps)
}

export type ChangeSummaryInput = {
  diff: AuditDiff
  prev: PromptAudit
  curr: PromptAudit
}

/** Generates the summary of changes versus the previous audit. Throws `AiGenerationError` on failure. */
export function generateChangeSummary(input: ChangeSummaryInput, deps: GenerateDeps = {}): Promise<ChangeSummary> {
  return generateStructured(changeSummarySchema, buildChangesPrompt(input.diff, input.prev, input.curr), deps)
}
