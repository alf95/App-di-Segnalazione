# Active Context

> **Last Updated**: 2025-06-22
> **Current Phase**: Architecture Definition / Project Bootstrap

## Current Focus

Defining the foundational architecture for the UrbanReport platform.
No code has been written yet — this is the **pre-development / design phase**.

## Decisions Made (This Session)

1. **Architecture style**: Event-Driven Microservices, starting as Majestic Monolith
2. **Primary geo-database**: PostgreSQL 16 + PostGIS 3.4 (non-negotiable)
3. **Mobile framework**: ~~Flutter~~ → **React Native with Expo SDK 51+** (TypeScript)
   - Rationale: full TypeScript stack alignment with NestJS backend, shared types/validators in monorepo, larger talent pool for JS teams
4. **Message broker**: Apache Kafka (vs RabbitMQ — chosen for persistence + replay)
5. **Analytics store**: ClickHouse (vs BigQuery — chosen for self-hosted flexibility)
6. **Deduplication radius**: 50 meters, same category, 30-day window
7. **Media flow**: Pre-signed S3 URL pattern (client uploads directly to S3)
8. **Priority algorithm**: Weighted score (category + confirmations + location risk + age)
9. **Monorepo structure**: Nx — enables shared `@urbanreport/types` and `@urbanreport/validators` packages across mobile, web admin, and backend services

## Open Questions / To Be Decided

- [ ] Cloud provider: AWS vs GCP vs Azure (or hybrid)?
- [ ] Municipality onboarding flow: self-service or manual admin setup?
- [ ] Anonymous reporting: allowed by default or opt-in?
- [ ] SLA enforcement: automatic escalation or just monitoring alerts?
- [ ] Expo managed workflow vs bare workflow? (managed recommended for MVP)

## Next Steps

1. Initialize monorepo structure (Nx)
2. Create shared packages: `@urbanreport/types`, `@urbanreport/validators` (zod)
3. Set up PostgreSQL schema with PostGIS migrations (Prisma)
4. Scaffold `report-service` with NestJS
5. Scaffold React Native app with Expo Router (file-based navigation)
6. Define Kafka topic schema (JSON Schema)
7. Set up GitHub Actions CI pipeline skeleton (including Expo EAS build)

## Active Work Streams

| Stream | Owner | Status |
|--------|-------|--------|
| Architecture design | @alfcola-eng | ✅ Complete |
| Mobile framework decision | @alfcola-eng | ✅ React Native (Expo) |
| Data model (PostgreSQL) | TBD | 🔲 Not started |
| report-service scaffold | TBD | 🔲 Not started |
| Mobile app scaffold (RN) | TBD | 🔲 Not started |
| Shared types package | TBD | 🔲 Not started |
| CI/CD pipeline | TBD | 🔲 Not started |
| Admin dashboard | TBD | 🔲 Not started |
