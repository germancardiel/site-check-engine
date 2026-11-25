# T13 — Review

| Ronda | Veredicto | Reglas fallidas | Resumen |
|---|---|---|---|
| 1 | FAIL (testing) + `fix` (finish review de diseño) | D-UX-04 (M): hover del botón primario a 4,43:1 en oscuro; avisos D-QA-04 (m) en `Home` y `ScoreChart` | Rediseño completo: tokens en dos temas, test de contraste, landing con informe de ejemplo, app en filas con medidores y espera de IA con reloj. El finish review pide 8 arreglos de fidelidad (píldoras en móvil, filas de /sitios, glifo "›", exceso de brasa, alineación del 404, mono en frase, copy de checks, email demo). |
| 2 | PASS (testing) + `fix` (finish review: 7/7 arreglos resueltos; quedan R1 y R2) | — | Hover del primario con token `accent-hover` (7,28:1), estados interactivos en `CONTRAST_PAIRS`, arreglos de diseño 1–7, `package.json` renombrado. 630 tests. |

## Notas
- D-UX-04 aclarada: los estados interactivos cuentan. Tarea T13 ampliada: rename de `package.json`; se permite el copy de UI fijado por los contratos.
- Abiertos del finish review, que pasan a T14 porque rehace el detalle de auditoría:
  - R1: datos del fixture de capturas incoherentes entre la lista, el historial y la banda (solo afecta a la evidencia).
  - R2: el primario pendiente o deshabilitado no se distingue a la vista del activo.
- Pendiente del humano: renombrar el email del usuario demo (aún con el nombre antiguo) en Supabase. El control de permisos bloqueó el intento con la API admin.
- DESIGN.md (documentador de impeccable): se genera al cerrar T14.
