# T18 — Review

| Ronda | Veredicto | Reglas fallidas | Resumen |
|---|---|---|---|
| 1 | FAIL | D-SEC-14, D-UX-09, D-UX-08 | Open redirect: `safeNextPath` aceptaba `/.//evil.com` y `/sitios/..//evil.com`, que el router normaliza a `//evil.com`. Faltaba el test de componente de D-UX-08 en `/recuperar`. D-UX-09 se quitó de T18 por error de definición: ya estaba en el alcance de T19 y ningún CA de T18 lo exigía (nota en la tarea). D-SEC-14 se endureció en `DIRECTRICES.md` (ruta normalizada). Se añadió como obligatorio que `/auth/confirm` capture las excepciones. |
| 2 | PASS | — | `safeNextPath` rechaza segmentos de punto y escapes de separador, y exige que la ruta normalizada sea idéntica, del mismo origen y sin `//` inicial. `/auth/confirm` con try/catch. Test de D-UX-08. Testing probó más de 20 variantes de bypass sin encontrar salida. 1133 tests. |

## Decisiones aceptadas
- "Confirma tu email antes de entrar." permite saber que existe una cuenta con ese email (enumeración). Lo pide la tarea (U4), a cambio de mejor usabilidad.
- Los escapes de control en la ruta (`/%0a/…`) se aceptan: son inocuos porque el origen no cambia.

## Configuración pendiente en Supabase (la hace el humano)
1. Site URL = URL de producción (igual que `NEXT_PUBLIC_SITE_URL`).
2. Redirect URLs: `https://<dominio>/auth/confirm**` y `http://localhost:3000/auth/confirm**` (y el patrón de las previews, si se usan).
3. Plantillas (recomendado): Confirm signup → `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`; Reset password → `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/nueva-contrasena`.
4. Mantener "Confirm email" activado.
5. `NEXT_PUBLIC_SITE_URL` definida en Vercel.
