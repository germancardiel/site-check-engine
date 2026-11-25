# T13 — Rediseño visual y de usabilidad + cambio de nombre a Site Check Engine

## Objetivo
Sustituir el aspecto actual (grises zinc y Geist) por el lenguaje visual de `www.gcastudio.dev`, la web del autor, y renombrar el producto de "Faro" a **Site Check Engine** en toda la interfaz. Se mantienen todas las funciones, los textos de producto, las reglas y los tests. Es un **rediseño**: el aspecto antiguo solo sirve como referencia de qué hay que mostrar, no de cómo.

## Fuentes de verdad (léelas antes de empezar)
- `PRODUCT.md`: usuarios, propósito, compromisos de marca (nombre, referencia visual, tema claro y oscuro, voz).
- `.impeccable/surfaces/src-app-page-tsx.md`: contrato de dirección de la **landing** (modo Persuade).
- `.impeccable/surfaces/src-app-app-layout-tsx.md`: contrato de dirección de la **app y del auth** (modo Operate).
- `DIRECTRICES.md`, en especial D-UX-01…07 (D-UX-04 se ha reescrito para tokens y para los dos temas).
- **No copies** el texto de los contratos (THESIS, OWN-WORLD, etc.) al código, a comentarios, a la metadata ni al HTML servido.

## Sistema visual (tokens obligatorios)
Defínelos como variables CSS en `src/app/globals.css` (Tailwind v4 `@theme`), con valores para el tema oscuro (por defecto) y el claro (`prefers-color-scheme: light`). Ningún componente usa hex sueltos.

| Token | Oscuro | Claro | Uso |
|---|---|---|---|
| `--color-ground` | `#151519` | `#F5F2EB` | fondo de página |
| `--color-panel` | `#1D1D22` | `#FAF8F4` | paneles, filas destacadas, inputs |
| `--color-ink` (texto) | `#F5F2EB` | `#151519` | texto principal |
| `--color-ink-muted` | crema al 70 % ≈ `#B4B2AD` | `#5C5A55` | texto secundario (≥4,5:1) |
| `--color-line` | crema al 18 % | tinta al 14 % | filetes de 1px |
| `--color-accent` | `#EE671B` | `#EE671B` | relleno del botón primario (texto `#151519` encima: 5,7:1), foco y marcas |
| `--color-accent-text` | `#EE671B` | `#A93F08` | texto y enlaces en color de acento |
| `--color-pass` | `#3FB27F` | `#1E7A4C` | estado pass |
| `--color-warn` | `#F2C14E` | `#8A6500` | estado warn |
| `--color-fail` | `#E5484D` | `#C2342F` | estado fail |
| selección | fondo acento, texto tinta | igual | `::selection` |

Prohibido: crema por debajo del 55 % de opacidad para texto, `#EE671B` como texto sobre crema (2,85:1) y gris por debajo de 4,5:1.

**Tipografía** (`next/font/google`, D-DATA-04; sustituye a Geist): **Syne** 600 para titulares de display (`--font-display`); **Plus Jakarta Sans** 400/500/600 para texto y UI (`--font-sans`); **Fraunces** cursiva 400 solo para la palabra resaltada de los titulares de la landing (`--font-serif`); **JetBrains Mono** 400/500 solo para datos: notas, fechas, ids de check y deltas, con `font-variant-numeric: tabular-nums` (`--font-mono`). Justificación (D-QA-07 no aplica: no son paquetes nuevos): son las tipografías de la referencia vinculante del humano.

**Forma:** filetes de 1px (`--color-line`). Radio de 6px en botones, inputs y paneles; píldoras `rounded-full` para estados y etiquetas. Sin sombras decorativas. Ancho máximo de 1320px en la landing y de 1080px en la app. Foco: `outline` de 2px en `--color-accent` con offset de 2px en todo lo interactivo. `::selection`, `caret-color`, el subrayado de enlaces (`underline-offset`) y `accent-color` salen de la paleta.

## Alcance
- Incluye: tokens y tipografía; cabeceras pública y privada; landing; login y registro; `/sitios`; página del sitio (historial y gráfico); detalle de auditoría (checks, comparación, plan y resumen de IA); páginas de error y not-found; imagen OG; y el cambio de nombre en interfaz, metadata, `llms.txt`, el User-Agent del motor (`SiteCheckEngineBot/1.0 (+https://site-check-engine.vercel.app)`), el README y `.env.example` (comentarios).
- No incluye: cambiar la lógica de negocio, las rutas, las server actions, los esquemas, las migraciones ni la IA; añadir un campo de URL en la portada (descartado por el humano); dependencias nuevas.

