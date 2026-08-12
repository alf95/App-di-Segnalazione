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

## Quick Start

1. Copy the example environment files:

   ```bash
   cp .env.example .env
   cp apps/report-service/.env.example apps/report-service/.env
   cp apps/media-service/.env.example apps/media-service/.env
   ```

2. Start the local platform dependencies:

   ```bash
   docker compose up -d
   ```

3. Run database migrations:

   ```bash
   npm run db:migrate
   ```

4. Seed development data:

   ```bash
   npm run db:seed
   ```

5. Start the application services:

   ```bash
   npx nx serve report-service
   npx nx serve media-service
   npx nx start mobile
   ```

## Environment Setup

- Root Docker Compose variables live in `.env` and are documented in `.env.example`
- Service-specific runtime variables belong in:
  - `apps/report-service/.env`
  - `apps/media-service/.env`
  - `apps/mobile/.env` (if required by Expo configuration)
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