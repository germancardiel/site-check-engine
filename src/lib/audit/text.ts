import type { CheerioAPI } from 'cheerio'
import type { JsonLdInfo } from './types'

const BLOCK_TAGS =
  'p,li,h1,h2,h3,h4,h5,h6,td,th,dt,dd,blockquote,figcaption,caption,summary,div,section,article,header,footer,main,aside,nav,br'

const INLINE_SEPARATE = 'a,button,label,input,select,img'
const PROSE_TAGS = 'p,li,blockquote,dd,figcaption,td'

/**
 * Texto visible de la página (sin scripts, estilos ni contenido oculto).
 * `prose` son solo los bloques de redacción (párrafos, listas…) con ≥4 palabras:
 * es lo que se usa para la legibilidad, sin menús, botones ni etiquetas sueltas.
 */
export function extractVisibleText($: CheerioAPI): { visible: string; blocks: string[]; prose: string[] } {
  const $clone = $.root().clone()
  $clone.find('script,style,noscript,template,svg,iframe,object,head,[hidden],[aria-hidden="true"]').remove()
  $clone.find(BLOCK_TAGS).each((_, el) => {
    $(el).prepend('\n').append('\n')
  })
  $clone.find(INLINE_SEPARATE).each((_, el) => {
    $(el).prepend(' ').append(' ')
  })
  const prose: string[] = []
  $clone
    .find(PROSE_TAGS)
    .filter((_, el) => $(el).find(PROSE_TAGS).length === 0 && $(el).closest('nav,header,footer,form,button').length === 0)
    .each((_, el) => {
      const t = $(el).text().replace(/\s+/g, ' ').trim()
      if (words(t).length >= 4) prose.push(t)
    })
  const raw = $clone.find('body').length ? $clone.find('body').text() : $clone.text()
  const blocks = raw
    .split(/\n+/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  return { visible: blocks.join('\n'), blocks, prose }
}

const WORD_RE = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu

export function words(text: string): string[] {
  return text.match(WORD_RE) ?? []
}

/** Frases: se corta por puntuación final y por bloque (títulos, items de lista…). */
export function sentences(blocks: string[]): string[] {
  const out: string[] = []
  for (const b of blocks) {
    for (const s of b.split(/(?<=[.!?…])\s+/)) {
      if (words(s).length > 0) out.push(s)
    }
  }
  return out
}

/* ---------- Sílabas en español ---------- */

const STRONG = new Set(['a', 'e', 'o', 'á', 'é', 'ó', 'í', 'ú'])
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'á', 'é', 'í', 'ó', 'ú', 'ü'])

/** Aproximación: cuenta núcleos vocálicos separando hiatos. */
export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-záéíóúüñ]/g, '')
  if (!w) return 0
  let count = 0
  let prev: string | null = null
  for (let i = 0; i < w.length; i++) {
    const ch = w[i]
    const isVowel = VOWELS.has(ch)
    if (isVowel) {
      if (prev === null) {
        count++
      } else if (STRONG.has(prev) && STRONG.has(ch)) {
        count++
      }
      prev = ch
    } else {
      prev = null
    }
  }
  return Math.max(1, count)
}

export interface Readability {
  score: number
  wordsPerSentence: number
  syllablesPer100: number
}

/**
 * Fernández Huerta (forma corregida):
 *   L = 206.84 − 60·(sílabas/palabra) − 1.02·(palabras/frase)
 */
export function fernandezHuerta(text: string, sentenceList: string[]): Readability | null {
  const ws = words(text).filter((w) => /\p{L}/u.test(w))
  if (ws.length < 50 || sentenceList.length === 0) return null
  const syll = ws.reduce((acc, w) => acc + countSyllables(w), 0)
  const spw = syll / ws.length
  const wps = ws.length / sentenceList.length
  const score = 206.84 - 60 * spw - 1.02 * wps
  return {
    score: Math.round(Math.max(0, Math.min(100, score)) * 10) / 10,
    wordsPerSentence: Math.round(wps * 10) / 10,
    syllablesPer100: Math.round(spw * 1000) / 10,
  }
}

export function readabilityLabel(score: number): string {
  if (score >= 80) return 'Fácil'
  if (score >= 70) return 'Bastante fácil'
  if (score >= 60) return 'Normal'
  if (score >= 50) return 'Moderadamente difícil'
  if (score >= 30) return 'Difícil'
  return 'Muy difícil'
}

/* ---------- JSON-LD ---------- */

export function extractJsonLdInfo($: CheerioAPI): JsonLdInfo {
  const nodes: Record<string, unknown>[] = []
  let blocks = 0
  let parseErrors = 0

  const visit = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(visit)
    if (!value || typeof value !== 'object') return
    const obj = value as Record<string, unknown>
    if (obj['@type']) nodes.push(obj)
    if (obj['@graph']) visit(obj['@graph'])
  }

  $('script[type="application/ld+json" i]').each((_, el) => {
    blocks++
    const raw = $(el).contents().text().trim()
    if (!raw) return
    try {
      visit(JSON.parse(raw))
    } catch {
      parseErrors++
    }
  })

  const types = new Set<string>()
  for (const n of nodes) for (const t of typesOf(n)) types.add(t)
  return { blocks, parseErrors, nodes, types: [...types] }
}

export function typesOf(node: Record<string, unknown>): string[] {
  const t = node['@type']
  if (Array.isArray(t)) return t.map(String)
  return t ? [String(t)] : []
}

export function nodesOfType(info: JsonLdInfo, ...types: string[]): Record<string, unknown>[] {
  const set = new Set(types)
  return info.nodes.filter((n) => typesOf(n).some((t) => set.has(t)))
}
