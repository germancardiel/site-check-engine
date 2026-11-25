# T02 — Esquema de BD, RLS y autenticación

## Objetivo
Crear las tablas `sites` y `audits` con RLS por usuario y un flujo de autenticación completo (registro, login, logout) con email y contraseña, que proteja la zona privada de la app.

## Alcance
- Incluye: migración SQL inicial, tipos `Database` escritos a mano, esquemas zod de auth, páginas `(auth)/login` y `(auth)/registro`, server actions de auth, `proxy.ts` para refrescar la sesión y proteger rutas, y una página privada `(app)/sitios` provisional.
- No incluye: CRUD de sitios ni auditorías (T04), tablas de IA y límites diarios (T06), recuperación de contraseña, OAuth, diseño final (T07). Tampoco **aplicar** la migración al proyecto remoto de Supabase: eso lo hace el Orquestador con confirmación humana.

## Criterios de aceptación
- [ ] CA1: existe `supabase/migrations/<timestamp>_init.sql` (formato `YYYYMMDDHHMMSS_init.sql`) que crea:
  - `public.sites`: `id uuid pk default gen_random_uuid()`, `user_id uuid not null references auth.users on delete cascade default auth.uid()`, `url text not null`, `name text`, `created_at timestamptz not null default now()`, y `unique (user_id, url)`.
  - `public.audits`: `id uuid pk default gen_random_uuid()`, `site_id uuid not null references public.sites on delete cascade`, `user_id uuid not null references auth.users on delete cascade default auth.uid()`, `status text not null check (status in ('ok','error'))`, `score int check (score between 0 and 100)`, `seo_score int check (seo_score between 0 and 100)`, `ai_score int check (ai_score between 0 and 100)`, `checks jsonb not null default '[]'`, `error text`, `created_at timestamptz not null default now()`.
- [ ] CA2: ambas tablas tienen `enable row level security` y políticas separadas de `select`, `insert`, `update` y `delete` para el rol `authenticated` con `user_id = auth.uid()` (en `using` y/o `with check`, según corresponda). El `insert` de `audits` comprueba además, en `with check`, que el `site_id` pertenece al usuario.
- [ ] CA3: índices en `sites(user_id)`, `audits(user_id)` y `audits(site_id, created_at desc)`.
- [ ] CA4: `src/lib/supabase/types.ts` define `Database` con las filas `Row`/`Insert`/`Update` de `sites` y `audits`, coherentes con la migración, y los clientes de `server.ts` y `client.ts` están tipados con él.
- [ ] CA5: `src/lib/validation/auth.ts` exporta los esquemas zod de login y registro (email válido; contraseña de 8 caracteres o más en el registro), con mensajes en español y tests que cubren casos válidos e inválidos.
- [ ] CA6: `/registro` y `/login` muestran formularios accesibles (con `<label>`, el botón deshabilitado mientras se envía y el error visible). Sus server actions validan con zod antes de llamar a Supabase y devuelven errores genéricos en español. Tras el registro: si hay sesión, redirige a `/sitios`; si Supabase exige confirmar el email, muestra "Revisa tu correo para confirmar la cuenta".
- [ ] CA7: hay una acción de logout que cierra la sesión y redirige a `/login`.
- [ ] CA8: `src/proxy.ts` refresca la sesión de Supabase en cada petición y redirige a `/login` a un usuario sin sesión que entra en `/sitios` (y en cualquier ruta bajo `(app)`). Al usuario con sesión que entra en `/login` o `/registro` lo redirige a `/sitios`. Lo cubre un test con Supabase mockeado.
- [ ] CA9: `(app)/sitios/page.tsx` es provisional: muestra el email del usuario (obtenido con `auth.getUser()` en el servidor) y el botón de cerrar sesión.
- [ ] CA10: los tests de las server actions de auth (con Supabase mockeado) cubren: input inválido (no se llama a Supabase), error de Supabase (mensaje genérico) y éxito (redirección).

## Reglas especialmente relevantes
D-SEC-02, D-SEC-04, D-SEC-06, D-SEC-08, D-DATA-01, D-DATA-03, D-QA-03, D-QA-06, D-UX-02, D-UX-07, D-TEST-01, D-TEST-05.

## Notas técnicas
- Estructura: `src/app/(auth)/login/`, `src/app/(auth)/registro/`, `src/app/(app)/sitios/`, cada una con su `actions.ts` si la necesita; formularios en `src/components/auth/`.
- Next 16: el middleware se llama `proxy.ts` (`export function proxy`). Consulta `node_modules/next/dist/docs/` antes de escribirlo.
- `next.config.ts` tiene `cacheComponents: true`. Cualquier uso de `cookies()`/`auth.getUser()` en una página debe ir dentro de `<Suspense>` o el build fallará. No desactives `cacheComponents`.
- El cliente de servidor de T01 ignora el `set` de cookies en Server Components. El refresco real lo hace `proxy.ts` con `createServerClient` sobre `request`/`response`.
- Usa `auth.getUser()` (nunca `getSession()`) para decidir el acceso.
- La migración no se aplica en esta tarea. Testing la verifica leyendo el SQL. No hace falta instalar la CLI de Supabase.
- No se permiten dependencias nuevas.
