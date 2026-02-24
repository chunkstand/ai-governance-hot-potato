# Phase 3: Foundation - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Backend infrastructure operational: Node.js 20.x + Express server running on Render, PostgreSQL database with schema for game sessions/agents/moves/decisions, CORS-configured API accessible from GitHub Pages frontend (chunkstand.github.io), environment configuration management, health check endpoint, and documented API contract (OpenAPI/JSON Schema).

This phase delivers the foundation that Phases 4-8 build upon. Without this infrastructure, no real-time gameplay, AI integration, or spectator experience is possible.

</domain>

<decisions>
## Implementation Decisions

### Deployment approach
- **Environments:** Staging + production (two separate Render instances)
- **Rollback:** Automatic rollback on health check failure
- **Other deployment details:** Claude's discretion (auto vs manual triggers, GitHub Actions CI/CD level)

### Database hosting
- **Service:** Render free PostgreSQL tier (30-day data retention limit)
- **Backups:** None required for v1.1 — game data is ephemeral per-session
- **Acceptance:** Data loss after 30 days is acceptable for demo/early version
- **Schema migrations:** Claude's discretion (ORM vs manual SQL files)
- **Development setup:** Claude's discretion (local PostgreSQL vs SQLite)

### API structure
- **OpenAPI specification:** Full spec with complete request/response examples
- **Error format:** Simple JSON structure `{error: "message"}`
- **Endpoint naming:** Claude's discretion (follow Express/Node conventions)
- **API versioning:** Claude's discretion (URL vs header vs none for v1.1)

### Configuration management
- **Validation:** Strict validation on startup — application refuses to start if required environment variables are missing or invalid
- **Environment structure:** Claude's discretion (single vs multiple .env files)
- **Secret management:** Claude's discretion (Render dashboard vs hybrid approach)
- **Dev/prod parity:** Claude's discretion (identical vs flexible)

### Claude's Discretion
The following areas are left to Claude's implementation judgment:
- Automated vs manual deployment triggers
- GitHub Actions CI/CD complexity level
- Database migration tool choice
- Development database setup (considering local space constraints)
- RESTful endpoint naming conventions
- API versioning strategy
- Environment file organization
- Secret management approach
- Development/production environment parity strategy

</decisions>

<specifics>
## Specific Ideas

- Must use Render free tier to keep costs minimal
- CORS must explicitly allow chunkstand.github.io origin
- Health check endpoint should verify database connectivity, not just return 200
- API contract documentation should be useful for Phase 7 (Spectator Experience) frontend development
- Configuration should fail fast — don't run with missing critical env vars

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 3 scope (backend infrastructure only).

WebSocket implementation, AI integration, game mechanics, and spectator UI belong in Phases 4-8 respectively.

</deferred>

---

*Phase: 03-foundation*
*Context gathered: 2026-02-24*
