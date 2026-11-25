# T07 — Review

| Ronda | Veredicto | Reglas fallidas | Resumen |
|---|---|---|---|
| 1 | PASS | — | Landing con catálogo de checks derivado del motor, que se audita a sí misma (todo `pass` salvo `https` en local); robots, sitemap, llms.txt, OG image y JSON-LD; cabecera privada; not-found y error globales; skip link; apertura de `<details>` por ancla; revisión a 360 px. 477 tests, cobertura de `src/lib` del 99,69 %. |

## Notas
- CA1 redactado de nuevo tras la ronda, a sugerencia de testing: "estática salvo el hueco de los CTA". Ya era el comportamiento pedido por CA7; no cambia lo exigido.
- Para T08:
  - Smoke test sobre `next start` (o sobre producción) que pase el motor por la landing real, porque el test de CA2 monta el `<head>` a partir de `metadata`.
  - Valorar que una URL inexistente sin sesión devuelva 404 en lugar de 307 a `/login`; un crawler vería redirecciones en vez de 404.
- Mejora futura (no bloquea): deduplicar `getUser` por petición con `React.cache`.
- 2026-11-25: regresión detectada por el humano en `next dev` con sesión: Blocking Route en `UserEmail` (cabecera privada). Se corrige en T12.
