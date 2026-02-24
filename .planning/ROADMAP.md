# Roadmap: AI Arena v1.1

**Project:** AgentGameworks.com  
**Milestone:** v1.1 AI Arena  
**Created:** 2026-02-24  
**Depth:** Quick (6 phases)

## Overview

Transform the governance game into a real-time multiplayer arena where AI agents compete on a map by answering governance questions, with humans as spectators.

**Total v1.1 Requirements:** 38 (across 5 categories)

---

## Phases

- [ ] **Phase 3: Foundation** — Backend infrastructure, database, CORS, deployment
- [ ] **Phase 4: Real-Time Core** — Socket.io, rooms, game state machine, connection management
- [ ] **Phase 5: AI Integration** — OpenAI/Anthropic APIs, rate limiting, caching, circuit breaker
- [ ] **Phase 6: Game Logic** — Map, simultaneous turns, demo tournament, scoring
- [ ] **Phase 7: Spectator Experience** — Map visualization, leaderboard, reasoning display
- [ ] **Phase 8: Polish & Launch** — Optimization, monitoring, docs, production readiness

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 3. Foundation | 2/2 | ✅ Complete | 2026-02-24 |
| 4. Real-Time Core | 0/2 | Not started | - |
| 5. AI Integration | 0/2 | Not started | - |
| 6. Game Logic | 0/3 | Not started | - |
| 7. Spectator Experience | 0/2 | Not started | - |
| 8. Polish & Launch | 0/2 | Not started | - |

---

## Phase Details

### Phase 3: Foundation

**Goal:** Backend infrastructure operational, database accepting connections, and CORS-configured API accessible from GitHub Pages frontend.

**Depends on:** Phase 2 (v1.0 complete)

**Requirements:**
- INF-01: Node.js 20.x + Express backend server running on Render
- INF-02: PostgreSQL database schema for game sessions, agents, moves, and decisions
- INF-03: CORS configured to allow GitHub Pages frontend (chunkstand.github.io)
- INF-04: Environment configuration management (development, staging, production)
- INF-05: Health check endpoint returning 200 OK when services operational
- INF-06: API contract documented (OpenAPI/JSON Schema for endpoints)

**Success Criteria** (what must be TRUE):
1. Backend server responds to HTTP requests from chunkstand.github.io with CORS headers
2. Health endpoint returns 200 OK when all services (database, AI clients) are operational
3. Database accepts connections and persists game session records
4. Environment-specific configs work correctly (dev/staging/prod settings isolated)
5. API contract documentation matches actual endpoint behavior

**Plans:** 2 plans in 2 waves

Plans:
- [x] 03-01-PLAN.md — Backend server + database setup with strict config validation
- [x] 03-02-PLAN.md — CORS configuration + OpenAPI documentation

**Wave Structure:**
- Wave 1: 03-01 (Backend + Database + Config + Health check) — INF-01, INF-02, INF-04, INF-05 ✅ Complete
- Wave 2: 03-02 (CORS + API Documentation) — INF-03, INF-06 ✅ Complete

---

### Phase 4: Real-Time Core

**Goal:** WebSocket infrastructure operational with room isolation, spectator viewing, and robust connection management.

**Depends on:** Phase 3

**Requirements:**
- RTC-01: Socket.io server with namespace/room support for game isolation
- RTC-02: Spectator room implementation (`/spectator/:gameId`) for live viewing
- RTC-03: WebSocket client integration in existing frontend HTML/JS
- RTC-04: Server-authoritative game state broadcast to all connected spectators
- RTC-05: 30-second heartbeat/ping-pong for connection health monitoring
- RTC-06: Exponential backoff reconnection with jitter (max 10 retries)
- RTC-07: Connection status indicators showing online/offline per spectator

**Success Criteria** (what must be TRUE):
1. Multiple game sessions run in isolated Socket.io rooms without interference
2. Spectator can connect to `/spectator/:gameId` and receive live game state updates
3. Frontend displays real-time connection status (online/offline)
4. Server recovers from client disconnections using exponential backoff reconnection
5. Stale connections are detected via heartbeat and cleaned up within 60 seconds
6. Game state broadcast reaches all connected spectators within 500ms of state change

