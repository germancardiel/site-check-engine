# T19 — Formularios accesibles

## Objetivo
Que los formularios no borren lo escrito al fallar y que cada error se asocie a su campo, con foco y anuncios correctos. Hallazgos U1, U9, U24 y U30.

## Alcance
- Incluye: todos los formularios con campos de texto (login, registro, recuperar, nueva contraseña, añadir sitio y la búsqueda de sitios si aplica).
  - Los estados de las actions (`AuthFormState`, `SiteActionState`…) admiten `values` (campos no sensibles) y `fieldErrors` (`Partial<Record<campo, string>>`), con todos los errores de zod, no solo el primero.
  - `TextField` acepta `error?: string`: pinta `<p id="{id}-error">` junto al campo, pone `aria-invalid="true"` y combina en `aria-describedby` la pista, el error y el `aria-describedby` recibido (sin pisarse).
  - Los formularios pasan `defaultValue={state.values?.campo}` (nunca la contraseña) y usan `key` para que React aplique el valor tras el reinicio.
  - Tras un error, el foco va al primer campo con error; si el error es general (no de campo), al mensaje.
  - `FormFeedback`: `role="alert"` para errores y `role="status"` para éxitos, sin `aria-live` duplicado.
  - Contraseña: botón "Mostrar/Ocultar" accesible (`aria-pressed` o `aria-label` cambiante, objetivo táctil ≥ 40 px) y la pista del registro indica mínimo y máximo ("Entre 8 y 72 caracteres.").
- No incluye: cambios de flujo (redirecciones tras crear sitio, etc.; van en T20).

## Criterios de aceptación
- [ ] CA1: En login, un error del servidor conserva el email y vacía la contraseña (test de componente con la action simulada).
- [ ] CA2: En registro y en añadir sitio, un error conserva los campos no sensibles (tests).
- [ ] CA3: Con un email inválido y una contraseña corta en registro, cada campo muestra su error, tiene `aria-invalid="true"` y su `aria-describedby` incluye el id del error y el de la pista (tests).
- [ ] CA4: Tras un error de campo, `document.activeElement` es el primer campo con error (test).
- [ ] CA5: `FormFeedback` no tiene `role="alert"` y `aria-live` a la vez; los éxitos usan `role="status"` (test).
- [ ] CA6: El botón de mostrar contraseña cambia el `type` entre `password` y `text` y su estado es accesible (test).
- [ ] CA7: Las 4 puertas pasan en verde; los tests existentes de formularios siguen pasando (se adaptan, no se borran).

## Reglas especialmente relevantes
D-UX-02, D-UX-03, D-UX-04, D-UX-08, D-UX-09, D-UX-10, D-SEC-04, D-SEC-08, D-QA-04, D-QA-06, D-TEST-05.

## Notas técnicas
- Una utilidad común en `src/lib/validation/` para convertir un `ZodError` en `fieldErrors` (con tests), reutilizada por todas las actions.
