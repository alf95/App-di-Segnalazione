# System Patterns

## 1. Report Lifecycle — State Machine

```
DRAFT → SUBMITTED → UNDER_REVIEW → ASSIGNED → IN_PROGRESS → RESOLVED
                                                           → REJECTED
                  → DUPLICATE (auto, on submission)
                  → REJECTED  (auto, on AI moderation failure)
```

- Transitions are validated server-side; invalid transitions return HTTP 422
- Every transition is recorded in `report_status_history` (immutable audit log)
- Only `municipality_officer` and `moderator` can move to `ASSIGNED` or `IN_PROGRESS`
- `resolved_at` timestamp is set only on `→ RESOLVED` transition

## 2. Deduplication Pattern

On every new report submission:
1. Query PostgreSQL for open reports within **50 meters** (same category, last 30 days)
2. If found → mark new report as `DUPLICATE`, link via `duplicate_of` FK, increment `confirmations_count` on original
3. If not found → proceed with normal creation flow
4. Deduplication runs **synchronously** before persisting the report

```sql
-- Core deduplication query
SELECT id FROM reports
WHERE category_id = $1
  AND status NOT IN ('rejected', 'duplicate', 'resolved')
  AND created_at > NOW() - INTERVAL '30 days'
  AND ST_DWithin(location::geography, ST_MakePoint($2,$3)::geography, 50)
ORDER BY confirmations_count DESC
LIMIT 1;
```

## 3. Priority Scoring Algorithm

Score is calculated on creation and recalculated on every confirmation:

```
score = (categoryWeight × 10)
      + min(confirmations × 5, 30)
      + (locationRisk × 15)
      + (hasMedia ? 5 : 0)
      + min(floor(ageHours / 24) × 2, 20)

critical : score ≥ 70
high     : score ≥ 45
normal   : score ≥ 20
low      : score  < 20
```

## 4. Media Upload Pattern — Pre-signed URL Flow

```
Client → POST /media/init → Service generates pre-signed S3 URL (15min TTL)
Client → PUT directly to S3 (bypasses service, reduces server load)
Client → POST /media/confirm → Service validates, publishes `media.uploaded` event
Worker → Consumes event: strip EXIF, resize, AI moderation, re-upload variants
Worker → Publishes `media.processed` → notifies client via WebSocket
```

- Never accept direct file uploads to the service itself
- Original file is always replaced with EXIF-stripped version
- Three variants: `thumb` (200×200 webp), `web` (800px webp), `full` (1920px jpeg)

## 5. Event-Driven Communication

All inter-service communication is **asynchronous via Kafka** except:
- Auth validation (synchronous HTTP via Kong)
- Real-time WebSocket updates (notification-service → client)

### Canonical Events

| Topic | Producer | Consumers |
|-------|----------|-----------|
| `report.created` | report-service | notification-service, analytics-service |
| `report.status_changed` | report-service | notification-service, analytics-service, integration-service |
| `report.confirmed` | report-service | notification-service |
| `media.uploaded` | media-service | media-worker |
| `media.processed` | media-worker | report-service, notification-service |
| `municipality.assigned` | report-service | notification-service, integration-service |

## 6. Municipal Integration — Adapter Pattern

```typescript
interface MunicipalityAdapter {
  submitReport(report: NormalizedReport): Promise<string>; // external ticket ID
  getTicketStatus(ticketId: string): Promise<ExternalStatus>;
  syncCategories(): Promise<ExternalCategory[]>;
  parseWebhook(payload: unknown): NormalizedStatusUpdate;
}
```

- Each municipality gets its own adapter class (e.g., `CityDeskAdapter`, `OpenCivicAdapter`)
- `AdapterFactory` resolves the correct adapter by municipality `code`
- Inbound webhooks are verified via **HMAC-SHA256 signature** before processing

## 7. Geo-Query Conventions

- Always cast to `::geography` for meter-accurate distance calculations
- Use `ST_DWithin` (index-friendly) instead of `ST_Distance` in WHERE clauses
- All stored points use **SRID 4326** (WGS84)
- Reverse geocoding (coordinates → address) is done asynchronously post-creation

## 8. API Response Conventions

- Success: standard HTTP 200/201/204
- Errors: **RFC 7807** Problem Details
  ```json
  { "type": "...", "title": "...", "status": 422, "detail": "...", "instance": "..." }
  ```
- Pagination: cursor-based for lists (`?after=<cursor>&limit=<n>`)
- All timestamps in **ISO 8601 UTC** (`2024-06-22T10:30:00Z`)
- Coordinates always as `{ "latitude": 45.46, "longitude": 9.19 }`

## 9. GDPR Patterns

- **Soft delete**: set `deleted_at`, never `DELETE FROM`
- **Anonymize on request**: null out PII fields, set `is_anonymous = true`, keep report content
- **Data export**: ZIP of JSON files delivered via email within 72h
- **EXIF stripping**: mandatory, synchronous, before any storage
- **Audit log**: `report_status_history` is append-only, no updates or deletes allowed

## 10. Rate Limiting Rules

Applied at Kong API Gateway level:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /reports` | 5 | 1 hour |
| `POST /reports/:id/confirm` | 50 | 1 day |
| `POST /auth/login` | 10 | 15 min |
| `POST /media` | 20 | 1 hour |
