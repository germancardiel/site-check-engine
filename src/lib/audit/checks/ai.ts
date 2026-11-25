import { collectSchemaTypes, countWords, extractJsonLd, visibleText } from '../parse'
import { isAgentBlocked, parseRobots } from '../robots'
import { defineCheck, type DefinedCheck } from './define'

/** AI crawlers whose access to the site root is verified in robots.txt. */
export const AI_CRAWLERS = ['GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended'] as const

/** JSON-LD types that identify the entity behind the site. */
export const ENTITY_TYPES = ['Organization', 'Person', 'WebSite', 'LocalBusiness'] as const

/** Visible words in the server HTML: pass ≥ 150, warn ≥ 50, fail below. */
export const CONTENT_THRESHOLDS = { pass: 150, warn: 50 } as const

export const aiCrawlersCheck = defineCheck(
  { id: 'ai-crawlers', category: 'ai', title: 'Acceso de rastreadores de IA', weight: 3, recommendation: 'Permite en robots.txt el acceso de GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot y Google-Extended.' },
  (ctx) => {
    if (ctx.robotsTxt === null) {
      return { status: 'pass', message: 'Sin robots.txt: ningún rastreador de IA está bloqueado.' }
    }
    const robots = parseRobots(ctx.robotsTxt)
    const blocked = AI_CRAWLERS.filter((agent) => isAgentBlocked(robots, agent))
    if (blocked.length === 0) return { status: 'pass', message: 'robots.txt permite a los rastreadores de IA.' }
    const message = `robots.txt bloquea a: ${blocked.join(', ')}.`
    return { status: blocked.length === AI_CRAWLERS.length ? 'fail' : 'warn', message }
  },
)

export const llmsTxtCheck = defineCheck(
  { id: 'llms-txt', category: 'ai', title: 'llms.txt', weight: 1, recommendation: 'Publica un /llms.txt en Markdown con un resumen del sitio y enlaces a sus páginas clave.' },
  (ctx) => {
    if (ctx.llmsTxt === null) return { status: 'fail', message: 'No se encontró /llms.txt.' }
    if (ctx.llmsTxt.trim() === '') return { status: 'warn', message: 'El archivo /llms.txt está vacío.' }
    return { status: 'pass', message: 'El sitio publica un /llms.txt.' }
  },
)

export const structuredDataCheck = defineCheck(
  { id: 'structured-data', category: 'ai', title: 'Datos estructurados', weight: 2, recommendation: 'Añade datos estructurados JSON-LD de schema.org que describan el contenido.' },
  (ctx) => {
    const { blocks, valid } = extractJsonLd(ctx.html)
    if (valid.length > 0) return { status: 'pass', message: `Hay ${valid.length} bloque(s) JSON-LD válidos.` }
    if (blocks > 0) {
      return {
        status: 'fail',
        message: 'Los bloques JSON-LD de la página no son JSON válido.',
        recommendation: 'Corrige la sintaxis de los bloques JSON-LD para que sean JSON válido.',
      }
    }
    return { status: 'fail', message: 'La página no tiene datos estructurados JSON-LD.' }
  },
)

export const entitySchemaCheck = defineCheck(
  { id: 'entity-schema', category: 'ai', title: 'Esquema de entidad', weight: 2, recommendation: 'Describe quién está detrás del sitio con JSON-LD de tipo Organization, Person, WebSite o LocalBusiness.' },
  (ctx) => {
    const types = collectSchemaTypes(extractJsonLd(ctx.html).valid)
    const found = ENTITY_TYPES.filter((type) => types.has(type))
    return found.length > 0
      ? { status: 'pass', message: `Se declara la entidad: ${found.join(', ')}.` }
      : { status: 'fail', message: 'No hay JSON-LD que identifique la entidad del sitio.' }
  },
)

export const serverRenderedContentCheck = defineCheck(
  { id: 'server-rendered-content', category: 'ai', title: 'Contenido renderizado en servidor', weight: 3, recommendation: `Renderiza el contenido principal en el servidor (SSR o estático): al menos ${CONTENT_THRESHOLDS.pass} palabras visibles sin JavaScript.` },
  (ctx) => {
    const words = countWords(visibleText(ctx.html))
    const message = `El HTML del servidor tiene ${words} palabras visibles.`
    if (words >= CONTENT_THRESHOLDS.pass) return { status: 'pass', message }
    return { status: words >= CONTENT_THRESHOLDS.warn ? 'warn' : 'fail', message }
  },
)

export const headingStructureCheck = defineCheck(
  { id: 'heading-structure', category: 'ai', title: 'Estructura de encabezados', weight: 1, recommendation: 'Organiza el contenido con <h2> y no te saltes niveles (h1 → h2 → h3).' },
  (ctx) => {
    const levels = ctx.html('h1, h2, h3, h4, h5, h6')
      .map((_, el) => Number(el.tagName.slice(1)))
      .get()
    if (!levels.includes(2)) return { status: 'fail', message: 'La página no tiene encabezados <h2>.' }
    const skip = levels.findIndex((level, i) => i > 0 && level > levels[i - 1] + 1)
    if (skip !== -1) {
      return { status: 'warn', message: `Hay un salto de nivel de h${levels[skip - 1]} a h${levels[skip]}.` }
    }
    return { status: 'pass', message: 'Los encabezados siguen una jerarquía correcta.' }
  },
)

export const AI_CHECKS: DefinedCheck[] = [
  aiCrawlersCheck,
  llmsTxtCheck,
  structuredDataCheck,
  entitySchemaCheck,
  serverRenderedContentCheck,
  headingStructureCheck,
]
