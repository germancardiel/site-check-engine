import { describe, expect, it } from 'vitest'
import { ALL_CHECKS, CHECK_CATALOG, runChecks } from '../checks'
import {
  aiCrawlersCheck,
  entitySchemaCheck,
  headingStructureCheck,
  llmsTxtCheck,
  serverRenderedContentCheck,
  structuredDataCheck,
} from '../checks/ai'
import {
  canonicalCheck,
  h1Check,
  htmlLangCheck,
  httpsCheck,
  imgAltCheck,
  indexableCheck,
  metaDescriptionCheck,
  openGraphCheck,
  robotsTxtCheck,
  sitemapCheck,
  status200Check,
  titleCheck,
  viewportCheck,
} from '../checks/seo'
import type { AuditContext, Check, CheckStatus } from '../types'
import { buildContext, readFixture } from './fixtures/helpers'
import { HTTP_PAGE_URL } from './fixtures/urls'

type Case = { check: Check; status: CheckStatus; ctx: () => AuditContext }

const good = () => buildContext('good.html')
const bad = (overrides: Partial<Omit<AuditContext, 'html'>> = {}) => buildContext('bad.html', overrides)
const partial = () => buildContext('partial.html')

const CASES: Record<string, Case[]> = {
  https: [
    { check: httpsCheck, status: 'pass', ctx: good },
    { check: httpsCheck, status: 'fail', ctx: () => bad({ finalUrl: HTTP_PAGE_URL }) },
  ],
  'status-200': [
    { check: status200Check, status: 'pass', ctx: good },
    { check: status200Check, status: 'warn', ctx: () => bad({ status: 203 }) },
    { check: status200Check, status: 'fail', ctx: () => bad({ status: 404 }) },
  ],
  title: [
    { check: titleCheck, status: 'pass', ctx: good },
    { check: titleCheck, status: 'warn', ctx: partial },
    { check: titleCheck, status: 'fail', ctx: () => bad() },
  ],
  'meta-description': [
    { check: metaDescriptionCheck, status: 'pass', ctx: good },
    { check: metaDescriptionCheck, status: 'warn', ctx: partial },
    { check: metaDescriptionCheck, status: 'fail', ctx: () => bad() },
  ],
  h1: [
    { check: h1Check, status: 'pass', ctx: good },
    { check: h1Check, status: 'warn', ctx: partial },
    { check: h1Check, status: 'fail', ctx: () => bad() },
  ],
  canonical: [
    { check: canonicalCheck, status: 'pass', ctx: good },
    { check: canonicalCheck, status: 'warn', ctx: partial },
    { check: canonicalCheck, status: 'fail', ctx: () => bad() },
  ],
  'html-lang': [
    { check: htmlLangCheck, status: 'pass', ctx: good },
    { check: htmlLangCheck, status: 'fail', ctx: () => bad() },
  ],
  viewport: [
    { check: viewportCheck, status: 'pass', ctx: good },
    { check: viewportCheck, status: 'warn', ctx: partial },
    { check: viewportCheck, status: 'fail', ctx: () => bad() },
  ],
  'img-alt': [
    { check: imgAltCheck, status: 'pass', ctx: good },
    { check: imgAltCheck, status: 'warn', ctx: partial },
    { check: imgAltCheck, status: 'fail', ctx: () => bad() },
  ],
  indexable: [
    { check: indexableCheck, status: 'pass', ctx: good },
    { check: indexableCheck, status: 'fail', ctx: () => bad() },
    { check: indexableCheck, status: 'fail', ctx: () => buildContext('good.html', { headers: { 'x-robots-tag': 'noindex' } }) },
  ],
  'open-graph': [
    { check: openGraphCheck, status: 'pass', ctx: good },
    { check: openGraphCheck, status: 'warn', ctx: partial },
    { check: openGraphCheck, status: 'fail', ctx: () => bad() },
  ],
  'robots-txt': [
    { check: robotsTxtCheck, status: 'pass', ctx: good },
    { check: robotsTxtCheck, status: 'fail', ctx: () => bad({ robotsTxt: null }) },
  ],
  sitemap: [
    { check: sitemapCheck, status: 'pass', ctx: good },
    { check: sitemapCheck, status: 'fail', ctx: () => bad({ sitemapFound: false }) },
  ],
  'ai-crawlers': [
    { check: aiCrawlersCheck, status: 'pass', ctx: good },
    { check: aiCrawlersCheck, status: 'pass', ctx: () => buildContext('good.html', { robotsTxt: null }) },
    { check: aiCrawlersCheck, status: 'warn', ctx: () => bad({ robotsTxt: readFixture('robots-block-some.txt') }) },
    { check: aiCrawlersCheck, status: 'warn', ctx: () => bad({ robotsTxt: readFixture('robots-allow-override.txt') }) },
    { check: aiCrawlersCheck, status: 'fail', ctx: () => bad({ robotsTxt: readFixture('robots-block-all.txt') }) },
  ],
  'llms-txt': [
    { check: llmsTxtCheck, status: 'pass', ctx: good },
    { check: llmsTxtCheck, status: 'warn', ctx: () => bad({ llmsTxt: '  \n' }) },
    { check: llmsTxtCheck, status: 'fail', ctx: () => bad({ llmsTxt: null }) },
  ],
  'structured-data': [
    { check: structuredDataCheck, status: 'pass', ctx: good },
    { check: structuredDataCheck, status: 'pass', ctx: partial },
    { check: structuredDataCheck, status: 'fail', ctx: () => bad() },
    { check: structuredDataCheck, status: 'fail', ctx: () => buildContext('no-jsonld.html') },
  ],
  'entity-schema': [
    { check: entitySchemaCheck, status: 'pass', ctx: good },
    { check: entitySchemaCheck, status: 'fail', ctx: partial },
    { check: entitySchemaCheck, status: 'fail', ctx: () => bad() },
  ],
  'server-rendered-content': [
    { check: serverRenderedContentCheck, status: 'pass', ctx: good },
    { check: serverRenderedContentCheck, status: 'warn', ctx: partial },
    { check: serverRenderedContentCheck, status: 'fail', ctx: () => bad() },
  ],
  'heading-structure': [
    { check: headingStructureCheck, status: 'pass', ctx: good },
    { check: headingStructureCheck, status: 'warn', ctx: partial },
    { check: headingStructureCheck, status: 'fail', ctx: () => bad() },
  ],
}

