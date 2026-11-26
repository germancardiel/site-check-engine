# T21 — Review

| Ronda | Veredicto | Reglas fallidas | Resumen |
|---|---|---|---|
| 1 | PASS | — | Saltos con foco y respeto de `reduced-motion`; contador con nombre accesible; evidencias con icono y texto; "Falla", "comprobaciones", "Sin datos", "Puntuación"; descargas con nombres distintos; `RouteError` con enlace para volver y títulos descriptivos; `generateMetadata` con nombre del sitio y fecha; anuncio de resultados de búsqueda; acordeón con `hidden`; objetivos táctiles ≥ 40 px; deshabilitados con opacidad 0,8 (contraste ≥ 4,5:1 en los dos temas); "Entrar" en la landing; índice del informe. 1281 tests. |

## Pendientes menores (seguimiento)
- Siguen dos textos con "nota": `audit-site-form.tsx:21` ("Calculando la nota") y `closing-cta.tsx:15` ("tu primera nota"). Ningún CA los cubría.
- El botón `quiet` deshabilitado no se atenúa (excepción por contraste; solo cursor y sin subrayado).
- `generateMetadata` repite la lectura de sesión y de BD: valorar `React.cache`.
