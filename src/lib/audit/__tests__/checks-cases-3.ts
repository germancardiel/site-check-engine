import { ok, withCtx, withHtml, type CheckCase } from './checks-cases-1'

export const CASES_PART_3: Record<string, CheckCase[]> = {
  'perf.img-dims': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace('width="800" height="600" loading="lazy"', 'loading="lazy"')) },
    { status: 'fail', ctx: withHtml((h) => h.replace(/width="800" height="600"/g, '')) },
  ],
  'perf.lazy': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace('loading="lazy"', '')) },
  ],
  'perf.lcp-lazy': [
    { status: 'pass', ctx: ok },
    { status: 'pass', ctx: withHtml((h) => h.replace('fetchpriority="high"', '').replace('</head>', '<link rel="preload" as="image" href="/img/entrenamiento-fuerza-lleida.jpg" /></head>')) },
    { status: 'warn', ctx: withHtml((h) => h.replace('fetchpriority="high"', '')) },
    { status: 'fail', ctx: withHtml((h) => h.replace('fetchpriority="high"', 'loading="lazy"')) },
    { status: 'na', ctx: withHtml((h) => h.replace(/<img[^>]*>/g, '')) },
  ],
  'perf.preconnect': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace(/<link rel="preconnect"[^>]*>/, '').replace('</head>', '<link rel="preload" href="https://fonts.example.org/font.woff2" as="font" /></head>')) },
    { status: 'na', ctx: withHtml((h) => h.replace(/<script src="https:\/\/cdn\.example\.org\/analytics\.js" defer><\/script>/, '')) },
  ],
  'perf.dom': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace('</article>', `${'<span>x</span>'.repeat(1600)}</article>`)) },
    { status: 'fail', ctx: withHtml((h) => h.replace('</article>', `${'<span>x</span>'.repeat(3100)}</article>`)) },
  ],
  'perf.unused-js': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withCtx({ psi: { ...ok().psi!, unusedJsBytes: 150 * 1024 } }) },
    { status: 'fail', ctx: withCtx({ psi: { ...ok().psi!, unusedJsBytes: 400 * 1024 } }) },
    { status: 'error', ctx: withCtx({ psi: null }) },
  ],
  'perf.inp': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withCtx({ psi: { ...ok().psi!, field: { ...ok().psi!.field, inpMs: 300 } } }) },
    { status: 'fail', ctx: withCtx({ psi: { ...ok().psi!, field: { ...ok().psi!.field, inpMs: 600 } } }) },
    { status: 'na', ctx: withCtx({ psi: { ...ok().psi!, field: { ...ok().psi!.field, inpMs: null } } }) },
  ],
  'perf.lazy-video': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace('preload="none"', 'preload="auto"')) },
  ],
  'perf.crux': [
    { status: 'pass', ctx: ok },
    { status: 'pass', ctx: withCtx({ psi: { ...ok().psi!, field: { ...ok().psi!.field, origin: 'origin' } } }) },
    { status: 'na', ctx: withCtx({ psi: { ...ok().psi!, field: { ...ok().psi!.field, origin: null } } }) },
    { status: 'error', ctx: withCtx({ psi: null }) },
  ],
  'mobile.viewport': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace('initial-scale=1', 'initial-scale=1, user-scalable=no')) },
    { status: 'fail', ctx: withHtml((h) => h.replace(/<meta name="viewport"[^>]*>/, '')) },
  ],
  'mobile.labels': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace('<label for="email">Email</label>', '')) },
  ],
  'mobile.buttons': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace('Enviar', '')) },
    { status: 'fail', ctx: withHtml((h) => h.replace('</form>', `${'<button type="button"></button>'.repeat(6)}</form>`)) },
  ],
  'mobile.semantic': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml(() => '<!doctype html><html lang="es"><body><header>H</header><main>M</main><div>D</div></body></html>') },
    { status: 'fail', ctx: withHtml(() => '<!doctype html><html lang="es"><body><div><span>Solo divs</span></div></body></html>') },
  ],
  'mobile.skip-link': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace('<a href="#main">Saltar al contenido</a>', '')) },
  ],
  'mobile.tabindex': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace('<button type="submit">', '<button type="submit" tabindex="3">')) },
  ],
  'mobile.link-text': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace('<a href="/contacto">Contacto</a>', '<a href="/contacto">leer más</a>')) },
  ],
  'mobile.iframe-title': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace('title="Vídeo de presentación"', '')) },
  ],
  'mobile.tables': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace(/<th>/g, '<td>').replace(/<\/th>/g, '</td>')) },
  ],
  'trust.https': [
    { status: 'pass', ctx: ok },
    { status: 'fail', ctx: withCtx({ url: new URL('http://example.com/entrenador-personal') }) },
    { status: 'fail', ctx: withCtx({ tls: { ...ok().tls!, authorized: false, error: 'SELF_SIGNED' } }) },
  ],
  'trust.ssl-expiry': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withCtx({ tls: { ...ok().tls!, daysLeft: 14 } }) },
    { status: 'fail', ctx: withCtx({ tls: { ...ok().tls!, daysLeft: 3 } }) },
    { status: 'fail', ctx: withCtx({ tls: { ...ok().tls!, daysLeft: -2 } }) },
  ],
  'trust.legal-links': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace('<a href="/privacidad">Política de privacidad</a>', '')) },
    { status: 'fail', ctx: withHtml((h) => h.replace('<a href="/sobre-mi">Sobre mí</a>', '').replace('<a href="/contacto">Contacto</a>', '').replace('<a href="/aviso-legal">Aviso legal</a>', '')) },
  ],
  'trust.mixed': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace('</body>', '<img src="http://cdn.example.org/a.jpg" /></body>')) },
    { status: 'fail', ctx: withHtml((h) => h.replace('</body>', '<script src="http://cdn.example.org/a.js"></script></body>')) },
  ],
  'trust.business-data': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace('NIF 12345678Z.', '')) },
    { status: 'fail', ctx: withHtml((h) => h.replace('Llámame al 600 123 456. Calle Mayor 12, 25001 Lleida. NIF 12345678Z.', '').replace('"telephone":"+34 600 000 000",', '').replace(/"address":\{[^}]+\},/, '')) },
  ],
  'trust.sec-headers': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withCtx({ page: { ...ok().page, headers: { 'content-type': 'text/html', 'strict-transport-security': 'max-age=100', 'x-content-type-options': 'nosniff' } } }) },
    { status: 'fail', ctx: withCtx({ page: { ...ok().page, headers: { 'content-type': 'text/html' } } }) },
  ],
  'trust.reviews': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace(/,"aggregateRating":\{[^}]+\}/, '').replace('</article>', '<div class="testimonios">Excelente</div></article>')) },
    { status: 'na', ctx: withHtml((h) => h.replace(/,"aggregateRating":\{[^}]+\}/, '')) },
  ],
  'intl.og-locale': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml((h) => h.replace('content="es_ES"', 'content="en_US"')) },
    { status: 'warn', ctx: withHtml((h) => h.replace(/<meta property="og:locale"[^>]*>/, '')) },
  ],
  'intl.hreflang': [
    { status: 'pass', ctx: ok },
    { status: 'na', ctx: withHtml((h) => h.replace(/<link rel="alternate"[^>]*>/g, '')) },
    { status: 'warn', ctx: withHtml((h) => h.replace(/<link rel="alternate" hreflang="x-default"[^>]*>/, '')) },
    { status: 'fail', ctx: withHtml((h) => h.replace('hreflang="es"', 'hreflang="idioma-invalido"')) },
  ],
  'ai.robots': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withCtx({ robots: { found: true, status: 200, text: 'User-agent: GPTBot\nDisallow: /\nUser-agent: *\nAllow: /' } }) },
    { status: 'warn', ctx: withCtx({ robots: { found: true, status: 200, text: 'User-agent: PerplexityBot\nDisallow: /\nUser-agent: *\nAllow: /' } }) },
    { status: 'fail', ctx: withCtx({ robots: { found: true, status: 200, text: 'User-agent: *\nDisallow: /' } }) },
  ],
  'ai.waf': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withCtx({ botProbes: [{ bot: 'GPTBot', status: 403 }, { bot: 'ClaudeBot', status: 200 }] }) },
    { status: 'fail', ctx: withCtx({ botProbes: [{ bot: 'GPTBot', status: 403 }, { bot: 'ClaudeBot', status: 429 }] }) },
  ],
  'ai.ssr': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withHtml(() => `<!doctype html><html lang="es"><body><p>${'palabra '.repeat(80)}</p></body></html>`) },
    { status: 'fail', ctx: withHtml(() => `<!doctype html><html lang="es"><body><div id="root"></div>${'<script src="/a.js"></script>'.repeat(6)}</body></html>`) },
  ],
  'ai.llms': [
    { status: 'pass', ctx: ok },
    { status: 'warn', ctx: withCtx({ llmsTxt: { found: false, url: 'https://example.com/llms.txt' } }) },
  ],
  'ai.webmcp': [
    { status: 'pass', ctx: ok },
    { status: 'pass', ctx: withHtml((h) => h.replace('toolname="reserva-sesion"', '').replace('</body>', '<script>navigator.modelContext.registerTool({ name: "x" })</script></body>')) },
    { status: 'warn', ctx: withHtml((h) => h.replace('toolname="reserva-sesion"', '')) },
  ],
}
