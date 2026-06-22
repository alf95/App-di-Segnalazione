# GitHub Copilot — Project Instructions

This file provides persistent context for GitHub Copilot across all sessions.
Always read the full `memory-bank/` folder before generating code, suggestions, or architecture decisions.

## Memory Bank Index

| File | Purpose |
|------|---------|
| `memory-bank/projectBrief.md` | Project goals, scope, target users |
| `memory-bank/techContext.md` | Full tech stack, versions, infrastructure |
| `memory-bank/systemPatterns.md` | Architecture decisions, patterns, conventions |
| `memory-bank/activeContext.md` | Current focus, work in progress |
| `memory-bank/progress.md` | Roadmap, status, known issues |

## Global Coding Rules

- Language: **TypeScript** (strict mode) for ALL services — backend, mobile, and web admin
- Always use **async/await** over raw Promises
- All database queries touching geospatial data MUST use **PostGIS** functions (`ST_DWithin`, `ST_MakePoint`, `ST_Distance`)
- Never log or store raw GPS coordinates from media — always strip EXIF first
- Follow **GDPR** rules: no PII in logs, soft-delete only, anonymize on account deletion
- All API endpoints must be protected by JWT middleware unless explicitly marked `@Public()`
- Use **UUIDs** (v4) for all primary keys, never auto-increment integers for public-facing entities
- Error responses must follow RFC 7807 (Problem Details for HTTP APIs)
- Write **unit tests** for all domain logic (priority calculator, deduplication, state machine)
- All Kafka event names follow the pattern: `<domain>.<event>` (e.g., `report.created`, `media.processed`)
- Mobile app uses **React Native with Expo SDK 51+** — never suggest Flutter or Swift/Kotlin native code
- Shared TypeScript types and zod validators live in `packages/@urbanreport/types` and `packages/@urbanreport/validators` — always import from there, never redefine
- Mobile secrets must use `expo-secure-store` — never use AsyncStorage for sensitive data
