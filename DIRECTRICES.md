# DIRECTRICES — Reglas que el código DEBE cumplir

Única fuente de reglas del proyecto. `develop` las cumple y `testing` las verifica.
Cada regla tiene un ID, el requisito y **cómo se verifica**. Si una regla no se cumple, la tarea es **FAIL**.
Severidad: **B** = bloqueante (siempre FAIL) · **M** = mayor (FAIL) · **m** = menor (se anota; FAIL si hay 3 o más).

## 0. Puerta automática (se ejecuta siempre y en este orden)
| ID | Sev | Requisito | Verificación |
|---|---|---|---|
| D-GATE-01 | B | El tipado compila sin errores | `npm run typecheck` → exit 0 |
| D-GATE-02 | B | Lint sin errores ni warnings | `npm run lint` → exit 0, 0 warnings |
| D-GATE-03 | B | Todos los tests pasan | `npm test` → exit 0 |
| D-GATE-04 | B | El build de producción compila | `npm run build` → exit 0 |

Si falla cualquier puerta, el informe se limita a ese fallo con su salida y no se sigue revisando.

## 1. Calidad de código (QA)
| ID | Sev | Requisito | Verificación |
|---|---|---|---|
| D-QA-01 | M | Sin `any`, `@ts-ignore` ni `@ts-expect-error` | `grep -rnE ": any\b\|as any\|@ts-(ignore\|expect-error)" src` → vacío |
| D-QA-02 | M | Sin `console.log` en `src/` (se permite `console.error` en catch de servidor) | `grep -rn "console.log" src` → vacío |
| D-QA-03 | M | Estructura de carpetas del §7 respetada | Revisión de las rutas nuevas |
| D-QA-04 | m | Funciones de 60 líneas o menos y archivos de 300 líneas o menos | Revisión de los archivos tocados |
| D-QA-05 | m | Sin código muerto, comentado o `TODO` sin ID de tarea | `grep -rn "TODO" src` → solo `TODO(TXX)` |
| D-QA-06 | M | Server Components por defecto; `"use client"` solo si hay estado, efectos o eventos | Cada `"use client"` usa hooks o handlers |
| D-QA-07 | M | Sin dependencias nuevas fuera del stack de `CLAUDE.md` §2 sin justificar en el informe. Las que trae el scaffold de `create-next-app` (T01) no necesitan justificación | Diff de `package.json` frente al informe |

## 2. Tests (TEST)
| ID | Sev | Requisito | Verificación |
|---|---|---|---|
| D-TEST-01 | B | Toda lógica nueva en `src/lib/` tiene tests en `__tests__/` junto a ella. Exentos: archivos que solo declaran tipos | Cada `.ts` nuevo de `lib/` con lógica tiene su `.test.ts`, o lo cubre un test del módulo (p. ej. `checks.test.ts` para `checks/*.ts`) con 100 % de líneas de ese archivo |
| D-TEST-02 | M | Cobertura de líneas de `src/lib/audit/**` de 80 % o más | `npm run test:coverage` |
| D-TEST-03 | M | Cada check de auditoría tiene al menos un test `pass` y uno `fail` con HTML de fixture | Lectura de `checks.test.ts` |
| D-TEST-04 | B | Los tests NO hacen peticiones de red reales (se usan mocks de `fetch`/DNS) | Tests pasan sin red; `grep -rn "https://" src/**/__tests__` solo en fixtures |
| D-TEST-05 | M | Cada criterio de aceptación de la tarea tiene un test o un paso manual documentado en el informe | Cruce CA ↔ tests |

## 3. Seguridad (SEC)
| ID | Sev | Requisito | Verificación |
|---|---|---|---|
| D-SEC-01 | B | Ningún secreto en el repositorio. `.env*` está ignorado, salvo `.env.example` (sin valores) | `git ls-files \| grep -E "^\.env"` → solo `.env.example`; `grep -rnE "(sk-\|eyJhbGci\|service_role)" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=coverage --exclude-dir=.git --exclude=DIRECTRICES.md --exclude=package-lock.json --exclude=.env.local .` → vacío |
| D-SEC-02 | B | Todas las tablas tienen RLS activado y políticas `user_id = auth.uid()` | Lectura de `supabase/migrations/*.sql` |
| D-SEC-03 | B | `SUPABASE_SERVICE_ROLE_KEY` nunca se importa desde código cliente ni de usuario; solo en `scripts/` | `grep -rn SERVICE_ROLE src` → vacío |
| D-SEC-04 | B | Todo input de server actions y route handlers se valida con zod antes de usarse | Cada action/route llama `.safeParse` o `.parse` al inicio |
| D-SEC-05 | B | Protección SSRF en el fetcher: solo `http`/`https`, rechaza IPs privadas, loopback, link-local y `localhost` **tras resolver el DNS**, máximo 5 redirecciones (revalidadas), timeout de 10 s y máximo 3 MB | Tests de `fetcher.test.ts` cubren `127.0.0.1`, `10.x`, `169.254.169.254`, `::1`, `localhost`, redirección a IP privada |
| D-SEC-06 | B | Cada acción de servidor comprueba la sesión (`auth.getUser()`) y opera solo sobre los datos de ese usuario. Exentas: las actions que crean la sesión (login, registro) | Lectura de las actions |
| D-SEC-07 | M | El HTML auditado nunca se renderiza con `dangerouslySetInnerHTML` | `grep -rn dangerouslySetInnerHTML src` → vacío |
| D-SEC-08 | M | Los errores al usuario son genéricos; el detalle solo en `console.error` del servidor | Lectura de los `catch` |

