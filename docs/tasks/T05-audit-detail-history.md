# T05 — Detalle de auditoría, historial y comparación

## Objetivo
Que el usuario vea el resultado completo de cada auditoría, la evolución de un sitio a lo largo del tiempo y qué ha cambiado entre dos auditorías.

## Alcance
- Incluye: página del sitio con su historial, página de detalle de una auditoría, comparación entre dos auditorías y enlaces desde `/sitios`.
- No incluye: IA (T06), exportar a PDF o CSV, paginación infinita (basta un límite) y el pulido visual final (T07).

## Criterios de aceptación
- [ ] CA1: `/sitios/[siteId]` (en `src/app/(app)/sitios/[siteId]/page.tsx`):
  - Valida `siteId` con zod (uuid). Si no es válido, o si el sitio no existe o no es del usuario (lectura filtrada por `user_id` tras `auth.getUser()`), responde con `notFound()`.
  - Muestra el nombre o el host, la URL, el botón "Auditar" (reutiliza `auditSite` de T04) y un enlace "Volver a tus sitios".
- [ ] CA2: en esa página, el **historial** muestra las 30 auditorías más recientes del sitio (columnas concretas, sin `checks`, D-DATA-02).
  - Cada fila incluye la fecha (absoluta con `Intl.DateTimeFormat('es')` y relativa), el estado, Nota/SEO/IA y la variación de la nota total respecto a la auditoría anterior `ok` (por ejemplo, "+7" o "−3", con texto accesible y no solo color). También enlaza a su detalle.
  - Las auditorías fallidas aparecen con su mensaje de error y no rompen el cálculo de la variación.
- [ ] CA3: en esa página hay un **gráfico de evolución** de la nota total, SEO e IA de las auditorías `ok` (en orden cronológico):
  - Es un SVG propio, sin dependencias nuevas.
  - Tiene `role="img"` y un `aria-label` que resume la tendencia (p. ej. "Nota total de 54 a 78 en 6 auditorías").
  - Su leyenda no depende solo del color: cada serie tiene un estilo de línea o un marcador distinto.
  - Con menos de 2 auditorías `ok` muestra "Necesitas al menos dos auditorías para ver la evolución".
  - La lógica de escalado y puntos está en una función pura con tests.
- [ ] CA4: `/sitios/[siteId]/auditorias/[auditId]` (detalle):
  - Valida los dos ids y comprueba que la auditoría pertenece a ese sitio y al usuario; si no, responde con `notFound()`.
  - Muestra la fecha, Nota/SEO/IA y los checks agrupados en dos secciones (SEO e IA), ordenados de `fail` a `warn` a `pass`.
  - Cada check muestra el título, el estado (icono más texto, no solo color), el mensaje y la recomendación. Los `pass` pueden ir plegados con `<details>`.
  - Si la auditoría es `error`, muestra el mensaje y un botón para volver a auditar.
- [ ] CA5: **comparación.** En el detalle, si existe una auditoría `ok` anterior del mismo sitio, se muestra "Cambios desde la auditoría del <fecha>":
  - Usa `diffAudits` de T03 e incluye las variaciones de Nota/SEO/IA y las listas de mejorados, empeorados, nuevos y eliminados, con el estado anterior y el nuevo.
  - Si no hay cambios en los checks, muestra "Sin cambios en los checks".
  - Además, se puede comparar con cualquier otra auditoría `ok` del sitio con `?comparar=<auditId>`. Ese id se valida con zod y se comprueba que es del mismo sitio; si no lo es, se ignora y se usa la anterior.
- [ ] CA6: la columna `checks` (jsonb) se valida al leerla con un esquema zod (`src/lib/validation/audit.ts`) antes de usarla. Si es inválida, el detalle muestra un error genérico (no se rompe la página) y se registra con `console.error`. Tiene tests.
- [ ] CA7: en `/sitios`, el nombre de cada sitio enlaza a `/sitios/[siteId]` y la nota de la última auditoría enlaza a su detalle.
- [ ] CA8: estados (D-UX-01). Las dos rutas nuevas tienen:
  - Carga: `loading.tsx` o `<Suspense>` con skeleton.
  - Error: `error.tsx` con "Reintentar".
  - Vacío: sitio sin auditorías, "Este sitio aún no tiene auditorías" con el botón Auditar.
  - `not-found.tsx` en español.
- [ ] CA9: tests:
  - La función de datos del gráfico.
  - El cálculo de variaciones del historial (incluida una auditoría `error` intercalada).
  - El esquema zod de `checks`.
  - El ordenado y agrupado de checks del detalle.
  - La resolución del objetivo de comparación (por defecto, `?comparar` válido, `?comparar` de otro sitio o inválido).
  - Toda esta lógica va en funciones puras de `src/lib/` (por ejemplo `src/lib/audit/history.ts` y `src/lib/audit/present.ts`), no dentro de los componentes.

## Reglas especialmente relevantes
D-SEC-06, D-SEC-07, D-DATA-02, D-UX-01, D-UX-02, D-UX-04, D-UX-05, D-QA-03, D-QA-04, D-QA-06, D-TEST-01, D-TEST-05.

## Notas técnicas
- Next 16: en páginas y layouts, `params` y `searchParams` son `Promise`. Consulta `node_modules/next/dist/docs/` antes de escribir las rutas dinámicas. Con `cacheComponents` activo, la lectura de datos del usuario va dentro de `<Suspense>`.
- Ya existen `diffAudits` / `AuditSnapshot` (`src/lib/audit/diff.ts`), `CheckResult` (`src/lib/audit/types.ts`), `formatRelativeTime` y `siteDisplayName` (`src/lib/format.ts`), y `siteIdSchema` (`src/lib/validation/site.ts`). Reutilízalos.
- Los componentes van en `src/components/audits/`. El gráfico va en `src/components/audits/score-chart.tsx` (Server Component si no tiene interacción).
- El índice `audits(site_id, created_at desc)` de T02 cubre las consultas del historial.
- No se permiten dependencias nuevas.
