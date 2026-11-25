# AGENTS.md

Este proyecto se trabaja con un equipo de 3 agentes. Las instrucciones son las mismas para Claude Code y para Codex:

- **Orquestador**: [`CLAUDE.md`](CLAUDE.md). Léelo primero; define el producto, el stack y el bucle de trabajo.
- **Develop**: [`.claude/agents/develop.md`](.claude/agents/develop.md).
- **Testing**: [`.claude/agents/testing.md`](.claude/agents/testing.md).
- **Reglas**: [`DIRECTRICES.md`](DIRECTRICES.md). Es la única fuente de reglas, la cumple Develop y la verifica Testing.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
