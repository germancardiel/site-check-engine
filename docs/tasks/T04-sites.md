# T04 — Sitios: crear, listar, borrar y ejecutar auditorías

## Objetivo
Que un usuario autenticado gestione sus sitios en `/sitios`: añadirlos, verlos con su última nota, borrarlos y lanzar una auditoría que se guarda en `audits` usando el motor de T03.

## Alcance
- Incluye: migración de grants, esquema zod de sitio, server actions (crear, borrar, auditar), la página `/sitios` con lista y formulario, y sus estados vacío, de carga y de error.
- No incluye: detalle de auditoría, historial ni comparación (T05), IA (T06), landing ni pulido visual final (T07), y el endurecimiento contra DNS rebinding (tarea aparte).

## Criterios de aceptación
- [ ] CA1: hay una migración **nueva** `supabase/migrations/<timestamp>_grants.sql`, posterior a `_init.sql`, con `grant select, insert, update, delete on public.sites, public.audits to authenticated;` y sin ningún grant a `anon`. No se modifica `_init.sql` (D-DATA-01).
- [ ] CA2: `src/lib/validation/site.ts` exporta `siteSchema`, que normaliza la URL:
  - Añade `https://` si falta el esquema y solo admite `http`/`https`.
  - Pasa el host a minúsculas, quita el fragmento y la barra final de la raíz, y rechaza URLs con credenciales (`user:pass@`).
  - Acepta un `name` opcional de 80 caracteres como máximo.
  - Los mensajes van en español. Tiene tests de casos válidos, inválidos y de normalización.
- [ ] CA3: la action `createSite` (en `src/app/(app)/sitios/actions.ts`):
  - Valida con zod y comprueba `auth.getUser()`.
  - Inserta el sitio y, si la URL ya existe para ese usuario (violación de `unique`, código `23505`), devuelve "Ya tienes este sitio.".
  - Devuelve errores genéricos y llama a `revalidatePath('/sitios')` al terminar bien.
- [ ] CA4: la action `deleteSite`:
  - Valida el `id` con zod (uuid) y comprueba `auth.getUser()`.
  - Borra filtrando por `id` **y** por `user_id` del usuario. Sus auditorías se borran por la cascada.
  - Pide confirmación en la UI antes de borrar (un diálogo accesible o un segundo paso de confirmación; `window.confirm` no vale).
- [ ] CA5: la action `auditSite`:
  - Valida el `siteId`, comprueba `auth.getUser()` y lee el sitio filtrando por `user_id` (si no existe, da un error genérico).
  - Llama a `runAudit(site.url)` e inserta en `audits` el resultado, tanto si es `ok` como si es `error`: `status`, notas, `checks` y `error`.
  - Limita la frecuencia: si el sitio tiene una auditoría de hace menos de 60 s, devuelve "Espera un minuto antes de volver a auditar este sitio." y no llama a `runAudit`.
  - Al terminar, llama a `revalidatePath('/sitios')`.
- [ ] CA6: `/sitios` lista los sitios del usuario (más recientes primero), seleccionando columnas concretas (D-DATA-02). Cada sitio muestra:
  - El nombre o, si no tiene, el host.
  - La URL.
  - La nota de su última auditoría (total, SEO e IA) y la fecha relativa en español. Si no tiene ninguna, muestra "Sin auditar"; si la última falló, "Error en la última auditoría".
  - Los botones "Auditar" y "Borrar".
  - Sin consultas N+1: como máximo, una consulta de sitios y una de auditorías.
- [ ] CA7: estados:
  - **Vacío:** "Aún no has añadido ningún sitio", con el formulario visible.
  - **Carga:** `loading.tsx` o `<Suspense>` con skeleton.
  - **Error:** `src/app/(app)/sitios/error.tsx` (cliente) con mensaje genérico y botón "Reintentar" (D-UX-01).
- [ ] CA8: el formulario de alta tiene un `<label>` en cada campo y muestra el error con `role="alert"`. "Añadir" y "Auditar" se deshabilitan y muestran progreso mientras corren ("Auditando…"), como pide D-UX-07. Se mantienen el email del usuario y el botón de cerrar sesión de T02.
- [ ] CA9: tests de las actions con Supabase y `runAudit` mockeados:
  - Input inválido: no llama a Supabase.
  - Sin sesión.
  - Duplicado (`23505`).
  - Sitio de otro usuario o inexistente.
  - Límite de 60 s.
  - Auditoría `ok` y auditoría `error`: las dos se insertan.
  - Error de Supabase: mensaje genérico y `console.error`.
  - Éxito: llama a `revalidatePath`.

## Reglas especialmente relevantes
D-SEC-04, D-SEC-06, D-SEC-08, D-DATA-01, D-DATA-02, D-UX-01, D-UX-02, D-UX-05, D-UX-07, D-QA-03, D-QA-06, D-TEST-05.

## Notas técnicas
- El motor ya existe: `runAudit(url)` de `src/lib/audit/index.ts` devuelve `AuditOutcome`, que encaja con la tabla `audits`. Lo que muestra el usuario al fallar es `AUDIT_ERROR_MESSAGES`.
- `runAudit` tarda hasta 10 s. Exporta `maxDuration = 60` en la ruta si hace falta para Vercel.
- Reutiliza `SubmitButton`, `TextField` y `FormFeedback` de `src/components/ui/`. Los componentes de esta feature van en `src/components/sites/`.
- `cacheComponents` sigue activo: los datos del usuario se leen dentro de `<Suspense>`.
- La migración no se aplica en esta tarea. Al cerrarla, el Orquestador pedirá al humano que la ejecute.
- Fechas relativas con `Intl.RelativeTimeFormat('es')`, sin dependencias nuevas.
- No se permiten dependencias nuevas.
