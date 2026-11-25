import type { CheerioAPI } from 'cheerio'
import type { LookupFunction } from 'node:net'

export type CheckStatus = 'pass' | 'warn' | 'fail'
export type CheckCategory = 'seo' | 'ai'

export type CheckResult = {
  id: string
  category: CheckCategory
  title: string
  status: CheckStatus
  weight: number
  message: string
  recommendation: string
}

export type AuditContext = {
  url: string
  finalUrl: string
  status: number
  headers: Record<string, string>
  html: CheerioAPI
  robotsTxt: string | null
  llmsTxt: string | null
  sitemapFound: boolean
}

export type Check = (ctx: AuditContext) => CheckResult

export type Scores = {
  score: number
  seoScore: number
  aiScore: number
}

/** Matches the `audits` table (T02): status, score, seo_score, ai_score, checks, error. */
export type AuditOutcome =
  | ({ status: 'ok'; checks: CheckResult[] } & Scores)
  | { status: 'error'; error: string }

export type LookupAddress = { address: string; family: number }
export type LookupFn = (hostname: string, options: { all: true }) => Promise<LookupAddress[]>

/** What `safeFetch` hands to the transport for one hop. */
export type TransportInit = {
  headers: Record<string, string>
  signal: AbortSignal
  /** Validating Node `lookup`: the only way the transport may resolve the hostname. */
  lookup: LookupFunction
}

/** Performs a single request without following redirects. Replaces `fetch` inside `safeFetch`. */
export type Transport = (url: string, init: TransportInit) => Promise<Response>

export type FetchDeps = {
  transport?: Transport
  lookup?: LookupFn
}

export type SafeFetchOptions = FetchDeps & {
  timeoutMs?: number
  maxBytes?: number
  maxRedirects?: number
}

export type SafeFetchResult = {
  finalUrl: string
  status: number
  headers: Record<string, string>
  body: string
  redirects: string[]
}
