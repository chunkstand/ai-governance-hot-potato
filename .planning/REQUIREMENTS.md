# Requirements: AgentGameworks.com v1.1 AI Arena

**Defined:** 2026-02-24
**Core Value:** AI agents making governance decisions according to clear principles — demonstrated through competitive real-time gameplay with human spectators.

## v1.1 Requirements

Requirements for AI Arena milestone. Each maps to roadmap phases.

### Backend & Infrastructure (INF)

- [x] **INF-01**: Node.js 20.x + Express backend server running on Render
- [x] **INF-02**: PostgreSQL database schema for game sessions, agents, moves, and decisions
- [x] **INF-03**: CORS configured to allow GitHub Pages frontend (chunkstand.github.io)
- [x] **INF-04**: Environment configuration management (development, staging, production)
- [x] **INF-05**: Health check endpoint returning 200 OK when services operational
- [x] **INF-06**: API contract documented (OpenAPI/JSON Schema for endpoints)

### Real-time Communication (RTC)

- [x] **RTC-01**: Socket.io server with namespace/room support for game isolation
- [x] **RTC-02**: Spectator room implementation (`/spectator/:gameId`) for live viewing
- [ ] **RTC-03**: WebSocket client integration in existing frontend HTML/JS
- [ ] **RTC-04**: Server-authoritative game state broadcast to all connected spectators
- [ ] **RTC-05**: 30-second heartbeat/ping-pong for connection health monitoring
- [ ] **RTC-06**: Exponential backoff reconnection with jitter (max 10 retries)
- [ ] **RTC-07**: Connection status indicators showing online/offline per spectator

### AI Integration (AI)

- [x] **AI-01**: OpenAI API client integration with GPT-4o-mini for agent decisions
- [x] **AI-02**: Rate limiting using token bucket (max 60 RPM per API key)
- [x] **AI-03**: Response caching with 5-minute TTL for identical prompts
- [x] **AI-04**: Queue-based sequential processing for agent decisions (p-queue or BullMQ)
- [x] **AI-05**: Anthropic API client as fallback when OpenAI fails
- [x] **AI-06**: Circuit breaker pattern for API failures (open after 5 errors, retry after 60s)
- [x] **AI-07**: Daily cost monitoring with alerting threshold ($10/day)
- [x] **AI-08**: Prompt engineering for governance question answering with consistent JSON output

### Game Mechanics (GM)

- [x] **GM-01**: Linear map with minimum 10 checkpoints from start to finish
- [x] **GM-02**: Multiple-choice governance questions at each checkpoint
- [ ] **GM-03**: Simultaneous turn system — all agents answer same question, then all move
- [ ] **GM-04**: Move resolution based on answer correctness and speed
- [ ] **GM-05**: Position tracking and collision detection (agents can occupy same space)
- [x] **GM-06**: AEL four-pillar scoring integration (affects movement bonuses)
- [x] **GM-07**: Move history/trail visualization showing agent path
- [ ] **GM-08**: Demo agent tournament support (StrictBot, LenientBot, BalancedBot, GPT-4)
- [x] **GM-09**: Game state machine (INIT → AWAITING_ANSWERS → PROCESSING → RESOLVED → FINISHED)
- [x] **GM-10**: Answer time limit (30 seconds per question)

### Spectator Experience (UX)

- [ ] **UX-01**: Visual map rendering with agent positions as tokens/icons
- [ ] **UX-02**: Turn/move indicator showing current game phase
- [ ] **UX-03**: Question display with 4 clear multiple-choice options
- [ ] **UX-04**: Immediate answer feedback visual indicator (< 1 second after all agents answer)
- [ ] **UX-05**: Leaderboard showing agent standings sorted by checkpoint progress
- [ ] **UX-06**: Agent identification with distinct colors, icons, and names
- [ ] **UX-07**: Game session state indicators (Waiting/Playing/Complete)
- [ ] **UX-08**: Agent decision reasoning display (show WHY agent chose answer)
- [ ] **UX-09**: Smooth animations for agent movement between checkpoints
- [ ] **UX-10**: Responsive design for mobile spectators

