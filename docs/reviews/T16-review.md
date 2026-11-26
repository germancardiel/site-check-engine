# T16 — Review

| Ronda | Veredicto | Reglas fallidas | Resumen |
|---|---|---|---|
| 1 | PASS | — | Nueva migración `20261126000000_usage_limits.sql`: `audit_usage` + RPC `start_audit` (15 auditorías/día y espera de 1 min en una sola transacción; la espera no gasta cuota), trigger de 10 sitios con advisory lock, `revoke update` en `audits`. Puertos solo por defecto en `normalizeSiteUrl` y `safeFetch`; `docs[].url` solo `http(s)`. 1038 tests. |

## Pendiente (fuera de alcance)
- La migración no se ha ejecutado contra Postgres (no hay Postgres local). Probarla en staging o con `supabase db reset` antes de producción. **Aplicarla antes o a la vez que el deploy**: el código ya llama a `start_audit`.
- `authenticated` conserva `insert` en `audits`: un usuario puede meter auditorías falsas en su propio historial por PostgREST (no sirve para rastrear webs). Candidata a una tarea futura (insertar desde la propia RPC).
- El comentario de la línea 29 de la migración no es exacto (se crea una fila con `count = 0` también en `quota`/`cooldown`). No afecta a los límites.
