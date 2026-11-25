---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: []
---

# Superficie: landing pública (`/`)

**Modo:** Persuade. **Audiencia:** profesionales y dueños de webs no técnicos (público mixto). **Acción:** crear cuenta gratis; la secundaria es entrar. **Prueba:** catálogo real de checks, flujo real de 3 pasos y un informe de ejemplo marcado como tal. **Restricciones:** sin testimonios, cifras ni clientes inventados; sin campo de URL en la portada (decisión del humano); tema oscuro y claro según el sistema; la landing debe seguir aprobando su propia autoauditoría (T07 CA2).

## Direction contract
THESIS: la web se presenta como un informe que se resuelve delante del visitante, no como un hero con mockup y tarjetas. Rechaza el patrón de la categoría: degradado, captura de dashboard y tres tarjetas de beneficios.
OWN-WORLD: el lenguaje de gcastudio.dev. Tinta `#151519`, crema `#F5F2EB` y un único acento brasa `#EE671B` (en tema claro: suelo crema y texto de acento `#A93F08`). Syne semibold con tracking -0.035em para titulares, Fraunces en cursiva y color brasa solo en la palabra que importa, Plus Jakarta Sans para el texto y JetBrains Mono en mayúsculas solo para datos (ids de check, notas, fechas). Filetes de 1px en crema al 16–22 %, radio de 6px en controles, píldoras redondas para estados y ancho máximo de 1320px.
STORY: el visitante entiende en una línea que se revisa su web para Google y para la IA, ve el informe resolverse check a check, comprende las dos notas y el flujo, y crea su cuenta.
FIRST VIEWPORT: a la izquierda, un h1 de hasta 18ch ("Tu web, revisada para Google *y para la IA*."), un subtítulo y el botón brasa "Crear cuenta gratis" con el enlace "Entrar" al lado. A la derecha (debajo en móvil), el espécimen de informe: una lista en mono de checks con su estado y su id, más las dos notas (SEO e IA), con la etiqueta "Informe de ejemplo".
FORM: mundo fijado por el brief (referencia vinculante: gcastudio.dev), sin sorteo; seed key: `pinned:gcastudio.dev`. Interacción insignia: los checks del espécimen se resuelven en secuencia al cargar (pendiente → pass, warn o fail), una sola vez y en estático con `prefers-reduced-motion`.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
