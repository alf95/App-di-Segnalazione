# AGENTS.md — UrbanReport

## Repo structure

Nx 19 monorepo. npm workspaces (not yarn/pnpm). Nx project names are **scoped** (`@urbanreport/*`) — un-prefixed names like `nx serve report-service` fail.

```
apps/
  report-service/   NestJS 10, Prisma + PostGIS, Kafka producer/consumer (port 3001)
  media-service/    Express + Sharp + S3 presigned URLs (port 3002); separate worker process
  mobile/           Expo SDK 51 + React Native, expo-router, WatermelonDB offline-first
packages/
  @urbanreport/types/       Shared TS types (no deps)
  @urbanreport/validators/  Zod schemas, jest tests
infra/
  helm/ k8s/ keycloak/      Deploy artifacts (realm-export.json imported by local Keycloak)
```

## Local dev

```bash
cp .env.example .env
cp apps/report-service/.env.example apps/report-service/.env
cp apps/media-service/.env.example apps/media-service/.env
docker compose up -d

# build the schema (see Prisma notes — db:migrate won't do it)
cd apps/report-service && npx prisma generate && npx prisma db push && cd ../..
npm run db:seed -w @urbanreport/report-service

npx nx start:dev @urbanreport/report-service   # NestJS dev server (port 3001)
npx nx start:dev @urbanreport/media-service    # Express dev server (port 3002)
npx nx start:worker @urbanreport/media-service # media worker (consumes media.uploaded)
npx nx start @urbanreport/mobile               # Expo dev
```

There is **no `serve` target** — dev commands are `start` / `start:dev` / `start:worker`, invoked with the scoped project name.

## Commands

| Command | Notes |
|---|---|
| `npx nx run @urbanreport/report-service:db:migrate` | `prisma migrate deploy` — see Prisma notes |
| `npm run db:seed -w @urbanreport/report-service` | `ts-node prisma/seed.ts` |
| `npm run lint` / `test` / `build` | `nx run-many --target=X --all` |
| `npm run typecheck` | Only the two shared packages define a `typecheck` target (apps don't); see broken-state note below |
| `npx nx affected:lint --base=HEAD~1 --head=HEAD` | Same pattern for `affected:typecheck/test/build` |
| `npm run format` | Prettier over all `*.{ts,tsx,js,json,md,yaml,yml}` |

CI order (`.github/workflows/ci.yml`): lint → typecheck → test → build, as sequential jobs on affected projects (`NX_BASE`/`NX_HEAD` set to PR base sha vs `HEAD~1`).

Single app test: `npx nx test @urbanreport/report-service` or `npm test -w @urbanreport/report-service`.

## Prisma notes (high-value gotchas)

- Migrations are **not committed and none exist in the repo** (gitignored; only `schema.prisma` + `seed.ts` are versioned). `db:migrate` = `prisma migrate deploy`, which creates nothing with zero migration files. To build the schema locally: `cd apps/report-service && npx prisma db push`.
- **No postinstall runs `prisma generate`** — run `npx prisma generate` manually (from `apps/report-service`) after any schema change.
- `DB URL` comes from `REPORT_DB_URL`. PostGIS extension is enabled via `previewFeatures = ["postgresqlExtensions"]`.
- `Report.location` is `Unsupported("geometry(Point,4326)")` — Prisma generates no typed field for it; geo reads/writes need raw SQL with PostGIS functions (`ST_DWithin`, `ST_MakePoint`, …).

## Architecture & conventions

- **Auth**: global JWT guard (`APP_GUARD` → `JwtAuthGuard`). Opt out per-route with `@Public()` from `apps/report-service/src/auth/public.decorator.ts`.
- **Errors**: RFC 7807 Problem Details via `HttpExceptionFilter` (global in `main.ts`).
- **Events**: Kafka, names always `<domain>.<event>`. Topics (from `docker-compose.yml` `kafka-init`): `report.created`, `report.status_changed`, `report.confirmed`, `media.uploaded`, `media.processed`, `media.uploaded.dlq`, `municipality.assigned`.
- **IDs**: UUIDv4 everywhere. **GDPR**: no PII in logs, soft-delete (`deletedAt`), anonymize on deletion. **Media**: EXIF stripped before storage, S3 presigned URLs (900s TTL).
- **Shared code**: `@urbanreport/types` and `@urbanreport/validators` are the single source of truth — import via tsconfig paths (`@urbanreport/types` → `packages/@urbanreport/types/src/index.ts`), never redefine in apps. Mobile additionally maps `@/*` → `apps/mobile/src/*`.
- **Env layering**: root `.env` only feeds `docker-compose.yml` (POSTGRES_PASSWORD, KC_*). Runtime config lives in `apps/*/.env` (`REPORT_DB_URL`, `KAFKA_BROKERS`, S3 vars, …). Only `.env.example` files are committed. Mobile config uses `EXPO_PUBLIC_*` vars with localhost defaults.

## Style (enforced)

- `no-explicit-any` is an **error** (relaxed only in `*.spec.ts`/`*.test.ts`); `no-floating-promises` and `await-thenable` are errors (hence `void bootstrap()` in `main.ts`); `no-console` is a warning allowing only `warn`/`error`.
- Prettier: single quotes, trailing commas, printWidth 100, LF endings.
- async/await over raw Promises.

## Known broken state

`npm run typecheck` currently fails on `@urbanreport/validators` (TS5095: base tsconfig sets `moduleResolution: "bundler"` but validators overrides `module: "commonjs"`). Only `@urbanreport/types` and `@urbanreport/validators` have a `typecheck` target — the three apps are not typechecked by that command.

## Other instruction sources

- `.github/copilot-instructions.md` + `.github/memory-bank/*.md` — repo convention says to read the full memory-bank before generating code or making architecture decisions; contains the source of the constraints above.
