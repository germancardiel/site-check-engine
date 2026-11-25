# T15 — Descargar el Plan de acción en Markdown

## Objetivo
Cuando una auditoría tiene un Plan de acción generado con IA, el usuario puede descargarlo como archivo `.md` para compartirlo o pegarlo en su gestor de tareas.

## Alcance
- Incluye:
  - Función pura `planToMarkdown` en `src/lib/ai/` que convierte el plan guardado (`ActionPlan` validado con `actionPlanSchema`) en Markdown.
  - Botón **"Descargar .md"** en la sección "Plan de acción" (`src/components/ai/plan-section.tsx`), visible solo cuando `report.status === 'ok'`.
  - Descarga en cliente (Blob + enlace temporal), igual que el "Descargar .md" del informe de T14 (`report-view.tsx`); reutiliza su icono y su patrón de descarga. Si hace falta, extrae la utilidad de descarga a un módulo común en vez de duplicarla.
- No incluye:
  - Exportar a PDF, Word u otros formatos.
  - Descargar el resumen de cambios (`kind = 'changes'`).
  - Cambios en el esquema de BD, en el prompt o en el modelo de IA.

## Criterios de aceptación
- [ ] CA1: `planToMarkdown(plan, meta)` devuelve un Markdown con: título `# Plan de acción — <URL del sitio>`, fecha de generación (la de `report.createdAt`, recibida por parámetro; nunca `new Date()` sin argumento, D-QA-08), la nota de la auditoría, el `summary` y una sección por acción en el orden del plan con número (`01`, `02`…), título, impacto, esfuerzo, **Por qué**, **Cómo** y los `checkIds` relacionados (con el título legible del check si existe en los checks de la auditoría).
- [ ] CA2: El texto procedente de la IA no puede romper la estructura del documento: los saltos de línea dentro de un campo no crean encabezados nuevos, y los caracteres que empiezan un encabezado o una lista al principio de una línea (`#`, `-`, `*`, `>`) se escapan. Lo cubren tests.
- [ ] CA3: En la sección "Plan de acción" aparece un botón **"Descargar .md"** (`buttonClass('secondary')`, icono SVG propio con `aria-hidden`; puede ser el `DownloadIcon` de T14) solo cuando existe un plan válido. No aparece con `status` `none` ni `invalid`.
- [ ] CA4: Al pulsarlo se descarga un archivo `plan-de-accion-<dominio>-<AAAA-MM-DD>.md` (dominio sin `www.`, fecha de generación del plan) con tipo `text/markdown;charset=utf-8` y el contenido de `planToMarkdown`. Lo cubre un test de componente (mock de `URL.createObjectURL`).
- [ ] CA5: La parte interactiva vive en un componente cliente pequeño; `plan-section.tsx` sigue siendo Server Component (D-QA-06).
- [ ] CA6: Las 4 puertas (`typecheck`, `lint`, `test`, `build`) pasan en verde.

## Reglas especialmente relevantes
D-GATE-01…04, D-QA-04, D-QA-06, D-QA-08, D-TEST-01, D-TEST-05, D-UX-02, D-UX-03, D-UX-04, D-UX-06.

## Notas técnicas
- Archivos esperados: `src/lib/ai/markdown.ts` + `src/lib/ai/__tests__/markdown.test.ts`, `src/components/ai/download-plan-button.tsx` (cliente), cambio en `src/components/ai/plan-section.tsx` y su test.
- Etiquetas de impacto y esfuerzo iguales a las de la interfaz ("Impacto alto", "Esfuerzo bajo"…); reutiliza las de `action-plan.tsx` si ya existen como constantes.
- Depende de T14 (botón y utilidad de descarga del informe). Se ejecuta después de que T14 esté en verde.
