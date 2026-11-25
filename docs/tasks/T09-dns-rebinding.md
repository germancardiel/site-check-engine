# T09 — Endurecer el fetcher contra DNS rebinding

## Objetivo
Cerrar el TOCTOU que se documentó en T03: hoy `safeFetch` resuelve el DNS y valida la IP (`assertPublicHost`), pero luego `fetch` vuelve a resolver el nombre por su cuenta. Un dominio con TTL 0 puede devolver una IP pública en la validación y una privada (p. ej. `169.254.169.254`) en la conexión. El objetivo es que **la IP validada sea exactamente la que se usa para abrir el socket**, en cada salto.

## Alcance
- Incluye: el transporte HTTP de `safeFetch` (`src/lib/audit/fetcher.ts` y los módulos auxiliares que necesites en `src/lib/audit/`), sus tests y la actualización de D-SEC-05.
- No incluye: cambios en los checks, el scoring, la UI ni los límites actuales (5 redirecciones, 10 s y 3 MB, que se mantienen).

## Criterios de aceptación
- [ ] CA1: **una sola resolución por salto.** La conexión TCP/TLS usa una función `lookup` propia que:
  1. resuelve el hostname;
  2. valida **todas** las direcciones con la lógica existente de `ip.ts`;
  3. si alguna es no pública, falla con `BLOCKED_HOST`;
  4. entrega al socket solo direcciones ya validadas.

  No queda ninguna ruta de código en la que el socket resuelva el nombre por su cuenta. Admite las dos firmas de `lookup` de Node (`all: true` y la de dirección única), porque Node usa `all: true` con `autoSelectFamily`.
- [ ] CA2: **implementación sin dependencias nuevas preferida**, con `node:http`/`node:https` (`request` con la opción `lookup`) detrás de una función de transporte inyectable que sustituye a `globalThis.fetch` dentro de `safeFetch`. Si eliges `undici` (`Agent` con `connect.lookup`), justifícalo en el informe según D-QA-07: hoy no es dependencia directa del proyecto. En cualquier caso:
  - TLS valida el certificado contra el **hostname** (`servername`/SNI = hostname), nunca contra la IP.
  - La cabecera `Host` es la del hostname.
  - Se mantienen `redirect: manual` con revalidación en cada salto, el timeout global de 10 s (también durante el DNS y la lectura del cuerpo), el corte a 3 MB, el `User-Agent` y los códigos de `AuditFetchError`.
  - `safeFetch` devuelve la misma forma `{ finalUrl, status, headers, body, redirects }` que ahora.
- [ ] CA3: **tests de rebinding** (sin red, D-TEST-04), con DNS y transporte inyectados:
  - Un `lookup` que devuelve una IP pública en la primera llamada y `127.0.0.1` en la segunda: la petición se bloquea o, si solo hay una resolución, se conecta a la IP pública. El test comprueba qué dirección llega al socket o transporte y que nunca es la privada.
  - Una respuesta con varias IPs, una pública y otra privada: `BLOCKED_HOST`.
  - La dirección que recibe la conexión es la validada: el test lo comprueba sobre la función `lookup` que se pasa al transporte.
  - TLS: `servername` es el hostname, comprobado sobre las opciones que se pasan a `https.request`, o equivalente.
  - Las dos firmas de `lookup` (`all: true` y única).
- [ ] CA4: todos los tests existentes de `fetcher.test.ts` e `index.test.ts` (D-SEC-05: `127.0.0.1`, `10.x`, `169.254.169.254`, `::1`, `localhost`, redirección a IP privada, más de 5 redirecciones, timeout y más de 3 MB) siguen pasando, adaptados al nuevo transporte **sin perder ningún caso**. La cobertura de `src/lib/audit/**` sigue en el 80 % o más (D-TEST-02).
- [ ] CA5: paso manual documentado. Con red, un script temporal (que no se commitea) llama a `runAudit('https://example.com')` y a otra web real con redirección (p. ej. `http://` → `https://`) y ambas devuelven `status: 'ok'`. Además, `runAudit('http://127.0.0.1')` y `runAudit('http://localhost')` devuelven error.
- [ ] CA6: las cuatro puertas en verde.

## Reglas especialmente relevantes
D-SEC-05 (ampliada), D-TEST-01, D-TEST-02, D-TEST-04, D-QA-04, D-QA-07.

## Notas técnicas
- `runAudit` usa `safeFetch` para la página y para los auxiliares (`robots.txt`, `llms.txt` y `sitemap.xml`), así que todos quedan protegidos.
- Ninguna librería permite comprobar los rangos de IP: se sigue usando `ip.ts`.
- Respeta D-QA-04: si `fetcher.ts` pasa de 300 líneas, separa el transporte en `src/lib/audit/transport.ts`.
