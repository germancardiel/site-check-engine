# T04 — Review

| Ronda | Veredicto | Reglas fallidas | Resumen |
|---|---|---|---|
| 1 | PASS | — | Migración de grants a `authenticated`; `siteSchema` con normalización; actions `createSite`, `deleteSite` (confirmación accesible en dos pasos) y `auditSite` (límite de 60 s, guarda auditorías ok y error); `/sitios` con una sola consulta y estados vacío, carga y error. 315 tests. |

## Notas
- D-UX-04 aclarada en DIRECTRICES, a sugerencia de testing: cubre todas las paletas neutras, no solo `gray`.
- Migración `20261125100000_grants.sql` **sin aplicar**: la ejecuta el humano en el SQL Editor.
- El límite de 60 s no es atómico (comprueba y luego inserta). Se propondrá cerrarlo en BD junto con los límites diarios de T06.
