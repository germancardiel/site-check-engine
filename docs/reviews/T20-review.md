# T20 — Review

| Ronda | Veredicto | Reglas fallidas | Resumen |
|---|---|---|---|
| 1 | PASS | — | Auditar y crear sitio redirigen al resultado; progreso de la auditoría (`ProgressPanel`, sustituye a `AiProgress`); cuenta atrás de la espera y cuota de auditorías/IA visibles con botones desactivados y motivo; aviso al regenerar; `runSafely`/`withNetworkFallback` (las actions nunca lanzan, `redirect` respetado); anuncio y foco tras borrar y generar; comparación con estado de carga y `scroll={false}`; sin `aria-live` duplicado; `readFormValues` recorta. 1242 tests. |

## Pendientes menores
- `actions-plan.test.ts:111`: para `generateChanges`, el describe.each comprueba `generateActionPlan` en vez de `generateChangeSummary`. Es inocuo; se corrige en T21.
- El hook `useCountdown` y el foco real se comprueban a mano (no hay DOM en los tests).
