import { AI_BOTS } from '../ai-bots'
import { DOCS } from '../docs'
import { isAllowed, parseRobots } from '../robots'
import type { EvidenceItem } from '../types'
import { defineChecks, fail, na, pass, warn } from './helpers'

export const aiChecks = defineChecks('ai', [
  {
    id: 'ai.robots',
    title: 'Acceso de crawlers de IA en robots.txt',
    weight: 2,
    docs: [DOCS.gptbot, DOCS.claudebot, DOCS.perplexity, DOCS.googleExtended],
    run: ({ robots, url }) => {
      const parsed = parseRobots(robots.text)
      const path = url.pathname + url.search
      const items: EvidenceItem[] = AI_BOTS.map((b) => {
        const ok = !robots.found || isAllowed(parsed, b.name, path)
        return { label: b.name, value: ok ? 'Permitido' : 'Bloqueado', status: ok ? 'ok' : 'bad' }
      })
      const allowed = items.filter((i) => i.status === 'ok').length
      const msg = `${allowed} de ${AI_BOTS.length} bots permitidos.`
      const note =
        'Revisa si cada bloqueo es intencionado: bloquear Google-Extended te excluye de usos de IA de Google; bloquear GPTBot, ClaudeBot o PerplexityBot te excluye de entrenamiento y/o citas en esos asistentes.'
      if (allowed === AI_BOTS.length) return pass(`${msg} ${note}`, { items })
      if (allowed === 0) {
        return fail(`${msg} Todos los bots de IA están bloqueados en robots.txt. ${note}`, {
          items,
          fix: 'Permite en robots.txt los rastreadores de IA que quieras que lean o citen tu web.',
        })
      }
      const searchBots = ['OAI-SearchBot', 'ChatGPT-User', 'Claude-User', 'PerplexityBot']
      const blockedSearch = items.filter((i) => i.status === 'bad' && searchBots.includes(i.label))
      if (blockedSearch.length > 0) {
        return warn(`${msg} Están bloqueados bots que citan tu web en respuestas (${blockedSearch.map((i) => i.label).join(', ')}). ${note}`, { items })
      }
      return warn(`${msg} ${note}`, { items })
    },
  },
  {
    id: 'ai.waf',
    title: 'Sin bloqueo por firewall/WAF a bots de IA',
    weight: 2,
    docs: [DOCS.gptbot, DOCS.claudebot],
    run: ({ botProbes }) => {
      if (botProbes.length === 0) return na('No se ha podido hacer la prueba con user-agents de IA.')
      const blocked = botProbes.filter((p) => p.status === 403 || p.status === 429 || p.status === 503 || p.status === 401)
      const items: EvidenceItem[] = botProbes.map((p) => ({
        label: p.bot,
        value: p.status === null ? 'Sin respuesta' : String(p.status),
        status: p.status === null ? 'neutral' : blocked.includes(p) ? 'bad' : 'ok',
      }))
      const note =
        'Límite de esta prueba: muchos WAF (como los "verified bots" de Cloudflare) también verifican la IP de origen. Un "permitido" aquí no garantiza que el bot real pase; un 403 sí indica bloqueo.'
      if (blocked.length === 0) return pass(`Ninguno de los bots de IA comprobados recibe 403/429 al pedir esta URL. ${note}`, { items })
      if (blocked.length === botProbes.length) {
        return fail(`Todos los bots de IA reciben ${blocked[0].status}: tu firewall los está bloqueando. ${note}`, { items })
      }
      return warn(`${blocked.length} de ${botProbes.length} bots de IA reciben un bloqueo (403/429). ${note}`, { items })
    },
  },
  {
    id: 'ai.ssr',
    title: 'Contenido presente en el HTML inicial (sin ejecutar JS)',
    weight: 3,
    docs: [DOCS.jsSeo],
    run: ({ $, text }) => {
      const scripts = $('script').length
      const evidence = `palabras=${text.words}, elementos en body=${$('body').children().length}, scripts=${scripts}`
      if (text.words >= 150) {
        return pass(`El HTML inicial contiene ~${text.words} palabras de texto visible sin ejecutar JavaScript.`, { evidence })
      }
      if (text.words < 50 && ($('#root, #app, #__next, [data-reactroot]').length > 0 || scripts > 5)) {
        return fail('El HTML inicial está casi vacío: el contenido se genera con JavaScript. La mayoría de bots de IA no ejecutan JS y no verán nada.', {
          evidence,
          fix: 'Usa renderizado en servidor (SSR) o generación estática (SSG): Next.js, Astro, Nuxt…',
        })
      }
      return warn(`El HTML inicial solo contiene ~${text.words} palabras. Comprueba que el contenido principal no dependa de JavaScript.`, { evidence })
    },
  },
  {
    id: 'ai.llms',
    title: 'Archivo llms.txt',
    weight: 1,
    docs: [DOCS.llmsTxt],
    run: ({ llmsTxt }) => {
      if (llmsTxt.found) return pass(`Se ha encontrado ${llmsTxt.url}, con contexto preparado para asistentes de IA.`)
      return warn('No hay /llms.txt. Es una propuesta emergente (Google no lo usa), pero algunos asistentes lo leen para entender tu web.', {
        fix: '# Tu marca\n> Qué haces en una frase.\n\n## Servicios\n- [Servicio](https://…): descripción',
      })
    },
  },
  {
    id: 'ai.webmcp',
    title: 'Herramientas WebMCP para agentes de IA',
    weight: 1,
    docs: [DOCS.webmcp],
    run: ({ $ }) => {
      const declarative = $('[toolname]')
        .map((_, el) => $(el).attr('toolname'))
        .get()
      const imperative = $('script')
        .map((_, el) => $(el).text())
        .get()
        .some((s) => /modelContext\s*\.\s*(registerTool|provideContext)/.test(s))
      if (declarative.length || imperative) {
        const parts = [
          declarative.length ? `${declarative.length} herramienta(s) declarativa(s) (atributo 'toolname')` : '',
          imperative ? 'registro por JavaScript (modelContext.registerTool)' : '',
        ].filter(Boolean)
        return pass(`Se detecta WebMCP: ${parts.join(' y ')}.`, { items: declarative.map((label) => ({ label })) })
      }
      return warn('No se exponen herramientas WebMCP. Es un estándar emergente para que los agentes de IA puedan, por ejemplo, pedir presupuesto en tu web.')
    },
  },
])
