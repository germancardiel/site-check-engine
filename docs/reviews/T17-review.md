# T17 — Review

| Ronda | Veredicto | Reglas fallidas | Resumen |
|---|---|---|---|
| 1 | PASS | — | `src/lib/security-headers.ts` + `next.config.ts`: Referrer-Policy, Permissions-Policy, CSP estática (`default-src 'self'`, `object-src 'none'`, `base-uri`, `form-action`, `frame-ancestors`, `connect-src` con Supabase) y `Cache-Control: private, no-store` en `/sitios/**`. 1050 tests. Verificado con `curl -I` y Playwright contra `next start` (0 errores de CSP). |

## Decisiones y pendientes
- CSP con `'unsafe-inline'` en `script-src` y `style-src`: la documentación de Next instalada indica que los nonces son incompatibles con PPR/`cacheComponents`. Endurecerla con hashes sería otra tarea.
- Falta verificar a mano los detalles de sitio y de auditoría con datos reales (el usuario demo no tiene sitios).
- Aviso de consola no bloqueante: la detección de JIT de zod provoca un `securitypolicyviolation` de `eval` capturado.
