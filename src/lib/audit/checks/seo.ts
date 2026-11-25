import type { Check } from '../types'
import { defineCheck, lengthStatus } from './define'

/** Thresholds (characters / ratio) used by the SEO checks. */
export const SEO_THRESHOLDS = {
  titleMin: 10,
  titleMax: 60,
  descriptionMin: 50,
  descriptionMax: 160,
  imgAltPass: 0.9,
  imgAltWarn: 0.5,
} as const

export const httpsCheck = defineCheck(
  { id: 'https', category: 'seo', title: 'HTTPS', weight: 3, recommendation: 'Sirve la web por HTTPS y redirige todo el tráfico HTTP a HTTPS.' },
  (ctx) =>
    new URL(ctx.finalUrl).protocol === 'https:'
      ? { status: 'pass', message: 'La página se sirve por HTTPS.' }
      : { status: 'fail', message: 'La página se sirve por HTTP sin cifrar.' },
)

export const status200Check = defineCheck(
  { id: 'status-200', category: 'seo', title: 'Respuesta 200', weight: 3, recommendation: 'Haz que la URL principal responda con un código 200.' },
  (ctx) => {
    if (ctx.status === 200) return { status: 'pass', message: 'La página responde con código 200.' }
    if (ctx.status >= 200 && ctx.status < 300) return { status: 'warn', message: `La página responde con código ${ctx.status}.` }
    return { status: 'fail', message: `La página responde con código ${ctx.status}.` }
  },
)

export const titleCheck = defineCheck(
  { id: 'title', category: 'seo', title: 'Título de la página', weight: 3, recommendation: `Escribe un <title> único y descriptivo de entre ${SEO_THRESHOLDS.titleMin} y ${SEO_THRESHOLDS.titleMax} caracteres.` },
  (ctx) => {
    const title = ctx.html('head > title, title').first().text().trim()
    const status = lengthStatus(title.length, SEO_THRESHOLDS.titleMin, SEO_THRESHOLDS.titleMax)
    if (status === 'fail') return { status, message: 'La página no tiene título.' }
    return { status, message: `El título mide ${title.length} caracteres.` }
  },
)

export const metaDescriptionCheck = defineCheck(
  { id: 'meta-description', category: 'seo', title: 'Meta descripción', weight: 2, recommendation: `Añade una meta descripción de entre ${SEO_THRESHOLDS.descriptionMin} y ${SEO_THRESHOLDS.descriptionMax} caracteres que resuma la página.` },
  (ctx) => {
    const description = (ctx.html('meta[name="description" i]').attr('content') ?? '').trim()
    const status = lengthStatus(description.length, SEO_THRESHOLDS.descriptionMin, SEO_THRESHOLDS.descriptionMax)
    if (status === 'fail') return { status, message: 'La página no tiene meta descripción.' }
    return { status, message: `La meta descripción mide ${description.length} caracteres.` }
  },
)

export const h1Check = defineCheck(
  { id: 'h1', category: 'seo', title: 'Encabezado H1', weight: 2, recommendation: 'Usa exactamente un <h1> que describa el tema principal de la página.' },
  (ctx) => {
    const count = ctx.html('h1').length
    if (count === 1) return { status: 'pass', message: 'La página tiene un único H1.' }
    if (count === 0) return { status: 'fail', message: 'La página no tiene ningún H1.' }
    return { status: 'warn', message: `La página tiene ${count} H1.` }
  },
)

export const canonicalCheck = defineCheck(
  { id: 'canonical', category: 'seo', title: 'URL canónica', weight: 2, recommendation: 'Añade <link rel="canonical"> apuntando a la URL preferida de la página.' },
  (ctx) => {
    const href = ctx.html('link[rel="canonical" i]').attr('href')?.trim()
    if (!href) return { status: 'fail', message: 'La página no declara una URL canónica.' }
    let canonical: URL
    try {
      canonical = new URL(href, ctx.finalUrl)
    } catch {
      return { status: 'fail', message: 'La URL canónica no es válida.' }
    }
    if (canonical.host !== new URL(ctx.finalUrl).host) {
      return { status: 'warn', message: `La URL canónica apunta a otro dominio (${canonical.host}).` }
    }
    return { status: 'pass', message: 'La página declara una URL canónica.' }
  },
)

export const htmlLangCheck = defineCheck(
  { id: 'html-lang', category: 'seo', title: 'Idioma del documento', weight: 1, recommendation: 'Indica el idioma en la etiqueta <html lang="es">.' },
  (ctx) => {
    const lang = ctx.html('html').attr('lang')?.trim()
    return lang
      ? { status: 'pass', message: `El idioma declarado es "${lang}".` }
      : { status: 'fail', message: 'La etiqueta <html> no declara el idioma.' }
  },
)

