# T01 — Review

| Ronda | Veredicto | Reglas fallidas | Resumen |
|---|---|---|---|
| 1 | PASS | — | Scaffold Next 16, clientes Supabase (server/client + validación de env), `cn()`, 16 tests. Puertas en verde. |

## Notas
- DIRECTRICES ajustadas tras la ronda 1, a sugerencia de testing (sin cambiar ningún criterio de aceptación):
  - D-SEC-01: el grep excluye `DIRECTRICES.md`, `package-lock.json`, `.next/`, `coverage/`, `.git/` y `.env.local` (ignorado), para que sea determinista.
  - D-QA-07: las dependencias del scaffold de `create-next-app` (p. ej. `@tailwindcss/turbopack`) no requieren justificación.
  - D-TEST-01: los archivos que solo declaran tipos están exentos de test.
- `@types/node` subido a ^24 (vitest 5 lo exige).
- Pendiente para T02: `proxy.ts` para refrescar la sesión; con `cacheComponents`, `cookies()` debe ir dentro de `<Suspense>`.
