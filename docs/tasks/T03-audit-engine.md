# T03 — Motor de auditoría (`src/lib/audit`)

## Objetivo
Construir un motor de auditoría puro y testeable: descarga de forma segura una URL y sus recursos auxiliares, ejecuta checks de SEO y de visibilidad para IA, calcula las notas y compara dos auditorías.

## Alcance
- Incluye: fetcher seguro (SSRF), parser HTML, checks de SEO y de IA, scoring, diff entre auditorías y una función de entrada `runAudit(url)`.
- No incluye: BD, server actions ni UI (T04/T05), IA generativa (T06) y renderizado con JavaScript (solo se analiza el HTML que devuelve el servidor).

## Criterios de aceptación
- [ ] CA1: `src/lib/audit/fetcher.ts` exporta `safeFetch(url, opts?)` y cumple D-SEC-05 completo:
  - Solo admite `http:`/`https:`.
  - Resuelve el DNS (con `node:dns/promises` inyectable) y rechaza si **alguna** IP resuelta es privada, loopback, link-local, CGNAT (`100.64/10`), `0.0.0.0/8`, multicast o reservada, en IPv4 o IPv6 (incluidas `::1`, `fc00::/7`, `fe80::/10` e IPv4 mapeadas `::ffff:a.b.c.d`). También rechaza `localhost` y `*.localhost`.
  - Sigue como máximo 5 redirecciones de forma manual (`redirect: 'manual'`) y revalida cada salto.
  - Tiene un timeout de 10 s (`AbortSignal`) y corta la lectura del cuerpo al pasar de 3 MB.
  - Devuelve `{ finalUrl, status, headers, body, redirects }` o lanza un `AuditFetchError` con un `code` (`INVALID_URL`, `BLOCKED_HOST`, `TOO_MANY_REDIRECTS`, `TIMEOUT`, `TOO_LARGE`, `NETWORK`).
- [ ] CA2: `fetcher.test.ts` cubre como mínimo `127.0.0.1`, `10.0.0.1`, `169.254.169.254`, `::1`, `localhost`, un hostname público que resuelve a una IP privada, una redirección a IP privada, más de 5 redirecciones, timeout, cuerpo de más de 3 MB, `ftp://` y un caso de éxito. Todo con `fetch` y DNS mockeados (D-TEST-04).
- [ ] CA3: los checks viven en `src/lib/audit/checks/`. Cada check es una función pura que recibe un `AuditContext` (`{ url, finalUrl, status, headers, html (parseado), robotsTxt: string|null, llmsTxt: string|null, sitemapFound: boolean }`) y devuelve `CheckResult`: `{ id, category: 'seo'|'ai', title, status: 'pass'|'warn'|'fail', weight, message, recommendation }`, con todos los textos en español.
- [ ] CA4: hay como mínimo estos checks (los umbrales exactos se documentan en el código):
  - **SEO:** `https`, `status-200`, `title` (existe y mide 10–60 caracteres; `warn` fuera de rango), `meta-description` (50–160), `h1` (exactamente uno), `canonical`, `html-lang`, `viewport`, `img-alt` (≥ 90 % de las `<img>` con `alt`), `indexable` (sin `noindex` en meta ni en `X-Robots-Tag`), `open-graph` (`og:title`, `og:description`, `og:image`), `robots-txt`, `sitemap`.
  - **IA:** `ai-crawlers` (robots.txt no bloquea `GPTBot`, `OAI-SearchBot`, `ClaudeBot`, `PerplexityBot` ni `Google-Extended`, ni tampoco `*` con `Disallow: /`; `warn` si bloquea a alguno, `fail` si bloquea a todos), `llms-txt`, `structured-data` (al menos un JSON-LD válido), `entity-schema` (JSON-LD con `Organization`, `Person`, `WebSite` o `LocalBusiness`), `server-rendered-content` (≥ 150 palabras de texto visible en el HTML del servidor), `heading-structure` (hay `h2` y no hay saltos de nivel `h1→h3`).
- [ ] CA5: `checks.test.ts` tiene, para **cada** check, al menos un test `pass` y uno `fail` con HTML de fixture (D-TEST-03). Los fixtures viven en `src/lib/audit/__tests__/fixtures/`.
- [ ] CA6: `src/lib/audit/scoring.ts` exporta `scoreChecks(checks)` y devuelve `{ score, seoScore, aiScore }` como enteros de 0 a 100. Cada categoría es la media ponderada (`pass` = 1, `warn` = 0,5, `fail` = 0) y `score` es la media redondeada de las dos. Una categoría sin checks cuenta como 0. Hay tests para todo `pass`, todo `fail`, una mezcla y el redondeo.
- [ ] CA7: `src/lib/audit/diff.ts` exporta `diffAudits(prev, curr)` y devuelve `{ scoreDelta, seoDelta, aiDelta, improved[], regressed[], unchanged[], added[], removed[] }` por `id` de check, ordenando los estados así: `fail` < `warn` < `pass`. Tiene tests.
- [ ] CA8: `src/lib/audit/index.ts` exporta `runAudit(url, deps?)`. Descarga la página, y en paralelo `/robots.txt` y `/llms.txt` del origen final (los fallos de estos auxiliares se tratan como `null`, no como error). Detecta el sitemap por la línea `Sitemap:` de robots.txt o porque `/sitemap.xml` responde 200. Ejecuta todos los checks y devuelve `{ status: 'ok', score, seoScore, aiScore, checks }`. Si la página principal falla, devuelve `{ status: 'error', error: <mensaje genérico en español según el code> }` sin lanzar. La forma de la salida encaja con la tabla `audits` de T02. Tiene tests con `fetch` y DNS mockeados.
- [ ] CA9: la cobertura de líneas de `src/lib/audit/**` es del 80 % o más (D-TEST-02).

## Reglas especialmente relevantes
D-SEC-05, D-TEST-01, D-TEST-02, D-TEST-03, D-TEST-04, D-QA-01, D-QA-04, D-QA-07.

## Notas técnicas
- Archivos esperados: `src/lib/audit/{fetcher,parse,scoring,diff,types,index}.ts`, `src/lib/audit/checks/{seo,ai,index}.ts` (o un archivo por grupo, siempre de 300 líneas o menos) y sus tests en `src/lib/audit/__tests__/`.
- Dependencia permitida: `cheerio`, para parsear HTML. Justifícala en el informe (D-QA-07). No se permite ninguna otra.
- Todo el motor solo corre en servidor (Node runtime). No importes nada de Next ni de Supabase en `src/lib/audit`.
- La protección SSRF debe validar la IP **resuelta**, no solo el hostname. Haz la comprobación de rangos con tu propio código y con tests (sin librerías).
- El User-Agent de las peticiones es `FaroBot/1.0 (+https://faro.app)`.
