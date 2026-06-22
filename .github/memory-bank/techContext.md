# Technical Context

## Architecture Style
**Event-Driven Microservices** deployed on Kubernetes.
Start as a **Majestic Monolith** (modular), extract services progressively.

## Services Overview

| Service | Runtime | Responsibility |
|---------|---------|----------------|
| `auth-service` | Keycloak / Auth0 | Authentication, JWT, roles |
| `report-service` | NestJS (Node 20) | Core report CRUD, lifecycle, deduplication |
| `media-service` | Node.js / Go | Upload, EXIF strip, resize, AI moderation |
| `notification-service` | Node.js | Push, email, SMS dispatch |
| `analytics-service` | Python / FastAPI | KPIs, heatmaps, OLAP queries |
| `integration-service` | NestJS | Municipal API adapters, inbound webhooks |

## Tech Stack

### Backend
- **Runtime**: Node.js 20 LTS, Python 3.12
- **Framework**: NestJS (TypeScript strict), FastAPI
- **ORM**: Prisma (PostgreSQL), Mongoose (MongoDB)
- **Validation**: class-validator + class-transformer (NestJS)
- **Testing**: Jest (unit), Supertest (integration), Playwright (E2E)

### Databases
| Store | Technology | Use Case |
|-------|-----------|----------|
| Primary DB | **PostgreSQL 16 + PostGIS 3.4** | Reports, users, geo-queries |
| Document store | **MongoDB 7** | Media metadata, flexible payloads |
| Cache / session | **Redis 7** | Sessions, rate limiting, pub/sub |
| Object storage | **AWS S3** (or compatible) | Photos, videos, thumbnails |
| Analytics (OLAP) | **ClickHouse 24** | KPIs, heatmaps, trend queries |

### Messaging
- **Apache Kafka 3.x** — primary event bus
- Topic naming: `<domain>.<event>` (e.g., `report.status_changed`, `media.processed`)
- Consumer groups follow pattern: `<service>-consumer`

### Mobile
- **React Native 0.74+** with **Expo SDK 51+** — single codebase iOS + Android
- **Language**: TypeScript strict (aligned with backend codebase)
- **Navigation**: Expo Router (file-based, v3)
- **State management**: Zustand (aligned with web admin)
- **Offline-first**: WatermelonDB (SQLite-based, reactive ORM for RN)
- **Background sync**: `expo-background-fetch` + `expo-task-manager`
- **Maps**: `react-native-maps` + `@rnmapbox/maps` (Mapbox GL)
- **Camera / Media**: `expo-camera`, `expo-image-picker`, `expo-media-library`
- **GPS**: `expo-location` (foreground + background modes)
- **Push notifications**: `expo-notifications` (FCM + APNs via Expo push service)
- **Shared types**: TypeScript interfaces shared via monorepo package (`@urbanreport/types`)

#### Key React Native Libraries
| Feature | Library |
|---------|---------|
| HTTP client | `axios` + `react-query` (TanStack Query v5) |
| Forms | `react-hook-form` + `zod` |
| Map clustering | `react-native-map-clustering` |
| Image compression | `expo-image-manipulator` |
| Secure storage | `expo-secure-store` (JWT tokens) |
| Offline queue | WatermelonDB sync engine |
| UI components | `react-native-paper` or custom design system |
| Testing | Jest + `@testing-library/react-native` |

#### Monorepo Advantage
React Native shares TypeScript types and validation schemas (`zod`) with the NestJS backend:
```
packages/
  @urbanreport/types/       ← shared DTO interfaces
  @urbanreport/validators/  ← shared zod schemas
apps/
  mobile/                   ← React Native (Expo)
  admin/                    ← Next.js
  report-service/           ← NestJS
```

### Web Admin
- **Next.js 14** (App Router) + **React 18**
- **Tailwind CSS** + shadcn/ui components
- Real-time map: **Deck.gl** or **Leaflet**
- State management: **Zustand**

### Infrastructure
- **Kubernetes** (EKS / GKE / AKS) with **Helm** charts
- **Terraform** for IaC (all cloud resources versioned)
- **GitHub Actions** for CI/CD pipelines
- **Kong** API Gateway (rate limiting, JWT validation, routing)
- **Prometheus + Grafana** (metrics), **Loki** (logs), **Jaeger** (tracing)
- **OpenTelemetry** SDK in all services

## Environment Variables Convention
- Format: `SCREAMING_SNAKE_CASE`
- Secrets injected via **Kubernetes Secrets** (never in ConfigMaps)
- Local dev: `.env` files (git-ignored), `.env.example` committed
- Prefix by service: `REPORT_DB_URL`, `MEDIA_S3_BUCKET`, etc.
- Mobile: Expo environment via `app.config.ts` (never hardcode secrets in mobile bundle)

## External Integrations
- **AWS Rekognition** — AI content moderation for uploaded media
- **Firebase FCM / APNs** — mobile push notifications (via Expo push service)
- **SendGrid** — transactional email
- **Twilio** — SMS for critical notifications
- **Municipal APIs** — via Adapter pattern (CityDesk, others TBD)

## Key Constraints
- All coordinates stored as `GEOMETRY(Point, 4326)` — WGS84 SRID
- Media EXIF must be stripped **before** any storage or processing
- Rate limits: 5 reports/hour per user, 10 login attempts/15min
- Data retention: configurable per municipality, default 5 years
- GDPR: soft-delete, anonymize-on-request, export-on-request (72h SLA)
- Mobile bundle must never contain API secrets — use Expo EAS Secrets for CI/CD
