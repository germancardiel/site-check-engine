import type { z } from 'zod'

/** One message per form field (the first zod issue of that field). */
export type FieldErrors<F extends string> = Partial<Record<F, string>>

/** Non-sensitive text values of a form, sent back to refill it after an error (D-UX-08). */
export type FormValues<F extends string> = Partial<Record<F, string>>

const GENERIC_ERROR = 'Revisa los datos del formulario.'

function isField<F extends string>(key: PropertyKey | undefined, fields: readonly F[]): key is F {
  return typeof key === 'string' && (fields as readonly string[]).includes(key)
}

/**
 * Maps every zod issue to its field: each field in `fields` gets the message of its first issue.
 * Issues of other paths (or without a path) are ignored.
 */
export function zodFieldErrors<F extends string>(error: z.ZodError, fields: readonly F[]): FieldErrors<F> {
  const result: FieldErrors<F> = {}
  for (const issue of error.issues) {
    const key = issue.path[0]
    if (isField(key, fields) && result[key] === undefined) result[key] = issue.message
  }
  return result
}

/**
 * State for a failed validation: the errors of each field or, if none belongs to a field
 * of the form, a general error with the first message.
 */
export function validationErrorState<F extends string>(
  error: z.ZodError,
  fields: readonly F[],
): { error?: string; fieldErrors?: FieldErrors<F> } {
  const fieldErrors = zodFieldErrors(error, fields)
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors }
  return { error: error.issues[0]?.message ?? GENERIC_ERROR }
}

/**
 * Longest value of each form field sent back to the client: URL 2048 (`SITE_URL_MAX_LENGTH`),
 * site name 80 (`SITE_NAME_MAX_LENGTH`) and email 254 (RFC 5321). Any other field gets the default.
 */
export const FORM_VALUE_MAX_LENGTH: Readonly<Record<string, number>> = { url: 2048, name: 80, email: 254 }
const DEFAULT_VALUE_MAX_LENGTH = 2048

/**
 * Reads the text values of `fields` (missing or non-text entries are left out), each one cut to the
 * maximum length of its field, so a huge input is never echoed back whole. Never pass the password.
 */
export function readFormValues<F extends string>(formData: FormData, fields: readonly F[]): FormValues<F> {
  const values: FormValues<F> = {}
  for (const field of fields) {
    const value = formData.get(field)
    if (typeof value !== 'string') continue
    values[field] = value.slice(0, FORM_VALUE_MAX_LENGTH[field] ?? DEFAULT_VALUE_MAX_LENGTH)
  }
  return values
}
