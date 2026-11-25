# T06 — Plan de acción y resumen de cambios con IA, con límites diarios

## Objetivo
Que el usuario, desde el detalle de una auditoría, genere con IA un plan de acción priorizado y un resumen de cambios frente a la auditoría anterior, con un límite diario por usuario aplicado de forma atómica en la base de datos. De paso, el límite de una auditoría por minuto (T04) pasa a ser atómico.

## Alcance
- Incluye: migración nueva (informes de IA, cuota diaria y límite atómico de auditoría), el módulo `src/lib/ai/`, las server actions de generación, la UI en el detalle de auditoría y los tests.
- No incluye: streaming, chat, IA en otras páginas, panel de uso ni ajustes de la cuota por usuario.

## Criterios de aceptación
- [ ] CA1: hay una migración **nueva** `supabase/migrations/<timestamp>_ai.sql`, posterior a `_grants.sql` y sin editar las anteriores (D-DATA-01), que crea:
  - **`public.ai_reports`:** `id uuid pk default gen_random_uuid()`, `audit_id uuid not null references public.audits on delete cascade`, `user_id uuid not null default auth.uid() references auth.users on delete cascade`, `kind text not null check (kind in ('plan','changes'))`, `content jsonb not null`, `model text not null`, `created_at timestamptz not null default now()`, y `unique (audit_id, kind)`.
    - RLS con políticas `select`, `insert`, `update` y `delete` con `user_id = auth.uid()`.
    - El `insert` y el `update` comprueban además en `with check` que la auditoría es del usuario.
    - Índice en `ai_reports(user_id)` (el de `audit_id` lo cubre el `unique`).
  - **`public.ai_usage`:** `user_id uuid not null references auth.users on delete cascade`, `day date not null`, `count int not null default 0 check (count >= 0)`, `refunds int not null default 0 check (refunds >= 0)`, y `primary key (user_id, day)`. RLS con **solo** una política `select` con `user_id = auth.uid()`. El usuario no puede escribir en esta tabla (D-SEC-09).
  - **Función `public.consume_ai_quota(p_limit int) returns int`:** es `security definer` y tiene `set search_path = ''`.
    - Si `auth.uid()` es null, lanza un error.
    - Suma 1 al contador del usuario `auth.uid()` para el día `(now() at time zone 'Europe/Madrid')::date` con un **único** `insert … on conflict (user_id, day) do update set count = ai_usage.count + 1 where ai_usage.count < p_limit returning count`.
    - Devuelve el nuevo contador, o `-1` si ya se había alcanzado el límite.
    - Acota `p_limit` en la función: usa `least(p_limit, 10)` para que un usuario que la llame directamente con un límite enorme no se lo salte.
  - **Función `public.refund_ai_quota() returns void`:** es `security definer` y tiene `set search_path = ''`. Resta 1 al contador del día de `auth.uid()` (sin bajar de 0) y suma 1 a `refunds`, **solo si `refunds < 3`**; si no, no hace nada. Así, aunque un usuario la llame directamente, como mucho consigue 3 generaciones extra al día y el coste sigue acotado.
  - **Columna `public.sites.last_audit_started_at timestamptz`.**
  - **Función `public.claim_audit_slot(p_site_id uuid) returns boolean`:** es `security definer` y tiene `set search_path = ''`. Hace un único `update public.sites set last_audit_started_at = now() where id = p_site_id and user_id = auth.uid() and (last_audit_started_at is null or last_audit_started_at < now() - interval '60 seconds') returning id` y devuelve `true` si actualizó una fila. Usa el `now()` de Postgres.
  - **Grants y revokes:**
    - `select, insert, update, delete` sobre `ai_reports` a `authenticated`.
    - **Solo `select`** sobre `ai_usage` a `authenticated` (`revoke insert, update, delete … from authenticated` explícito).
    - `last_audit_started_at` no es escribible por el usuario ni al crear ni al actualizar: `revoke insert, update on public.sites from authenticated` y después `grant insert (user_id, url, name) on public.sites to authenticated` y `grant update (url, name) on public.sites to authenticated`.
    - `execute` de las tres funciones a `authenticated`, y `revoke execute … from public, anon` en las tres.
    - Ningún grant a `anon`.
- [ ] CA2: **límite de auditoría atómico.** `auditSite` sustituye la comprobación de T04 (consultar y luego insertar) por `rpc('claim_audit_slot', { p_site_id })`. Si devuelve `false`, responde "Espera un minuto antes de volver a auditar este sitio." y no llama a `runAudit`. Si el rpc falla, devuelve un error genérico. Los tests de T04 se adaptan sin perder casos.
- [ ] CA3: `src/lib/ai/schemas.ts` define con zod:
  - **`actionPlanSchema`:**
    - `summary`: string de 1 a 600 caracteres.
    - `actions`: de 3 a 8 elementos, cada uno con `title` (≤ 120), `why`, `how`, `impact` (`'alto'|'medio'|'bajo'`), `effort` (`'bajo'|'medio'|'alto'`) y `checkIds` (string[]).
  - **`changeSummarySchema`:** `summary` (≤ 600) y `highlights` (de 1 a 5 strings).
  - Tiene tests.
- [ ] CA4: `src/lib/ai/prompts.ts` exporta `buildPlanPrompt(audit)` y `buildChangesPrompt(diff, prev, curr)`:
  - Solo incluyen datos de la auditoría: URL, notas, y `id`, título, estado, mensaje y recomendación de los checks; nunca HTML.
  - Instruyen al modelo a responder en español, a priorizar por impacto y esfuerzo y a referenciar los `checkIds` reales.
  - El plan solo envía los checks `fail` y `warn`, ordenados `fail` primero.
  - El resultado completo (system + prompt) mide **8.000 caracteres o menos**. Si se pasa, se eliminan checks del final (los `warn` primero) y se añade una nota "(N checks omitidos)".
  - Hay tests del contenido, de la ausencia de HTML, del truncado con un input enorme y del límite exacto (D-AI-04).
