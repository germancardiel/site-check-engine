/** AI Gateway model string ("provider/model"); routed through Vercel AI Gateway by the AI SDK. */
export const AI_MODEL = 'recursive/flint-v1.0'

/** Maximum AI generations (plans + change summaries) per user and day (Europe/Madrid). */
export const AI_DAILY_LIMIT = 10

/** Timeout of a single model call. Reasoning models such as Flint take 40-60 s. */
export const AI_TIMEOUT_MS = 120_000

/** Maximum size of a prompt (instructions + prompt), in characters (D-AI-04). */
export const PROMPT_MAX_CHARS = 8_000

/** Hint shown while an AI report is being generated (the model can take up to a minute). */
export const AI_PENDING_HINT = 'Esto puede tardar hasta un minuto.'
