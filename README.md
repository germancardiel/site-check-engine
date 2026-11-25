# Faro

Faro audita webs en **SEO técnico** y en **visibilidad para asistentes de IA**, guarda el historial de cada sitio y genera con IA un **plan de acción priorizado**.

Producción: <https://site-check-engine.vercel.app>

## Qué hace

Flujo principal:

1. **Añadir un sitio**: el usuario (registrado con email y contraseña) guarda una URL pública.
2. **Auditar**: Faro descarga la página, su `robots.txt`, su `llms.txt` y su sitemap, y ejecuta los checks.
3. **Ver la nota y los checks**: nota global de 0 a 100, nota SEO, nota de IA y cada check en `pass`, `warn` o `fail` con su recomendación.
4. **Plan de acción con IA**: a partir de los checks, un modelo genera un plan priorizado (y, entre dos auditorías, un resumen de los cambios).
5. **Historial**: la evolución de la nota en el tiempo y la comparación entre dos auditorías.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router), TypeScript strict, Tailwind CSS |
| Datos y auth | Supabase (Postgres + RLS) con `@supabase/ssr` |
| IA | AI SDK 7 (`ai`) + Vercel AI Gateway; modelo `recursive/flint-v1.0` (plan gratuito) |
| Validación | zod |
| Tests | Vitest |
| Deploy | Vercel (producción pública) |

## Puesta en marcha local

### Requisitos

- Node.js 24 o superior y npm.
- Un proyecto de Supabase (el plan gratuito basta).
- Para la IA: una clave de Vercel AI Gateway o un proyecto de Vercel enlazado (ver más abajo).

### Instalación

```bash
npm install
cp .env.example .env.local
```

Rellena `.env.local` (nunca se sube al repositorio; `.gitignore` ignora todo `.env*` salvo `.env.example`):

| Variable | Obligatoria | Para qué sirve |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | URL del proyecto de Supabase (Settings → API). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Clave pública `anon` de Supabase. Es segura en el navegador porque RLS protege los datos. |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Clave de administración. La aplicación no la usa; solo podría usarse desde `scripts/`. Nunca en `src/`. |
| `AI_GATEWAY_API_KEY` | En local, para la IA | Clave de Vercel AI Gateway. Alternativa: `vercel env pull` deja un `VERCEL_OIDC_TOKEN` temporal que también sirve. |
| `NEXT_PUBLIC_SITE_URL` | No | URL pública del sitio (canonical, sitemap, `robots.txt`, Open Graph). Por defecto `http://localhost:3000`. |
| `SMOKE_BASE_URL` | Solo smoke | Instancia contra la que se lanzan los smoke tests, p. ej. `http://localhost:3100`. |
| `DEMO_EMAIL`, `DEMO_PASSWORD` | Solo smoke | Credenciales del usuario demo para la parte con sesión del smoke. |

Después:

```bash
npm run dev
```

y abre <http://localhost:3000>.

### Base de datos

1. En el **SQL Editor** de Supabase, ejecuta los archivos de `supabase/migrations/` **en orden** (el nombre empieza por la fecha):
   1. `20261125000000_init.sql`: tablas `sites` y `audits`, índices y RLS.
   2. `20261125100000_grants.sql`: permisos del rol `authenticated`.
   3. `20261125200000_ai.sql`: informes de IA, cuota diaria de IA y límite de frecuencia de auditorías.
2. En **Authentication → Sign In / Providers → Email**, desactiva **Confirm email**. Si lo dejas activo, cada usuario nuevo tendrá que confirmar su email antes de poder entrar.
3. En **Authentication → URL Configuration**, pon como **Site URL** la URL del entorno (`http://localhost:3000` en local).

El esquema solo cambia con migraciones nuevas: nunca se editan las ya aplicadas.

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo. |
| `npm run build` | Build de producción (`npm start` lo sirve). |
| `npm test` | Tests unitarios y de integración con Vitest. Sin red: DNS y transporte simulados. |
| `npm run test:coverage` | Los mismos tests con informe de cobertura de `src/lib`. |
| `npm run test:smoke` | Smoke tests contra una instancia en marcha (usa la red; ver abajo). No forma parte de `npm test`. |
| `npm run typecheck` | Comprobación de tipos (`tsc --noEmit`). |
| `npm run lint` | ESLint sin warnings permitidos. |

### Smoke tests

Están en `src/__smoke__/` con su propia configuración (`vitest.smoke.config.mts`). Comprueban:

- Rutas públicas (`/`, `/login`, `/registro`, `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/opengraph-image`) → 200, una ruta inexistente → 404 y `/sitios` sin sesión → 307 a `/login`.
- La autoauditoría: Faro se audita a sí mismo y todos los checks deben pasar (en `http` se exime solo el de HTTPS).
- Con sesión del usuario demo: `/sitios` → 200 con su email y la página de su primer sitio, si tiene. **No escriben datos.**

Toman `SMOKE_BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DEMO_EMAIL` y `DEMO_PASSWORD` del entorno o de `.env.local`. Sin las credenciales del demo, la parte con sesión se omite con un aviso.

Contra producción:

```bash
SMOKE_BASE_URL=https://site-check-engine.vercel.app npm run test:smoke
```

