# UrbanReport

UrbanReport is a civic reporting platform that lets citizens submit geo-located urban issues, while municipalities triage, assign, and resolve them through an event-driven workflow.

## Architecture Overview

UrbanReport is organized as an Nx monorepo with shared TypeScript packages and infrastructure-as-code for local development, CI/CD, and Kubernetes deployments.

```text
.
├── .github/
│   ├── memory-bank/
│   └── workflows/
├── apps/
│   ├── media-service/
│   ├── mobile/
│   └── report-service/
├── infra/
│   ├── helm/
│   │   ├── kong/
│   │   ├── media-service/
│   │   └── report-service/
│   ├── k8s/
│   └── keycloak/
├── packages/
│   ├── @urbanreport/types/
│   └── @urbanreport/validators/
├── docker-compose.yml
└── README.md
```

### Core Components

- **report-service**: report lifecycle, moderation, deduplication, and municipality assignment
- **media-service**: media upload orchestration and processing pipeline
- **media-worker**: background consumer for `media.uploaded` events
- **PostgreSQL + PostGIS**: primary geospatial datastore
- **Redis**: caching and rate-limiting support
- **Kafka**: event backbone for inter-service communication
- **Keycloak**: identity, roles, and JWT issuance
- **Kong**: API gateway and policy enforcement in Kubernetes

## Prerequisites

- Docker and Docker Compose
- Node.js 20
- npm
- Expo CLI
- EAS CLI

## Starting the Application

UrbanReport can be started in five ways. Pick the case that matches what you are doing:

| Case | What runs where | Use it for |
|---|---|---|
| **A — Full Docker Compose** | Everything (infra + both services + worker) in containers | Demos, smoke tests, "just run it" |
| **B — Hybrid (recommended for dev)** | Infra in Docker, Node services on the host | Day-to-day development with hot reload and debuggers |
| **C — Single service** | One service only, plus the dependencies it needs | Focused work on one component |
| **D — Mobile** | Expo/Metro on the host, backend as in A or B | Mobile feature work |
| **E — Kubernetes (staging)** | Helm charts in a cluster | Deploying to a cluster |

> Nx project names are **scoped** (`@urbanreport/*`). Un-prefixed names such as `npx nx start:dev report-service` fail — always pass the scoped name.

### Step 0 — One-time setup (every case)

**Prerequisites:** Node.js 20+ / npm 10+, Docker + Docker Compose, and — only for the mobile case — Expo CLI, EAS CLI and `adb` (Android) or Xcode (iOS).

1. Install workspace dependencies (Nx monorepo with npm workspaces — do not use yarn/pnpm):

   ```bash
   npm install
   ```

