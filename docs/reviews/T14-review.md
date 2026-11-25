# T14 — Review

## Ronda 1 — FAIL
- Reglas fallidas: D-UX-04 (×2), D-QA-08; avisos D-QA-04 (×1), D-QA-05 (×2).
- Puertas en verde (996 tests, cobertura audit 99,8 %). CA1–4 y CA6–12 OK; CA5 falla por contraste.
- Fallos: opacidad en Anterior/Siguiente deshabilitados (3,36:1 en claro); `text-fail` sobre `bg-panel` en oscuro (4,29:1) en report-view y category-accordion; `Date.now()` en `src/lib/audit/context.ts` (probeTls).
- Avisos: `SiteList` de 65 líneas; `categoryScore` y `defaultProbeBots` sin uso.
- Cambio en DIRECTRICES: la verificación de D-QA-08 ahora busca también `Date.now()` en `src/lib`.
- Nota de proceso: testing creó y borró un archivo de prueba temporal; no quedó en el árbol.

## Ronda 2 — PASS
- Reglas fallidas: ninguna. 1003 tests, 4 puertas en verde, cobertura audit 99,83 %.
- Arreglo: `fail` oscuro a #F06064 y pares de estado sobre `panel` registrados en `CONTRAST_PAIRS`; botones secundarios deshabilitados con `disabled:text-ink-muted` sin opacidad; `probeTls`/`daysUntil` reciben `now` (`FetchDeps.now`); `SiteList` dividido; borrado código muerto (`categoryScore`, `defaultProbeBots`, `closedDetailsAround`); `bindAnchorReveal` con tests para `#check-<id>`.
- Pendiente para tareas futuras: `ai.waf` queda en `na` en producción (falta `probeBots` con user-agent configurable); valorar `now` obligatorio en `runAudit` para que la sonda TLS no se salte en silencio.
- Nota de proceso: develop detectó escrituras de otro proceso en el working tree durante la ronda; las revisó e incluyó.
