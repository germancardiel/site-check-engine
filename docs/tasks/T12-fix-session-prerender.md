# T12 — Corrección: lectura de sesión durante el prerender (Blocking Route en la cabecera)

## Objetivo
Eliminar el error "Route "/sitios": Next.js encountered the unstable value `Date.now()` while prerendering", que aparece en `next dev` con sesión iniciada en todas las rutas de `(app)`, y evitar que vuelva a aparecer cuando se cree un componente nuevo que lea la sesión.

## Contexto
Error que vio el humano (Next 16.4.6):
```
at AppHeader (src/components/layout/app-header.tsx:23:13)   → <UserEmail />
at AppLayout (src/app/(app)/layout.tsx:7:7)
```
Diagnóstico del Orquestador:
- `src/components/layout/user-email.tsx` llama a `createClient()` + `auth.getUser()` sin `await connection()`.
- `@supabase/auth-js` usa `Date.now()` internamente (GoTrueClient, comprobación de expiración de la sesión). Ese `Date.now()` es el que detecta Next.
- `await cookies()` dentro de `createClient()` no basta: en T10 `SitesContent` ya llamaba a `cookies()` y aun así daba el error, hasta que se añadió `connection()`.
- El test guardián de T10 (`src/__tests__/no-unstable-values.test.ts`) solo detecta `new Date()`, `Date.now()` y similares escritos en nuestro código, no los indirectos.
- D-QA-08 se ha ampliado: leer la sesión de Supabase cuenta como valor no determinista.

## Alcance
- Incluye: arreglar `UserEmail` y cualquier otro Server Component que lea la sesión sin `connection()`, centralizar la protección si la API lo permite, y ampliar el test guardián.
- No incluye: cambios visuales ni de comportamiento.

## Criterios de aceptación
- [ ] CA1: ningún Server Component lee la sesión de Supabase sin `await connection()` previo (D-QA-08 ampliada). Opción preferida: llamar a `await connection()` **dentro de `createClient()`** (`src/lib/supabase/server.ts`), antes de `cookies()`, para cubrir a todos los consumidores de una vez. Antes de elegirla, **verifica en `node_modules/next/dist/docs/`** que `connection()` se puede llamar también desde server actions y route handlers (que también usan `createClient()`), sin errores ni cambios de comportamiento. Si no se puede, añade `await connection()` en cada Server Component que lea la sesión y explica por qué en el informe.
- [ ] CA2: se amplía el test guardián (`src/__tests__/no-unstable-values.test.ts`) para que en Server Components (archivos `.tsx` sin `"use client"`) de `src/app` y `src/components`, cualquier uso de `createClient(` de `@/lib/supabase/server` o de `.auth.getUser(` cuente como valor no determinista. Si la protección está centralizada en `createClient()`, el test comprueba en su lugar que `src/lib/supabase/server.ts` llama a `connection()` antes de `cookies()`. Se demuestra que el test falla reintroduciendo temporalmente el problema, y se describe en el informe.
- [ ] CA3: tests de `src/lib/supabase/__tests__/server.test.ts` actualizados (con `next/server` mockeado) para cubrir el orden `connection()` → `cookies()` si se centraliza.
- [ ] CA4: paso manual: con `next build` y `next start`, sin sesión, ninguna ruta muestra en el log avisos "unstable" ni "blocking". Con sesión no se puede comprobar desde aquí; el Orquestador se lo pedirá al humano.
- [ ] CA5: las cuatro puertas en verde y sin perder tests.

## Reglas especialmente relevantes
D-QA-08, D-GATE-01…04, D-TEST-05.

## Notas técnicas
- No se permiten dependencias nuevas.
- `connection()` está en `next/server`.