export const viewportCheck = defineCheck(
  { id: 'viewport', category: 'seo', title: 'Viewport móvil', weight: 2, recommendation: 'Añade <meta name="viewport" content="width=device-width, initial-scale=1">.' },
  (ctx) => {
    const content = ctx.html('meta[name="viewport" i]').attr('content')
    if (content === undefined) return { status: 'fail', message: 'La página no tiene meta viewport.' }
    return /width\s*=\s*device-width/i.test(content)
      ? { status: 'pass', message: 'La meta viewport está configurada para móviles.' }
      : { status: 'warn', message: 'La meta viewport no usa width=device-width.' }
  },
)

export const imgAltCheck = defineCheck(
  { id: 'img-alt', category: 'seo', title: 'Texto alternativo en imágenes', weight: 1, recommendation: 'Añade un atributo alt descriptivo a cada imagen (alt="" si es decorativa).' },
  (ctx) => {
    const images = ctx.html('img')
    if (images.length === 0) return { status: 'pass', message: 'La página no tiene imágenes.' }
    const withAlt = images.filter((_, img) => ctx.html(img).attr('alt') !== undefined).length
    const ratio = withAlt / images.length
    const message = `${withAlt} de ${images.length} imágenes tienen atributo alt.`
    if (ratio >= SEO_THRESHOLDS.imgAltPass) return { status: 'pass', message }
    return { status: ratio >= SEO_THRESHOLDS.imgAltWarn ? 'warn' : 'fail', message }
  },
)

const NOINDEX = /\b(noindex|none)\b/i

export const indexableCheck = defineCheck(
  { id: 'indexable', category: 'seo', title: 'Página indexable', weight: 3, recommendation: 'Elimina la directiva noindex de la meta robots y de la cabecera X-Robots-Tag.' },
  (ctx) => {
    const metas = ctx.html('meta[name="robots" i], meta[name="googlebot" i]')
      .map((_, el) => ctx.html(el).attr('content') ?? '')
      .get()
    if (metas.some((content) => NOINDEX.test(content))) {
      return { status: 'fail', message: 'La meta robots contiene noindex.' }
    }
    if (NOINDEX.test(ctx.headers['x-robots-tag'] ?? '')) {
      return { status: 'fail', message: 'La cabecera X-Robots-Tag contiene noindex.' }
    }
    return { status: 'pass', message: 'La página permite la indexación.' }
  },
)

const OG_PROPERTIES = ['og:title', 'og:description', 'og:image'] as const

export const openGraphCheck = defineCheck(
  { id: 'open-graph', category: 'seo', title: 'Open Graph', weight: 1, recommendation: 'Añade las etiquetas og:title, og:description y og:image.' },
  (ctx) => {
    const missing = OG_PROPERTIES.filter(
      (property) => !ctx.html(`meta[property="${property}"]`).attr('content')?.trim(),
    )
    if (missing.length === 0) return { status: 'pass', message: 'Están todas las etiquetas Open Graph básicas.' }
    const message = `Faltan etiquetas Open Graph: ${missing.join(', ')}.`
    return { status: missing.length === OG_PROPERTIES.length ? 'fail' : 'warn', message }
  },
)

export const robotsTxtCheck = defineCheck(
  { id: 'robots-txt', category: 'seo', title: 'robots.txt', weight: 1, recommendation: 'Publica un archivo /robots.txt en la raíz del dominio.' },
  (ctx) =>
    ctx.robotsTxt !== null
      ? { status: 'pass', message: 'El sitio publica un robots.txt.' }
      : { status: 'fail', message: 'No se encontró /robots.txt.' },
)

export const sitemapCheck = defineCheck(
  { id: 'sitemap', category: 'seo', title: 'Sitemap XML', weight: 1, recommendation: 'Publica un sitemap.xml y decláralo en robots.txt con la línea "Sitemap:".' },
  (ctx) =>
    ctx.sitemapFound
      ? { status: 'pass', message: 'Se encontró un sitemap.' }
      : { status: 'fail', message: 'No se encontró ningún sitemap.' },
)

export const SEO_CHECKS: Check[] = [
  httpsCheck,
  status200Check,
  titleCheck,
  metaDescriptionCheck,
  h1Check,
  canonicalCheck,
  htmlLangCheck,
  viewportCheck,
  imgAltCheck,
  indexableCheck,
  openGraphCheck,
  robotsTxtCheck,
  sitemapCheck,
]
