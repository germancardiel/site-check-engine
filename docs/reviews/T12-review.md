# T12 — Review

| Ronda | Veredicto | Reglas fallidas | Resumen |
|---|---|---|---|
| 1 | PASS | — | `await connection()` centralizado en `createClient()` de servidor, antes de `cookies()`; tests de orden en `server.test.ts`; guardián ampliado (`serverClientViolation`). 483 tests. |

## Notas
- Origen: regresión de T07 detectada por el humano (Blocking Route en `UserEmail`). `@supabase/auth-js` usa `Date.now()` internamente en `getUser()`.
- D-QA-08 ampliada, también a sugerencia de testing: la sesión cuenta como valor no determinista, la protección está centralizada y se prohíbe usar `createClient()` de servidor en `use cache`, `unstable_cache` o `after()`.
- Mejora menor pendiente (no bloquea): las regex del guardián también detectan coincidencias dentro de comentarios.
- Pendiente: que el humano confirme `/sitios` con sesión en `next dev`.
