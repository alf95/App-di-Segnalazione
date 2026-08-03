# AGENTS.md — UrbanReport

## Repo structure

Nx 19 monorepo (`defaultBase: main`). npm workspaces, **not** yarn/pnpm.

```
apps/
  report-service/   NestJS 10, Prisma + PostGIS, Kafka producer/consumer
  media-service/    Express, S3 presigned URLs, Sharp image processing
  mobile/           Expo SDK 51 + React Native, WatermelonDB, Expo Router
packages/
  @urbanreport/types/       Shared TS types (no deps)
  @urbanreport/validators/  Zod schemas, jest tests
infra/
  helm/             Helm charts for report-service, media-service, kong
  k8s/              Staging kustomize overlays
  keycloak/         Realm export for local Keycloak
```

## Local dev setup (order matters)

```bash
cp .env.example .env
cp apps/report-service/.env.example apps/report-service/.env
cp apps/media-service/.env.example apps/media-service/.env
docker compose up -d
npm run db:migrate           # prisma migrate deploy (report-service)
npm run db:seed              # ts-node prisma/seed.ts
npx nx serve report-service  # NestJS dev server (port 3001)
npx nx serve media-service   # Express dev server (port 3002)
npx nx start mobile          # Expo dev
```

## Commands

| Command | Scope |
|---|---|
| `npm run lint` / `typecheck` / `test` / `build` | All projects |
| `npx nx affected:lint --base=HEAD~1 --head=HEAD` | Changed only |
| `npx nx affected:test --base=HEAD~1 --head=HEAD --ci --coverage` | Changed only |
| `npm run format` | Prettier all `*.{ts,tsx,js,json,md,yaml,yml}` |

CI order: `lint -> typecheck -> test -> build` (sequential stages).

Run a single app's test: `npx nx test report-service` or `npx nx test @urbanreport/validators`.

## Key architecture

- **Auth**: Keycloak JWT. All API endpoints JWT-guarded unless `@Public()`.
- **DB**: PostgreSQL 16 + PostGIS 3.4. Prisma ORM with `postgis` extension. All geo queries use PostGIS functions (`ST_DWithin`, `ST_MakePoint`, etc.).
- **Events**: Kafka topics declared in `docker-compose.yml` `kafka-init` service: `report.created`, `report.status_changed`, `report.confirmed`, `media.uploaded`, `media.processed`, `media.uploaded.dlq`, `municipality.assigned`. Event naming: `<domain>.<event>`.
- **IDs**: UUIDv4 everywhere, never auto-increment for public entities.
- **Errors**: RFC 7807 Problem Details.
- **GDPR**: No PII in logs. Soft-delete (`deletedAt`). Anonymize on account deletion.
- **Media**: EXIF stripped before storage. S3 presigned URLs (900s TTL). Worker (`apps/media-service/src/worker.ts`) generates thumb/webp (200px), web/webp (800px), full/jpeg (1920px) variants.

## Prisma notes

- Migrations are **not committed** (gitignored). Only `schema.prisma` + `seed.ts` under version control.
- Generate client: `npx prisma generate` (done automatically via postinstall in Nest projects if configured).
- DB URL from `REPORT_DB_URL` env var.

## Package conventions

- `@urbanreport/types` and `@urbanreport/validators` are the single source of truth for shared types/schemas — never redefine in apps.
- Path aliases in tsconfig: `@urbanreport/types` → `packages/@urbanreport/types/src`, `@urbanreport/validators` → `packages/@urbanreport/validators/src`.
- Mobile also uses `@/*` → `apps/mobile/src/*`.

## Style

- `no-console` is a warning, allow `warn`/`error`. `no-explicit-any` is an error (relaxed in tests).
- Prettier: single quotes, trailing commas, 100 width, LF endings.
- `@typescript-eslint/no-floating-promises` and `await-thenable` are errors.

## Important constraints from `.github/copilot-instructions.md`

- async/await over raw Promises.
- Strip EXIF from all media uploads.
- Mobile secrets via `expo-secure-store`, never AsyncStorage.
- Shared types/validators from named packages, never redefined.
