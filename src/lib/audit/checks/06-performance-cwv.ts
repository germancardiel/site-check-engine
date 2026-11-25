import { DOCS } from '../docs'
import type { AuditContext, CheckOutcome } from '../types'
import { defineChecks, fail, na, pass, unavailable, warn } from './helpers'

export const psiMissing = (ctx: AuditContext): CheckOutcome | null =>
  !ctx.psi
    ? unavailable('No se ha podido medir con PageSpeed Insights.')
    : ctx.psi.error
      ? unavailable(`No se ha podido medir: ${ctx.psi.error}. Prueba de nuevo en unos minutos.`)
      : null

const secs = (ms: number): string => `${(ms / 1000).toFixed(2)}s`
const kb = (b: number): string => `${Math.round(b / 1024)} KB`

export const performanceCwvChecks = defineChecks('performance', [
  {
    id: 'perf.lcp',
    title: 'LCP < 2.5s (móvil)',
    weight: 3,
    docs: [DOCS.lcp],
    run: (ctx) => {
      const missing = psiMissing(ctx)
      if (missing) return missing
      const lab = ctx.psi!.lcpMs
      const field = ctx.psi!.field.lcpMs
      if (lab === null) return unavailable('PageSpeed no ha devuelto el LCP.')
      const fieldNote = field !== null ? ` Usuarios reales (CrUX, p75): ${secs(field)}.` : ''
      const msg = `LCP en móvil (estimado en laboratorio): ${secs(lab)}. Objetivo: ≤ 2.5s.${fieldNote}`
      const value = field ?? lab
      if (value <= 2500) return pass(msg)
      const fix = 'Optimiza la imagen principal (WebP/AVIF, tamaño correcto, fetchpriority="high") y reduce el CSS/JS que bloquea el render.'
      if (value <= 4000) return warn(msg, { fix })
      return fail(msg, { fix })
    },
  },
  {
    id: 'perf.html-size',
    title: 'Tamaño del documento HTML',
    weight: 1,
    docs: [DOCS.compression],
    run: ({ page }) => {
      const bytes = Buffer.byteLength(page.body, 'utf8')
      const mb = (bytes / 1024 / 1024).toFixed(2)
      const evidence = `${mb} MB (${bytes} bytes)`
      if (bytes <= 500 * 1024) return pass(`El HTML inicial pesa ${mb} MB, dentro de un rango razonable.`, { evidence })
      if (bytes <= 1.5 * 1024 * 1024) return warn(`El HTML inicial pesa ${mb} MB. Revisa si incluye datos o SVG en línea innecesarios.`, { evidence })
      return fail(`El HTML inicial pesa ${mb} MB: demasiado pesado.`, { evidence })
    },
  },
  {
    id: 'perf.cls',
    title: 'CLS < 0.1 (móvil)',
    weight: 2,
    docs: [DOCS.cls],
    run: (ctx) => {
      const missing = psiMissing(ctx)
      if (missing) return missing
      const lab = ctx.psi!.cls
      const field = ctx.psi!.field.cls
      if (lab === null) return unavailable('PageSpeed no ha devuelto el CLS.')
      const fieldNote = field !== null ? ` Usuarios reales (CrUX, p75): ${field.toFixed(3)}.` : ''
      const msg = `CLS en móvil (estimado en laboratorio): ${lab.toFixed(3)}. Objetivo: ≤ 0.1.${fieldNote}`
      const value = field ?? lab
      if (value <= 0.1) return pass(msg)
      const fix = 'Reserva espacio para imágenes, anuncios y banners (width/height o aspect-ratio) y evita insertar contenido encima del ya cargado.'
      if (value <= 0.25) return warn(msg, { fix })
      return fail(msg, { fix })
    },
  },
  {
    id: 'perf.ttfb',
    title: 'TTFB razonable',
    weight: 2,
    docs: [DOCS.ttfb],
    run: ({ page }) => {
      const ms = page.ttfbMs
      const msg = `Tiempo de respuesta del servidor: ${ms}ms. Objetivo: ≤ 600ms.`
      if (ms <= 600) return pass(msg)
      const fix = 'Activa caché en el servidor o CDN, revisa el hosting y evita consultas lentas al generar la página.'
      if (ms <= 1800) return warn(msg, { fix })
      return fail(msg, { fix })
    },
  },
  {
    id: 'perf.compression',
    title: 'Compresión Brotli/Gzip activa',
    weight: 1,
    docs: [DOCS.compression],
    run: ({ page }) => {
      const enc = page.headers['content-encoding'] ?? ''
      if (/br|gzip|zstd|deflate/i.test(enc)) return pass(`Content-Encoding: '${enc}'.`)
      if (Buffer.byteLength(page.body) < 1400) return na('El HTML es tan pequeño que la compresión no aporta.')
      return warn('El HTML se sirve sin comprimir. Activa Brotli o Gzip en el servidor.')
    },
  },
  {
    id: 'perf.cache',
    title: 'Cabeceras de caché configuradas',
    weight: 1,
    docs: [DOCS.caching],
    run: ({ page }) => {
      const cc = page.headers['cache-control']
      const etag = page.headers.etag || page.headers['last-modified']
      if (cc && !/no-store/i.test(cc)) return pass(`Cache-Control: '${cc}'.`)
      if (cc) return warn(`Cache-Control: '${cc}'. 'no-store' impide cualquier caché, incluso la validación.`)
      if (etag) return pass('No hay Cache-Control, pero sí ETag/Last-Modified para revalidar.')
      return warn('No hay cabeceras de caché (Cache-Control, ETag ni Last-Modified).')
    },
  },
  {
    id: 'perf.http2',
    title: 'Protocolo HTTP moderno (HTTP/2 o HTTP/3)',
    weight: 1,
    docs: [DOCS.http2],
    run: ({ tls, page, url }) => {
      if (url.protocol !== 'https:') return fail('La web no usa HTTPS, así que tampoco puede usar HTTP/2.')
      const h3 = /h3/.test(page.headers['alt-svc'] ?? '')
      if (h3) return pass('El servidor anuncia HTTP/3 (alt-svc), además de HTTP/2.')
      if (tls?.alpn === 'h2') {
        return pass('La conexión usa HTTP/2, que multiplexa peticiones sobre una misma conexión (más rápido que HTTP/1.1).')
      }
      if (!tls) return unavailable('No se ha podido negociar la conexión TLS para comprobarlo.')
      return warn('El servidor solo ofrece HTTP/1.1. Activar HTTP/2 acelera la carga de páginas con muchos recursos.')
    },
  },
  {
    id: 'perf.unused-js',
    title: 'Sin JavaScript innecesario/sin usar',
    weight: 1,
    docs: [DOCS.unusedJs],
    run: (ctx) => {
      const missing = psiMissing(ctx)
      if (missing) return missing
      const bytes = ctx.psi!.unusedJsBytes ?? 0
      if (bytes < 100 * 1024) return pass('No hay una cantidad significativa de JavaScript sin usar en la carga inicial.')
      const msg = `Se cargan ~${kb(bytes)} de JavaScript que no se usa en esta página.`
      const fix = 'Elimina scripts y plugins innecesarios, y carga los de terceros (chat, mapas, píxeles) de forma diferida.'
      return bytes < 300 * 1024 ? warn(msg, { fix }) : fail(msg, { fix })
    },
  },
  {
    id: 'perf.inp',
    title: 'INP',
    weight: 2,
    docs: [DOCS.inp],
    run: (ctx) => {
      const missing = psiMissing(ctx)
      if (missing) return missing
      const inp = ctx.psi!.field.inpMs
      if (inp === null) {
        return na('Sin datos de campo de INP para esta URL (tráfico insuficiente en CrUX). No existe una métrica de laboratorio equivalente fiable.')
      }
      const scope = ctx.psi!.field.origin === 'origin' ? ' (dato del dominio completo)' : ''
      const msg = `INP de usuarios reales (p75): ${inp}ms${scope}. Objetivo: ≤ 200ms.`
      if (inp <= 200) return pass(msg)
      return inp <= 500 ? warn(msg) : fail(msg)
    },
  },
  {
    id: 'perf.crux',
    title: 'Datos de campo (CrUX)',
    weight: 1,
    docs: [DOCS.crux],
    run: (ctx) => {
      const missing = psiMissing(ctx)
      if (missing) return missing
      const src = ctx.psi!.field.origin
      if (src === 'url') return pass('Hay datos de usuarios reales (Chrome UX Report) para esta URL.')
      if (src === 'origin') return pass('Hay datos de usuarios reales a nivel de dominio (no de esta URL concreta).')
      return na('Esta URL no tiene suficiente tráfico en el Chrome UX Report (CrUX) para tener datos de campo. Se usan solo datos de laboratorio.')
    },
  },
])
