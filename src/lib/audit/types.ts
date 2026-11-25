import type { CheerioAPI } from 'cheerio'
import type { LookupFunction } from 'node:net'

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'na' | 'error'

export type CategoryId =
  | 'crawl'
  | 'url'
  | 'onpage'
  | 'content'
  | 'schema'
  | 'performance'
  | 'mobile'
  | 'trust'
  | 'international'
  | 'ai'

export type CheckCategory = CategoryId

export type DocLink = {
  label: string
  url: string
}

export type EvidenceItem = {
  label: string
  value?: string
  status?: 'ok' | 'bad' | 'neutral'
}

/** Lo que devuelve la función `run` de cada comprobación. */
export type CheckOutcome = {
  status: CheckStatus
  message: string
  /** Dato crudo en una línea (p. ej. "meta robots='index, follow'"). */
  evidence?: string
  /** Lista de valores detectados (p. ej. etiquetas OG, bots, cabeceras). */
  items?: EvidenceItem[]
  /** Cómo arreglarlo, opcionalmente con un snippet. */
  fix?: string
  /** Recomendación explícita si difiere de `fix` o del mensaje. */
  recommendation?: string
}

export type CheckResult = CheckOutcome & {
  id: string
  category: CategoryId
  title: string
  weight: number
  docs: DocLink[]
  recommendation: string
}

export interface CategoryResult {
  id: CategoryId
  title: string
  shortTitle: string
  weight: number
  /** null cuando no hay ninguna comprobación evaluable. */
  score: number | null
  issues: number
  checks: CheckResult[]
}

export type ScoreLabel = 'Excelente' | 'Bueno' | 'Mejorable' | 'Deficiente'

export interface AuditIssue {
  checkId: string
  category: CategoryId
  categoryTitle: string
  title: string
  status: 'warn' | 'fail'
  weight: number
}

export interface AuditReport {
  finalUrl: string
  auditedAt: string
  score: number
  seoScore: number
  aiScore: number
  label: ScoreLabel
  /** Motivo por el que la nota global se ha limitado (noindex, no-200…). */
  capReason?: string
  categories: CategoryResult[]
  issues: AuditIssue[]
  notices: string[]
}

/* ---------- Contexto de auditoría ---------- */

export interface RedirectHop {
  url: string
  status: number
}

export interface HttpResult {
  url: string
  status: number
  headers: Record<string, string>
  body: string
  bytes: number
  ttfbMs: number
  redirects: RedirectHop[]
}

export interface RobotsInfo {
  found: boolean
  status: number | null
  text: string
}

export interface SitemapInfo {
  declaredInRobots: boolean
  urls: string[]
  checked: string[]
  found: boolean
  containsUrl: boolean
}

export interface TlsInfo {
  validTo: string | null
  daysLeft: number | null
  issuer: string | null
  alpn: string | null
  authorized: boolean
  error?: string
}

export interface PsiInfo {
  lcpMs: number | null
  cls: number | null
  tbtMs: number | null
  unusedJsBytes: number | null
  unusedJsScore: number | null
  field: {
    lcpMs: number | null
    cls: number | null
    inpMs: number | null
    origin: 'url' | 'origin' | null
  }
  error?: string
}

export interface BotProbe {
  bot: string
  status: number | null
  error?: string
}

export interface JsonLdInfo {
  blocks: number
  parseErrors: number
  /** Todos los nodos aplanados (incluye los de @graph). */
  nodes: Record<string, unknown>[]
  types: string[]
}

export interface AuditContext {
  inputUrl: string
  url: URL
  page: HttpResult
  $: CheerioAPI
  robots: RobotsInfo
  sitemap: SitemapInfo
  llmsTxt: { found: boolean; url: string }
  tls: TlsInfo | null
  psi: PsiInfo | null
  botProbes: BotProbe[]
  jsonLd: JsonLdInfo
  text: {
    visible: string
    words: number
    /** Frases de la prosa (párrafos, listas…), sin fragmentos de interfaz. */
    sentences: string[]
  }
}

export interface CheckDef {
  id: string
  category: CategoryId
  title: string
  /** 1 = menor, 2 = importante, 3 = crítico. */
  weight: 1 | 2 | 3
  docs: DocLink[]
  run: (ctx: AuditContext) => CheckOutcome
}

export type Check = (ctx: AuditContext) => CheckResult

export type Scores = {
  score: number
  seoScore: number
  aiScore: number
  label: ScoreLabel
  capReason?: string
}

/** Matches the `audits` table (T02): status, score, seo_score, ai_score, checks, error. */
export type AuditOutcome =
  | ({ status: 'ok'; checks: CheckResult[]; categories: CategoryResult[]; issues: AuditIssue[] } & Scores)
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

export type PsiFetcher = (url: string) => Promise<PsiInfo | null>
export type TlsProber = (url: URL) => Promise<TlsInfo | null>
export type BotProber = (url: string) => Promise<BotProbe[]>

export type FetchDeps = {
  transport?: Transport
  lookup?: LookupFn
  fetchPsi?: PsiFetcher
  probeTls?: TlsProber
  probeBots?: BotProber
  psiFetcher?: PsiFetcher
  tlsProber?: TlsProber
  /** Audit time, used for the certificate expiry (D-QA-08: `src/lib` never reads the clock). */
  now?: Date
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
  redirectChain: RedirectHop[]
  ttfbMs: number
}
