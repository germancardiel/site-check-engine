# Auditoría de usabilidad y seguridad — 2026-11-26

Alcance: código en `main` (a0e1bbf), migraciones de `supabase/migrations/` y cabeceras reales de producción (`curl -I`).
Método: revisión de código en modo lectura; la app no se ha ejecutado en un navegador. Las correcciones se reparten en T16–T21.

## 1. Seguridad

### Bien resuelto
- RLS activado en todas las tablas con políticas `user_id = auth.uid()`; nada concedido a `anon`.
- Funciones `security definer` con `set search_path = ''`; cuota de IA atómica, acotada a 10 y con un máximo de 3 reembolsos al día.
- SSRF (`src/lib/audit/fetcher.ts`, `safe-lookup.ts`, `ip.ts`): una sola resolución DNS validada que usa el propio socket (sin rebinding), IPv4 e IPv6 especiales bloqueadas, redirecciones revalidadas (máx. 5), 10 s, 3 MB contados tras descomprimir.
- Acciones de servidor: zod, `auth.getUser()` y filtro por `user_id`; mensajes de error genéricos en login y registro (no revelan si un email existe); redirecciones fijas (sin open redirect).
- Sin `dangerouslySetInnerHTML`; los enlaces externos llevan `rel="noopener noreferrer"`.

### Hallazgos
| ID | Sev. | Hallazgo | Evidencia | Arreglo | Tarea |
|---|---|---|---|---|---|
| S1 | Media | El límite de 1 auditoría por minuto y sitio se salta borrando y recreando el sitio, o añadiendo variantes de la URL (`?a=1`). No hay tope de sitios ni de auditorías por usuario: con el registro abierto, cualquiera puede usar el servidor como rastreador y gastar la cuota de PageSpeed. | `src/app/(app)/sitios/actions.ts` (`createSite`, `auditSite`); `claim_audit_slot` en `20261125200000_ai.sql` | Cuota diaria de 15 auditorías y tope de 10 sitios por usuario, aplicados en la BD | T16 |
| S2 | Media | Faltan cabeceras: la CSP solo tiene `frame-ancestors`; no hay `Referrer-Policy` ni `Permissions-Policy`. | `next.config.ts`; producción | Añadirlas | T17 |
| S3 | Baja-media | `Cache-Control: public, max-age=0, must-revalidate` se aplica a todo (`/(.*)`), incluidas las páginas con sesión. | `next.config.ts` | `private, no-store` en `/sitios/**` | T17 |
| S4 | Baja | Se acepta cualquier puerto (`https://host:22`): permite sondear puertos de hosts públicos. | `src/lib/validation/site.ts`, `src/lib/audit/fetcher.ts` | Solo 80 y 443 | T16 |
| S5 | Baja | `docs[].url` se valida como `z.string()` y se pinta en un `href` (`check-row.tsx:40`). `authenticated` tiene `update` sobre `audits`, aunque el código nunca lo usa: es posible un XSS en la propia cuenta con `javascript:`. | `src/lib/validation/audit.ts`, `20261125100000_grants.sql` | Validar `https?:` y revocar `update` | T16 |
| S6 | Info | El login y el registro dependen solo de los límites de Supabase Auth. | `login/actions.ts`, `registro/actions.ts` | El humano comprueba en el panel de Supabase la confirmación por email y los límites | — |

## 2. Usabilidad y accesibilidad

### Bien resuelto
Borrado en dos pasos que nombra el sitio y avisa de la cascada; progreso de la IA con cronómetro y reembolso de la cuota si falla; `SubmitButton` evita los envíos dobles; `autoComplete` correcto; el estado siempre lleva icono y texto; estados vacío, de carga y de error en todas las rutas; enlace para saltar al contenido, `lang="es"`, foco visible, `aria-current`; los acordeones son `<button aria-expanded>`; el tema sigue la preferencia del sistema y se respeta `prefers-reduced-motion` en el fondo.

### Hallazgos — alta
| ID | Hallazgo | Evidencia | Tarea |
|---|---|---|---|
| U1 | Al volver un error del servidor se borra lo escrito: un fallo de contraseña vacía también el email, y una URL mala vacía el campo URL (React 19 reinicia los formularios con `action`). | `components/auth/login-form.tsx`, `register-form.tsx`, `sites/add-site-form.tsx` | T19 |
| U2 | No se puede recuperar la contraseña: no hay ruta ni enlace. | `app/(auth)/` | T18 |
| U3 | No hay ruta de confirmación del email (no se pasa `emailRedirectTo` y no hay `/auth/confirm`). El mensaje "Revisa tu correo" no repite la dirección ni ofrece reenviar el correo. | `registro/actions.ts:23` | T18 |
| U4 | Un email sin confirmar se muestra como "Revisa el email y la contraseña". | `login/actions.ts:18-20` | T18 |
| U5 | "Volver a auditar" desde un informe deja al usuario en el informe antiguo, sin enlace al nuevo. | `auditorias/[auditId]/page.tsx:220,268`; `sitios/actions.ts:138-140` | T20 |
| U6 | Si una acción lanza un error (corte de red o timeout), la página entera se sustituye por `error.tsx` en mitad de una generación de IA. | `ai/generate-report-form.tsx:41`, `sites/audit-site-form.tsx:20` | T20 |
| U7 | La cuota de IA no se ve junto a los botones: con 0 generaciones el botón sigue activo y luego ofrece "Reintentar"; la sección de cambios no muestra la cuota. | `ai/plan-section.tsx:49`, `generate-report-form.tsx:43,49`, `ai/changes-section.tsx` | T20 |
| U8 | "Regenerar" sustituye el plan y gasta cuota sin avisar. | `generate-report-form.tsx:18,43` | T20 |
| U9 | Los errores no se asocian a su campo (no hay `aria-invalid` ni id del error en `aria-describedby`; un `aria-describedby` externo pisa el de la pista); solo se muestra el primer error y el foco no se mueve. | `ui/text-field.tsx:22` | T19 |

