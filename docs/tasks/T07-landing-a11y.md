# T07 — Landing, estados vacío/carga/error, accesibilidad y responsive

## Objetivo
Convertir la portada en una landing que explique Faro y lleve al registro, darle a la zona privada una cabecera con navegación y revisar toda la app para que tenga estados completos, sea accesible y funcione desde 360 px. Como Faro audita SEO y visibilidad para IA, la propia landing debe aprobar sus checks.

## Alcance
- Incluye: landing (`/`), cabecera de la zona privada, cabecera pública mínima en auth, páginas globales `not-found` y `error`, archivos de SEO y de IA del propio sitio, pasada de accesibilidad y responsive por todas las rutas, y los pendientes de reviews anteriores listados en CA9.
- No incluye: blog, precios, i18n, modo claro/oscuro conmutable (se mantiene `prefers-color-scheme`), tests de componentes con DOM y ninguna dependencia nueva.

## Criterios de aceptación
- [ ] CA1: **landing `/`** (Server Component, estática salvo el hueco de los CTA de CA7, que lee la sesión dentro de `<Suspense>` con `connection()`, D-QA-08), en español y con un único `h1`. Tiene estas secciones:
  1. Hero con propuesta de valor y dos CTA: "Crear cuenta gratis" → `/registro` y "Entrar" → `/login`.
  2. "Qué revisa Faro", con dos bloques (SEO y visibilidad para IA) y ejemplos reales de checks. Los textos se generan a partir de `ALL_CHECKS` o de una lista derivada de él, para que no se desincronicen con el motor.
  3. "Cómo funciona", en 3 pasos: añadir sitio → auditar → plan de acción con IA y evolución.
  4. CTA final.
  5. Footer.

  Sin imágenes pesadas (si hay alguna, con `next/image`, D-DATA-04) y sin lorem ipsum.
- [ ] CA2: **la landing aprueba el motor de Faro.** Hay un test que ejecuta `runChecks` (o `runAudit` con `fetch` y DNS mockeados) sobre el HTML real que devuelve `next build` + `next start` para `/` (o sobre un HTML equivalente generado en el test, explicando el método en el informe), junto con los `robots.txt`, `llms.txt` y sitemap servidos. Comprueba que **todos los checks dan `pass` salvo `https`**, que se exime en local, y que cualquier otra excepción esté justificada en el informe. Para ello:
  - `src/app/robots.ts`: permite todo, incluidos los crawlers de IA, y declara el sitemap.
  - `src/app/sitemap.ts`: incluye `/`, `/login` y `/registro`.
  - `public/llms.txt` o una ruta equivalente, con la descripción de Faro.
  - Metadata con `title` (10–60 caracteres), `description` (50–160), `alternates.canonical`, Open Graph (`og:title`, `og:description` y `og:image`, que puede ser `opengraph-image.tsx` con `next/og`, sin dependencias nuevas) y `viewport`.
  - JSON-LD `WebSite` u `Organization` (renderizado con un `<script type="application/ld+json">` cuyo contenido es `JSON.stringify` de un objeto propio; no es HTML auditado, así que no infringe D-SEC-07).
  - Al menos 150 palabras de texto en el HTML del servidor, con `h2` y sin saltos de nivel.

  La URL base sale de `NEXT_PUBLIC_SITE_URL` (añádela vacía a `.env.example`), con `http://localhost:3000` por defecto.
- [ ] CA3: **cabecera de la zona privada.** `src/app/(app)/layout.tsx` muestra una cabecera con:
  - el logo/texto "Faro" enlazado a `/sitios`;
  - el enlace "Sitios", con `aria-current="page"` cuando corresponde;
  - el email del usuario (dentro de `<Suspense>`);
  - el botón "Cerrar sesión".

  El email y el logout que estaban en `/sitios` se mueven a esta cabecera, sin duplicarse. En las páginas de auth hay un enlace "Faro" a `/` y un enlace cruzado ("¿No tienes cuenta? Crear cuenta" / "¿Ya tienes cuenta? Entrar").
- [ ] CA4: **páginas globales.**
  - `src/app/not-found.tsx` en español, con enlace a `/`.
  - `src/app/global-error.tsx`, o `error.tsx` en la raíz, con un mensaje genérico y "Reintentar".
  - Las rutas existentes conservan sus `error.tsx` y `not-found.tsx` (D-UX-01).
- [ ] CA5: **accesibilidad** en toda la app:
  - Enlace "Saltar al contenido" como primer elemento enfocable, que lleva a `<main id="contenido">`; cada página tiene un único `<main>`.
  - Jerarquía de encabezados sin saltos en cada ruta.
  - Foco visible en todos los elementos interactivos (D-UX-03).
  - Contraste de D-UX-04 en modo claro y oscuro.
  - Los enlaces a checks plegados en `<details>` (de T06) deben abrir el `<details>` al navegar al ancla. Puede hacerse con un pequeño componente cliente que escuche `hashchange` y la carga inicial; la lógica de resolver el ancla al `<details>` va en una función pura testeada.
  - Ninguna regla de D-UX-02 se rompe.
- [ ] CA6: **responsive.** Todas las rutas (landing, login, registro, `/sitios`, sitio, detalle de auditoría y not-found) se ven sin scroll horizontal a 360 px (D-UX-05). Hay que revisar en concreto el historial, el gráfico SVG (que debe escalar con `viewBox` y `width: 100%`), la lista de checks, la comparación y el plan de IA. El paso manual va documentado por ruta: qué se comprobó a 360 px y a 1280 px.
- [ ] CA7: **proxy.** Las rutas públicas nuevas (`/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/opengraph-image`, etc.) son accesibles sin sesión: se añaden a `PUBLIC_PATHS` o se excluyen en el matcher. Esto se cubre con tests de `getAuthRedirect`. Un usuario con sesión que entra en `/` **no** se redirige: ve la landing con un CTA "Ir a tus sitios" en lugar de "Entrar" y "Crear cuenta". Esa parte va dentro de un `<Suspense>` con `connection()` para no hacer dinámica toda la landing, o se resuelve en cliente.
- [ ] CA8: **textos de espera de IA.** `AI_PENDING_HINT` pasa a "Esto puede tardar uno o dos minutos." (sugerencia de testing en T11).
- [ ] CA9: **cobertura.** `vitest.config.mts` incluye `src/lib/**/*.ts` (ya está) y la cobertura de líneas global de `src/lib` es del 90 % o más. Se indica en el informe.

## Reglas especialmente relevantes
D-UX-01…07, D-QA-03, D-QA-06, D-QA-08, D-DATA-04, D-SEC-07, D-TEST-01, D-TEST-05.

## Notas técnicas
- Estética: mantén la línea actual (paleta `zinc`, Geist, sobria y con mucho aire) y no introduzcas otro sistema de diseño. Usa tipografía y espaciado para dar jerarquía, no decoración.
- En la landing, `ALL_CHECKS` se puede importar desde `src/lib/audit/checks` porque son funciones puras. Si necesitas títulos legibles sin ejecutar los checks, exporta junto a ellos un catálogo de metadatos (`id`, `category`, `title`) y testéalo.
- Next 16: `robots.ts`, `sitemap.ts` y `opengraph-image.tsx` son convenciones de metadata. Consulta `node_modules/next/dist/docs/` antes de escribirlos.
- No se permiten dependencias nuevas.
