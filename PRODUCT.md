# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Público mixto, a partes iguales:
- **Profesionales** (freelancers y agencias) que auditan las webs de sus clientes, siguen su evolución y les entregan un plan de acción.
- **Dueños de su propia web** (pymes, autónomos, creadores) sin conocimientos de SEO, que quieren saber qué mejorar y en qué orden.

El trabajo es el mismo en los dos casos: añadir un sitio, auditarlo, entender la nota y los checks, recibir un plan priorizado y volver más adelante para ver si ha mejorado.

## Product Purpose
**Site Check Engine** (antes "Faro") audita una web en SEO clásico y en visibilidad para asistentes de IA (crawlers de IA, `llms.txt`, datos estructurados, contenido renderizado en servidor). Guarda el historial de cada sitio y genera con IA un plan de acción priorizado y un resumen de cambios entre auditorías. El éxito es que el usuario sepa en segundos qué falla, por qué importa y qué hacer primero, y que vea la mejora en el historial.

## Positioning
Mide en una sola pasada **dos audiencias**: los buscadores y los asistentes de IA. Separa las notas de SEO y de IA y conserva la evolución por sitio. El plan de acción se construye con los checks reales de la auditoría (referencia sus ids), no con consejos genéricos.

## Operating Context
- App web en español, autenticada con email y contraseña. El flujo es: añadir sitio → auditar (unos 10 s) → ver nota y checks → generar el plan con IA (de 1 a 2 minutos con el modelo gratuito) → volver y comparar.
- Hay un usuario demo para pruebas, con credenciales privadas.
- Producción: `https://site-check-engine.vercel.app`.

## Capabilities and Constraints
- 19 checks (13 de SEO y 6 de IA), cada uno `pass`, `warn` o `fail`, con mensaje y recomendación. Hay nota total, nota de SEO y nota de IA (0–100).
- Historial de 30 auditorías por sitio, gráfico de evolución y comparación entre dos auditorías cualesquiera.
- IA: 10 generaciones por usuario y día. Se analiza solo el HTML del servidor, sin ejecutar JavaScript.
- Stack fijo (`CLAUDE.md` §2): Next.js 16 con `cacheComponents`, Tailwind, Supabase y AI SDK por AI Gateway. Sin dependencias nuevas salvo que se justifiquen.
- Reglas de calidad y accesibilidad en `DIRECTRICES.md` (contraste 4,5:1, foco visible, 360 px, estados vacío, carga y error).
- Gratis: no hay planes ni precios.

## Brand Commitments
- **Nombre:** Site Check Engine. Sustituye a "Faro" en toda la interfaz, la metadata y la documentación.
- **Referencia visual vinculante:** el lenguaje de `www.gcastudio.dev`, la web del propio autor. Se toma su estilo, **no** su marca: Site Check Engine no se firma como GCA Studio.
- **Tema:** oscuro y claro según la preferencia del sistema.
- **Voz:** español, tuteo, directa y sin tecnicismos innecesarios, como en la referencia.

## Evidence on Hand
- No hay testimonios, clientes, cifras de uso, benchmarks ni capturas reales de terceros. No se deben inventar.
- Sí son reales y se pueden mostrar: el catálogo de checks (`CHECK_CATALOG`), el flujo de 3 pasos, el límite diario y la autoauditoría de la propia landing (todo `pass`).

## Product Principles
1. **El diagnóstico primero:** la nota y lo que falla se entienden antes de leer el detalle.
2. **Accionable, no alarmista:** cada fallo viene con su recomendación y su prioridad.
3. **Dos audiencias, dos notas:** SEO e IA siempre separados y comparables.
4. **La evolución es el valor:** volver a auditar y ver el cambio tiene que ser fácil y gratificante.
5. **Honestidad:** solo se afirma lo que el motor mide de verdad.

## Accessibility & Inclusion
WCAG 2.1 AA según `DIRECTRICES.md` §5: contraste de 4,5:1 en texto y 3:1 en texto grande y gráficos, foco visible, navegación por teclado, enlace de salto, estados sin depender solo del color, responsive desde 360 px y `prefers-reduced-motion` respetado.