En local, la protección SSRF no deja auditar `localhost`, así que la autoauditoría pide la instancia local con el nombre `faro-smoke.test` (solo ese origen se dirige al servidor local). Compila con ese nombre como URL pública para que la canónica coincida:

```bash
NEXT_PUBLIC_SITE_URL=http://faro-smoke.test:3100 npm run build
npm start -- -p 3100
# en otra terminal
SMOKE_BASE_URL=http://localhost:3100 npm run test:smoke
```

## Arquitectura

```
src/app/                  rutas (App Router); grupos (auth)/ y (app)/
src/app/**/actions.ts     server actions de cada ruta
src/components/ui/        componentes genéricos sin lógica de negocio
src/components/<feature>/ componentes de cada funcionalidad
src/lib/audit/            motor de auditoría puro (fetcher, checks/, scoring, diff)
src/lib/ai/               prompts, esquemas y llamadas a la IA
src/lib/supabase/         clientes (server.ts, client.ts), proxy y tipos
src/lib/validation/       esquemas zod compartidos
src/__smoke__/            smoke tests contra una instancia real
supabase/migrations/      SQL versionado
scripts/                  utilidades (único lugar donde se permitiría la service role)
```

- **Motor de auditoría** (`src/lib/audit`): funciones puras y testeadas. `runAudit(url)` descarga la página y sus archivos auxiliares, ejecuta los checks de SEO (HTTPS, título, meta descripción, H1, canónica, idioma, viewport, `alt`, indexabilidad, Open Graph, `robots.txt`, sitemap) y de IA (acceso de rastreadores de IA, `llms.txt`, datos estructurados, esquema de entidad, contenido renderizado en servidor, estructura de encabezados) y calcula las notas ponderadas. Nunca lanza: los fallos devuelven `{ status: 'error' }` con un mensaje genérico.
- **Protección SSRF** (`fetcher.ts`, `safe-lookup.ts`, `transport.ts`): solo `http`/`https`; se rechazan `localhost`, IPs privadas, loopback, link-local y metadatos de nube **después de resolver el DNS**. Cada salto se resuelve una sola vez con un `lookup` propio que valida antes de conectar, y el socket usa esa IP validada (sin segunda resolución, así que no hay DNS rebinding); TLS se valida contra el hostname. Máximo 5 redirecciones (revalidadas), 10 s de timeout y 3 MB por respuesta.
- **Rutas y sesión** (`src/proxy.ts`): refresca la sesión de Supabase en cada petición. Las rutas bajo `PRIVATE_PREFIXES` (hoy `/sitios`) redirigen a `/login` sin sesión; un test exige que cada carpeta de `src/app/(app)/` esté en esa lista. Cualquier otra ruta desconocida devuelve un 404 real. Las páginas privadas vuelven a comprobar la sesión por su cuenta.
- **IA con límites** (`src/lib/ai`): el prompt solo contiene datos de la auditoría (URL, notas y checks, máximo 8.000 caracteres, nunca el HTML) y la salida se valida con un esquema zod. Antes de llamar al modelo, el servidor consume la cuota diaria (10 generaciones por usuario y día) mediante una función de Postgres `security definer`; el usuario no puede modificar sus contadores. Si la IA falla, la auditoría sigue visible y se puede reintentar.
- **RLS**: todas las tablas tienen Row Level Security con políticas `user_id = auth.uid()`; el rol `anon` no tiene permisos. Las auditorías están limitadas a una por sitio y minuto con el reloj de la base de datos.

## Despliegue en Vercel

El proyecto de Vercel está conectado a GitHub: cada push a `main` despliega a producción.

1. **Variables de entorno** (Production y Preview): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `NEXT_PUBLIC_SITE_URL` (la URL pública, p. ej. `https://site-check-engine.vercel.app`). Se gestionan con `vercel env` o desde el panel, nunca en el repositorio.
2. **IA con OIDC**: en Vercel, el AI SDK se autentica contra AI Gateway con el token OIDC del propio despliegue, así que en producción no hace falta `AI_GATEWAY_API_KEY`.
3. **Supabase**: en Authentication → URL Configuration, pon la URL de producción como **Site URL** (y añádela a las Redirect URLs).

Tras desplegar, lanza el smoke contra producción (ver [Smoke tests](#smoke-tests)).

## Usuario demo

Existe un usuario demo en Supabase para probar la aplicación con datos y para la parte con sesión del smoke. **Sus credenciales no se publican** en el repositorio, en este README ni en los logs: solo están en el `.env.local` de quien mantiene el proyecto (`DEMO_EMAIL`, `DEMO_PASSWORD`), de donde las lee `npm run test:smoke`. El smoke solo lee: no crea sitios ni lanza auditorías.

## Limitaciones conocidas

- **Modelo gratuito lento**: `recursive/flint-v1.0` es un modelo de razonamiento del plan gratuito; generar un plan o un resumen puede tardar uno o dos minutos (timeout de 120 s).
- **HTML sin JavaScript**: Faro analiza el HTML que devuelve el servidor, sin ejecutar JavaScript. Las webs que pintan su contenido solo en el cliente salen peor puntuadas (igual que las ven muchos rastreadores de IA).
- **Límite de IA**: 10 generaciones (planes y resúmenes de cambios) por usuario y día.
- **Frecuencia de auditorías**: una auditoría por sitio y minuto.
