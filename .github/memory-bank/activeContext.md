# Active Context

> **Last Updated**: 2025-06-22
> **Current Phase**: Architecture Definition / Project Bootstrap

## Current Focus

Defining the foundational architecture for the UrbanReport platform.
No code has been written yet — this is the **pre-development / design phase**.

## Decisions Made (This Session)

1. **Architecture style**: Event-Driven Microservices, starting as Majestic Monolith
2. **Primary geo-database**: PostgreSQL 16 + PostGIS 3.4 (non-negotiable)
3. **Mobile framework**: Flutter (single codebase iOS + Android)
4. **Message broker**: Apache Kafka (vs RabbitMQ — chosen for persistence + replay)
5. **Analytics store**: ClickHouse (vs BigQuery — chosen for self-hosted flexibility)
6. **Deduplication radius**: 50 meters, same category, 30-day window
7. **Media flow**: Pre-signed S3 URL pattern (client uploads directly to S3)
8. **Priority algorithm**: Weighted score (category + confirmations + location risk + age)

## Open Questions / To Be Decided

- [ ] Cloud provider: AWS vs GCP vs Azure (or hybrid)?
- [ ] Monorepo tool: Nx vs Turborepo?
- [ ] Municipality onboarding flow: self-service or manual admin setup?
- [ ] Anonymous reporting: allowed by default or opt-in?
- [ ] SLA enforcement: automatic escalation or just monitoring alerts?

## Next Steps

1. Initialize monorepo structure (Nx recommended)
2. Set up PostgreSQL schema with PostGIS migrations (Prisma)
3. Scaffold `report-service` with NestJS
4. Define Kafka topic schema (Avro or JSON Schema)
5. Set up GitHub Actions CI pipeline skeleton
6. Design Flutter app navigation and offline queue

## Active Work Streams

| Stream | Owner | Status |
|--------|-------|--------|
| Architecture design | @alfcola-eng | ✅ Complete |
| Data model (PostgreSQL) | TBD | 🔲 Not started |
| report-service scaffold | TBD | 🔲 Not started |
| Mobile app scaffold | TBD | 🔲 Not started |
| CI/CD pipeline | TBD | 🔲 Not started |
| Admin dashboard | TBD | 🔲 Not started |
