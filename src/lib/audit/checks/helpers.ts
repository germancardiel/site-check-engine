import type { Cheerio, CheerioAPI } from 'cheerio'
import type { Element } from 'domhandler'
import type {
  AuditContext,
  CategoryId,
  CheckDef,
  CheckOutcome,
  EvidenceItem,
} from '../types'

type Extra = Omit<CheckOutcome, 'status' | 'message'>

export const pass = (message: string, extra?: Extra): CheckOutcome => ({ status: 'pass', message, ...extra })
export const warn = (message: string, extra?: Extra): CheckOutcome => ({ status: 'warn', message, ...extra })
export const fail = (message: string, extra?: Extra): CheckOutcome => ({ status: 'fail', message, ...extra })
export const na = (message: string, extra?: Extra): CheckOutcome => ({ status: 'na', message, ...extra })
export const unavailable = (message: string, extra?: Extra): CheckOutcome => ({ status: 'error', message, ...extra })

export function defineChecks(category: CategoryId, defs: Omit<CheckDef, 'category'>[]): CheckDef[] {
  return defs.map((d) => ({ ...d, category }))
}

/** Normaliza para comparar URLs (host en minúsculas, sin barra final ni hash). */
export function comparableUrl(u: string): string {
  try {
    const url = new URL(u)
    url.hash = ''
    const path = url.pathname.replace(/\/+$/, '') || '/'
    return `${url.protocol}//${url.host.toLowerCase()}${path}${url.search}`
  } catch {
    return u
  }
}

/* ---------- Lectura del HTML ---------- */

export function meta(ctx: AuditContext, key: string): string | null {
  const { $ } = ctx
  const el = $(`meta[name="${key}" i], meta[property="${key}" i]`).first()
  const v = el.attr('content')
  return v === undefined ? null : v.trim()
}

export function allMeta(ctx: AuditContext, key: string): string[] {
  const { $ } = ctx
  return $(`meta[name="${key}" i], meta[property="${key}" i]`)
    .map((_, el) => ($(el).attr('content') ?? '').trim())
    .get()
}

export function resolveUrl(ctx: AuditContext, href: string | undefined): URL | null {
  if (!href) return null
  try {
    return new URL(href, ctx.url)
  } catch {
    return null
  }
}

export function isInternal(ctx: AuditContext, href: string | undefined): boolean {
  const u = resolveUrl(ctx, href)
  if (!u || (u.protocol !== 'http:' && u.protocol !== 'https:')) return false
  return u.hostname.replace(/^www\./, '') === ctx.url.hostname.replace(/^www\./, '')
}

export const cleanText = (s: string): string => s.replace(/\s+/g, ' ').trim()

export interface Heading {
  level: number
  text: string
}

export function headings($: CheerioAPI): Heading[] {
  return $('h1,h2,h3,h4,h5,h6')
    .map((_, el) => ({ level: Number(el.tagName[1]), text: cleanText($(el).text()) }))
    .get()
}

/** Nombre accesible aproximado de un control. */
export function accessibleName($: CheerioAPI, el: Cheerio<Element>): string {
  const aria = el.attr('aria-label') ?? ''
  if (aria.trim()) return aria.trim()
  const labelledBy = el.attr('aria-labelledby')
  if (labelledBy) {
    const txt = labelledBy
      .split(/\s+/)
      .map((id) => cleanText($(`[id="${id}"]`).text()))
      .join(' ')
      .trim()
    if (txt) return txt
  }
  const text = cleanText(el.text())
  if (text) return text
  const imgAlt = el.find('img[alt]').attr('alt')
  if (imgAlt?.trim()) return imgAlt.trim()
  const svgTitle = cleanText(el.find('svg title').first().text())
  if (svgTitle) return svgTitle
  const title = el.attr('title')
  if (title?.trim()) return title.trim()
  const value = el.attr('value')
  if (value?.trim()) return value.trim()
  return ''
}

export const pct = (n: number, total: number): number => (total === 0 ? 0 : Math.round((n / total) * 100))

export function itemList(values: string[], status: EvidenceItem['status'] = 'neutral'): EvidenceItem[] {
  return values.map((v) => ({ label: v, status }))
}

export const truncate = (s: string, n = 120): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

/** URL de imagen real (desenvuelve /_next/image?url=…). */
export function imageSrc(ctx: AuditContext, src: string | undefined): URL | null {
  const u = resolveUrl(ctx, src)
  if (!u) return null
  const inner = u.searchParams.get('url')
  if (inner && /\/_next\/image|\/_vercel\/image|\/cdn-cgi\/image/.test(u.pathname)) {
    return resolveUrl(ctx, inner)
  }
  return u
}

export function isHomePage(ctx: AuditContext): boolean {
  return ctx.url.pathname === '/' || ctx.url.pathname === ''
}
