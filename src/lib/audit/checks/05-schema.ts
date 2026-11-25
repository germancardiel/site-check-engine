import { DOCS } from '../docs'
import { nodesOfType, typesOf } from '../text'
import type { EvidenceItem } from '../types'
import { defineChecks, fail, isHomePage, na, pass, warn } from './helpers'

/** Tipos de identidad o estructura (no describen el contenido de la página). */
const STRUCTURAL = new Set([
  'WebSite', 'WebPage', 'Organization', 'BreadcrumbList', 'ListItem', 'ImageObject', 'SearchAction', 'EntryPoint',
  'ContactPoint', 'PostalAddress', 'GeoCoordinates', 'OpeningHoursSpecification', 'Place', 'Country', 'City',
  'AdministrativeArea', 'SiteNavigationElement', 'WPHeader', 'WPFooter', 'ReadAction', 'Offer', 'Answer', 'Question',
  'Brand', 'Rating', 'PropertyValue', 'MonetaryAmount', 'DefinedTerm', 'Thing', 'CollectionPage',
])

/** Tipos con resultado enriquecido o función visible en Google. */
const RICH = new Set([
  'Article', 'NewsArticle', 'BlogPosting', 'Product', 'ProductGroup', 'Recipe', 'Event', 'JobPosting', 'Course',
  'VideoObject', 'Review', 'AggregateRating', 'SoftwareApplication', 'MobileApplication', 'WebApplication', 'Book',
  'Dataset', 'QAPage', 'DiscussionForumPosting', 'ProfilePage', 'LocalBusiness', 'Restaurant', 'Movie',
  'EmployerAggregateRating', 'VacationRental', 'ClaimReview', 'MathSolver', 'Quiz',
])

const ORG_RE = /Organization|Corporation|LocalBusiness|Business|Store|Service$|Restaurant|Clinic|Gym|Club|Agency|Shop|Center|Dentist|Physician|Hotel|Cafe|Bakery|Salon|Spa/

const EDITORIAL = ['Article', 'NewsArticle', 'BlogPosting', 'TechArticle', 'Recipe', 'Review', 'HowTo']