**Plans:** TBD

---

### Phase 5: AI Integration

**Goal:** AI agent processing operational with rate limiting, caching, fallback mechanisms, and cost controls preventing financial surprises.

**Depends on:** Phase 3

**Requirements:**
- AI-01: OpenAI API client integration with GPT-4o-mini for agent decisions
- AI-02: Rate limiting using token bucket (max 60 RPM per API key)
- AI-03: Response caching with 5-minute TTL for identical prompts
- AI-04: Queue-based sequential processing for agent decisions (p-queue or BullMQ)
- AI-05: Anthropic API client as fallback when OpenAI fails
- AI-06: Circuit breaker pattern for API failures (open after 5 errors, retry after 60s)
- AI-07: Daily cost monitoring with alerting threshold ($10/day)
- AI-08: Prompt engineering for governance question answering with consistent JSON output

**Success Criteria** (what must be TRUE):
1. AI agent responds to governance questions with structured decisions (answer choice + reasoning) within 5 seconds
2. Rate limiter prevents exceeding 60 requests per minute per API key
3. Identical prompts return cached responses within 5 minutes of first call
4. Anthropic API automatically used when OpenAI fails (circuit breaker open)
5. Daily API costs visible in monitoring dashboard with alert at $10 threshold
6. Queue processes agent decisions sequentially preventing race conditions

**Plans:** TBD

---

### Phase 6: Game Logic

**Goal:** Complete game mechanics functional with simultaneous turns, map-based movement, and demo agent tournament capability.

**Depends on:** Phase 4, Phase 5

**Requirements:**
- GM-01: Linear map with minimum 10 checkpoints from start to finish
- GM-02: Multiple-choice governance questions at each checkpoint
- GM-03: Simultaneous turn system — all agents answer same question, then all move
- GM-04: Move resolution based on answer correctness and speed
- GM-05: Position tracking and collision detection (agents can occupy same space)
- GM-06: AEL four-pillar scoring integration (affects movement bonuses)
- GM-07: Move history/trail visualization showing agent path
- GM-08: Demo agent tournament support (StrictBot, LenientBot, BalancedBot, GPT-4)
- GM-09: Game state machine (INIT → AWAITING_ANSWERS → PROCESSING → RESOLVED → FINISHED)
- GM-10: Answer time limit (30 seconds per question)

**Success Criteria** (what must be TRUE):
1. Map displays 10+ checkpoints in a linear path from start to finish
2. All registered agents receive the same governance question simultaneously
3. Agents move only after all answers submitted (simultaneous resolution)
4. Correct answers advance agents 1-2 spaces; incorrect answers advance 0-1 space based on AEL pillar alignment
5. Multiple agents can occupy the same checkpoint space without collision blocking
6. Game state transitions correctly: INIT → AWAITING_ANSWERS → PROCESSING → RESOLVED → FINISHED
7. Agent has 30 seconds to answer; unanswered questions treated as incorrect
8. Demo tournament with StrictBot, LenientBot, BalancedBot, and GPT-4 completes full game
9. Move history tracked showing each agent's path through checkpoints

**Plans:** TBD

---

### Phase 7: Spectator Experience

**Goal:** Spectators can view live games with real-time visualization, leaderboards, and agent reasoning.

**Depends on:** Phase 4, Phase 6

**Requirements:**
- UX-01: Visual map rendering with agent positions as tokens/icons
- UX-02: Turn/move indicator showing current game phase
- UX-03: Question display with 4 clear multiple-choice options
- UX-04: Immediate answer feedback visual indicator (< 1 second after all agents answer)
- UX-05: Leaderboard showing agent standings sorted by checkpoint progress
- UX-06: Agent identification with distinct colors, icons, and names
- UX-07: Game session state indicators (Waiting/Playing/Complete)
- UX-08: Agent decision reasoning display (show WHY agent chose answer)
- UX-09: Smooth animations for agent movement between checkpoints
- UX-10: Responsive design for mobile spectators

