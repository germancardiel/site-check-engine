# T11 — Review

| Ronda | Veredicto | Reglas fallidas | Resumen |
|---|---|---|---|
| 1 | PASS | — | `AI_MODEL = 'recursive/flint-v1.0'`, `AI_TIMEOUT_MS = 120_000`, `maxDuration = 150` en el detalle de auditoría y aviso "Esto puede tardar hasta un minuto." en `role="status"`. 435 tests. |

## Notas
- Origen: 403 "Free tier users do not have access to this model" con `anthropic/claude-haiku-5-5`. El humano aprobó cambiar el stack a un modelo gratuito.
- Pruebas reales del Orquestador: flint 3/3 OK (43–59 s); nemotron-free 0/3 (no respeta el esquema); beam-free 403.
- Para T08: confirmar que el plan de Vercel admite `maxDuration = 150`.
- Para T07: valorar tests de componentes (exigiría jsdom/testing-library, una dependencia nueva que habría que justificar).
