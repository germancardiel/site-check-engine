# T02 — Review

| Ronda | Veredicto | Reglas fallidas | Resumen |
|---|---|---|---|
| 1 | PASS | — | Migración `sites`/`audits` con RLS e índices, tipos `Database`, esquemas zod de auth, login/registro/logout, `proxy.ts` con guardia que bloquea por defecto. 58 tests. |

## Notas
- D-SEC-06 aclarada en DIRECTRICES, a sugerencia de testing: las actions de login y registro están exentas de `getUser()`.
- Para T04: `/sitios` necesita `error.tsx` (D-UX-01).
- Rutas públicas: hay que añadirlas a `PUBLIC_PATHS` en `src/lib/supabase/proxy.ts`. Lo demás es privado por defecto.
- Migración `20261125000000_init.sql` **sin aplicar** en remoto: pendiente de confirmación humana.
- `.env.local` sin `NEXT_PUBLIC_SUPABASE_ANON_KEY`: sin ella el proxy devuelve 500 en todas las rutas.
- 2026-11-25: el humano aplicó la migración. El registro queda abierto, sin confirmación por email. El rol `anon` recibe `42501 permission denied`, así que el proyecto no da grants por defecto. **T04 debe incluir una migración nueva con los `grant select, insert, update, delete` a `authenticated` sobre `sites` y `audits`.**
