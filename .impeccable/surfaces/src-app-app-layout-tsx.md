---
version: 1
slug: "src-app-app-layout-tsx"
primary_target: "src/app/(app)/layout.tsx"
related_targets: ["src/app/(auth)/layout.tsx"]
---

# Superficie: app autenticada (`/sitios`, `/sitios/[id]`, detalle de auditoría) y auth (`/login`, `/registro`)

**Modo:** Operate. **Tarea:** añadir sitios, auditar, leer la nota y los checks, comparar y generar el plan con IA (espera de 1 a 2 minutos). **Estados importantes:** vacío, carga, error, auditoría fallida, cuota de IA agotada y generación en curso. **Frecuencia:** visitas recurrentes para ver la evolución. **Restricciones:** DIRECTRICES §5 y Server Components por defecto.

## Direction contract
THESIS: un cuaderno de taller nocturno, donde cada sitio es una ficha y cada auditoría una lectura con fecha. Rechaza el dashboard SaaS de tarjetas redondeadas con sombras y métricas gigantes.
OWN-WORLD: el mismo sistema que la landing, en registro contenido. Suelo tinta y paneles `#1D1D22` (en claro, crema y `#FAF8F4`). Plus Jakarta Sans para la UI y Syne solo en el h1 de cada página. JetBrains Mono para notas, fechas, ids y deltas, con cifras tabulares. El brasa se reserva a la acción primaria, la selección y la nota total. Estados semánticos (pass, warn y fail) siempre con icono y texto.
STORY: el usuario ve sus sitios como filas legibles con nota y fecha, entra, entiende qué falla primero y lanza la siguiente acción sin buscarla.
FIRST VIEWPORT: en `/sitios`, cabecera fina (marca, Sitios, email, salir), h1 "Tus sitios", el alta en línea (URL, nombre y "Añadir") y la lista en filas con su nota en mono. En el detalle de auditoría, una banda de resumen con las tres notas como medidores lineales con su cifra, la fecha y "Volver a auditar", seguida de "Qué arreglar primero".
FORM: mundo heredado de la landing (fijado por el brief); seed key: `pinned:gcastudio.dev`. Interacción insignia: la espera del plan con IA se muestra como un registro de progreso con tiempo transcurrido y la nota "puede tardar uno o dos minutos", no como un spinner.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
