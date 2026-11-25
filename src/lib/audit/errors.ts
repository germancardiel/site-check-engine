export type AuditFetchErrorCode =
  | 'INVALID_URL'
  | 'BLOCKED_HOST'
  | 'TOO_MANY_REDIRECTS'
  | 'TIMEOUT'
  | 'TOO_LARGE'
  | 'NETWORK'

export class AuditFetchError extends Error {
  readonly code: AuditFetchErrorCode

  constructor(code: AuditFetchErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'AuditFetchError'
    this.code = code
  }
}
