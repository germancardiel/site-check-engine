# T08 — Producción, usuario demo y README

## Objetivo
Dejar Faro listo para producción en `https://site-check-engine.vercel.app`: URLs inexistentes con 404 real, smoke tests (con y sin sesión) que se puedan lanzar contra `next start` o contra producción, y un README completo. El despliegue lo hace el Orquestador después del PASS y con el OK del humano.

## Estado ya preparado por el Orquestador (no lo toques)
- El proyecto Vercel `site-check-engine` está enlazado (`.vercel/`, ignorado) y conectado a GitHub: cada push a `main` despliega.
- Variables en Vercel (producción y preview): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `NEXT_PUBLIC_SITE_URL=https://site-check-engine.vercel.app`. En producción, la IA se autentica con OIDC, sin `AI_GATEWAY_API_KEY`.
- El usuario demo existe en Supabase. Sus credenciales están **solo** en `.env.local` (`DEMO_EMAIL`, `DEMO_PASSWORD`) y **nunca** deben aparecer en el repositorio, en el README ni en logs.

## Alcance
- Incluye: el cambio del proxy para dar 404, los smoke tests, los scripts de npm, el README, las entradas nuevas de `.env.example` y la regla de excepción para smoke en D-TEST-04 (la redacta el Orquestador).
- No incluye: desplegar, hacer push, tocar la configuración de Vercel o Supabase, ni crear o borrar usuarios.

## Criterios de aceptación
- [ ] CA1: **404 real.** El proxy deja de tratar como privada "cualquier ruta salvo las públicas":
  - Pasan a privadas solo las rutas bajo prefijos explícitos (`PRIVATE_PREFIXES`, hoy `['/sitios']`). Sin sesión, esas rutas siguen redirigiendo a `/login`.
  - Cualquier otra ruta desconocida llega a Next y devuelve **404** con el `not-found` raíz, con o sin sesión.
  - `/login` y `/registro` mantienen su comportamiento.
  - Hay un test guardián que lista los directorios de primer nivel de `src/app/(app)/` y exige que cada uno esté en `PRIVATE_PREFIXES`, para que una ruta privada nueva no quede abierta por olvido.
  - Las páginas privadas siguen comprobando `auth.getUser()` por su cuenta (defensa en profundidad).
  - Tests de `getAuthRedirect` actualizados sin perder casos de seguridad.
- [ ] CA2: **smoke tests** en `src/__smoke__/` con una configuración propia de Vitest (`vitest.smoke.config.mts`), excluida de `npm test`, y el script `npm run test:smoke`. Leen `SMOKE_BASE_URL` (obligatoria) y, para la parte con sesión, `DEMO_EMAIL` y `DEMO_PASSWORD`. Si faltan las credenciales, esa parte se salta con un aviso claro. Comprueban:
  - **Público:** `/`, `/login`, `/registro`, `/robots.txt`, `/sitemap.xml`, `/llms.txt` y `/opengraph-image` → 200. `/no-existe-xyz` → 404. `/sitios` sin sesión → 307 a `/login`.
  - **Autoauditoría:** `runAudit(SMOKE_BASE_URL)`, con el transporte real, da `status: 'ok'`. Si la URL es `https`, **todos** los checks deben dar `pass`. Con `http` (local) se exime solo `https`.
  - **Con sesión:** se inicia sesión contra Supabase Auth (password grant, con la anon key) usando el usuario demo, y se construye la cookie de sesión con el mismo formato y nombre que usa `@supabase/ssr` (verifícalo en `node_modules/@supabase/ssr`). Con esa cookie, `GET /sitios` → 200, el HTML contiene el email del demo y no contiene el texto de `error.tsx`. Si el demo tiene sitios, se pide también la página del primero → 200. **El smoke no escribe datos**: ni crea sitios ni audita.
  - Ningún secreto ni cookie aparece en la salida.
- [ ] CA3: el smoke pasa contra `next build && next start` en local: `SMOKE_BASE_URL=http://localhost:<puerto>`, con las credenciales demo de `.env.local`. Documenta el comando y el resultado en el informe.
- [ ] CA4: **README.md** en español, para alguien que llega al repo. Incluye:
  1. Qué es Faro y el flujo principal.
  2. El stack (tal cual `CLAUDE.md` §2).
  3. Puesta en marcha local: requisitos, `npm install`, `.env.local` desde `.env.example` y cada variable explicada.
  4. Base de datos: aplicar las migraciones de `supabase/migrations/` **en orden** desde el SQL Editor, y desactivar "Confirm email" (o tenerlo en cuenta).
  5. Scripts: `dev`, `build`, `test`, `test:coverage`, `test:smoke`, `typecheck` y `lint`.
  6. Arquitectura en breve: carpetas de DIRECTRICES §7, motor de auditoría, protección SSRF, IA con límites y RLS.
  7. Despliegue en Vercel: variables, OIDC para la IA y Site URL de Supabase.
  8. Usuario demo: que existe, que sus credenciales **no** se publican y que el smoke las lee de `.env.local`.
  9. Limitaciones conocidas: modelo gratuito lento, HTML sin JavaScript y límite de 10 generaciones al día.

  Sin secretos y sin `TODO`.
- [ ] CA5: `.env.example` añade `DEMO_EMAIL=`, `DEMO_PASSWORD=` y `SMOKE_BASE_URL=` vacías, con un comentario.
- [ ] CA6: las cuatro puertas en verde. `npm test` **no** ejecuta los smoke ni hace peticiones de red (D-TEST-04).

## Reglas especialmente relevantes
D-SEC-01, D-SEC-03, D-TEST-04 (con su excepción para smoke), D-QA-03, D-QA-07, D-GATE-01…04, D-TEST-05.

## Notas técnicas
- No se permiten dependencias nuevas.
- No uses `SUPABASE_SERVICE_ROLE_KEY` en el smoke: basta la anon key y el usuario demo.
- `src/__smoke__/` puede importar `@/lib/audit` (`runAudit` con el transporte real por defecto).
