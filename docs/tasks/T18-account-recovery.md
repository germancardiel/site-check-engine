# T18 — Cuenta: recuperar contraseña y confirmar email

## Objetivo
Que ningún usuario se quede fuera de su cuenta: recuperar la contraseña, confirmar el email con un enlace que funcione y volver a la página pedida tras iniciar sesión. Hallazgos U2, U3, U4 y U14.

## Alcance
- Incluye:
  - Página `/recuperar`: formulario de email → `resetPasswordForEmail` con `redirectTo` a `/auth/confirm?next=/nueva-contrasena`. Siempre responde con el mismo mensaje ("Si existe una cuenta con ese email, te hemos enviado un enlace.") para no revelar si el email existe.
  - Route handler `/auth/confirm` (GET): valida con zod `token_hash` + `type` (`verifyOtp`) y también `code` (`exchangeCodeForSession`), crea la sesión y redirige a `next` validado (D-SEC-14) o a `/sitios`. Si falla, redirige a `/login?error=enlace` con un mensaje claro ("El enlace no es válido o ha caducado").
  - Página `/nueva-contrasena` (requiere sesión): formulario de nueva contraseña con las mismas reglas que el registro → `updateUser({ password })` → `/sitios`.
  - Registro: `signUp` con `options.emailRedirectTo` a `/auth/confirm`; tras el registro sin sesión, la tarjeta sustituye el formulario por un mensaje que repite el email ("Te hemos enviado un enlace a x@y.com…") y un botón "Reenviar correo" (`auth.resend({ type: 'signup' })`).
  - Login: si Supabase devuelve `email_not_confirmed`, mensaje propio "Confirma tu email antes de entrar." con la opción de reenviar el correo. Enlace "¿Has olvidado tu contraseña?" junto al campo de contraseña.
  - `?next=`: el proxy añade `next=<ruta pedida>` al redirigir a `/login` desde una ruta privada; `login` redirige a `next` validado como ruta interna (función pura en `src/lib/` con tests: rechaza `//evil.com`, `/\\evil.com`, `https://…`, rutas no privadas raras se aceptan solo si empiezan por `/`).
  - Las rutas nuevas se añaden a `AUTH_PATHS`/`PRIVATE_PREFIXES` del proxy según corresponda (`/nueva-contrasena` es privada; `/recuperar` es de auth; `/auth/confirm` es pública).
  - URL base de los enlaces desde `NEXT_PUBLIC_SITE_URL` (ya existe en `src/lib/site.ts`).
- No incluye:
  - Cambiar la configuración de Supabase Auth (Redirect URLs, plantillas de email). El informe debe listar exactamente qué hay que configurar; lo hace el humano.
  - OAuth, magic link u otros métodos de acceso.

## Criterios de aceptación
- [ ] CA1: `/recuperar` existe, valida el email con zod y muestra siempre el mismo mensaje de éxito, exista o no la cuenta (test de la action con error y sin error de Supabase).
- [ ] CA2: `/auth/confirm` con `token_hash`+`type` válidos llama a `verifyOtp` y redirige a `next` (validado) o a `/sitios`; con parámetros inválidos o error de Supabase redirige a `/login?error=enlace` (tests del route handler).
- [ ] CA3: `/nueva-contrasena` sin sesión redirige a `/login`; con sesión actualiza la contraseña y redirige a `/sitios`; valida longitud igual que el registro (tests).
- [ ] CA4: `register` pasa `emailRedirectTo` y, sin sesión, devuelve el email para mostrar el mensaje de confirmación; el formulario se oculta y aparece "Reenviar correo" (test de componente).
- [ ] CA5: `login` con `email_not_confirmed` devuelve el mensaje propio; cualquier otro error mantiene el mensaje genérico (tests).
- [ ] CA6: El enlace "¿Has olvidado tu contraseña?" aparece en `/login`.
- [ ] CA7: Visitar `/sitios/abc` sin sesión redirige a `/login?next=%2Fsitios%2Fabc`; tras iniciar sesión se llega a `/sitios/abc`. Un `next` externo (`//evil.com`, `https://evil.com`, `/\evil.com`) se ignora y se va a `/sitios` (tests del validador, del proxy y de la action) (D-SEC-14).
- [ ] CA8: El informe lista la configuración necesaria en Supabase (Site URL, Redirect URLs, plantillas con `{{ .TokenHash }}` si aplica).
- [ ] CA9: Las 4 puertas pasan en verde y `src/__tests__/proxy.test.ts` se actualiza sin perder casos.

## Reglas especialmente relevantes
D-SEC-04, D-SEC-06, D-SEC-08, D-SEC-14, D-QA-08, D-UX-02, D-UX-06, D-UX-08, D-UX-09, D-TEST-01, D-TEST-05.

## Notas técnicas
- Guía de referencia: patrón de `@supabase/ssr` para Next App Router (route handler de confirmación con `verifyOtp({ type, token_hash })`).
- Reutiliza `AuthCard`, `TextField`, `SubmitButton`, `FormFeedback` y los esquemas de `src/lib/validation/auth.ts`.
- Si T19 ya ha cambiado los formularios (no debería: T18 va antes), sigue el patrón que haya.
