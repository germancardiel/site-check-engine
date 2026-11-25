import { DOCS } from '../docs'
import { nodesOfType } from '../text'
import { defineChecks, fail, isHomePage, na, pass, warn } from './helpers'

export const urlChecks = defineChecks('url', [
  {
    id: 'url.breadcrumbs',
    title: 'Breadcrumbs visibles y marcados',
    weight: 1,
    docs: [DOCS.breadcrumb],
    run: (ctx) => {
      const { $, jsonLd } = ctx
      const marked =
        nodesOfType(jsonLd, 'BreadcrumbList').length > 0 || $('[itemtype*="BreadcrumbList"]').length > 0
      const visible =
        $('nav[aria-label*="breadcrumb" i], nav[aria-label*="migas" i], [class*="breadcrumb" i], ol[itemtype*="BreadcrumbList"]').length > 0
      if (marked && visible) return pass('Hay breadcrumbs visibles y marcados con BreadcrumbList.')
      if (marked) {
        return warn('Hay marcado BreadcrumbList pero no se ha detectado el elemento visible de breadcrumbs en el HTML.', {
          fix: 'Muestra la ruta (Inicio › Sección › Página) en un <nav aria-label="Breadcrumb"> que coincida con el JSON-LD.',
        })
      }
      if (visible) {
        return warn('Hay breadcrumbs visibles pero sin marcado BreadcrumbList.', {
          fix: 'Añade un JSON-LD de tipo BreadcrumbList con los mismos elementos.',
        })
      }
      if (isHomePage(ctx)) return na('Es la página de inicio: los breadcrumbs no son necesarios.')
      return warn('No hay breadcrumbs. Ayudan a Google y al usuario a entender la jerarquía del sitio.')
    },
  },
  {
    id: 'url.length',
    title: 'URL corta y legible',
    weight: 1,
    docs: [DOCS.urlStructure],
    run: ({ url }) => {
      const len = url.href.length
      if (len <= 75) return pass(`La URL tiene ${len} caracteres, dentro de un rango razonable.`)
      if (len <= 115) return warn(`La URL tiene ${len} caracteres. Las URLs cortas se leen y comparten mejor.`)
      return fail(`La URL tiene ${len} caracteres: es demasiado larga.`)
    },
  },
  {
    id: 'url.format',
    title: 'URL en minúsculas y con guiones',
    weight: 1,
    docs: [DOCS.urlStructure],
    run: ({ url }) => {
      const path = decodeURIComponent(url.pathname)
      const problems: string[] = []
      if (/[A-Z]/.test(path)) problems.push('mayúsculas')
      if (/_/.test(path)) problems.push('guiones bajos')
      if (/\s|%20/.test(url.pathname) || /\s/.test(path)) problems.push('espacios')
      if (/[áéíóúñü]/i.test(path)) problems.push('tildes o ñ')
      if (problems.length === 0) return pass('La URL sigue el formato recomendado (minúsculas, guiones medios).')
      return warn(`La URL contiene ${problems.join(', ')}. Usa minúsculas, sin tildes y con guiones medios.`, {
        evidence: url.pathname,
      })
    },
  },
  {
    id: 'url.dates-ids',
    title: 'Sin fechas/IDs innecesarios',
    weight: 1,
    docs: [DOCS.urlStructure],
    run: ({ url }) => {
      const p = url.pathname
      if (/\/(19|20)\d{2}\/\d{1,2}(\/\d{1,2})?\//.test(p)) {
        return warn('La URL incluye una fecha. Envejece el contenido y alarga la URL sin aportar nada.', { evidence: p })
      }
      if (/\d{6,}|[a-f0-9]{24,}/i.test(p)) {
        return warn('La URL incluye un ID numérico o hash largo. Mejor un slug descriptivo.', { evidence: p })
      }
      return pass('No se detectan patrones de fecha ni IDs numéricos largos en la ruta.')
    },
  },
  {
    id: 'url.depth',
    title: 'Profundidad de la URL',
    weight: 1,
    docs: [DOCS.urlStructure],
    run: ({ url }) => {
      const depth = url.pathname.split('/').filter(Boolean).length
      if (depth <= 3) return pass(`Profundidad de ${depth} nivel(es) respecto a la raíz, razonable.`)
      if (depth <= 5) return warn(`Profundidad de ${depth} niveles. Las páginas importantes deberían estar a 3 clics o menos.`)
      return fail(`Profundidad de ${depth} niveles: la arquitectura es demasiado profunda.`)
    },
  },
])
