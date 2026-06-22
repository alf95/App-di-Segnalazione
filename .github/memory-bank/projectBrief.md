# Project Brief

## Project Name
**UrbanReport** — Urban Irregularity Reporting Platform

## Vision
A civic platform that empowers citizens to report urban irregularities (potholes,
illegal parking, broken streetlights, etc.) and enables municipalities to manage
and resolve them efficiently.

## Target Users

| Role | Description |
|------|-------------|
| `citizen` | Reports irregularities, confirms others' reports, follows status |
| `moderator` | Reviews submitted reports, flags spam or duplicates |
| `municipality_officer` | Manages assigned reports, updates status, posts official comments |
| `admin` | Full platform control, municipality management, analytics |

## Core Value Propositions
1. **Citizens**: Easy mobile-first reporting with offline support
2. **Municipalities**: Structured workflow + external API integration
3. **Everyone**: Transparency through public map and status tracking

## Key Functional Requirements
- Geo-located report submission with photo/video evidence
- Automatic deduplication of reports within 50m radius / same category / 30-day window
- Full report lifecycle: `draft → submitted → under_review → assigned → in_progress → resolved / rejected`
- Automatic priority scoring based on category weight, confirmations, location risk, and aging
- Push / email / SMS notifications for lifecycle events
- Offline-first mobile app with background sync queue
- Admin dashboard with real-time map and KPI analytics
- Integration with external municipal ticketing systems via Adapter pattern

## Out of Scope (v1)
- Payments or fines management
- Direct messaging between users
- AR overlay features (planned for v2)
- Gamification badges (planned for v1.5)