## Criterios de aceptación
- [ ] CA1: **nombre.** "Faro" no aparece en ningún texto visible, metadata, JSON-LD, `llms.txt`, `robots`/`sitemap`, imagen OG, README ni User-Agent (`grep -rniw "faro" src README.md` → solo nombres internos justificados en el informe, como las variables CSS antiguas eliminadas o los fixtures). El título del sitio pasa a "Site Check Engine" con una descripción de 50–160 caracteres.
- [ ] CA2: **tokens y temas.** Existen los tokens de la tabla para los dos temas. No hay clases `zinc-*` ni Geist en `src/`. No hay hex en `src/components` ni en `src/app` salvo `opengraph-image.tsx`. El tema sigue `prefers-color-scheme`.
- [ ] CA3: **contraste automático.** `src/lib/design/contrast.ts` (función pura de contraste WCAG con mezcla de opacidad) y `src/lib/design/tokens.ts` (los valores de la tabla como datos, la misma fuente de la que se generan o validan los de `globals.css`). Un test comprueba que todos los pares de uso real (texto, texto secundario, acento-texto, estados, botón primario, filete de inputs ≥3:1 y foco ≥3:1) cumplen D-UX-04 en los dos temas. Otro test comprueba que cada token de `tokens.ts` está declarado en `globals.css` con el mismo valor.
- [ ] CA4: **landing**, según su contrato:
  - Primera pantalla: h1 con la palabra resaltada en Fraunces cursiva, botón primario "Crear cuenta gratis" y enlace "Entrar"; con sesión, "Ir a tus sitios" (se conserva).
  - Al lado (debajo en móvil), un **informe de ejemplo** etiquetado como tal, generado a partir de `CHECK_CATALOG` con estados de ejemplo fijos y deterministas y con las dos notas. Sus checks se resuelven en secuencia al cargar (CSS o un componente cliente mínimo); con `prefers-reduced-motion: reduce` se muestra en estático.
  - Secciones "Qué revisa" (SEO e IA en dos columnas de filas, no en tarjetas iguales), "Cómo funciona" (3 pasos numerados, porque la secuencia importa) y un cierre con CTA y footer.
  - Sin eyebrows ni kickers encima de los titulares, sin texto con degradado, sin glassmorphism y sin bordes laterales de color de más de 1px.
  - Debe seguir **aprobando su autoauditoría** (test de T07 CA2 en verde: todos `pass` salvo `https`) y conservar al menos 150 palabras, `h2` sin saltos y JSON-LD.
- [ ] CA5: **app**, según su contrato:
  - Cabecera fina con la marca "Site Check Engine", "Sitios" con `aria-current`, el email y "Cerrar sesión".
  - `/sitios`: alta en línea (URL, nombre y "Añadir") y lista **en filas** con el nombre o host, la URL, la nota total en mono con un medidor lineal, SEO e IA, la fecha relativa y las acciones.
  - Detalle de auditoría: banda de resumen con las tres notas como medidores lineales (cifra en mono más barra con `role="meter"` o equivalente accesible), la fecha y "Volver a auditar"; después "Qué arreglar primero" (los `fail` y `warn` primero) y los `pass` plegados.
  - Estados pass, warn y fail con icono SVG propio (no emoji ni caracteres Unicode) más texto.
  - Gráfico de evolución con los tokens: total en acento continuo, SEO discontinuo y IA punteado, con leyenda sin depender del color.
- [ ] CA6: **espera de la IA.** Mientras se genera el plan o el resumen, en lugar de solo "Generando…" se muestra un registro de progreso: el tiempo transcurrido (mm:ss) en mono, la nota "Puede tardar uno o dos minutos." y el botón deshabilitado. Va en un `aria-live="polite"` que no anuncia cada segundo (anuncia el inicio y el fin). La lógica de formato del tiempo va en una función pura testeada.
- [ ] CA7: **auth.** Login y registro con el nuevo sistema: marca, formulario en panel, `<label>` visibles, error en `role="alert"` y enlaces cruzados.
- [ ] CA8: **estados** (D-UX-01) rediseñados en todas las rutas: vacío (que enseñe qué hacer, con la acción), skeleton de carga con la forma del contenido real y error con "Reintentar". También el not-found y el error raíz.
- [ ] CA9: **verificación visual** (paso manual obligatorio). Capturas en `.impeccable/review/` de la landing, `/login`, `/sitios` y el detalle de una auditoría, en **desktop (1440)** y **móvil (390)**, en **oscuro y claro**. Las páginas privadas se capturan con el usuario demo (credenciales de `.env.local`, sin mostrarlas) o con la ruta temporal de fixtures que usaste en T07, borrada al terminar. Revisa que no haya scroll horizontal a 360 px. Nombres de archivo: `desktop.png` y `mobile.png` para la landing en oscuro, y `<ruta>-<tema>-<ancho>.png` para el resto.
- [ ] CA10: **detector de diseño.** Ejecuta `/Users/germancardiel/.claude/skills/impeccable/scripts/impeccable detect --json` sobre los archivos de UI modificados, corrige lo mecánico y adjunta en el informe los hallazgos que queden y por qué.
- [ ] CA11: **sin regresiones.** Las cuatro puertas en verde, ningún test perdido ni debilitado (los textos esperados pueden cambiar por el nombre nuevo) y D-QA-08/09 respetadas. El smoke local (`npm run test:smoke`, con el procedimiento del README) pasa 12/12.

## Reglas especialmente relevantes
D-UX-01…07, D-QA-03, D-QA-04, D-QA-06, D-QA-08, D-DATA-04, D-SEC-07, D-TEST-01, D-TEST-05.

## Notas técnicas
- Respeta el lenguaje de Operate en la app: Syne solo en el h1, y nada de fuentes de display en botones, etiquetas ni datos.
- Mono solo para datos, nunca como adorno.
- Movimiento: de 150 a 250 ms en la app, con ease-out, y un único momento orquestado en la landing (el informe que se resuelve).
- Sin dependencias nuevas. Los iconos son SVG propios, pequeños y de trazo uniforme.

## Aclaraciones tras la ronda 1
- D-UX-04 incluye expresamente los estados interactivos (hover, active, focus), que entran en "pares de uso real" del CA3.
- Los textos de interfaz que fija un contrato de dirección (p. ej. el h1 de la landing) son copy de producto y están permitidos. Lo prohibido es copiar el contrato en sí (THESIS, OWN-WORLD, etc.).
- CA1 se amplía: `package.json` y `package-lock.json` pasan a `"name": "site-check-engine"`.
- La revisión de diseño independiente (finish review, disposición `fix`) forma parte de la ronda 2 junto con el informe de testing.
