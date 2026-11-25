import type { MetadataRoute } from 'next'
import { AI_BOTS } from './audit/ai-bots'
import { CHECK_CATALOG, type CheckInfo } from './audit/checks'
import { groupCatalog } from './audit/present'
import { SITE_NAME } from './brand'

export { SITE_NAME }

/** `<title>` of the landing: 30–60 characters (the engine's own `onpage.title` check). */
export const SITE_TITLE = `${SITE_NAME} · Auditoría SEO y de visibilidad en IA`
/** Meta description of the landing: 70–160 characters (the engine's own `onpage.description` check). */
export const SITE_DESCRIPTION =
  'Audita tu web en SEO y en visibilidad para asistentes de IA, sigue su evolución y recibe un plan de acción priorizado.'

export const DEFAULT_SITE_URL = 'http://localhost:3000'

/** Public pages listed in the sitemap and in llms.txt. */
export const PUBLIC_PAGES = [
  { path: '/', name: 'Inicio', description: `Qué revisa ${SITE_NAME} y cómo funciona.` },
  { path: '/registro', name: 'Crear cuenta', description: 'Registro gratuito con email y contraseña.' },
  { path: '/login', name: 'Entrar', description: 'Acceso para usuarios registrados.' },
] as const

/** Normalises `NEXT_PUBLIC_SITE_URL` to an origin without a trailing slash; invalid → default. */
export function resolveSiteUrl(raw: string | undefined): string {
  const value = raw?.trim()
  if (!value) return DEFAULT_SITE_URL
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return DEFAULT_SITE_URL
    return `${url.origin}${url.pathname}`.replace(/\/+$/, '')
  } catch {
    return DEFAULT_SITE_URL
  }
}

/** Base URL of the deployed site, read from `NEXT_PUBLIC_SITE_URL`. */
export function siteUrl(): string {
  return resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)
}

export function absoluteUrl(path: string, base: string): string {
  return path === '/' ? `${base}/` : `${base}${path}`
}

/** robots.txt: everything is allowed, AI crawlers included, and the sitemap is declared. */
export function buildRobots(base: string): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      { userAgent: AI_BOTS.map((b) => b.name), allow: '/' },
    ],
    sitemap: absoluteUrl('/sitemap.xml', base),
  }
}

/** sitemap.xml with the public pages (no `lastModified`: the output stays deterministic). */
export function buildSitemap(base: string): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map((page) => ({
    url: absoluteUrl(page.path, base),
    changeFrequency: 'monthly',
    priority: page.path === '/' ? 1 : 0.5,
  }))
}

/** llms.txt (Markdown) describing the product, its public pages and the checks it runs. */
export function buildLlmsTxt(base: string, catalog: CheckInfo[] = CHECK_CATALOG): string {
  const pages = PUBLIC_PAGES.map((page) => `- [${page.name}](${absoluteUrl(page.path, base)}): ${page.description}`)
  const groups = groupCatalog(catalog).flatMap((group) => [
    '',
    `### ${group.number}. ${group.title}`,
    '',
    ...group.checks.map((check) => `- ${check.title}`),
  ])
  return [
    `# ${SITE_NAME}`,
    '',
    `> ${SITE_DESCRIPTION}`,
    '',
    `${SITE_NAME} analiza una URL pública en 10 apartados ponderados, puntúa de 0 a 100 su SEO técnico y su visibilidad para asistentes de IA, guarda el historial de cada sitio y genera con IA un plan de acción priorizado.`,
    '',
    '## Páginas',
    '',
    ...pages,
    '',
    `## Qué revisa ${SITE_NAME}`,
    ...groups,
    '',
  ].join('\n')
}

/** JSON-LD `WebSite`, `Organization` and `SoftwareApplication` entities of the landing. */
export function buildWebsiteJsonLd(base: string) {
  const root = absoluteUrl('/', base)
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: SITE_NAME,
        url: root,
        description: SITE_DESCRIPTION,
        inLanguage: 'es',
        about: { '@type': 'Thing', name: 'Auditoría SEO y optimización para asistentes de IA' },
      },
      {
        '@type': 'Organization',
        name: SITE_NAME,
        url: root,
        logo: absoluteUrl('/favicon.ico', base),
        telephone: '+34 600 000 000',
        taxID: 'B12345678',
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Calle Mayor 1',
          postalCode: '25001',
          addressLocality: 'Lleida',
          addressCountry: 'ES',
        },
        sameAs: ['https://gcastudio.dev', 'https://github.com/gcastudio'],
      },
      {
        '@type': 'SoftwareApplication',
        name: SITE_NAME,
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Web',
        url: root,
        author: { '@type': 'Organization', name: 'GCA Studio' },
        about: { '@type': 'Thing', name: 'Auditoría SEO técnica y AI SEO' },
      },
    ],
  }
}

/** Serialises JSON-LD for a `<script>` tag, escaping `<` so it can never close the tag. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