## v2.0 Requirements (Deferred)

Future enhancements tracked but not in v1.1 scope.

### Advanced Gameplay

- **ADV-01**: Branching paths with strategic route choices
- **ADV-02**: Power-ups and special abilities for agents
- **ADV-03**: Variable checkpoint distances and difficulty

### Tournament System

- **TOUR-01**: Multi-game tournament brackets
- **TOUR-02**: Persistent leaderboard across sessions
- **TOUR-03**: Replay system with step-through

### Multi-Game Support

- **MULTI-01**: Multiple simultaneous games on same server
- **MULTI-02**: Spectator can choose which game to watch
- **MULTI-03**: Game creation and joining system

## Out of Scope

Explicitly excluded from v1.1. Documented to prevent scope creep.

| Feature | Reason | Considered For |
|---------|--------|----------------|
| Human players as agents | v1.1 is spectator-only; humans watch AI compete | v1.2 |
| Real-time voice/video | Complexity doesn't add governance value | Not planned |
| Native mobile app | Web-first approach with responsive design sufficient | v2.0+ |
| Blockchain/NFT integration | No educational value for governance learning | Not planned |
| Custom domain (agentgameworks.com) | DNS setup is infrastructure, not feature | v1.1 infra task |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INF-01 | Phase 3 | Complete |
| INF-02 | Phase 3 | Complete |
| INF-03 | Phase 3 | Pending |
| INF-04 | Phase 3 | Complete |
| INF-05 | Phase 3 | Complete |
| INF-06 | Phase 3 | Pending |
| RTC-01 | Phase 4 | Complete |
| RTC-02 | Phase 4 | Complete |
| RTC-03 | Phase 4 | Complete |
| RTC-04 | Phase 4 | Complete |
| RTC-05 | Phase 4 | Complete |
| RTC-06 | Phase 4 | Complete |
| RTC-07 | Phase 4 | Complete |
| AI-01 | Phase 5 | Complete |
| AI-02 | Phase 5 | Complete |
| AI-03 | Phase 5 | Complete |
| AI-04 | Phase 5 | Complete |
| AI-05 | Phase 5 | Complete |
| AI-06 | Phase 5 | Complete |
| AI-07 | Phase 5 | Complete |
| AI-08 | Phase 5 | Complete |
| GM-01 | Phase 6 | Complete |
| GM-02 | Phase 6 | Complete |
| GM-03 | Phase 6 | Pending |
| GM-04 | Phase 6 | Pending |
| GM-05 | Phase 6 | Pending |
| GM-06 | Phase 6 | Complete |
| GM-07 | Phase 6 | Complete |
| GM-08 | Phase 6 | Pending |
| GM-09 | Phase 6 | Complete |
| GM-10 | Phase 6 | Complete |
| UX-01 | Phase 7 | Pending |
| UX-02 | Phase 7 | Pending |
| UX-03 | Phase 7 | Pending |
| UX-04 | Phase 7 | Pending |
| UX-05 | Phase 7 | Pending |
| UX-06 | Phase 7 | Pending |
| UX-07 | Phase 7 | Pending |
| UX-08 | Phase 7 | Pending |
| UX-09 | Phase 7 | Pending |
| UX-10 | Phase 7 | Pending |

**Coverage:**
- v1.1 requirements: 38 total
- Mapped to phases: 38
- Unmapped: 0 ✓

**Phase Summary:**
- Phase 3 (Foundation): 6 requirements — INF-01 through INF-06
- Phase 4 (Real-Time Core): 7 requirements — RTC-01 through RTC-07
- Phase 5 (AI Integration): 8 requirements — AI-01 through AI-08
- Phase 6 (Game Logic): 10 requirements — GM-01 through GM-10
- Phase 7 (Spectator Experience): 10 requirements — UX-01 through UX-10

---
*Requirements defined: 2026-02-24*
*Last updated: 2026-02-25 after completing Phase 4 Plans 02-03*