describe.each(Object.entries(CASES))('check %s', (id, cases) => {
  it('tiene al menos un caso pass y uno fail (D-TEST-03)', () => {
    const statuses = cases.map((c) => c.status)
    expect(statuses).toContain('pass')
    expect(statuses).toContain('fail')
  })

  it.each(cases.map((c, i) => [c.status, i, c] as const))('devuelve %s (caso %i)', (status, _i, c) => {
    const result = c.check(c.ctx())
    expect(result.id).toBe(id)
    expect(result.status).toBe(status)
    expect(result.message.length).toBeGreaterThan(0)
    expect(result.recommendation.length).toBeGreaterThan(0)
  })
})

describe('catálogo de checks', () => {
  it('todos los checks tienen casos de test', () => {
    const ids = runChecks(good()).map((r) => r.id)
    expect(ids.sort()).toEqual(Object.keys(CASES).sort())
  })

  it('separa 13 checks de SEO y 6 de IA con pesos positivos', () => {
    const results = runChecks(good())
    expect(results).toHaveLength(ALL_CHECKS.length)
    expect(results.filter((r) => r.category === 'seo')).toHaveLength(13)
    expect(results.filter((r) => r.category === 'ai')).toHaveLength(6)
    expect(results.every((r) => r.weight > 0)).toBe(true)
  })

  it('good.html pasa todos los checks y bad.html solo pasa robots-txt (existe pero bloquea todo)', () => {
    expect(runChecks(good()).filter((r) => r.status !== 'pass')).toEqual([])
    const badCtx = bad({ finalUrl: HTTP_PAGE_URL, status: 500, robotsTxt: readFixture('robots-block-all.txt'), llmsTxt: null, sitemapFound: false })
    expect(runChecks(badCtx).filter((r) => r.status === 'pass').map((r) => r.id)).toEqual(['robots-txt'])
  })

  it('las recomendaciones de fallo son textos de acción y las de pass indican que no hay nada que hacer', () => {
    const [pass] = runChecks(good())
    expect(pass.recommendation).toBe('No hace falta ninguna acción.')
    const failed = structuredDataCheck(bad())
    expect(failed.recommendation).toMatch(/JSON válido/)
  })
})

describe('CHECK_CATALOG', () => {
  it('expone id, categoría y título de cada check sin ejecutarlo, en el orden de ALL_CHECKS', () => {
    const results = runChecks(good())
    expect(CHECK_CATALOG).toEqual(results.map(({ id, category, title }) => ({ id, category, title })))
  })

  it('cada check definido lleva sus metadatos completos', () => {
    for (const check of ALL_CHECKS) {
      expect(check.meta.weight).toBeGreaterThan(0)
      expect(check.meta.recommendation.length).toBeGreaterThan(0)
    }
  })
})

describe('detalles de los checks', () => {
  it('canonical inválida falla', () => {
    const ctx = buildContext('good.html')
    ctx.html('link[rel="canonical"]').attr('href', 'http://[mal')
    expect(canonicalCheck(ctx).status).toBe('fail')
  })

  it('img-alt pasa si no hay imágenes', () => {
    expect(imgAltCheck(buildContext('no-jsonld.html')).status).toBe('pass')
  })

  it('open-graph indica las etiquetas que faltan', () => {
    expect(openGraphCheck(partial()).message).toContain('og:description, og:image')
  })

  it('indexable no confunde "index" con "noindex"', () => {
    const ctx = buildContext('good.html', { headers: { 'x-robots-tag': 'index, follow' } })
    expect(indexableCheck(ctx).status).toBe('pass')
  })
})
