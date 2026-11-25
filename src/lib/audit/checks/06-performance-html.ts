import { DOCS } from '../docs'
import type { AuditContext } from '../types'
import { defineChecks, fail, na, pass, resolveUrl, warn } from './helpers'

/** Imágenes en orden de documento, excluyendo píxeles de tracking. */
function contentImages(ctx: AuditContext) {
  const { $ } = ctx
  return $('img').filter((_, el) => {
    const w = Number($(el).attr('width'))
    return !(w > 0 && w <= 2)
  })
}

export const performanceHtmlChecks = defineChecks('performance', [
  {
    id: 'perf.img-dims',
    title: 'Imágenes con dimensiones reservadas',
    weight: 2,
    docs: [DOCS.imgSize],
    run: (ctx) => {
      const { $ } = ctx
      const imgs = contentImages(ctx)
      if (imgs.length === 0) return na('La página no contiene imágenes.')
      const missing = imgs.filter((_, el) => {
        const $el = $(el)
        const style = $el.attr('style') ?? ''
        return !(($el.attr('width') && $el.attr('height')) || /aspect-ratio|width:\s*100%.*height:\s*100%/i.test(style) || $el.attr('data-nimg') === 'fill')
      })
      if (missing.length === 0) return pass(`Las ${imgs.length} imágenes declaran width/height (o aspect-ratio).`)
      const msg = `${missing.length} de ${imgs.length} imágenes no declaran width/height: provocan saltos de diseño (CLS).`
      const items = missing.slice(0, 8).map((_, el) => ({ label: ($(el).attr('src') ?? '').slice(0, 120) })).get()
      return missing.length / imgs.length > 0.5 ? fail(msg, { items }) : warn(msg, { items })
    },
  },
  {
    id: 'perf.lazy',
    title: 'Carga diferida de imágenes fuera del viewport',
    weight: 1,
    docs: [DOCS.lazyImg],
    run: (ctx) => {
      const { $ } = ctx
      const below = contentImages(ctx).slice(3)
      if (below.length === 0) return na('No hay más de 3 imágenes; no aplica.')
      const eager = below.filter((_, el) => $(el).attr('loading') !== 'lazy')
      if (eager.length === 0) return pass(`Las ${below.length} imágenes evaluadas (fuera de las 3 primeras) usan lazy-load.`)
      return warn(`${eager.length} de ${below.length} imágenes por debajo del pliegue no usan loading="lazy".`, {
        fix: '<img src="…" loading="lazy" … />',
      })
    },
  },
  {
    id: 'perf.lcp-lazy',
    title: 'Imagen principal (LCP) sin lazy-load',
    weight: 2,
    docs: [DOCS.lcp, DOCS.lazyImg],
    run: (ctx) => {
      const { $ } = ctx
      const preloaded = new Set(
        $('link[rel="preload"][as="image"]')
          .map((_, el) => resolveUrl(ctx, $(el).attr('href') ?? $(el).attr('imagesrcset')?.split(' ')[0])?.href)
          .get(),
      )
      const prioritized = $('img[fetchpriority="high"]').first()
      const candidate = prioritized.length
        ? prioritized
        : $('main img, body img').filter((_, el) => $(el).closest('header, nav, footer').length === 0).first()
      if (candidate.length === 0) return na('No se ha identificado una imagen principal.')
      const src = resolveUrl(ctx, candidate.attr('src'))?.href
      const isPriority = candidate.attr('fetchpriority') === 'high' || (src && preloaded.has(src))
      const note = 'Es una estimación sobre el HTML inicial: si el LCP real es un texto u otra imagen, no aplica.'
      if (candidate.attr('loading') === 'lazy') {
        return fail(`La imagen principal tiene loading="lazy": retrasa el LCP. ${note}`, {
          evidence: candidate.attr('src'),
          fix: 'Quita loading="lazy" de la imagen principal y añade fetchpriority="high".',
        })
      }
      if (!isPriority) {
        return warn(`La imagen principal no se prioriza. Añade fetchpriority="high" o un preload. ${note}`, {
          evidence: candidate.attr('src'),
        })
      }
      return pass(`La imagen principal no lleva lazy-load y ya se prioriza (fetchpriority="high" o preload). ${note}`)
    },
  },
  {
    id: 'perf.dom',
    title: 'Tamaño del DOM',
    weight: 1,
    docs: [DOCS.domSize],
    run: ({ $ }) => {
      const n = $('*').length
      const evidence = `nodos totales: ${n}`
      if (n <= 1500) return pass(`El HTML inicial tiene ${n} nodos, dentro de un rango razonable.`, { evidence })
      if (n <= 3000) return warn(`El HTML inicial tiene ${n} nodos. Un DOM grande ralentiza la interacción (INP).`, { evidence })
      return fail(`El HTML inicial tiene ${n} nodos: excesivo.`, { evidence })
    },
  },
  {
    id: 'perf.lazy-video',
    title: 'Carga diferida de vídeos',
    weight: 1,
    docs: [DOCS.lazyVideo],
    run: ({ $ }) => {
      const iframes = $('iframe[src*="youtube"], iframe[src*="youtu.be"], iframe[src*="vimeo"], iframe[src*="dailymotion"]')
      const videos = $('video')
      const total = iframes.length + videos.length
      if (total === 0) return na('La página no contiene vídeos (<video> ni YouTube/Vimeo/Dailymotion); no aplica.')
      const eager =
        iframes.filter((_, el) => $(el).attr('loading') !== 'lazy').length +
        videos.filter((_, el) => {
          const p = $(el).attr('preload')
          return $(el).attr('autoplay') === undefined && p !== 'none' && p !== 'metadata'
        }).length
      if (eager === 0) return pass(`Los ${total} vídeos se cargan de forma diferida.`)
      return warn(`${eager} de ${total} vídeos se cargan de inmediato. Usa loading="lazy" en iframes y preload="none" en <video>.`)
    },
  },
  {
    id: 'perf.preconnect',
    title: 'Preconnect/dns-prefetch a orígenes de terceros',
    weight: 1,
    docs: [DOCS.preconnect],
    run: (ctx) => {
      const { $, url } = ctx
      const critical = new Set(
        [
          ...$('script[src]').map((_, el) => $(el).attr('src')).get(),
          ...$('link[rel~="stylesheet"][href]').map((_, el) => $(el).attr('href')).get(),
          ...$('link[rel="preload"][href]').map((_, el) => $(el).attr('href')).get(),
        ]
          .map((h) => resolveUrl(ctx, h))
          .filter((u): u is URL => !!u && u.protocol.startsWith('http') && u.host !== url.host)
          .map((u) => u.origin),
      )
      if (critical.size === 0) {
        return na('La página no carga scripts ni hojas de estilo desde orígenes de terceros; no aplica.')
      }
      const hinted = new Set(
        $('link[rel~="preconnect"], link[rel~="dns-prefetch"]')
          .map((_, el) => resolveUrl(ctx, $(el).attr('href'))?.origin)
          .get(),
      )
      const missing = [...critical].filter((o) => !hinted.has(o))
      if (missing.length === 0) return pass(`Los ${critical.size} orígenes de terceros críticos tienen preconnect o dns-prefetch.`)
      return warn(`${missing.length} origen(es) de terceros sin preconnect.`, {
        items: missing.slice(0, 6).map((label) => ({ label })),
        fix: missing.slice(0, 2).map((o) => `<link rel="preconnect" href="${o}" crossorigin />`).join('\n'),
      })
    },
  },
])
