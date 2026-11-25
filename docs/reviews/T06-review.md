# T06 — Review

| Ronda | Veredicto | Reglas fallidas | Resumen |
|---|---|---|---|
| 1 | FAIL | D-SEC-09 (B); aviso D-QA-04 (m) | `authenticated` conservaba `insert` a nivel de tabla sobre `sites` (grant de T04), así que podía escribir `last_audit_started_at` al crear un sitio. Arreglo pedido: `revoke insert` + `grant insert (user_id, url, name)`. |
| 2 | PASS | — | `revoke insert, update` + `grant insert (user_id, url, name)` / `update (url, name)` sobre `sites`; tests de `/sitios` partidos en `harness.ts`, `actions.test.ts` y `audit-site.test.ts` (D-QA-04 resuelto). 427 tests. |

## Corrección de criterios (antes de la ronda 1 de testing)
- **Motivo:** develop detectó que los CA1 y CA2 originales permitían al usuario saltarse sus límites desde PostgREST: grants de `insert`/`update` sobre `ai_usage`, `refund_ai_quota()` ilimitado y `update` sobre `sites.last_audit_started_at`. Era un error del criterio, no de la implementación.
- **Cambios:**
  - Nueva regla D-SEC-09 en DIRECTRICES.
  - CA1: `ai_usage` solo de lectura; funciones `security definer`; `consume_ai_quota` acotada a 10; `refund_ai_quota` limitada a 3 por día; nueva `claim_audit_slot` con `now()` de Postgres; `update` de `sites` solo en `(url, name)`.
  - CA2: el límite de auditoría pasa a hacerse con `rpc('claim_audit_slot')`.
  - CA6: mensaje propio para `generateChanges`.
- Se devuelve a develop para que adapte la entrega y después se revisa con testing.

## Aclaración de criterio tras la ronda 1
- CA1 nombra ahora de forma explícita el `revoke insert` y el `grant insert (user_id, url, name)` sobre `sites`. No se relaja ningún criterio.
- Pendiente antes de T08: probar con clave real que el Gateway acepta el JSON Schema de salida estructurada.
- Migración `20261125200000_ai.sql` **sin aplicar**: la ejecuta el humano. Hasta entonces, `auditSite` falla, porque `claim_audit_slot` todavía no existe.
- Sugerencia de testing descartada: no hace falta una regla de `revoke … from anon`, porque el proyecto no concede privilegios por defecto a `anon` (comprobado con 42501).
- 2026-11-25: el humano aplicó `20261125200000_ai.sql`. Comprobado desde fuera: las 3 funciones existen y devuelven 42501 a `anon`; `ai_reports` y `ai_usage` también devuelven 42501 a `anon`.
