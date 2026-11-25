import { DOCS } from '../docs'
import { isAllowed, parseRobots } from '../robots'
import { allMeta, cleanText, comparableUrl, defineChecks, fail, na, pass, resolveUrl, warn } from './helpers'

export const crawlChecks = defineChecks('crawl', [
  {
    id: 'crawl.status',
    title: 'La URL devuelve 200 directamente',
    weight: 3,
    docs: [DOCS.httpStatus],
    run: ({ page }) => {
      const chain = page.redirects.map((r) => `${r.status} ${r.url}`)
      if (page.status === 200 && page.redirects.length === 0) {
        return pass('La URL responde 200 sin redirecciones intermedias.')
      }
      if (page.status === 200) {
        return warn(
          `La URL responde 200 tras ${page.redirects.length} redirección(es). Enlaza siempre a la URL final para ahorrar saltos.`,
          { items: [...chain, `200 ${page.url}`].map((label) => ({ label })) },
        )
      }
      return fail(`La URL responde con un código ${page.status}. Google no indexa páginas que no devuelven 200.`, {
        items: [...chain, `${page.status} ${page.url}`].map((label) => ({ label })),
      })
    },
  },
  {
    id: 'crawl.robots-txt',
    title: 'No bloqueada en robots.txt',
    weight: 3,
    docs: [DOCS.robotsIntro],
    run: ({ robots, url }) => {
      if (robots.status !== null && robots.status >= 500) {
        return warn(
          `robots.txt responde ${robots.status}. Si persiste, Google puede dejar de rastrear el sitio entero.`,
        )
      }
      if (!robots.found) return pass('No hay robots.txt: por defecto se permite rastrear todo.')
      const parsed = parseRobots(robots.text)
      const path = url.pathname + url.search
      const google = isAllowed(parsed, 'Googlebot', path)
      const generic = isAllowed(parsed, '*', path)
      if (google && generic) {
        return pass('robots.txt permite el rastreo de esta ruta a Googlebot y al user-agent genérico.')
      }
      if (!google) {
        return fail('robots.txt bloquea esta URL a Googlebot: no podrá rastrearse.', {
          fix: 'Elimina o ajusta la regla Disallow que afecta a esta ruta en robots.txt.',
        })
      }
      return warn('robots.txt bloquea esta URL al user-agent genérico (*), aunque Googlebot puede rastrearla.')
    },
  },
  {
    id: 'crawl.noindex',
    title: 'Meta robots / X-Robots-Tag (noindex, nofollow)',
    weight: 3,
    docs: [DOCS.metaRobots],
    run: (ctx) => {
      const metas = [...allMeta(ctx, 'robots'), ...allMeta(ctx, 'googlebot')].join(', ')
      const header = ctx.page.headers['x-robots-tag'] ?? ''
      const all = `${metas} ${header}`.toLowerCase()
      const evidence = `meta robots='${metas}' | X-Robots-Tag='${header}'`
      if (/\bnoindex\b|\bnone\b/.test(all)) {
        return fail('La página tiene la directiva noindex: Google no la mostrará en los resultados.', {
          evidence,
          fix: 'Quita "noindex" de la etiqueta <meta name="robots"> o de la cabecera X-Robots-Tag.',
        })
      }
      if (/\bnofollow\b/.test(all)) {
        return warn('La página tiene nofollow: Google no seguirá sus enlaces.', { evidence })
      }
      return pass("No se han encontrado las directivas 'noindex' ni 'nofollow'.", { evidence })
    },
  },
  {
    id: 'crawl.soft404',
    title: 'Sin indicios de soft 404',
    weight: 2,
    docs: [DOCS.soft404],
    run: ({ page, $, text }) => {
      if (page.status !== 200) return na('La página no responde 200; no aplica.')
      const title = cleanText($('title').first().text())
      const h1 = cleanText($('h1').first().text())
      const errorish = /\b(404|not found|page not found|no encontrad[ao]|no existe|página no disponible)\b/i
      if (errorish.test(title) || errorish.test(h1)) {
        return fail('La página responde 200 pero su título o H1 indican un error (soft 404).', {
          evidence: `title='${title}' | h1='${h1}'`,
          fix: 'Si la página no existe, devuelve un código 404 o 410 real.',
        })
      }
      if (text.words < 50) {
        return warn(`La página responde 200 pero solo tiene ~${text.words} palabras visibles: Google podría tratarla como soft 404.`)
      }
      return pass('No se detectan señales típicas de soft 404 (200 con contenido vacío o de error).')
    },
  },
  {
    id: 'crawl.resources',
    title: 'robots.txt no bloquea el CSS/JS de la página',
    weight: 2,
    docs: [DOCS.jsSeo, DOCS.robotsIntro],
    run: (ctx) => {
      const { $, robots, url } = ctx
      const resources = [
        ...$('link[rel~="stylesheet"][href]').map((_, el) => $(el).attr('href')).get(),
        ...$('script[src]').map((_, el) => $(el).attr('src')).get(),
      ]
        .map((h) => resolveUrl(ctx, h))
        .filter((u): u is URL => !!u && u.host === url.host)
      if (resources.length === 0) return na('La página no enlaza CSS/JS propios.')
      if (!robots.found) return pass(`Los ${resources.length} recursos CSS/JS son accesibles (no hay robots.txt).`)
      const parsed = parseRobots(robots.text)
      const blocked = resources.filter((u) => !isAllowed(parsed, 'Googlebot', u.pathname + u.search))
      if (blocked.length === 0) {
        return pass(`Los ${resources.length} recursos CSS/JS enlazados son accesibles para Googlebot según robots.txt.`)
      }
      return fail(`${blocked.length} de ${resources.length} recursos CSS/JS están bloqueados: Google no podrá renderizar bien la página.`, {
        items: blocked.slice(0, 10).map((u) => ({ label: u.pathname, status: 'bad' as const })),
        fix: 'Permite en robots.txt las rutas de tus CSS y JS (p. ej. Allow: /_next/).',
      })
    },
  },
  {
    id: 'crawl.canonical',
    title: 'Canonical autorreferencial y absoluta',
    weight: 3,
    docs: [DOCS.canonical],
    run: (ctx) => {
      const { $, page, url } = ctx
      const htmlCanon = $('link[rel="canonical" i]')
        .map((_, el) => $(el).attr('href') ?? '')
        .get()
        .filter(Boolean)
      const headerCanon = (page.headers.link ?? '').match(/<([^>]+)>\s*;\s*rel="?canonical"?/i)?.[1]
      const all = [...htmlCanon, ...(headerCanon ? [headerCanon] : [])]
      if (all.length === 0) {
        return warn('No hay etiqueta canonical. Google elegirá por su cuenta la URL principal.', {
          fix: `<link rel="canonical" href="${url.href}" />`,
        })
      }
      const unique = [...new Set(all.map((h) => resolveUrl(ctx, h)?.href ?? h))]
      if (unique.length > 1) {
        return fail('Hay varias canonical distintas: Google ignorará todas.', { items: unique.map((label) => ({ label })) })
      }
      const raw = all[0]
      const abs = /^https?:\/\//i.test(raw)
      const target = unique[0]
      const self = comparableUrl(target) === comparableUrl(url.href)
      const where = headerCanon && htmlCanon.length === 0 ? 'en la cabecera Link' : 'en el HTML'
      if (!self) {
        return warn(`La canonical apunta a otra URL (${target}). Correcto solo si esta página es un duplicado intencionado.`, {
          evidence: raw,
        })
      }
      if (!abs) {
        return warn(`La canonical es relativa (${raw}). Usa una URL absoluta para evitar ambigüedades.`, {
          fix: `<link rel="canonical" href="${target}" />`,
        })
      }
      return pass(`La canonical (${raw}) es absoluta y apunta a la propia URL (${where}).`)
    },
  },
  {
    id: 'crawl.sitemap',
    title: 'Sitemap declarado e incluye la URL',
    weight: 2,
    docs: [DOCS.sitemap],
    run: ({ sitemap }) => {
      const where = sitemap.checked.join(', ')
      if (!sitemap.found) {
        return fail('No se ha encontrado ningún sitemap XML.', {
          fix: 'Crea /sitemap.xml y decláralo en robots.txt con "Sitemap: https://tu-dominio/sitemap.xml".',
        })
      }
      if (!sitemap.containsUrl) {
        return warn(`Hay sitemap (${where}) pero no incluye esta URL.`, {
          fix: 'Añade esta URL al sitemap si quieres que Google la descubra y priorice.',
        })
      }
      if (!sitemap.declaredInRobots) {
        return warn('El sitemap incluye la URL, pero no está declarado en robots.txt.', {
          fix: 'Añade "Sitemap: <url del sitemap>" al final de robots.txt.',
        })
      }
      return pass(`Declarado en robots.txt. La URL aparece en el sitemap (${where}).`)
    },
  },
  {
    id: 'crawl.meta-refresh',
    title: 'Sin meta refresh (redirección obsoleta)',
    weight: 1,
    docs: [DOCS.metaRefresh],
    run: ({ $ }) => {
      const refresh = $('meta[http-equiv="refresh" i]').attr('content')
      if (refresh) {
        return warn('Se usa <meta http-equiv="refresh">. Sustitúyelo por una redirección 301 en el servidor.', {
          evidence: refresh,
        })
      }
      return pass('No se usa <meta http-equiv="refresh">.')
    },
  },
  {
    id: 'crawl.query',
    title: 'Sin parámetros de consulta',
    weight: 1,
    docs: [DOCS.duplicate],
    run: ({ url }) => {
      if (url.search) {
        return warn('La URL lleva parámetros de consulta, que pueden generar contenido duplicado. Asegúrate de que la canonical apunta a la versión limpia.', {
          evidence: url.search,
        })
      }
      return pass('La URL no lleva parámetros de consulta que puedan generar contenido duplicado.')
    },
  },
])
