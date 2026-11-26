# T20 — Flujos de auditoría e IA

## Objetivo
Que los flujos principales (añadir sitio → auditar → plan IA) lleven al usuario al resultado, le avisen antes de chocar con un límite y no rompan la página si algo falla. Hallazgos U5–U8, U10–U13, U21 y U25.

## Alcance
- Incluye:
  - **Auditar** (`auditSite`): si la auditoría se guarda (ok o error), redirige a `/sitios/{siteId}/auditorias/{nuevoId}`. Mientras corre, el formulario muestra un bloque de progreso (patrón de `AiProgress`: cronómetro, "Suele tardar entre 10 y 60 segundos", anuncio único con `role="status"`).
  - **Espera de 1 minuto**: la página calcula cuándo vuelve a estar disponible (a partir de `last_audit_started_at`, leído en servidor tras `connection()`) y el botón se desactiva con una cuenta atrás en cliente ("Disponible en 0:42").
  - **Cuota diaria de auditorías** (de T16): se muestra junto al botón ("Te quedan N auditorías hoy") y con 0 el botón se desactiva con el motivo.
  - **Añadir sitio** (`createSite`): redirige a `/sitios/{id}`, cuyo estado vacío ya ofrece "Auditar ahora".
  - **Borrar sitio**: el resultado se anuncia en la lista ("Sitio borrado.") con `role="status"` y el foco pasa al título de la lista.
  - **IA**: la cuota restante se muestra junto a los dos botones (plan y resumen de cambios); con 0 el botón se desactiva con "Has usado las N generaciones de hoy; se renuevan a medianoche (hora de Madrid)", y el error de cuota no ofrece "Reintentar". "Regenerar" indica que sustituye el plan actual y usa 1 generación. Tras generar, el foco va al encabezado del plan o del resumen.
  - **Acciones que no lanzan errores** (D-UX-12): `auditSite`, `generatePlan`, `generateChanges`, `createSite` y `deleteSite` capturan cualquier excepción y devuelven `{ error }` genérico (salvo `redirect()`). En cliente, un fallo de red de la action se muestra como error recuperable en el formulario, no como `error.tsx`.
  - **Comparar**: el formulario muestra estado de carga y conserva la posición (o lleva a `#comparison-title`).
- No incluye: cambios de textos generales ni del informe (T21).

## Criterios de aceptación
- [ ] CA1: `auditSite` con éxito llama a `redirect('/sitios/{siteId}/auditorias/{id}')` con el id insertado (test de la action).
- [ ] CA2: Durante la auditoría se ve el bloque de progreso con la estimación y un único `role="status"` (test de componente).
- [ ] CA3: Con la última auditoría hace 20 s, el botón "Auditar" está desactivado y muestra la cuenta atrás; al llegar a 0 se activa (test con temporizadores falsos).
- [ ] CA4: Con 0 auditorías restantes hoy, el botón está desactivado con el motivo visible (test).
- [ ] CA5: `createSite` con éxito redirige a `/sitios/{id}` (test).
- [ ] CA6: Tras borrar un sitio se anuncia "Sitio borrado." y el foco queda en el título de la lista (test o paso manual documentado).
- [ ] CA7: Con cuota de IA 0, los botones de plan y de resumen están desactivados con el motivo; el error de cuota no muestra "Reintentar" (tests).
- [ ] CA8: El botón "Regenerar" lleva un texto visible que dice que sustituye el plan y usa una generación (test).
- [ ] CA9: Si la llamada al modelo lanza, o si la action falla por red en cliente, el formulario muestra un error recuperable y el informe sigue visible (tests).
- [ ] CA10: Tras generar el plan, el foco pasa a su encabezado (test).
- [ ] CA11: La comparación muestra estado de carga (test).
- [ ] CA12: Las 4 puertas pasan en verde.

## Reglas especialmente relevantes
D-UX-01, D-UX-07, D-UX-10, D-UX-11, D-UX-12, D-AI-03, D-AI-05, D-QA-06, D-QA-08, D-SEC-06, D-SEC-08, D-TEST-05.

## Notas técnicas
- `redirect()` dentro de una action lanza internamente: no lo captures en el `try/catch` (llámalo fuera, o vuelve a lanzar los errores de redirección).
- La hora actual en Server Components solo tras `await connection()` dentro de `<Suspense>` (D-QA-08); la cuenta atrás se calcula en cliente a partir de una marca de tiempo.

## Añadido por el Orquestador tras T19
- Quitar los `aria-live` que acompañan a `role="status"` en `src/components/audits/detail-skeleton.tsx`, `src/components/sites/sites-skeleton.tsx` y `src/components/ai/generate-report-form.tsx` (D-UX-10). Test.
- `readFormValues` (`src/lib/validation/form-state.ts`) recorta cada valor devuelto al cliente a la longitud máxima de su campo (URL 2048, nombre 80, email 254). Test.
