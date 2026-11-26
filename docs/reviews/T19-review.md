# T19 — Review

| Ronda | Veredicto | Reglas fallidas | Resumen |
|---|---|---|---|
| 1 | PASS | — | Utilidad común `form-state.ts` (`fieldErrors`/`values`), `TextField` con `error`/`aria-invalid`/`aria-describedby` combinado, foco al primer error (`form-focus.ts` + hook), `FormFeedback` sin `aria-live` duplicado, `PasswordField` con Mostrar/Ocultar, pista "Entre 8 y 72 caracteres.". 1171 tests. |

## Pendientes
- El cableado de React (el `useEffect` del foco, el `useState` de `PasswordField` y el reinicio con `key`) se cubre con pasos manuales: no hay DOM en los tests (instalar `jsdom` requiere aprobación del humano).
- Pasan a T20: los `aria-live` que siguen junto a `role="status"` (`detail-skeleton.tsx`, `sites-skeleton.tsx`, `generate-report-form.tsx`) y el recorte de longitud de los `values` devueltos (`readFormValues`).
