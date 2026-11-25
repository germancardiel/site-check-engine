import { afterEach, describe, expect, it, vi } from 'vitest'
import { CHECK_CATALOG } from '@/lib/audit/checks'
import { AI_CRAWLERS } from '@/lib/audit/checks/ai'
import { SEO_THRESHOLDS } from '@/lib/audit/checks/seo'
import {
  absoluteUrl,
  buildLlmsTxt,
  buildRobots,
  buildSitemap,
  buildWebsiteJsonLd,
  DEFAULT_SITE_URL,
  resolveSiteUrl,
  serializeJsonLd,
  SITE_DESCRIPTION,
  SITE_TITLE,
  siteUrl,
} from '@/lib/site'

const BASE = 'https://faro.example'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('resolveSiteUrl', () => {
  it('usa http://localhost:3000 si la variable está vacía o no existe', () => {
    expect(resolveSiteUrl(undefined)).toBe(DEFAULT_SITE_URL)
    expect(resolveSiteUrl('   ')).toBe('http://localhost:3000')
  })

  it('normaliza la URL y quita la barra final', () => {
    expect(resolveSiteUrl(' https://faro.example/ ')).toBe(BASE)
    expect(resolveSiteUrl('https://faro.example/app/')).toBe('https://faro.example/app')
  })

  it('descarta valores que no son URL http(s)', () => {
    expect(resolveSiteUrl('no es una url')).toBe(DEFAULT_SITE_URL)
    expect(resolveSiteUrl('ftp://faro.example')).toBe(DEFAULT_SITE_URL)
  })

  it('siteUrl lee NEXT_PUBLIC_SITE_URL', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://faro.example/')
    expect(siteUrl()).toBe(BASE)
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
    expect(siteUrl()).toBe(DEFAULT_SITE_URL)
  })
})

describe('textos de la landing', () => {
  it('el título y la descripción cumplen los umbrales del propio motor', () => {
    expect(SITE_TITLE.length).toBeGreaterThanOrEqual(SEO_THRESHOLDS.titleMin)
    expect(SITE_TITLE.length).toBeLessThanOrEqual(SEO_THRESHOLDS.titleMax)
    expect(SITE_DESCRIPTION.length).toBeGreaterThanOrEqual(SEO_THRESHOLDS.descriptionMin)
    expect(SITE_DESCRIPTION.length).toBeLessThanOrEqual(SEO_THRESHOLDS.descriptionMax)
  })
})

describe('absoluteUrl', () => {
  it('construye URLs absolutas, con barra final solo en la raíz', () => {
    expect(absoluteUrl('/', BASE)).toBe('https://faro.example/')
    expect(absoluteUrl('/login', BASE)).toBe('https://faro.example/login')
  })
})

describe('buildRobots', () => {
  it('permite todo, también a los rastreadores de IA, y declara el sitemap', () => {
    const robots = buildRobots(BASE)
    expect(robots.rules).toEqual([
      { userAgent: '*', allow: '/' },
      { userAgent: [...AI_CRAWLERS], allow: '/' },
    ])
    expect(robots.sitemap).toBe('https://faro.example/sitemap.xml')
  })
})

describe('buildSitemap', () => {
  it('incluye /, /login y /registro con URL absoluta', () => {
    const urls = buildSitemap(BASE).map((entry) => entry.url)
    expect(urls).toEqual(['https://faro.example/', 'https://faro.example/registro', 'https://faro.example/login'])
  })
})

describe('buildLlmsTxt', () => {
  it('describe Faro, enlaza las páginas públicas y lista todos los checks', () => {
    const text = buildLlmsTxt(BASE)
    expect(text.startsWith('# Faro\n')).toBe(true)
    expect(text).toContain(`> ${SITE_DESCRIPTION}`)
    expect(text).toContain('- [Crear cuenta](https://faro.example/registro)')
    expect(text).toContain('### SEO')
    expect(text).toContain('### Visibilidad en IA')
    for (const check of CHECK_CATALOG) expect(text).toContain(`- ${check.title}`)
  })

  it('usa el catálogo recibido', () => {
    const text = buildLlmsTxt(BASE, [{ id: 'x', category: 'ai', title: 'Check inventado' }])
    expect(text).toContain('- Check inventado')
    expect(text).not.toContain('- HTTPS')
  })
})

describe('JSON-LD', () => {
  it('declara la entidad WebSite de Faro', () => {
    expect(buildWebsiteJsonLd(BASE)).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Faro',
      url: 'https://faro.example/',
    })
  })

  it('escapa < para que el contenido no pueda cerrar la etiqueta <script>', () => {
    const json = serializeJsonLd({ name: '</script><script>alert(1)</script>' })
    expect(json).not.toContain('<')
    expect(JSON.parse(json)).toEqual({ name: '</script><script>alert(1)</script>' })
  })
})