### Hallazgos — media
| ID | Hallazgo | Evidencia | Tarea |
|---|---|---|---|
| U10 | Al borrar un sitio, el mensaje "Sitio borrado." no llega a verse (la fila desaparece) y el foco cae en `<body>`. | `sites/delete-site-form.tsx` | T20 |
| U11 | La auditoría solo muestra "Auditando…", sin estimación de tiempo ni anuncio para lectores de pantalla. | `sites/audit-site-form.tsx:25` | T20 |
| U12 | La espera de 1 minuto solo se descubre después de hacer clic; no hay cuenta atrás. | `sitios/actions.ts:19,126` | T20 |
| U13 | Después de añadir un sitio no hay un camino directo para auditarlo. | `sitios/actions.ts:79` | T20 |
| U14 | El login no devuelve a la página pedida (no hay `?next=`). | `lib/supabase/proxy.ts:75-77`, `login/actions.ts:23` | T18 |
| U15 | Al saltar a una sección se desplaza la página pero no el foco. | `audits/report-view.tsx:193-196`, `lib/anchor.ts:47-49` | T21 |
| U16 | El desplazamiento suave ignora `prefers-reduced-motion`. | `report-view.tsx:195`, `lib/anchor.ts:48` | T21 |
| U17 | El contador de la rejilla de categorías es un número sin etiqueta. | `audits/report-sections.tsx:44-48` | T21 |
| U18 | Las evidencias ok/bad se distinguen solo por el color del borde. | `audits/check-row.tsx:7-11,20-23` | T21 |
| U19 | "Error" significa a la vez "check suspendido" y "auditoría fallida". | `lib/audit/present.ts:10-16`, `site-row.tsx:38` | T21 |
| U20 | Jerga e inconsistencias: "checks", "N/A", dos botones "Descargar .md", la puntuación "IA" sin explicar, "Nota" frente a "Puntuación global". | `action-plan.tsx:35`, `audit-comparison.tsx:87`, `report-view.tsx:113`, `download-plan-button.tsx:20`, `score-gauge.tsx:13` | T21 |
| U21 | El plan generado aparece encima del botón y el foco no va hacia él. | `ai/plan-section.tsx:60-81` | T20 |
| U22 | Las pantallas de error solo ofrecen "Reintentar", sin enlace para volver, y tienen títulos vagos. | `ui/route-error.tsx:22-24` | T21 |
| U23 | Títulos de pestaña genéricos ("Sitio", "Auditoría"). | `sitios/[siteId]/page.tsx:16-18`, `auditorias/[auditId]/page.tsx:24-26` | T21 |

### Hallazgos — baja
| ID | Hallazgo | Evidencia | Tarea |
|---|---|---|---|
| U24 | `role="alert"` y `aria-live="assertive"` a la vez (doble anuncio); los mensajes de éxito no desaparecen. | `ui/form-feedback.tsx:14` | T19 |
| U25 | La comparación no muestra estado de carga y puede volver arriba de la página. | `audits/compare-form.tsx:32` | T20 |
| U26 | La búsqueda y la paginación de sitios no anuncian los resultados. | `sites/site-list.tsx:110-147` | T21 |
| U27 | `aria-controls` apunta a paneles que no existen cuando están cerrados. | `audits/category-accordion.tsx:45,59-65` | T21 |
| U28 | Objetivos táctiles de 32 px o menos (tema, salir, "Expandir todo", enlaces `text-xs`). | `theme-toggle.tsx:75`, `app-header.tsx:28`, `report-view.tsx:142-155` | T21 |
| U29 | Los botones principales desactivados se ven igual que los activos. | `ui/button-styles.ts:9` | T21 |
| U30 | No se muestra el máximo de la contraseña (72) ni hay opción de mostrarla. | `auth/register-form.tsx:23` | T19 |
| U31 | Falta "Entrar" en la cabecera de la landing. | `landing/landing-header.tsx:9-22` | T21 |
| U32 | El informe es una columna larga sin índice; el plan de IA queda debajo de todos los acordeones. | `auditorias/[auditId]/page.tsx:214-233` | T21 |

## 3. Tareas
| Tarea | Cubre |
|---|---|
| T16 Límites de uso y endurecimiento de datos | S1, S4, S5 |
| T17 Cabeceras de seguridad y caché | S2, S3 |
| T18 Cuenta: recuperar contraseña y confirmar email | U2, U3, U4, U14 |
| T19 Formularios accesibles | U1, U9, U24, U30 |
| T20 Flujos de auditoría e IA | U5–U8, U10–U13, U21, U25 |
| T21 Pulido de textos y accesibilidad | U15–U20, U22, U23, U26–U29, U31, U32 |
