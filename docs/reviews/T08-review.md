# T08 — Review

| Ronda | Veredicto | Reglas fallidas | Resumen |
|---|---|---|---|
| 1 | PASS | — | Proxy con `PRIVATE_PREFIXES` y ruta normalizada (404 real para rutas desconocidas, `/SITIOS` y `/%73itios` siguen protegidas, guardián sobre `src/app/(app)/`); smoke tests (`npm run test:smoke`) públicos, de autoauditoría y con sesión demo, 12/12 contra `next start`; README completo. 523 tests. |

## Preparación del Orquestador (con OK del humano)
- Proyecto Vercel `site-check-engine` enlazado; variables `NEXT_PUBLIC_*` dadas de alta en producción y preview.
- Usuario demo creado por signup con la anon key; credenciales solo en `.env.local`.
- El humano configuró la Site URL y las Redirect URLs en Supabase.

## Notas
- Tras la ronda, a sugerencia de testing: `src/__smoke__/` añadido a DIRECTRICES §7; nueva regla D-QA-09 (nada importa de `__smoke__` fuera de esa carpeta); email del demo eliminado de la tarea.
- Pendiente: push a `main` (despliegue) con OK del humano y `npm run test:smoke` contra producción.
