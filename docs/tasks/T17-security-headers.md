# T17 — Cabeceras de seguridad y caché

## Objetivo
Completar las cabeceras HTTP de seguridad y evitar que las páginas con sesión se marquen como cacheables públicamente. Hallazgos S2 y S3 de `docs/audits/2026-11-26-usabilidad-seguridad.md`.

## Alcance
- Incluye:
  - `Referrer-Policy: strict-origin-when-cross-origin` y `Permissions-Policy` restrictiva (`camera=(), microphone=(), geolocation=(), browsing-topics=()` como mínimo) en todas las respuestas.
  - `Content-Security-Policy` con al menos `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'self'`, y `connect-src` con el origen de Supabase (de `NEXT_PUBLIC_SUPABASE_URL`). Que no rompa: scripts de Next (hidratación, Server Actions), estilos de Tailwind, el script del tema sin parpadeo, la imagen OG ni las fuentes de `next/font`. Si hacen falta nonces, se generan en `src/proxy.ts` siguiendo la guía de CSP de la documentación de Next instalada (`node_modules/next/dist/docs/`); si se usa `'unsafe-inline'` en `style-src` o `script-src`, se justifica en el informe.
  - `Cache-Control: private, no-store` en `/sitios` y `/sitios/:path*`; el resto mantiene el comportamiento actual.
  - Un test que fije la lista de cabeceras esperadas (p. ej. sobre la función `headers()` de `next.config.ts` o sobre el proxy).
- No incluye:
  - Cambios en Vercel (firewall, protección de despliegue).
  - Report-URI / report-to de la CSP.

## Criterios de aceptación
- [ ] CA1: `curl -I` contra `next start` en `/` devuelve `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` y `Content-Security-Policy` con las directivas del alcance (D-SEC-13). Pegar la salida en el informe.
- [ ] CA2: `curl -I` en `/sitios` (con y sin sesión; sin sesión es la redirección a `/login`) devuelve `Cache-Control: private, no-store` (o más estricto) y no `public`.
- [ ] CA3: Con `next start`, la landing, `/login`, `/sitios`, el detalle de un sitio y de una auditoría cargan sin errores de CSP en la consola del navegador, el cambio de tema funciona y los formularios (Server Actions) envían. Paso manual documentado en el informe, o smoke test.
- [ ] CA4: Un test de Vitest comprueba la presencia y el valor de las cabeceras.
- [ ] CA5: Las 4 puertas pasan en verde.

## Reglas especialmente relevantes
D-SEC-13, D-GATE-01…04, D-TEST-05, D-QA-07, D-QA-08.

## Notas técnicas
- Archivos esperados: `next.config.ts` y, si hay nonce, `src/proxy.ts` / `src/lib/supabase/proxy.ts` (sin romper `src/__tests__/proxy.test.ts`). Con nonce, las páginas pasan a renderizado dinámico: comprueba que no rompe `cacheComponents` ni el prerender (ver T10/T12).
- Si la CSP con nonce resulta incompatible con `cacheComponents`/PPR, usa una CSP estática en `next.config.ts` con `'unsafe-inline'` solo en `style-src` y en `script-src`, explicándolo en el informe.
