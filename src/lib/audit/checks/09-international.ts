import { DOCS } from '../docs'
import type { EvidenceItem } from '../types'
import { comparableUrl, defineChecks, fail, meta, na, pass, resolveUrl, warn } from './helpers'

const HREFLANG_RE = /^(x-default|[a-z]{2,3}(-[a-z]{4})?(-([a-z]{2}|\d{3}))?)$/i

export const internationalChecks = defineChecks('international', [
  {
    id: 'intl.og-locale',
    title: 'og:locale coherente con lang',
    weight: 1,
    docs: [DOCS.og],
    run: (ctx) => {
      const lang = ctx.$('html').attr('lang')?.trim()
      const locale = meta(ctx, 'og:locale')
      if (!lang) return na('No hay atributo lang con el que comparar.')
      if (!locale) {
        return warn('No hay og:locale. Añádelo para indicar el idioma al compartir.', {
          fix: `<meta property="og:locale" content="${lang.split('-')[0].toLowerCase()}_${(lang.split('-')[1] ?? 'ES').toUpperCase()}" />`,
        })
      }
      const a = lang.split(/[-_]/)[0].toLowerCase()
      const b = locale.split(/[-_]/)[0].toLowerCase()
      if (a === b) return pass(`og:locale='${locale}' coincide en idioma con lang='${lang}'.`)
      return warn(`og:locale='${locale}' no coincide con lang='${lang}'.`)
    },
  },
  {
    id: 'intl.hreflang',
    title: 'hreflang',
    weight: 2,
    docs: [DOCS.hreflang],
    run: (ctx) => {
      const { $, url } = ctx
      const tags = $('link[rel="alternate"][hreflang]')
        .map((_, el) => ({ lang: ($(el).attr('hreflang') ?? '').trim(), href: $(el).attr('href') ?? '' }))
        .get()
      if (tags.length === 0) {
        return na(
          'No hay etiquetas hreflang ni señales de versiones por idioma. Si tu web tiene varias versiones (subdominio, carpeta /en/…), revísalo: la detección automática no lo cubre todo.',
        )
      }
      const problems: string[] = []
      const invalid = tags.filter((t) => !HREFLANG_RE.test(t.lang))
      if (invalid.length) problems.push(`códigos no válidos: ${invalid.map((t) => t.lang).join(', ')}`)
      if (tags.some((t) => !/^https?:\/\//i.test(t.href))) problems.push('hay URLs relativas (deben ser absolutas)')
      const self = tags.some((t) => comparableUrl(resolveUrl(ctx, t.href)?.href ?? '') === comparableUrl(url.href))
      if (!self) problems.push('falta la autorreferencia (la propia página debe estar en la lista)')
      const dupLangs = tags.map((t) => t.lang.toLowerCase()).filter((l, i, a) => a.indexOf(l) !== i)
      if (dupLangs.length) problems.push(`idiomas duplicados: ${[...new Set(dupLangs)].join(', ')}`)
      const hasDefault = tags.some((t) => t.lang.toLowerCase() === 'x-default')
      const items: EvidenceItem[] = tags.map((t) => ({ label: t.lang, value: t.href }))
      if (invalid.length || !self) return fail(`hreflang con errores: ${problems.join('; ')}.`, { items })
      if (problems.length || !hasDefault) {
        return warn(`hreflang mejorable: ${[...problems, ...(hasDefault ? [] : ['falta x-default'])].join('; ')}.`, { items })
      }
      return pass(`${tags.length} etiquetas hreflang válidas, con autorreferencia y x-default. La reciprocidad entre versiones no se comprueba aquí.`, { items })
    },
  },
])
