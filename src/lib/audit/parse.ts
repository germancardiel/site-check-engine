import { load, type CheerioAPI } from 'cheerio'

export function parseHtml(html: string): CheerioAPI {
  return load(html)
}

const NON_VISIBLE = 'script, style, noscript, template, svg, iframe, head'

/** Text a crawler without JavaScript would see in the server HTML. */
export function visibleText($: CheerioAPI): string {
  const body = $('body').clone()
  body.find(NON_VISIBLE).remove()
  return body.text().replace(/\s+/g, ' ').trim()
}

export function countWords(text: string): number {
  const words = text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)
  return words ? words.length : 0
}

export type JsonLdExtraction = { blocks: number; valid: unknown[] }

/** Parses every `<script type="application/ld+json">`; invalid JSON is skipped. */
export function extractJsonLd($: CheerioAPI): JsonLdExtraction {
  const scripts = $('script[type="application/ld+json" i]')
  const valid: unknown[] = []
  scripts.each((_, element) => {
    try {
      valid.push(JSON.parse($(element).text()))
    } catch {
      // Invalid JSON-LD is reported by the structured-data check through `blocks` vs `valid`.
    }
  })
  return { blocks: scripts.length, valid }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Collects every `@type` in a JSON-LD tree (arrays and `@graph` included). */
export function collectSchemaTypes(data: unknown, found: Set<string> = new Set()): Set<string> {
  if (Array.isArray(data)) {
    data.forEach((item) => collectSchemaTypes(item, found))
    return found
  }
  if (!isRecord(data)) return found
  const type = data['@type']
  const types = Array.isArray(type) ? type : [type]
  types.filter((t): t is string => typeof t === 'string').forEach((t) => found.add(t))
  Object.values(data).forEach((value) => collectSchemaTypes(value, found))
  return found
}

/** Heuristic: some servers answer any path with the HTML app shell. */
export function looksLikeHtml(text: string): boolean {
  return /^\s*<(!doctype|html|head|body)/i.test(text)
}
