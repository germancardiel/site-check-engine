# T10 — Review

| Ronda | Veredicto | Reglas fallidas | Resumen |
|---|---|---|---|
| 1 | PASS | — | `await connection()` en `SitesContent`, `SiteContent` y `AuditContent` (dentro de `<Suspense>`); `formatRelativeTime` con `now` obligatorio (aparece un 4.º uso oculto, corregido); test guardián `no-unstable-values.test.ts`. 434 tests. |

## Notas
- Origen: error "Blocking Route" (Next 16, `cacheComponents`) que vio el humano en `/sitios` con sesión. Ni el build ni los tests lo detectaban.
- Nueva regla D-QA-08, ampliada tras la sugerencia de testing: sin `= new Date()` por defecto en `src/lib`.
- Pendiente: que el humano confirme en `next dev`, con sesión, que el overlay ha desaparecido.
- 2026-11-25: el humano confirma en `next dev`, con sesión, que `/sitios` carga, que añade un sitio y que la auditoría funciona (95/100). Antes salió una vez "An unexpected response was received from the server" al añadir un sitio, que no se repitió. Seguramente era una página abierta con IDs de server action anteriores al reinicio del dev server. Si vuelve a pasar, se pide el log.
