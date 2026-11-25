/** AI Gateway model string ("provider/model"); routed through Vercel AI Gateway by the AI SDK. */
export const AI_MODEL = 'anthropic/claude-haiku-5-5'

/** Maximum AI generations (plans + change summaries) per user and day (Europe/Madrid). */
export const AI_DAILY_LIMIT = 10

/** Timeout of a single model call. */
export const AI_TIMEOUT_MS = 30_000

/** Maximum size of a prompt (instructions + prompt), in characters (D-AI-04). */
export const PROMPT_MAX_CHARS = 8_000
