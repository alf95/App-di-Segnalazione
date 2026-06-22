# Progress

## Roadmap

### Phase 1 — MVP (Target: Month 1–3)
- [ ] Monorepo setup (Nx)
- [ ] PostgreSQL + PostGIS schema + migrations
- [ ] `auth-service` integration (Keycloak)
- [ ] `report-service` — CRUD, state machine, deduplication, priority
- [ ] `media-service` — pre-signed upload, EXIF strip, resize
- [ ] Flutter mobile app — report creation, map view, offline queue
- [ ] GitHub Actions CI pipeline (lint, test, build, SAST)
- [ ] Kubernetes manifests + Helm charts (staging)

### Phase 2 — v1.0 (Target: Month 4–5)
- [ ] Push / email notifications (`notification-service`)
- [ ] Admin dashboard (Next.js) — map, workflow, report management
- [ ] AI content moderation (AWS Rekognition)
- [ ] Redis rate limiting at Kong gateway
- [ ] Blue/green production deployment
- [ ] E2E test suite (Playwright)

### Phase 3 — v1.5 (Target: Month 6–7)
- [ ] `analytics-service` — ClickHouse, KPI dashboard, heatmaps
- [ ] Automatic report aging + priority recalculation (cron)
- [ ] SLA monitoring + alerts
- [ ] GDPR export + anonymization endpoints
- [ ] Municipal API integration (`integration-service` + CityDesk adapter)

### Phase 4 — v2.0 (Target: Month 8–10)
- [ ] Gamification (reputation score, badges)
- [ ] AR overlay on map (mobile)
- [ ] Multi-municipality onboarding (self-service)
- [ ] OpenData export (GeoJSON, CSV)
- [ ] SDK for third-party municipality integrations

---

## Completed

| Date | Item |
|------|------|
| 2025-06-22 | Full architecture design documented |
| 2025-06-22 | Data model defined (PostgreSQL + PostGIS schema) |
| 2025-06-22 | CI/CD pipeline designed (GitHub Actions) |
| 2025-06-22 | Memory bank initialized for GitHub Copilot |

## Known Issues / Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Municipality API fragmentation | High | Adapter pattern per provider |
| Mobile offline sync conflicts | Medium | Last-write-wins + deduplication |
| Media storage costs at scale | Medium | Lifecycle policies on S3, WebP compression |
| GDPR compliance complexity | High | Legal review before go-live |
| Kafka operational overhead | Medium | Consider Kafka-less MVP with Redis pub/sub first |