Ejemplo D-SEC-04:
```ts
// ✅
const parsed = siteSchema.safeParse(Object.fromEntries(formData))
if (!parsed.success) return { error: 'URL no válida.' }
// ❌
const url = formData.get('url') as string
```

## 4. IA (AI)
| ID | Sev | Requisito | Verificación |
|---|---|---|---|
| D-AI-01 | B | Las llamadas al modelo van por AI Gateway con un string `"proveedor/modelo"`. Sin SDKs de proveedor ni claves en el código | `grep -rn "@ai-sdk/anthropic\|@ai-sdk/openai" src package.json` → vacío |
| D-AI-02 | M | La salida de la IA es estructurada y se valida con un esquema zod | Uso de `Output.object`/esquema zod |
| D-AI-03 | B | Límite diario por usuario comprobado en el servidor **antes** de llamar al modelo | Test del límite y lectura de la action |
| D-AI-04 | M | El prompt solo incluye datos de la auditoría (checks, nota, URL), nunca el HTML completo, y como máximo 8.000 caracteres | Lectura del builder del prompt y test de truncado |
| D-AI-05 | M | Si la IA falla, la auditoría sigue visible y se muestra un error recuperable (botón reintentar) | Test o paso manual |

## 5. UX y accesibilidad (UX)
| ID | Sev | Requisito | Verificación |
|---|---|---|---|
| D-UX-01 | M | Toda vista con datos tiene estado vacío, de carga y de error | Revisión de las páginas tocadas |
| D-UX-02 | M | Todo input tiene `<label>` asociado; los botones solo de icono tienen `aria-label` | Lectura de JSX |
| D-UX-03 | M | Foco visible en elementos interactivos (sin `outline-none` sin alternativa `focus-visible:`) | `grep -rn "outline-none" src` → cada uso con `focus-visible:` |
| D-UX-04 | M | Contraste de texto de 4,5:1 o más (no hay texto de tono 400 o más claro de ninguna paleta neutra —`gray`, `zinc`, `slate`, `neutral`, `stone`— sobre fondo claro, ni de tono 600 o más oscuro sobre fondo oscuro en `dark:`). Aplica también a `fill-*`/`stroke-*` usados para texto o datos en SVG (en trazos y marcadores de datos basta 3:1) | Revisión de clases de color: `grep -rnE "text-(gray\|zinc\|slate\|neutral\|stone)-(50\|100\|200\|300\|400)\b" src` solo en contextos `dark:` |
| D-UX-05 | M | Responsive desde 360 px sin scroll horizontal | Revisión de layouts (`flex-wrap`, `grid` responsive, sin anchos fijos > 360 px) |
| D-UX-06 | m | Textos de interfaz en español, sin lorem ipsum | Revisión |
| D-UX-07 | M | Las acciones lentas (auditar, IA) deshabilitan el botón y muestran progreso | Lectura de JSX (`useFormStatus`/`pending`) |

## 6. Datos y rendimiento (DATA)
| ID | Sev | Requisito | Verificación |
|---|---|---|---|
| D-DATA-01 | B | El esquema cambia SOLO mediante nuevos archivos en `supabase/migrations/` (sin editar los ya aplicados) | `git diff` no modifica migraciones existentes |
| D-DATA-02 | M | Las consultas seleccionan columnas concretas en las listas (sin `select('*')` en listados) | `grep -rn "select('\*')" src` |
| D-DATA-03 | M | Índices en las claves foráneas y en `(site_id, created_at)` | Lectura de las migraciones |
| D-DATA-04 | m | Imágenes con `next/image` y fuentes con `next/font` | Lectura de JSX |

## 7. Estructura obligatoria
```
src/app/                 rutas (App Router); (auth)/ y (app)/ como grupos
src/app/**/actions.ts    server actions de cada ruta
src/components/ui/       componentes genéricos sin lógica de negocio
src/components/<feature>/ componentes de feature
src/lib/audit/           motor de auditoría puro (fetcher, checks/, scoring, diff)
src/lib/ai/              prompts, esquemas y llamadas a la IA
src/lib/supabase/        clientes (server.ts, client.ts) y tipos
src/lib/validation/      esquemas zod compartidos
supabase/migrations/     SQL versionado
scripts/                 seed y utilidades (único lugar con service role)
```
