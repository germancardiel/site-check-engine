# T16 — Límites de uso y endurecimiento de datos

## Objetivo
Impedir que una cuenta use el servidor como rastreador ilimitado y cerrar dos huecos menores de datos (puertos arbitrarios y `href` sin validar). Hallazgos S1, S4 y S5 de `docs/audits/2026-11-26-usabilidad-seguridad.md`.

## Alcance
- Incluye:
  - Nueva migración (sin tocar las aplicadas, D-DATA-01):
    - Cuota diaria de **15 auditorías por usuario** (día de Europe/Madrid) consumida de forma atómica en la BD, en la misma llamada que reclama el hueco de 1 minuto por sitio (o en una RPC nueva que haga las dos cosas). Una auditoría rechazada por la espera de 1 minuto no gasta cuota. Contador no modificable por el usuario (D-SEC-09).
    - Tope de **10 sitios por usuario** aplicado en la BD (trigger `before insert` o política `with check`), atómico frente a inserciones concurrentes.
    - `revoke update on public.audits from authenticated` (el código nunca actualiza auditorías).
  - `auditSite` y `createSite` muestran mensajes claros al llegar a cada límite.
  - Solo puertos por defecto: `normalizeSiteUrl` rechaza URLs con puerto distinto de 80/443 (`http://x:80` y `https://x:443` se normalizan sin puerto) y `safeFetch` rechaza cualquier salto (incluidas redirecciones) a un puerto no por defecto con `BLOCKED_HOST` (D-SEC-11).
  - `docLinkSchema.url` solo acepta `http:`/`https:`; un enlace no válido se descarta (no invalida la auditoría entera) (D-SEC-12).
  - Regenerar `src/lib/supabase/types.ts` (o editarlo a mano de forma coherente) con las funciones o tablas nuevas.
- No incluye:
  - Aplicar la migración en el Supabase de producción (lo confirma el humano después).
  - Mostrar la cuota de auditorías en la interfaz antes de hacer clic (va en T20).
  - Límites del login o del registro (Supabase Auth).

## Criterios de aceptación
- [ ] CA1: La migración crea la cuota diaria de auditorías con una función `security definer`, `set search_path = ''`, `auth.uid()` y `now()` de Postgres; `authenticated` no tiene `insert`/`update` sobre el contador; la función no admite un límite mayor de 15 aunque se le pase otro valor.
- [ ] CA2: La auditoría número 16 del día se rechaza con "Has alcanzado el límite de 15 auditorías por hoy. Vuelve mañana." y no llama al motor (`runAudit`). Lo cubre un test de la action.
- [ ] CA3: Si la espera de 1 minuto rechaza la auditoría, no se consume cuota (lógica en SQL; documentada en el informe con la lectura de la función).
- [ ] CA4: Borrar y volver a crear un sitio no reinicia la cuota diaria (el contador es por usuario, no por sitio).
- [ ] CA5: Con 10 sitios, crear el 11.º falla en la BD y `createSite` devuelve "Has llegado al máximo de 10 sitios. Borra uno para añadir otro." (test de la action con el código de error que eleve la migración).
- [ ] CA6: `authenticated` ya no tiene `update` sobre `public.audits`.
- [ ] CA7: `normalizeSiteUrl('https://ejemplo.com:22')` y `'http://ejemplo.com:8080'` devuelven error; `'https://ejemplo.com:443'` se normaliza a `https://ejemplo.com`. Tests en `site.test.ts`.
- [ ] CA8: `safeFetch` rechaza con `BLOCKED_HOST` una URL inicial o una redirección a un puerto no por defecto, sin abrir el socket. Tests en `fetcher.test.ts`.
- [ ] CA9: `parseChecks` descarta los `docs` cuya `url` no sea `http:`/`https:` (`javascript:alert(1)`, `data:…`) y conserva el resto de la auditoría. Test en `audit.test.ts`.
- [ ] CA10: Las 4 puertas (`typecheck`, `lint`, `test`, `build`) pasan en verde y los tests existentes siguen pasando.

## Reglas especialmente relevantes
D-SEC-02, D-SEC-04, D-SEC-05, D-SEC-06, D-SEC-08, D-SEC-09, D-SEC-10, D-SEC-11, D-SEC-12, D-DATA-01, D-TEST-01, D-TEST-04, D-TEST-05, D-QA-04.

## Notas técnicas
- Archivo esperado: `supabase/migrations/20261126000000_usage_limits.sql`. Sigue el patrón de `consume_ai_quota` (`20261125200000_ai.sql`): tabla `audit_usage (user_id, day, count)` o columna en una tabla propia, con `revoke`/`grant` explícitos y `revoke execute … from public, anon`.
- Para el tope de sitios, un trigger con `pg_advisory_xact_lock(hashtext(user_id::text))` o un `select … for update` evita la carrera; eleva un error con `errcode` propio (p. ej. `P0001` y un mensaje reconocible) para mapearlo en `createSite`.
- Constantes en un solo sitio (p. ej. `src/lib/limits.ts`: `MAX_SITES = 10`, `AUDIT_DAILY_LIMIT = 15`) usadas por las actions y los mensajes; la BD tiene sus propios topes fijos.
- Los tests de las actions usan los harness existentes (`src/app/(app)/sitios/__tests__/harness.ts`).
