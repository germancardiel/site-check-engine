# T01 — Scaffold de Next.js, tooling y clientes de Supabase

## Objetivo
Dejar un proyecto Next.js 16 vacío pero con todas las puertas de calidad (`typecheck`, `lint`, `test`, `build`) funcionando y los clientes de Supabase preparados.

## Alcance
- Incluye: scaffold, scripts de npm, Vitest con cobertura, clientes de Supabase, `.env.example`, una home mínima y la estructura de carpetas de DIRECTRICES §7.
- No incluye: tablas, auth, UI real (llegan en T02 y siguientes).

## Criterios de aceptación
- [ ] CA1: `npm run typecheck`, `npm run lint`, `npm test` y `npm run build` terminan con exit 0.
- [ ] CA2: `package.json` tiene los scripts `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `test` (`vitest run`) y `test:coverage`.
- [ ] CA3: `tsconfig.json` tiene `"strict": true` y el alias `@/*` → `src/*`.
- [ ] CA4: existen `src/lib/supabase/server.ts` (cliente de servidor con cookies, `@supabase/ssr`) y `src/lib/supabase/client.ts` (cliente de navegador), que leen `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` y fallan con un mensaje claro si faltan.
- [ ] CA5: `.env.example` lista las variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `AI_GATEWAY_API_KEY`) **sin valores**.
- [ ] CA6: hay al menos un test de humo en `src/lib/__tests__/` que pasa (por ejemplo, de una utilidad `cn()` en `src/lib/utils.ts`).
- [ ] CA7: la home (`/`) muestra "Faro" y una frase descriptiva en español, con `lang="es"` en `<html>`.

## Reglas especialmente relevantes
D-GATE-01…04, D-SEC-01, D-QA-01, D-QA-03, D-TEST-01.

## Notas técnicas
- La carpeta ya contiene `CLAUDE.md`, `AGENTS.md`, `DIRECTRICES.md`, `.claude/`, `docs/` y `.gitignore`. `create-next-app` puede negarse a usar un directorio con archivos: genera en una carpeta temporal (`npx create-next-app@latest /tmp/faro-scaffold --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes`) y mueve el contenido aquí **sin sobrescribir** esos archivos.
- **NO sobrescribir `.gitignore`**: si el scaffold trae reglas útiles que falten, añádelas al final.
- Si `next dev` o el scaffold generan o modifican `AGENTS.md`/`CLAUDE.md`, conserva el contenido del proyecto y deja solo el bloque añadido por Next al final.
- Dependencias permitidas en esta tarea: `@supabase/ssr`, `@supabase/supabase-js`, `zod`, `clsx`, `tailwind-merge`, `vitest`, `@vitest/coverage-v8`.