**Success Criteria** (what must be TRUE):
1. Spectator sees visual map with agent tokens positioned at correct checkpoints
2. Turn indicator clearly shows current phase: "Waiting for answers", "Processing moves", "Round complete"
3. Current question displays with 4 clearly labeled multiple-choice options (A, B, C, D)
4. Answer feedback (correct/incorrect) appears within 1 second after all agents respond
5. Leaderboard updates in real-time showing agents sorted by checkpoint progress
6. Each agent has unique color, icon, and name visible on map and leaderboard
7. Game status clearly indicates Waiting/Playing/Complete
8. Spectator can view each agent's reasoning for their answer choice
9. Agent movements animate smoothly between checkpoints (300-500ms transition)
10. UI is usable on mobile devices (iPhone/Android) in portrait orientation

**Plans:** TBD

---

### Phase 8: Polish & Launch

**Goal:** Production-ready system with performance optimization, monitoring, and documentation.

**Depends on:** Phase 3, Phase 5, Phase 6, Phase 7

**Requirements:** None (optimization of existing features)

**Success Criteria** (what must be TRUE):
1. API response time p95 < 200ms for cached responses, < 2s for AI decisions
2. Server memory usage stable under load (no leaks detected over 24-hour period)
3. WebSocket connection count visible in real-time monitoring dashboard
4. Daily AI API costs tracked and alerted if exceeding $10 threshold
5. Deployment pipeline works: push to main branch auto-deploys to Render
6. Error handling covers: AI API failures, database connection loss, WebSocket disconnections
7. Documentation complete: API reference, deployment guide, troubleshooting runbook

**Plans:** TBD

---

## Dependencies

```
Phase 3 (Foundation)
    ↓
Phase 4 (Real-Time Core) ←────┐
    ↓                          │
Phase 5 (AI Integration) ←─────┤ (both need Phase 3)
    ↓                          │
Phase 6 (Game Logic) ←─────────┘ (needs Phase 4 + Phase 5)
    ↓
Phase 7 (Spectator Experience) ←── (needs Phase 4 + Phase 6)
    ↓
Phase 8 (Polish & Launch) ←─────── (needs Phase 3, 5, 6, 7)
```

---

## Requirement Coverage

| Category | Requirements | Phase | Count |
|----------|--------------|-------|-------|
| Backend & Infrastructure (INF) | INF-01 to INF-06 | 3 | 6 |
| Real-time Communication (RTC) | RTC-01 to RTC-07 | 4 | 7 |
| AI Integration (AI) | AI-01 to AI-08 | 5 | 8 |
| Game Mechanics (GM) | GM-01 to GM-10 | 6 | 10 |
| Spectator Experience (UX) | UX-01 to UX-10 | 7 | 10 |
| **Total v1.1** | **38** | **3-8** | **38** |

**Coverage:** 38/38 requirements mapped ✓

---

## Notes

**Phase Numbering:** Starts at 3 because v1.0 MVP completed Phases 1-2.

**Critical Path:** Phase 3 → Phase 4 → Phase 6 → Phase 7  
(Without these, no playable game. Phase 5 and Phase 8 have some flexibility.)

**Research Flags:**
- Phase 4 (Game Logic): Simultaneous turn conflict resolution patterns need validation during planning
- Phase 3 (AI Integration): Prompt engineering for governance question answering needs specific design
- Phase 4 (Scoring): Translation of 4-pillar AEL scores to racing points needs prototype validation

**Risk Mitigation:**
- Phase 3 implements strict CORS → prevents API mismatch later
- Phase 4 implements heartbeat/ping-pong → prevents connection leaks
- Phase 5 implements rate limiting + circuit breaker → prevents cost explosion
- Phase 6 implements state machine + sequential queue → prevents race conditions

---

## History

### v1.0 MVP (Phases 1-2) — SHIPPED 2026-02-24
- Phase 1: MVP Launch
- Phase 2: AEL Framework Integration

See `.planning/milestones/v1.0-ROADMAP.md` for details.

---

*Last updated: 2026-02-24 — Phase 3 planning complete*
