import { ok, withCtx, withHtml, type CheckCase } from './checks-cases-1'

export const CASES_PART_2: Record<string, CheckCase[]> = {
  'content.readability': [
    { status: 'pass', ctx: ok },
    { status: 'na', ctx: withHtml((h) => h.replace('<html lang="es">', '<html lang="en">')) },
    {
      status: 'warn',
      ctx: withHtml(() => {
        const sentence = 'Este contenido explica paso a paso el funcionamiento completo de las herramientas modernas para empresas locales. '
        return `<!doctype html><html lang="es"><body><main><p>${sentence.repeat(8)}</p></main></body></html>`
      }),
    },
    {
      status: 'fail',
      ctx: withHtml(() => {
        const sentence = 'La institucionalización interdisciplinar electroencefalográfica contrarrevolucionaria descontextualizada imposibilita sistemáticamente cualquier conceptualización epistemológica hiperespecializada. '
        return `<!doctype html><html lang="es"><body><main><p>${sentence.repeat(8)}</p></main></body></html>`
      }),
    },
  ],
  'content.author': [
    { status: 'pass', ctx: ok },
    { status: 'pass', ctx: withHtml((h) => h.replace(/<meta name="author"[^>]*>/, '')) },
    { status: 'pass', ctx: withHtml((h) => h.replace(/<meta name="author"[^>]*>/, '').replace('"author":{"@type":"Person","name":"Ana García"}', '"keywords":"x"').replace('"Article"', '"Person"')) },
    { status: 'pass', ctx: withHtml((h) => h.replace(/<meta name="author"[^>]*>/, '').replace(/"author":\{[^}]+\},?/, '').replace('</article>', '<span rel="author">Ana</span></article>')) },
    { status: 'warn', ctx: withHtml((h) => h.replace(/<meta name="author"[^>]*>/, '').replace(/"author":\{[^}]+\},?/, '')) },
  ],
  'content.alt': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace('alt="Plan semanal"', '').replace('</article>', '<img src="/a.jpg" alt="A" width="10" height="10" /><img src="/b.jpg" alt="B" width="10" height="10" /></article>')) },
    { status: 'fail', ctx: withHtml((h) => h.replace(/alt="[^"]*"/g, '')) },
  ],
  'content.length': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml(() => `<!doctype html><html lang="es"><body><p>${'palabra '.repeat(180)}</p></body></html>`) },
    { status: 'fail', ctx: withHtml(() => `<!doctype html><html lang="es"><body><p>${'palabra '.repeat(30)}</p></body></html>`) },
  ],
  'content.img-names': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace('plan-semanal-lleida.jpg', 'IMG_1234.jpg')) },
    { status: 'fail', ctx: withHtml((h) => h.replace('entrenamiento-fuerza-lleida.jpg', 'IMG_0001.jpg').replace('calentamiento-movilidad.jpg', 'DSC_0002.jpg').replace('estiramientos-finales.jpg', 'screenshot-3.png')) },
  ],
  'content.hidden': [
    { status: 'pass', ctx: ok },
    { status: 'pass', ctx: withHtml((h) => h.replace('</article>', '<details><p>Unas pocas palabras ocultas aquí.</p></details></article>')) },
    { status: 'warn', ctx: withHtml((h) => h.replace('</article>', `<details><p>${'texto oculto en acordeón '.repeat(250)}</p></details></article>`)) },
  ],
  'content.text-vs-images': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml(() => '<!doctype html><html lang="es"><body><p>Poco texto</p><img src="/1.jpg"/><img src="/2.jpg"/><img src="/3.jpg"/></body></html>') },
  ],
  'content.dates': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace('"datePublished":"2026-01-10","dateModified":"2026-02-01",', '')) },
    { status: 'na', ctx: withHtml((h) => h.replace('"Article"', '"Service"')) },
  ],
  'schema.detected': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace('</head>', '<script type="application/ld+json">{mal</script></head>')) },
    { status: 'fail', ctx: withHtml((h) => h.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '<script type="application/ld+json">{mal</script>')) },
    { status: 'fail', ctx: withHtml((h) => h.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '')) },
  ],
  'schema.breadcrumb': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace(/"BreadcrumbList"/g, '"Thing"')) },
  ],
  'schema.identity': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace('"WebSite"', '"Thing"')) },
    { status: 'fail', ctx: withHtml((h) => h.replace('"WebSite"', '"Thing"').replace('"ExerciseGym"', '"Thing"')) },
  ],
  'schema.logo': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace('"logo":"https://example.com/logo.png",', '')) },
  ],
  'schema.sameas': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace('"https://instagram.com/anafit","https://linkedin.com/in/anafit"', '"https://linkedin.com/in/anafit"')) },
    { status: 'warn', ctx: withHtml((h) => h.replace('"https://instagram.com/anafit","https://linkedin.com/in/anafit"', '"https://linkedin.com/in/anafit","https://linkedin.com/in/anafit"')) },
    { status: 'warn', ctx: withHtml((h) => h.replace('"sameAs":["https://instagram.com/anafit","https://linkedin.com/in/anafit"],', '')) },
  ],
  'schema.about': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace(/"about":\{[^}]+\},?/, '')) },
  ],
  'schema.author': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace(/"author":\{[^}]+\}/, '"keywords":"seo"')) },
  ],
  'schema.product': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace(/"offers":\{[^}]+\}/, '"sku":"123"')) },
  ],
  'schema.video': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace('"VideoObject"', '"Thing"')) },
  ],
  'schema.article': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace('"headline":"Entrenador personal en Lleida",', '')) },
  ],
  'perf.lcp': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withCtx({ psi: { ...ok().psi!, lcpMs: 3200, field: { ...ok().psi!.field, lcpMs: 3200 } } }) },
    { status: 'fail', ctx: withCtx({ psi: { ...ok().psi!, lcpMs: 5000, field: { ...ok().psi!.field, lcpMs: null } } }) },
    { status: 'error', ctx: withCtx({ psi: null }) },
  ],
  'perf.html-size': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withCtx({ page: { ...ok().page, body: 'a'.repeat(700 * 1024) } }) },
    { status: 'fail', ctx: withCtx({ page: { ...ok().page, body: 'a'.repeat(1600 * 1024) } }) },
  ],
  'perf.cls': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withCtx({ psi: { ...ok().psi!, cls: 0.18, field: { ...ok().psi!.field, cls: 0.18 } } }) },
    { status: 'fail', ctx: withCtx({ psi: { ...ok().psi!, cls: 0.35, field: { ...ok().psi!.field, cls: null } } }) },
    { status: 'error', ctx: withCtx({ psi: null }) },
  ],
  'perf.ttfb': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withCtx({ page: { ...ok().page, ttfbMs: 900 } }) },
    { status: 'fail', ctx: withCtx({ page: { ...ok().page, ttfbMs: 2200 } }) },
  ],
  'perf.compression': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withCtx({ page: { ...ok().page, headers: { ...ok().page.headers, 'content-encoding': '' } } }) },
  ],
  'perf.cache': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withCtx({ page: { ...ok().page, headers: { ...ok().page.headers, 'cache-control': 'no-store' } } }) },
    { status: 'warn', ctx: withCtx({ page: { ...ok().page, headers: Object.fromEntries(Object.entries(ok().page.headers).filter(([k]) => k !== 'cache-control')) } }) },
  ],
  'perf.http2': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withCtx({ tls: { ...ok().tls!, alpn: 'http/1.1' } }) },
    { status: 'fail', ctx: withCtx({ url: new URL('http://example.com/entrenador-personal') }) },
  ],
}
