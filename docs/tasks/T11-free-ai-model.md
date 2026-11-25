# T11 — Cambiar el modelo de IA al plan gratuito (`recursive/flint-v1.0`)

## Objetivo
Que la generación del plan y del resumen de cambios funcione con la cuenta gratuita de AI Gateway del humano. El modelo `anthropic/claude-haiku-5-5` devuelve 403: "Free tier users do not have access to this model".

## Contexto (pruebas del Orquestador del 2026-11-25, con la clave real)
- Hay 3 modelos gratuitos con `structured-output`. Se probaron con un esquema equivalente a `actionPlanSchema`:
  - `recursive/flint-v1.0`: **3 de 3 OK**, de 43 a 59 s.
  - `nvidia/nemotron-3.5-lightning-free`: 3 de 3 fallan con `AI_NoObjectGeneratedError`, porque no respeta el esquema.
  - `reflection/beam-free`: 403, no disponible en el plan gratuito.
- El humano aprobó el cambio de stack. `CLAUDE.md` §2 ya está actualizado.
- Flint es un modelo de razonamiento, así que es lento: el timeout de 30 s y el `maxDuration = 60` actuales no le bastan.

## Alcance
- Incluye: cambiar el modelo, ajustar timeouts y duración máxima, adaptar la UI a la espera más larga y actualizar los tests.
- No incluye: cambiar los esquemas, los prompts, la cuota ni la lógica de refund.

## Criterios de aceptación
- [ ] CA1: `AI_MODEL` (`src/lib/ai/config.ts`) vale `'recursive/flint-v1.0'`. No queda ninguna referencia a `claude-haiku` en `src/` (tests incluidos), salvo los datos históricos de fixtures si los hay, y en ese caso se explica en el informe.
- [ ] CA2: `AI_TIMEOUT_MS` sube a `120_000`. La ruta del detalle de auditoría (`src/app/(app)/sitios/[siteId]/auditorias/[auditId]/page.tsx`), que es la que ejecuta las server actions de IA, exporta `maxDuration = 150`, por encima del timeout del modelo para que el refund pueda ejecutarse. Las demás rutas no cambian.
- [ ] CA3: mientras se genera, el botón sigue deshabilitado con "Generando…" (D-UX-07) y además aparece un texto visible (`aria-live="polite"`, por ejemplo con `role="status"`): "Esto puede tardar hasta un minuto." Lo cubre un paso manual o una función pura testeada.
- [ ] CA4: los tests existentes siguen pasando con el modelo nuevo. El test "usa por defecto el modelo …" comprueba `'recursive/flint-v1.0'` y el timeout de 120 s.
- [ ] CA5: el resto de D-AI-01…05 se sigue cumpliendo: el modelo es un string `"proveedor/modelo"` y no hay SDKs de proveedor.

## Reglas especialmente relevantes
D-AI-01, D-AI-02, D-AI-05, D-UX-07, D-GATE-01…04, D-TEST-05.

## Notas técnicas
- No se permiten dependencias nuevas.
- No hace falta migración.
- En `ai_reports.model` se guarda `AI_MODEL`, así que los planes nuevos quedarán registrados con `recursive/flint-v1.0`.