export const schemaChecks = defineChecks('schema', [
  {
    id: 'schema.detected',
    title: 'Datos estructurados Schema detectados',
    weight: 2,
    docs: [DOCS.sdGallery, DOCS.schemaOrg],
    run: ({ $, jsonLd }) => {
      const microdata = $('[itemscope][itemtype]').length
      if (jsonLd.parseErrors > 0 && jsonLd.nodes.length === 0) {
        return fail(`Hay ${jsonLd.parseErrors} bloque(s) JSON-LD con errores de sintaxis: Google los ignora.`, {
          fix: 'Valida el JSON-LD en https://validator.schema.org/',
        })
      }
      if (jsonLd.nodes.length === 0 && microdata === 0) {
        return fail('No hay datos estructurados. Sin ellos, Google y las IA entienden peor quién eres y qué ofreces.', {
          fix: 'Añade al menos un JSON-LD de Organization/LocalBusiness y WebSite.',
        })
      }
      const content = jsonLd.types.filter((t) => !STRUCTURAL.has(t))
      const items: EvidenceItem[] = content.map((t) => ({
        label: t,
        value: RICH.has(t)
          ? 'Con resultado enriquecido o función visible en Google'
          : 'Válido en Schema.org, sin resultado enriquecido de Google asociado',
        status: 'ok',
      }))
      if (jsonLd.parseErrors > 0) {
        return warn(`Se detectan datos estructurados, pero ${jsonLd.parseErrors} bloque(s) JSON-LD tienen errores de sintaxis.`, { items })
      }
      if (jsonLd.nodes.length === 0) return pass(`Se usan microdatos (${microdata} elementos). JSON-LD es el formato recomendado por Google.`)
      return pass(
        `${content.length} tipo(s) de contenido detectado(s) (además de los estructurales o de identidad).`,
        { items },
      )
    },
  },
  {
    id: 'schema.breadcrumb',
    title: 'BreadcrumbList marcado',
    weight: 1,
    docs: [DOCS.breadcrumb],
    run: (ctx) => {
      if (nodesOfType(ctx.jsonLd, 'BreadcrumbList').length > 0) return pass('BreadcrumbList presente en JSON-LD.')
      if (isHomePage(ctx)) return na('Es la página de inicio: BreadcrumbList no es necesario.')
      return warn('No hay BreadcrumbList. Ayuda a que Google muestre la ruta de la página en los resultados.')
    },
  },
  {
    id: 'schema.identity',
    title: 'Identidad del sitio marcada (Organization / WebSite)',
    weight: 2,
    docs: [DOCS.schemaOrganization],
    run: ({ jsonLd }) => {
      const org = jsonLd.nodes.some((n) => typesOf(n).some((t) => ORG_RE.test(t)))
      const site = nodesOfType(jsonLd, 'WebSite').length > 0
      const found = [org && 'Organization', site && 'WebSite'].filter(Boolean).join(' ')
      if (org && site) {
        return pass(`Detectado: ${found}. Describe QUIÉN es el sitio o la marca, no de qué trata esta página concreta.`)
      }
      if (org || site) return warn(`Solo se detecta ${found}. Añade también ${org ? 'WebSite' : 'Organization o LocalBusiness'}.`)
      return fail('No se marca la identidad del sitio (Organization/LocalBusiness ni WebSite).')
    },
  },
  {
    id: 'schema.logo',
    title: 'Logo de marca en schema Organization',
    weight: 1,
    docs: [DOCS.schemaOrganization],
    run: ({ jsonLd }) => {
      const orgs = jsonLd.nodes.filter((n) => typesOf(n).some((t) => ORG_RE.test(t)))
      if (orgs.length === 0) return na('No hay schema Organization/LocalBusiness.')
      if (orgs.some((o) => o.logo)) return pass("El schema Organization/LocalBusiness incluye la propiedad 'logo'.")
      return warn("El schema Organization no incluye 'logo'. Google lo usa en el panel de conocimiento.")
    },
  },
  {
    id: 'schema.sameas',
    title: 'Enlaces sameAs a perfiles externos',
    weight: 1,
    docs: [DOCS.schemaOrganization],
    run: ({ jsonLd }) => {
      const nodes = jsonLd.nodes.filter((n) => typesOf(n).some((t) => ORG_RE.test(t) || t === 'Person'))
      const all = nodes.flatMap((n) => {
        const s = n.sameAs
        return Array.isArray(s) ? s.map(String) : s ? [String(s)] : []
      })
      if (nodes.length === 0) return na('No hay schema Organization ni Person.')
      if (all.length === 0) {
        return warn("No hay 'sameAs'. Enlazar tus perfiles (Google Business, Instagram, LinkedIn…) ayuda a Google a confirmar tu entidad.")
      }
      const unique = [...new Set(all.map((u) => u.replace(/\/+$/, '').toLowerCase()))]
      const dupInNode = nodes.some((n) => {
        const s = Array.isArray(n.sameAs) ? n.sameAs.map((u: unknown) => String(u).replace(/\/+$/, '').toLowerCase()) : []
        return new Set(s).size !== s.length
      })
      const items: EvidenceItem[] = unique.map((label) => ({ label }))
      if (dupInNode) {
        return warn("'sameAs' contiene enlaces duplicados. Deja cada perfil una sola vez y añade otros perfiles reales.", { items })
      }
      if (unique.length === 1) {
        return warn("'sameAs' solo enlaza a 1 perfil externo. Añade más (Google Business, Instagram, GitHub…).", { items })
      }
      return pass(`Se encuentra 'sameAs' con ${unique.length} perfiles externos: ayuda a Google a confirmar la entidad.`, { items })
    },
  },
  {
    id: 'schema.about',
    title: 'Marcado de entidades (about/mentions)',
    weight: 1,
    docs: [DOCS.schemaOrg],
    run: ({ jsonLd }) => {
      if (jsonLd.nodes.some((n) => n.about || n.mentions)) {
        return pass("Se usa 'about' o 'mentions' para declarar las entidades o el tema central de la página.")
      }
      if (jsonLd.nodes.length === 0) return na('No hay JSON-LD.')
      return warn("No se usan 'about' ni 'mentions'. Declarar el tema central ayuda a buscadores e IA a clasificar la página.")
    },
  },
  {
    id: 'schema.author',
    title: 'Autor en datos estructurados',
    weight: 1,
    docs: [DOCS.schemaPerson],
    run: ({ jsonLd }) => {
      const editorial = jsonLd.nodes.filter((n) => typesOf(n).some((t) => EDITORIAL.includes(t)))
      if (editorial.length === 0) {
        return na("'author' es una propiedad de contenido redactado (artículos, recetas, reseñas…); no aplica a este tipo de página.")
      }
      if (editorial.every((n) => n.author)) return pass("Los contenidos editoriales incluyen 'author'.")
      return warn("Hay contenido editorial sin 'author' en el schema.")
    },
  },
  {
    id: 'schema.product',
    title: 'Datos estructurados de producto',
    weight: 1,
    docs: [DOCS.product],
    run: ({ jsonLd }) => {
      const products = nodesOfType(jsonLd, 'Product', 'ProductGroup')
      if (products.length === 0) return na('No es una página de producto (no se ha detectado schema Product).')
      const missing = ['name', 'image', 'offers'].filter((k) => !products[0][k])
      if (missing.length === 0) return pass('El schema Product incluye name, image y offers.')
      return warn(`Al schema Product le falta: ${missing.join(', ')}.`)
    },
  },
  {
    id: 'schema.video',
    title: 'VideoObject para vídeos',
    weight: 1,
    docs: [DOCS.video],
    run: ({ $, jsonLd }) => {
      const videos = $('video, iframe[src*="youtube"], iframe[src*="youtu.be"], iframe[src*="vimeo"], iframe[src*="dailymotion"]').length
      if (videos === 0) return na('No se detecta ningún <video> ni iframe de YouTube, Vimeo o Dailymotion.')
      if (nodesOfType(jsonLd, 'VideoObject').length > 0) return pass('Los vídeos están marcados con VideoObject.')
      return warn(`Hay ${videos} vídeo(s) sin VideoObject: no podrán aparecer en la pestaña de vídeos de Google.`)
    },
  },
  {
    id: 'schema.article',
    title: 'Preparado para Top Stories / Google Discover',
    weight: 1,
    docs: [DOCS.article],
    run: ({ jsonLd }) => {
      const articles = nodesOfType(jsonLd, 'Article', 'NewsArticle', 'BlogPosting')
      if (articles.length === 0) return na('No se detecta schema Article, NewsArticle ni BlogPosting; no aplica.')
      const missing = ['headline', 'image', 'datePublished', 'author'].filter((k) => !articles[0][k])
      if (missing.length === 0) return pass('El schema Article incluye headline, image, datePublished y author.')
      return warn(`Al schema Article le falta: ${missing.join(', ')}.`)
    },
  },
])