2. Create the environment files. Only `.env.example` files are committed; the real `.env` files are git-ignored:

   ```bash
   cp .env.example .env
   cp apps/report-service/.env.example apps/report-service/.env
   cp apps/media-service/.env.example apps/media-service/.env
   ```

   Root `.env` feeds **only** `docker-compose.yml` (`POSTGRES_PASSWORD`, `KC_*`). Runtime configuration lives in the per-app files — see [Environment Setup](#environment-setup) for the full list. The mobile app additionally reads `apps/mobile/.env.local` (`EXPO_PUBLIC_*`).

3. Start the datastores at least once so the database exists (any case):

   ```bash
   docker compose up -d postgresql
   ```

4. Build the Prisma schema and seed reference data. **`db:migrate` is a no-op**: no migration files are committed, and `prisma migrate deploy` creates nothing from an empty migrations folder.

   ```bash
   cd apps/report-service
   npx prisma generate
   npx prisma db push
   cd ../..
   npm run db:seed -w @urbanreport/report-service
   ```

   The seed inserts 8 categories and 1 municipality (`DEMO`). Zero users and zero reports is expected.

5. **Keycloak on a fresh database needs one manual step.** Compose points Keycloak at `jdbc:postgresql://postgresql:5432/keycloak` with user `keycloak`, but the `postgis/postgis` image only creates the `urbanreport` database and role. Create them before starting Keycloak, otherwise the container crash-loops:

   ```bash
   docker compose exec postgresql psql -U urbanreport -d urbanreport \
     -c "CREATE ROLE keycloak LOGIN PASSWORD '<KC_DB_PASSWORD>';" \
     -c "CREATE DATABASE keycloak OWNER keycloak;"
   ```

   Use the same password you set for `KC_DB_PASSWORD` in the root `.env`. Keycloak then runs `start-dev --import-realm` and needs ~60–90 s (Quarkus rebuild) before port 8080 answers.

### Case A — Full stack with Docker Compose

Starts PostgreSQL + PostGIS, Redis, ZooKeeper, Kafka, the Kafka topic bootstrap, Keycloak, and the three application containers (built from `apps/report-service/Dockerfile` and `apps/media-service/Dockerfile`).

```bash
docker compose up -d            # start everything in the background
docker compose ps               # check container states
docker compose logs -f report-service media-service media-worker
```

Startup order is enforced by healthchecks and `depends_on`: PostgreSQL and Kafka must be healthy before the app containers start, and `kafka-init` only creates the topics once Kafka is healthy.

**Required before the first `up`:** complete Step 0.3–0.5 above — the containers do not run `prisma db push` or the seed themselves, so the schema must already exist in the `urbanreport` database.

To stop, or to stop and wipe the datastores:

```bash
docker compose down             # stop and remove containers, keep volumes
docker compose down -v          # also delete postgres_data and keycloak_data
```

### Case B — Hybrid: infra in Docker, services on the host (recommended)

This is the normal development loop: stateful dependencies in containers, application code running on the host so you get watch mode, breakpoints and fast restarts.

1. Start only the infrastructure:

   ```bash
   docker compose up -d postgresql redis zookeeper kafka kafka-init keycloak
   ```

2. Complete Step 0.4 (Prisma generate / push / seed) if you have not already.

3. Start each application process in its own terminal:

   ```bash
   npx nx start:dev @urbanreport/report-service    # NestJS API, watch mode, port 3001
   npx nx start:dev @urbanreport/media-service     # Express API, port 3002
   npx nx start:worker @urbanreport/media-service  # Kafka consumer for media.uploaded
   ```

   There is **no `serve` target**. The available targets are `start`, `start:dev` and `start:worker`; the equivalents without Nx are `npm run start:dev -w @urbanreport/report-service`, `npm run start:dev -w @urbanreport/media-service` and `npm run start:worker -w @urbanreport/media-service`.

4. The worker is a **separate process** from `media-service`. The HTTP service only issues presigned URLs and accepts `init`/`confirm` calls; image processing happens in the worker that consumes `media.uploaded` and publishes `media.processed`. If processed media never appears, the worker is usually simply not running.

Two things that look like failures but are not:

- **`start:dev` can take ~2 minutes before printing anything** (cold Nx daemon + project-graph plugins). The first line is `Starting compilation in watch mode...`. Do not kill it as "hung".
- Do **not** run `docker compose up` for `report-service`/`media-service` at the same time as the host processes — both bind 3001/3002 and the second one fails with `EADDRINUSE`. Start them selectively, as in step 1.

### Case C — Start a single service

Every service is independently startable; just bring up the dependencies it actually needs.

| Goal | Commands |
|---|---|
| **report-service only** | `docker compose up -d postgresql kafka kafka-init` → `npx nx start:dev @urbanreport/report-service` |
| **media-service only** | `docker compose up -d kafka kafka-init` → `npx nx start:dev @urbanreport/media-service` |
| **media worker only** | `docker compose up -d kafka kafka-init` → `npx nx start:worker @urbanreport/media-service` |
| **Everything but mobile, in one shell** | `docker compose up -d postgresql redis zookeeper kafka kafka-init keycloak` then the three `nx` commands above |

`report-service` needs PostgreSQL **and** Kafka (it produces `report.created`, `report.status_changed`, `report.confirmed`, `municipality.assigned`). `media-service` needs Kafka and the S3 credentials in its `.env`; the worker additionally uses `MEDIA_DB_URL` and `sharp`.

To run a single service from its own directory instead of through Nx:

```bash
cd apps/report-service && npm run start:dev     # nest start --watch
cd apps/media-service  && npm run start:dev     # ts-node src/main.ts
cd apps/media-service  && npm run start:worker  # ts-node src/worker.ts
```

### Case D — Mobile app (Expo)

The mobile app is a client only: it needs a reachable `report-service` (3001), `media-service` (3002) and Keycloak (8080), so start the backend first with Case A or Case B.

1. Point the app at the backend by creating `apps/mobile/.env.local` (git-ignored):

   ```bash
   EXPO_PUBLIC_API_URL=http://localhost:3001
   EXPO_PUBLIC_KEYCLOAK_URL=http://localhost:8080
   EXPO_PUBLIC_KEYCLOAK_REALM=urbanreport
   EXPO_PUBLIC_KEYCLOAK_CLIENT_ID=urbanreport-mobile
   ```

   `EXPO_PUBLIC_*` values are inlined at bundle time, so **restart Metro with `--clear` after editing this file**. Unset variables fall back to the `localhost` defaults in `apps/mobile/src/constants/config.ts`.

2. Start the Expo dev server:

   ```bash
   npx nx start @urbanreport/mobile     # expo start, Metro on 8081
   npx nx start @urbanreport/mobile -- --clear
   ```

   `expo start --clear` takes several minutes in this monorepo (large `watchFolders`) and pauses after `Expo Autolinking module resolution enabled`. It is not hung — wait for `Starting Metro Bundler`.

3. Choose how to open the app:

   - **Android emulator** (AVD `urbanreport`): press `a` in the Expo terminal, or `npm run android -w @urbanreport/mobile`.
   - **iOS simulator** (macOS only): press `i`, or `npm run ios -w @urbanreport/mobile`.
   - **Physical Android device over USB (preferred, no firewall changes):**

     On Windows, `adb` is usually not on `PATH`; call it by full path, e.g. `& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"`.

     ```bash
     adb reverse tcp:8081 tcp:8081   # Metro
     adb reverse tcp:3001 tcp:3001   # report-service
     adb reverse tcp:3002 tcp:3002   # media-service
     adb reverse tcp:8080 tcp:8080   # Keycloak
     ```

     Tunnels are wiped on every replug or `adb` restart, so re-create them before launching. Metro must bind **IPv4** for the tunnel to work — start it with `NODE_OPTIONS=--dns-result-order=ipv4first` (PowerShell: `$env:NODE_OPTIONS='--dns-result-order=ipv4first'`) and check the listener with `Get-NetTCPConnection -LocalPort 8081 -State Listen`. Either `127.0.0.1:8081` or a dual-stack `::` listener works; an `::1`-only listener does not, because `adb reverse` connects over IPv4 loopback.

     Then launch the app on the device (Metro must already be running):

     ```bash
     adb shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:8081" host.exp.exponent
     ```

     Verify it really loaded: Metro prints `Android Bundled <ms> node_modules\expo-router\entry.js (<modules> modules)`, and `adb shell screencap -p /sdcard/ur.png` followed by `adb pull` shows the tab UI.
   - **Physical device over Wi-Fi:** put the host's LAN IP in `apps/mobile/.env.local` instead of `localhost`, and allow inbound TCP 3001/3002/8080/8081 through the host firewall. `--localhost` mode will not work here.

4. Production/staging builds go through EAS: pushing a `v*` tag triggers `.github/workflows/expo-build.yml`.

#### Mobile device notes

- **The device must be awake and unlocked.** While the screen is off the app is backgrounded and never requests the bundle, so Metro stays silent and the launch looks like a failure. On MIUI builds the screen cannot be woken from `adb` — `adb shell input keyevent` fails with `SecurityException: Injecting input events requires INJECT_EVENTS permission`, and `settings put global stay_on_while_plugged_in` needs `WRITE_SECURE_SETTINGS` — so wake it by hand.
- `adb devices` showing `unauthorized` means the on-device "Allow USB debugging?" prompt has not been accepted yet; `adb kill-server` + `adb start-server` re-triggers it. A crashed daemon wipes all four tunnels, so re-create them afterwards.
- Expo Go must match the SDK in use (SDK 57 → Expo Go 57.x, package `host.exp.exponent`). The app uses WatermelonDB's **LokiJS** adapter, so no custom dev build is needed.
- Tunnel tests with `nc` are not trustworthy: a reverse tunnel pointed at a dead port still exits `0`, and Android's toybox `netcat` accepts the connection but never relays payloads. Validate with a real client (Expo Go, or Chrome via `adb shell am start -a android.intent.action.VIEW -d <url>`).
- For the Wi-Fi path, remember that **container ports published by a WSL-hosted Docker are bound to loopback only**, so Keycloak (8080) is not reachable from the phone even with a firewall rule. Either use USB/`adb reverse`, or forward the host LAN IP to `127.0.0.1:8080` with a small TCP proxy.
- The phone only needs `report-service` (3001) and Keycloak (8080) for the main flows; `3002` is required only for media upload. A missing category list in `new-report` means `report-service` is down, not that the seed failed.

### Case E — Kubernetes (staging)

Helm charts live in `infra/helm/` (`report-service`, `media-service`, `kong`); the staging overlay is `infra/k8s/namespace.yaml` + `infra/k8s/staging-values.yaml`. Images are published to GHCR by `.github/workflows/docker-build.yml` on pushes to `main`.

```bash
kubectl apply -f infra/k8s/namespace.yaml
helm upgrade --install report-service infra/helm/report-service -n staging \
  -f infra/k8s/staging-values.yaml
helm upgrade --install media-service infra/helm/media-service -n staging \
  -f infra/k8s/staging-values.yaml
helm upgrade --install kong infra/helm/kong -n staging
```

In-cluster, Kong fronts `report-service` (`http://report-service:3001`) and adds rate limiting (5 requests/hour on `POST /reports`) plus JWT validation against the Keycloak realm. Configuration and secrets come from Kubernetes Secrets, never from committed files.

> **Known gap:** `media-service` exposes `GET /health` (used by its Helm probes). `report-service` currently has **no `/health` route**, so its liveness/readiness probes on port 3001 will not pass until an endpoint is added.

### Ports

| Component | Host port | Notes |
|---|---|---|
| PostgreSQL + PostGIS 16/3.4 | 5432 | database and role `urbanreport`; PostGIS via `postgresqlExtensions` preview feature |
| Redis 7 | 6379 | cache / rate limiting |
| ZooKeeper | 2181 | Kafka coordination |
| Kafka — external listener | 9092 | advertised as `localhost:9092`; use this from host processes |
| Kafka — internal listener | 29092 | advertised as `kafka:29092`; use this from other containers |
| Keycloak 24 | 8080 | `start-dev --import-realm`, realm `urbanreport` from `infra/keycloak/realm-export.json` |
| report-service | 3001 | NestJS REST API, global JWT guard, RFC 7807 errors |
| media-service | 3002 | Express; `GET /health`, `POST /media/init`, `POST /media/confirm` |
| media-worker | — | no HTTP listener; consumes `media.uploaded` |
| Expo / Metro | 8081 | mobile case only |

### Endpoints by component

Legend: 🔓 public, 🔒 requires `Authorization: Bearer <JWT>` (Keycloak realm `urbanreport`). Neither service sets a global path prefix, so paths below are the full paths.

#### report-service — `http://localhost:3001`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/reports` | 🔒 | Creates a report. Body (`CreateReportDto`): `categoryId` (UUID v4), `latitude`, `longitude`, `description` (≤ 2000 chars), optional `mediaIds` (UUID v4[]). Emits `report.created` (skipped when the submission was deduplicated). |
| `GET` | `/reports` | 🔓 | Paginated list. Query: `after` (cursor), `limit` (default 20), `municipalityId`. |
| `GET` | `/reports/:id` | 🔓 | Single report with category, municipality, media items and status history. `:id` must be a UUID; 404 (RFC 7807) if missing or soft-deleted. |
| `PATCH` | `/reports/:id/status` | 🔒 | Transitions the report through the state machine. Body (`UpdateStatusDto`): `status` (one of `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `REJECTED`, `DUPLICATE`), optional `comment`. Emits `report.status_changed`. |
| `POST` | `/reports/:id/confirm` | 🔒 | Adds a citizen confirmation and recomputes `priorityScore`/`priorityLevel`. Body (`ConfirmReportDto`): optional `comment`. Emits `report.confirmed`. |
| `GET` | `/categories` | 🔓 | Reference data; returns the 8 seeded categories. |
| `GET` | `/health` | ❌ | **Not implemented** — see the Helm note in Case E. |

Errors are RFC 7807 Problem Details (`type`, `title`, `status`, `detail`, `instance`) produced by the global `HttpExceptionFilter`.

#### media-service — `http://localhost:3002`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | 🔓 | `{ status: "ok", service: "media-service", timestamp }` — used by the Helm probes. |
| `POST` | `/media/init` | 🔓 | Body: `{ contentType, reportId? }`. Returns `{ mediaId, uploadUrl, key }` where `key` is `uploads/pending/<mediaId>` and `uploadUrl` is an S3 presigned `PUT` valid for `PRESIGNED_URL_TTL_SECONDS` (default 900 s). 400 if `contentType` is missing. |
| `POST` | `/media/confirm` | 🔓 | Body: `{ mediaId, key }`. Verifies the object exists in S3 (404 if not) and emits `media.uploaded`; returns `{ status: "processing", mediaId }`. |
| — | any other path | — | 404. |

> **Security gap:** unlike `report-service`, `media-service` registers **no JWT middleware** — `/media/init` and `/media/confirm` are unauthenticated. In Kubernetes it is only reachable as a `ClusterIP` service and is not routed through Kong, but locally the port is open on the host.

#### media-worker — no HTTP endpoints

| Direction | Topic | Details |
|---|---|---|
| consumes | `media.uploaded` | consumer group `media-service-consumer`. Downloads the source object, normalizes rotation, then writes three variants: `media/<mediaId>/thumb.webp` (200×200 cover), `media/<mediaId>/web.webp` (800 px inside), `media/<mediaId>/full.jpeg` (1920 px inside). |
| produces | `media.processed` | `{ mediaId, variants: { thumb, web, full }, processedAt }` after all three variants are uploaded. |
| produces | `media.uploaded.dlq` | `{ payload, error, failedAt }` when processing throws; invalid payloads are logged and dropped without a DLQ message. |

#### Kafka topics

| Topic | Produced by | Consumed by |
|---|---|---|
| `report.created` | `report-service` | — (no consumer in the repo) |
| `report.status_changed` | `report-service` | — |
| `report.confirmed` | `report-service` | — |
| `media.uploaded` | `media-service` (`POST /media/confirm`) | `media-worker` |
| `media.processed` | `media-worker` | — |
| `media.uploaded.dlq` | `media-worker` | — |
| `municipality.assigned` | — (pre-created only) | — |

All seven topics are created by the `kafka-init` container with 3 partitions and replication factor 1. `report-service` is not a Kafka consumer: `media.processed` appears in its `ReportEventTopic` type, but nothing subscribes to it.

#### Keycloak — `http://localhost:8080`, realm `urbanreport`

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/realms/urbanreport` | Realm metadata — returns 200 once the realm is imported and the server is ready. |
| `GET` | `/realms/urbanreport/.well-known/openid-configuration` | OIDC discovery document. |
| `GET`/`POST` | `/realms/urbanreport/protocol/openid-connect/auth` | Authorization endpoint (browser/PKCE flow). |
| `POST` | `/realms/urbanreport/protocol/openid-connect/token` | Token endpoint (code exchange and refresh). |
| `GET` | `/realms/urbanreport/protocol/openid-connect/certs` | JWKS — public keys for token verification. |
| `GET`/`POST` | `/realms/urbanreport/protocol/openid-connect/userinfo` | UserInfo endpoint. |
| `GET`/`POST` | `/realms/urbanreport/protocol/openid-connect/logout` | RP-initiated logout. |
| `GET` | `/admin` | Admin console (credentials from `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD`). |

| Item | Value |
|---|---|
| Clients | `urbanreport-mobile` — public, standard + implicit flow, redirect URIs `urbanreport://*` and `http://localhost:8081/*`; `urbanreport-report-service` — confidential, service accounts enabled |
| Realm roles | `citizen` (default), `moderator`, `municipality_officer`, `admin` |
| Password policy | length 8, 1 uppercase, 1 special character |

> `report-service` verifies tokens with the static RS256 key in `REPORT_JWT_PUBLIC_KEY` (passport-jwt), **not** by fetching the JWKS endpoint, and it checks neither issuer nor audience. Kong's `openid-connect` plugin, by contrast, validates against the in-cluster issuer `http://keycloak.staging.svc.cluster.local/realms/urbanreport`.

#### Datastores and external services

| Endpoint | Value | Consumed by |
|---|---|---|
| PostgreSQL | `postgresql://urbanreport:<POSTGRES_PASSWORD>@localhost:5432/urbanreport` | `REPORT_DB_URL` (report-service), `MEDIA_DB_URL` (media-worker) |
| Keycloak database | `jdbc:postgresql://postgresql:5432/keycloak` (container network) | `KC_DB_URL` |
| Redis | `redis://localhost:6379` | caching / rate limiting |
| Kafka brokers | `localhost:9092` on the host, `kafka:29092` between containers | `KAFKA_BROKERS` |
| S3 | bucket `MEDIA_S3_BUCKET`, region `MEDIA_S3_REGION` (default `eu-west-1`) | presigned uploads and variant storage; no local endpoint override, so real AWS credentials are required |

#### Kong API gateway (in-cluster only)

| Route | Upstream | Plugins |
|---|---|---|
| `POST /reports` | `http://report-service:3001` | `rate-limiting` (5 requests/hour, local policy) + `openid-connect` against the `urbanreport` realm |

This is the **only** route declared in `infra/helm/kong/values.yaml` (`strip_path: false`). `GET /reports`, `/reports/:id`, `/categories` and all `/media/*` endpoints are not exposed through the gateway.

#### Kubernetes service DNS (namespace `staging`)

| Endpoint | Type |
|---|---|
| `report-service.staging.svc.cluster.local:3001` | `ClusterIP` (chart values default) |
| `media-service.staging.svc.cluster.local:3002` | `ClusterIP` |
| `keycloak.staging.svc.cluster.local:8080` | referenced by the Kong OIDC issuer |

#### Mobile client

`apps/mobile/src/services/api.ts` calls these paths against `EXPO_PUBLIC_API_URL` (default `http://localhost:3001`): `GET /reports` (`?userId=`), `GET /reports/:id`, `POST /reports`, `POST /reports/:id/confirm`, `GET /categories`, `POST /media/init`, `POST /media/confirm`. A `401` clears the auth store and redirects to `/(auth)/login`.

> **Known gap:** `/media/init` and `/media/confirm` are served by `media-service` on port 3002, but the mobile client sends them to the single `API_URL` base (3001), and no local gateway forwards `/media/*`. Those two calls therefore need either a separate base URL for media or a gateway route.

### Verify that it started

```bash
curl http://localhost:3001/categories     # public endpoint, no JWT: expects the 8 seeded categories
curl http://localhost:3002/health         # media-service: {"status":"ok",...}
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/realms/urbanreport   # Keycloak realm: 200
```

`/categories` returning `[]` or an empty category list in the mobile app almost always means **report-service is not running**, not that the seed failed — check the process and port before re-seeding. Every endpoint marked 🔒 above requires a Keycloak JWT.

There is no CLI shortcut for minting a token: the `urbanreport-mobile` client has `directAccessGrantsEnabled: false`, so the password grant is disabled and tokens come from the authorization-code flow in the app. To test protected routes with `curl`, temporarily enable direct access grants on that client in the Keycloak admin console, or create a test user and use the admin console's token view.

### Troubleshooting the startup

| Symptom | Cause and fix |
|---|---|
| `EADDRINUSE` on 3001/3002 | A stray `node`/`nest` process (or a compose container) already holds the port. `Get-NetTCPConnection -LocalPort 3001 -State Listen \| Select OwningProcess` (Windows) or `lsof -i :3001` (macOS/Linux), then stop it. |
| `nx` reports "Cannot find project" | You used an un-prefixed name. Use `@urbanreport/report-service`, `@urbanreport/media-service`, `@urbanreport/mobile`. |
| Keycloak container restarts in a loop | The `keycloak` role/database do not exist — run the SQL in Step 0.5 and recreate the container. |
| `db:migrate` does nothing | Expected: no migrations are committed. Use `npx prisma db push` from `apps/report-service`. |
| Prisma Client has no `location` field | `Report.location` is `Unsupported("geometry(Point,4326)")`. Geospatial reads/writes require raw SQL with PostGIS functions (`ST_DWithin`, `ST_MakePoint`, `ST_Distance`). |
| Kafka events never arrive in containers | The per-app `.env` files are written for host processes (`localhost:9092`, `localhost:5432`). Inside a container those point at the container itself — override them with `KAFKA_BROKERS=kafka:29092` and `REPORT_DB_URL=postgresql:5432/urbanreport` (for example in a `docker-compose.override.yml`). |
| Phone can't reach the backend over Wi-Fi | Windows firewall blocks inbound `node.exe` by default, and container ports published from a WSL-hosted Docker are bound to loopback only. Use the USB/`adb reverse` path, or add an inbound allow rule. |

## Environment Setup

- Root Docker Compose variables live in `.env` and are documented in `.env.example`
- Service-specific runtime variables belong in:
  - `apps/report-service/.env`
  - `apps/media-service/.env`
  - `apps/mobile/.env.local` (Expo `EXPO_PUBLIC_*` variables; restart Metro with `--clear` after editing)
- Never commit real secrets; keep only `.env.example` files under version control

## Local Development Stack

The root `docker-compose.yml` provisions:

- PostgreSQL 16 with PostGIS 3.4
- Redis 7
- Zookeeper + Kafka
- Kafka topic bootstrap container
- Keycloak realm import for `urbanreport`
- Local builds of `report-service`, `media-service`, and `media-worker`

## Running Tests

Run the workspace quality gates from the repository root:

```bash
npx nx affected:lint --base=HEAD~1 --head=HEAD
npx nx affected:typecheck --base=HEAD~1 --head=HEAD
npx nx affected:test --base=HEAD~1 --head=HEAD --ci --coverage
npx nx affected:build --base=HEAD~1 --head=HEAD
```

## CI/CD Overview

GitHub Actions workflows are defined in `.github/workflows/`:

- `ci.yml`: lint, typecheck, unit tests, and builds for affected Nx projects
- `sast.yml`: CodeQL analysis for pull requests to `main`
- `docker-build.yml`: builds and publishes container images to GHCR on pushes to `main`
- `expo-build.yml`: triggers EAS mobile builds when version tags (`v*`) are pushed

Kubernetes deployment artifacts live under `infra/helm/` and `infra/k8s/`, with staging overlays for lower-cost environments.

## Contributing Guidelines

1. Create a feature branch from `main`
2. Keep changes scoped and consistent with the monorepo architecture
3. Add or update tests for domain logic and service behavior
4. Run lint, typecheck, test, and build checks before opening a pull request
5. Document environment or infrastructure changes in the relevant README or IaC files

## Security Notes

- JWT authentication is managed through Keycloak
- Sensitive runtime configuration must be injected via `.env` files locally and Kubernetes Secrets in clusters
- Mobile secrets must be managed through Expo Secure Store and EAS secrets, never hardcoded in the app bundle