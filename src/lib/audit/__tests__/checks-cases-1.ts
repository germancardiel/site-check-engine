import type { AuditContext } from '../types'
import { makeCtx, PERFECT_HTML } from './fixtures/helpers'

export type CheckCase = {
  status: 'pass' | 'warn' | 'fail' | 'na' | 'error'
  ctx: () => AuditContext
}

export const ok = () => makeCtx(PERFECT_HTML)
export const withHtml = (fn: (h: string) => string, overrides?: Partial<AuditContext>) => () =>
  makeCtx(fn(PERFECT_HTML), overrides)
export const withCtx = (overrides: Partial<AuditContext>) => () => makeCtx(PERFECT_HTML, overrides)

export const CASES_PART_1: Record<string, CheckCase[]> = {
  'crawl.status': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withCtx({ page: { ...ok().page, redirects: [{ url: 'https://example.com/old', status: 301 }] } }) },
    { status: 'fail', ctx: withCtx({ page: { ...ok().page, status: 404 } }) },
  ],
  'crawl.robots-txt': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withCtx({ robots: { found: true, status: 503, text: '' } }) },
    { status: 'warn', ctx: withCtx({ robots: { found: true, status: 200, text: 'User-agent: *\nDisallow: /entrenador\nUser-agent: Googlebot\nAllow: /' } }) },
    { status: 'fail', ctx: withCtx({ robots: { found: true, status: 200, text: 'User-agent: *\nDisallow: /entrenador' } }) },
  ],
  'crawl.noindex': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace('<meta charset="utf-8" />', '<meta charset="utf-8" /><meta name="robots" content="nofollow" />')) },
    { status: 'fail', ctx: withHtml((h) => h.replace('<meta charset="utf-8" />', '<meta charset="utf-8" /><meta name="robots" content="noindex" />')) },
  ],
  'crawl.soft404': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml(() => '<!doctype html><html lang="es"><head><title>Título</title></head><body><h1>Hola</h1><p>Corto</p></body></html>') },
    { status: 'fail', ctx: withHtml((h) => h.replace('<h1>Entrenador personal en Lleida</h1>', '<h1>404 Not Found</h1>')) },
    { status: 'na', ctx: withCtx({ page: { ...ok().page, status: 404 } }) },
  ],
  'crawl.resources': [
    { status: 'pass', ctx: ok },
    { status: 'fail', ctx: withCtx({ robots: { found: true, status: 200, text: 'User-agent: *\nDisallow: /styles/' } }) },
    { status: 'na', ctx: withHtml((h) => h.replace('<link rel="stylesheet" href="/styles/main.css" />', '')) },
  ],
  'crawl.canonical': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace(/<link rel="canonical"[^>]*>/, '')) },
    { status: 'warn', ctx: withHtml((h) => h.replace('href="https://example.com/entrenador-personal"', 'href="/entrenador-personal"')) },
    { status: 'warn', ctx: withHtml((h) => h.replace('href="https://example.com/entrenador-personal"', 'href="https://example.com/otra"')) },
    { status: 'fail', ctx: withHtml((h) => h.replace('<link rel="icon"', '<link rel="canonical" href="https://example.com/otra" /><link rel="icon"')) },
  ],
  'crawl.sitemap': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withCtx({ sitemap: { declaredInRobots: false, urls: [ok().url.href], checked: ['https://example.com/sitemap.xml'], found: true, containsUrl: true } }) },
    { status: 'warn', ctx: withCtx({ sitemap: { declaredInRobots: true, urls: [], checked: ['https://example.com/sitemap.xml'], found: true, containsUrl: false } }) },
    { status: 'fail', ctx: withCtx({ sitemap: { declaredInRobots: false, urls: [], checked: ['https://example.com/sitemap.xml'], found: false, containsUrl: false } }) },
  ],
  'crawl.meta-refresh': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace('<meta charset="utf-8" />', '<meta charset="utf-8" /><meta http-equiv="refresh" content="5;url=https://example.com" />')) },
  ],
  'crawl.query': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withCtx({ url: new URL('https://example.com/entrenador-personal?utm=1') }) },
  ],
  'url.breadcrumbs': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace(/<nav aria-label="Breadcrumb">[\s\S]*?<\/nav>/, '')) },
    { status: 'warn', ctx: withHtml((h) => h.replace(/"BreadcrumbList"/g, '"Thing"')) },
    { status: 'warn', ctx: withHtml((h) => h.replace(/<nav aria-label="Breadcrumb">[\s\S]*?<\/nav>/, '').replace(/"BreadcrumbList"/g, '"Thing"')) },
    { status: 'na', ctx: withHtml((h) => h.replace(/<nav aria-label="Breadcrumb">[\s\S]*?<\/nav>/, '').replace(/"BreadcrumbList"/g, '"Thing"'), { url: new URL('https://example.com/') }) },
  ],
  'url.length': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withCtx({ url: new URL(`https://example.com/${'a'.repeat(70)}`) }) },
    { status: 'fail', ctx: withCtx({ url: new URL(`https://example.com/${'a'.repeat(110)}`) }) },
  ],
  'url.format': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withCtx({ url: new URL('https://example.com/Entrenador_Personal%20España') }) },
  ],
  'url.dates-ids': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withCtx({ url: new URL('https://example.com/2025/11/post') }) },
    { status: 'warn', ctx: withCtx({ url: new URL('https://example.com/item/987654321') }) },
  ],
  'url.depth': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withCtx({ url: new URL('https://example.com/a/b/c/d') }) },
    { status: 'fail', ctx: withCtx({ url: new URL('https://example.com/a/b/c/d/e/f') }) },
  ],
  'onpage.headings': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace('<h2>Cómo trabajo</h2>', '<h4>Cómo trabajo</h4>')) },
    { status: 'fail', ctx: withHtml((h) => h.replace(/<h1>[\s\S]*?<\/h1>/, '')) },
  ],
  'onpage.title': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace(/<title>[\s\S]*?<\/title>/, '<title>Corto</title>')) },
    { status: 'warn', ctx: withHtml((h) => h.replace(/<title>[\s\S]*?<\/title>/, `<title>${'Largo '.repeat(15)}</title>`)) },
    { status: 'fail', ctx: withHtml((h) => h.replace(/<title>[\s\S]*?<\/title>/, '')) },
  ],
  'onpage.headings-descriptive': [
    { status: 'pass', ctx: ok },
    {
      status: 'warn',
      ctx: withHtml((h) =>
        h
          .replace('<h1>Entrenador personal en Lleida</h1>', '<h1>Inicio</h1>')
          .replace('<h2>Cómo trabajo</h2>', '<h2>Más</h2>')
          .replace('<h3>Primera sesión</h3>', '<h3>Otros</h3>'),
      ),
    },
  ],
  'onpage.description': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace(/<meta name="description"[^>]*>/, '<meta name="description" content="Descripción muy corta." />')) },
    { status: 'warn', ctx: withHtml((h) => h.replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${'Texto largo '.repeat(20)}" />`)) },
    { status: 'fail', ctx: withHtml((h) => h.replace(/<meta name="description"[^>]*>/, '')) },
  ],
  'onpage.lang': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace('<html lang="es">', '<html lang="123-invalido">')) },
    { status: 'fail', ctx: withHtml((h) => h.replace('<html lang="es">', '<html>')) },
  ],
  'onpage.og': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace(/<meta property="og:type"[^>]*>/, '')) },
    { status: 'fail', ctx: withHtml((h) => h.replace(/<meta property="og:[^"]+"[^>]*>/g, '')) },
  ],
  'onpage.empty-headings': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace('<h2>Cómo trabajo</h2>', '<h2>   </h2>')) },
  ],
  'onpage.charset': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace('<meta charset="utf-8" />', ''), { page: { ...ok().page, headers: { ...ok().page.headers, 'content-type': 'text/html' } } }) },
  ],
  'onpage.twitter': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace(/<meta name="twitter:card"[^>]*>/, '')) },
  ],
  'onpage.favicon': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace(/<link rel="icon"[^>]*>/, '')) },
  ],
  'onpage.nofollow-internal': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace('<a href="/contacto">', '<a href="/contacto" rel="nofollow">')) },
  ],
}
