# T21 — Pulido de textos y accesibilidad

## Objetivo
Quitar jerga, aclarar estados y cerrar los detalles de accesibilidad pendientes del informe. Hallazgos U15–U20, U22, U23, U26–U29, U31 y U32.

## Alcance
- Incluye:
  - Saltos a secciones del informe: mueven el foco al destino (`tabIndex={-1}`) y usan `behavior: 'auto'` con `prefers-reduced-motion: reduce`.
  - Contador de la rejilla de categorías con texto accesible ("3 aspectos a mejorar").
  - Evidencias ok/bad con `StatusIcon` y texto sr-only, no solo con el color.
  - Estado `fail` de un check: "Falla" (no "Error"); "Error" solo para auditorías fallidas y `error` → "No evaluable".
  - Textos: "checks" → "comprobaciones" en toda la interfaz; "N/A" → "Sin datos"; "Descargar informe (Markdown)" y "Descargar plan (Markdown)"; una sola palabra para la nota total ("Puntuación"); una ayuda breve que explique la puntuación "IA" ("visibilidad para asistentes de IA").
  - `RouteError`: título descriptivo y enlace secundario "Volver a tus sitios" (o "Ir al inicio" en el error global).
  - `generateMetadata` en el detalle de sitio y de auditoría con el nombre del sitio (y la fecha en la auditoría).
  - Búsqueda y paginación de sitios: línea `role="status"` con "N sitios encontrados".
  - Acordeón: el panel se renderiza siempre y se oculta con `hidden`, para que `aria-controls` apunte a un elemento existente.
  - Objetivos táctiles ≥ 40 px en el cambio de tema, "Salir", "Expandir/Colapsar todo", "Historial y evolución" y los enlaces de documentación.
  - Botones desactivados visualmente distintos (opacidad y cursor), manteniendo el contraste de D-UX-04 si muestran texto.
  - "Entrar" en la cabecera de la landing.
  - Índice del informe (Resumen · Aspectos · Plan de acción · Comparación) al principio del detalle de auditoría, con enlaces a anclas.
- No incluye: cambios de flujo o de datos.

## Criterios de aceptación
- [ ] CA1: Al saltar a una sección, `document.activeElement` es el destino y con `reduced-motion` se usa `behavior: 'auto'` (tests).
- [ ] CA2: El contador de la rejilla tiene un nombre accesible que incluye "aspectos a mejorar" (test).
- [ ] CA3: Cada evidencia ok/bad tiene icono y texto sr-only (test).
- [ ] CA4: `grep -rniE "\bchecks?\b" src/components src/app --include=*.tsx` no encuentra la palabra en textos visibles (sí en identificadores); "N/A" no aparece en textos; los dos botones de descarga tienen textos distintos (test).
- [ ] CA5: Un check `fail` muestra "Falla" (test de `present.ts`).
- [ ] CA6: `RouteError` muestra un enlace para volver (test).
- [ ] CA7: El título de la pestaña del detalle de sitio y de auditoría incluye el nombre del sitio (test de `generateMetadata` o paso manual).
- [ ] CA8: La búsqueda de sitios anuncia el número de resultados (test).
- [ ] CA9: Con un panel cerrado, el elemento de `aria-controls` existe y tiene `hidden` (test).
- [ ] CA10: Los controles listados tienen `min-h-10` o mayor (revisión + test de clase si es viable).
- [ ] CA11: La cabecera de la landing tiene "Entrar" (o "Ir a mis sitios" con sesión) (test).
- [ ] CA12: El detalle de auditoría tiene un índice con enlaces a las secciones existentes (test).
- [ ] CA13: El test de contraste y las 4 puertas pasan en verde.

## Reglas especialmente relevantes
D-UX-02…06, D-UX-10, D-QA-04, D-QA-06, D-QA-08, D-TEST-05.

## Notas técnicas
- Reutiliza `StatusIcon`, `buttonClass`, `checkAnchorId` y los helpers de `src/lib/anchor.ts`.
- El índice del informe es un Server Component; los enlaces son anclas normales.

## Añadido por el Orquestador tras T20
- En `src/app/(app)/sitios/[siteId]/auditorias/[auditId]/__tests__/actions-plan.test.ts:111`, el caso `generateChanges` del describe.each debe comprobar que no se llama a `generateChangeSummary` (hoy comprueba `generateActionPlan`).