- [ ] CA5: `src/lib/ai/generate.ts` llama al modelo con AI SDK (`ai`) a través de AI Gateway:
  - Usa el string de modelo `'anthropic/claude-haiku-5-5'` (constante `AI_MODEL`), sin SDKs de proveedor (D-AI-01).
  - Usa salida estructurada con el esquema zod correspondiente (D-AI-02), con timeout (`abortSignal`) de 30 s.
  - Exporta `generateActionPlan` y `generateChangeSummary`, que reciben el modelo o la función de generación inyectables para poder testear sin red.
  - Si la salida es inválida o el modelo falla, lanza un error tipado.
- [ ] CA6: las server actions `generatePlan` y `generateChanges` (en `src/app/(app)/sitios/[siteId]/auditorias/[auditId]/actions.ts`) siguen este orden:
  1. Validan los ids con zod y comprueban `auth.getUser()`.
  2. Leen la auditoría filtrando por `user_id`. Solo se aceptan auditorías `ok`; `generateChanges` exige además que haya una auditoría `ok` anterior. Los `checks` se validan con `parseChecks`.
  3. **Antes** de llamar al modelo, llaman a `rpc('consume_ai_quota', { p_limit: AI_DAILY_LIMIT })`, con `AI_DAILY_LIMIT = 10`. Si devuelve `-1`, responden "Has alcanzado el límite diario de generaciones con IA. Vuelve mañana." sin llamar al modelo (D-AI-03).
  4. Generan el contenido y hacen upsert en `ai_reports` (`onConflict: 'audit_id,kind'`) con `content` y `model`.
  5. Llaman a `revalidatePath` del detalle.
  6. Si el modelo o el guardado fallan, llaman a `refund_ai_quota` y devuelven, con `console.error` (D-SEC-08), "No se pudo generar el plan. Inténtalo de nuevo." (`generatePlan`) o "No se pudo generar el resumen. Inténtalo de nuevo." (`generateChanges`).
- [ ] CA7: en el detalle de una auditoría `ok`:
  - **Sección "Plan de acción":**
    - Si ya existe el plan, lo muestra validado con zod al leerlo: resumen y acciones ordenadas por impacto. Cada acción muestra su impacto y esfuerzo como texto (no solo color) y enlaza a los checks referenciados (anclas a los checks de la página).
    - Si no existe, muestra el botón "Generar plan con IA". Si existe, el botón "Regenerar".
  - **Sección "Resumen de cambios con IA":** va dentro de la comparación y solo aparece si hay una auditoría anterior. Tiene botón de generar/regenerar y compara contra la auditoría anterior `ok` por defecto. Si existe `?comparar`, el resumen generado sigue siendo contra la anterior; indícalo en el texto.
  - Los botones se deshabilitan y muestran progreso ("Generando…", D-UX-07).
  - Hay un texto "Te quedan N generaciones hoy", leído de `ai_usage`.
  - Si la IA falla, la auditoría sigue visible, el error aparece en `role="alert"` y el botón permite reintentar (D-AI-05).
  - Las auditorías `error` no muestran estas secciones.
- [ ] CA8: tests (con `ai`/generación y Supabase mockeados, sin red):
  - Input inválido.
  - Sin sesión.
  - Auditoría ajena o `error`.
  - `generateChanges` sin auditoría anterior.
  - **Cuota agotada: no se llama al modelo** (test explícito del orden, D-AI-03).
  - Éxito: upsert y revalidate.
  - Fallo del modelo: refund y mensaje genérico.
  - Salida inválida del modelo: refund.
  - Lectura de un `content` inválido de `ai_reports`: no rompe la página. La lógica va en una función pura testeada.

## Reglas especialmente relevantes
D-AI-01…05, D-SEC-02, D-SEC-04, D-SEC-06, D-SEC-08, D-SEC-09, D-DATA-01, D-DATA-03, D-UX-01, D-UX-07, D-QA-03, D-QA-06, D-QA-07, D-TEST-01, D-TEST-05.

## Notas técnicas
- Dependencia permitida: `ai` (AI SDK 7, del stack). No se permite ninguna otra. En concreto, **ni `@ai-sdk/anthropic` ni `@ai-sdk/gateway` explícito**: con AI SDK 7, el string `'anthropic/claude-haiku-5-5'` se enruta por AI Gateway por defecto.
- **Verifica la API contra la versión instalada** (`node_modules/ai/` y sus tipos `.d.ts`). La salida estructurada debe usar la API vigente de esa versión (p. ej. `generateText` con `output: Output.object({ schema })`). No te fíes de la memoria.
- La clave no se lee en el código: el SDK usa `AI_GATEWAY_API_KEY` en local y OIDC en Vercel. Si falta, el modelo falla, y eso se trata como cualquier otro fallo (refund y mensaje genérico).
- `AI_DAILY_LIMIT` y `AI_MODEL` van en `src/lib/ai/config.ts`.
- Añade a `src/lib/supabase/types.ts` las tablas nuevas, la columna `last_audit_started_at` y las funciones (`Functions`).
- La migración no se aplica en esta tarea. La ejecutará el humano al cerrarla.
- Los componentes van en `src/components/ai/`. Las server actions exportan `maxDuration = 60` en la ruta si hace falta.
