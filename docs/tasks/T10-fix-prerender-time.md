# T10 — Corrección: hora actual durante el prerender (Blocking Route)

## Objetivo
Que `/sitios`, `/sitios/[siteId]` y el detalle de auditoría no den el error de Next 16 "Route … encountered the unstable value `Date.now()` while prerendering" al cargar en `next dev` con sesión iniciada.

## Contexto
Error que vio el humano en `/sitios` (Next 16.4.6, Turbopack):
```
Route "/sitios": Next.js encountered the unstable value `Date.now()` while prerendering.
    at SitesPage (src/app/(app)/sitios/page.tsx:78:9)
```
Usos detectados por el Orquestador:
- `src/app/(app)/sitios/page.tsx:60`: `now={new Date()}`
- `src/app/(app)/sitios/[siteId]/page.tsx:96`: `now={new Date()}`
- `src/app/(app)/sitios/[siteId]/auditorias/[auditId]/page.tsx:107`: `madridDay(new Date())`
- `src/lib/format.ts:13`: el parámetro por defecto `now: Date = new Date()`

Ni el build ni los tests detectaron estos usos. La documentación de la versión instalada (`node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`, sección de valores por petición) indica que hay que llamar a `await connection()` antes de la operación, dentro de un componente envuelto en `<Suspense>`.

## Alcance
- Incluye: corregir todos los usos de valores no deterministas en Server Components de `src/app` y `src/components`, cumplir la nueva regla D-QA-08 y añadir una protección automática para que no vuelva a pasar.
- No incluye: cambios de UI ni de comportamiento.

## Criterios de aceptación
- [ ] CA1: cada Server Component que lee la hora actual (o cualquier valor no determinista) llama antes a `await connection()` (`next/server`) y está dentro de un `<Suspense>`, según D-QA-08. Se cubren los tres usos listados y cualquier otro que haya.
- [ ] CA2: en `formatRelativeTime` (`src/lib/format.ts`), `now` pasa a ser **obligatorio** (sin `= new Date()`), para que nadie pueda llamarla sin darle la hora explícitamente. Los tests se adaptan.
- [ ] CA3: hay un test automático (por ejemplo `src/__tests__/no-unstable-values.test.ts`) que recorre los `.tsx` de `src/app` y `src/components`. En cada archivo **sin** `"use client"` que contenga `new Date()`, `Date.now()`, `Math.random()` o `randomUUID()`, exige que el mismo archivo importe y llame a `connection()` desde `next/server`. El test falla si se reintroduce el problema: compruébalo temporalmente durante el desarrollo y descríbelo en el informe.
- [ ] CA4: paso manual documentado: con `npm run dev` y sesión iniciada, `/sitios`, `/sitios/<id>` y `/sitios/<id>/auditorias/<auditId>` cargan sin el overlay "Blocking Route". Si no puedes iniciar sesión, explícalo en el informe y documenta en su lugar que `npm run build` y `npm run start` no muestran el aviso en el log.
- [ ] CA5: las cuatro puertas siguen en verde y no se pierde ningún test.

## Reglas especialmente relevantes
D-QA-08, D-QA-06, D-GATE-01…04, D-TEST-05.

## Notas técnicas
- `connection()` hace que el componente se renderice en cada petición. Colócalo dentro del componente que ya está en `<Suspense>` (`SitesContent` y sus equivalentes), no en la página exterior, para no perder el prerenderizado parcial.
- No se permiten dependencias nuevas.
