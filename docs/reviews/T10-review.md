# T10 — Review

| Ronda | Veredicto | Reglas fallidas | Resumen |
|---|---|---|---|
| 1 | PASS | — | `await connection()` en `SitesContent`, `SiteContent` y `AuditContent` (dentro de `<Suspense>`); `formatRelativeTime` con `now` obligatorio (aparece un 4.º uso oculto, corregido); test guardián `no-unstable-values.test.ts`. 434 tests. |

## Notas
- Origen: error "Blocking Route" (Next 16, `cacheComponents`) que vio el humano en `/sitios` con sesión. Ni el build ni los tests lo detectaban.
- Nueva regla D-QA-08, ampliada tras la sugerencia de testing: sin `= new Date()` por defecto en `src/lib`.
- Pendiente: que el humano confirme en `next dev`, con sesión, que el overlay ha desaparecido.
