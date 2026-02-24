# Project Research Summary: AI Governance Hot Potato - v1.1 AI Arena

**Project:** AI Governance Hot Potato
**Domain:** Real-time multiplayer AI arena with WebSocket updates, AI agent integration, and spectator-only mode
**Researched:** 2026-02-24
**Confidence:** MEDIUM-HIGH (verified with official docs, multiple authoritative sources)

## Executive Summary

The v1.1 AI Arena milestone transforms the existing static AEL governance game into a real-time competitive experience where AI agents race on a map by answering governance questions. This is an emerging product category combining AI competition platforms with educational gaming — positioning it uniquely as "AI sport" where humans spectate AI agents competing on ethics and governance knowledge.

Expert research reveals this should be built as a **static frontend (GitHub Pages) + dynamic backend (Node.js on Render)** architecture. The frontend provides the spectator visualization while a Socket.io-powered backend handles real-time game state, AI agent coordination, and simultaneous turn resolution. This split approach keeps the existing GitHub Pages deployment while adding the necessary real-time capabilities without over-engineering.

The primary risks are **WebSocket connection management** (leaks can exhaust server memory), **AI API cost control** (unlimited OpenAI calls can generate surprise bills), and **state synchronization** (clients and server can drift without server-authoritative architecture). These are all well-understood problems with established patterns — the key is implementing them from day one rather than retrofitting.

## Key Findings

### Recommended Stack

Based on STACK.md research, the stack prioritizes familiarity, ecosystem fit, and cost control. Node.js + Express leverages existing JavaScript expertise from v1.0. Socket.io (not native WebSocket) provides automatic reconnection, room management, and HTTP fallbacks critical for games. PostgreSQL on Render's free tier handles structured game data with ACID guarantees.

**Core technologies:**
- **Node.js 20.x LTS**: Runtime — LTS stability, native fetch, async/await patterns
- **Express 4.x**: Web framework — Minimal, familiar, huge ecosystem
- **Socket.io 4.8.x**: WebSocket + real-time — Auto reconnection, rooms, fallbacks, battle-tested for games
- **PostgreSQL 15+**: Database — Structured game data, ACID consistency, Render free tier available
- **openai 4.98.x / @anthropic-ai/sdk 0.50.x**: AI integration — Official SDKs, streaming support
- **Render**: Hosting — Free tier (750 hrs/mo), GitHub integration, managed PostgreSQL

**Architecture approach:** Static GitHub Pages frontend communicates via CORS to Node.js backend on Render. Socket.io rooms isolate game sessions, and a queue-based AI processor respects rate limits.

### Expected Features

From FEATURES.md, this is a "spectator-only" AI competition platform where humans watch agents compete. The combination of AEL governance questions + simultaneous movement + reasoning display creates a unique educational positioning.

**Must have (table stakes):**
- Visual map with agent positions — Core of "map-based" concept
- Turn/move indicator — Spectators need to know game phase
- Question display with clear choices — Multiple choice format standard
- Immediate answer feedback — Visual indicator within 1 second
- Leaderboard/standings — Sorted ranking with progress
- Agent identification — Colors, icons, names on tokens
- Game session state — Waiting/playing/complete indicators
- Connection status — Online/offline per agent

**Should have (competitive):**
- AEL governance questions — Educational differentiation, unique to this domain
- Four-pillar scoring integration — Connects to v1.0 AEL framework
- Batch simultaneous movement — All agents answer same question, then all move (critical for spectator pacing)
- Agent decision reasoning display — Show WHY each agent chose answer
- Demo agent tournament system — StrictBot/LenientBot/BalancedBot racing each other
- Move history/trail — Shows where agents have been

**Defer (v1.2+):**
- Branching paths with strategic choices — Adds complexity without core value
- Replay system — Educational but not essential for launch
- Tournament brackets — Multi-game logic for v1.2+
- Multiple simultaneous games — Spectator chooses which to watch

**Critical insight:** Simultaneous turns are essential — sequential turns would kill spectator pacing. The "all agents move at once" approach provides real-time feel with manageable complexity.

### Architecture Approach

From ARCHITECTURE.md, the architecture follows a **static-dynamic split** pattern: GitHub Pages serves the spectator UI while a Render-hosted Node.js backend manages game state and AI coordination.

**Major components:**
1. **Static Frontend (GitHub Pages)** — UI rendering, spectator view, WebSocket client. Stays unchanged from v1.0 with added WebSocket capability.
2. **Express.js API Layer** — REST endpoints for game management, CORS-enabled for cross-origin communication.
3. **Socket.io Server** — Real-time bidirectional communication with rooms per game session (`/game/:id`, `/spectator/:id`).
4. **AI Service Layer** — Abstract OpenAI/Anthropic APIs with queue-based processing (BullMQ or p-queue) to respect rate limits.
5. **Game State Machine** — Explicit state transitions (INIT → AWAITING → PROCESS → RESOLVE) to eliminate race conditions.
6. **Database (SQLite for v1.1, PostgreSQL for scale)** — Persist game state, decision history, leaderboard.

**Integration pattern:** CORS-enabled backend accepts requests from `chunkstand.github.io`. WebSocket connections use Socket.io for automatic reconnection and room management.

### Critical Pitfalls

From PITFALLS.md, the top risks when building real-time games with AI integration:

1. **WebSocket Connection Leaks** — Each connection consumes ~16KB. Without heartbeat/ping-pong and explicit cleanup on close, memory grows until OOM kills. *Prevention: Implement 30s heartbeat, track `isAlive`, force terminate dead connections.*

2. **Reconnection Storms** — When server restarts, thousands of clients reconnect simultaneously without backoff, overwhelming the server. *Prevention: Exponential backoff with jitter (1000ms × 2^n + random), max 10 retry attempts.*

3. **OpenAI/Anthropic API Cost Explosion** — 10 concurrent games × 4 agents × 20 moves = 800 API calls. At $0.03/1K tokens = $24 per session. Run 100 sessions = $2,400 surprise bill. *Prevention: Token bucket rate limiter, response caching (5 min TTL), circuit breaker for failures, daily cost monitoring.*

4. **Game State Desynchronization** — Without server-authoritative architecture, clients show different states than server. *Prevention: Server is single source of truth, broadcast authoritative state with sequence numbers, client reconciliation with interpolation.*

5. **Concurrent Agent Race Conditions** — Node.js async I/O means interleaving between awaits. Two agents can read same position before either writes. *Prevention: Sequential processing queue or Redis atomic operations with locks.*

6. **Free Tier Sleep/Wake Cycles** — Render free tier spins down after 15 min idle. WebSocket connections drop, games in progress die. *Prevention: Use paid tier ($7/mo) for production, or implement 14-min keep-alive ping + state persistence for recovery.*

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation
**Rationale:** Infrastructure must be solid before building features. CORS, database, and deployment pipeline are prerequisites for everything else.
**Delivers:** Node.js + Express scaffold, SQLite schema, CORS configuration tested with GitHub Pages, Render deployment pipeline, API contract (OpenAPI/JSON Schema).
**Addresses:** Basic REST API, database schema (flexible JSONB pattern)
**Avoids:** Frontend/backend API mismatch, database migration hell, DevOps complexity

### Phase 2: Real-Time Core
**Rationale:** Socket.io is the critical path — everything else builds on real-time communication. Must handle connection management from day one.
**Delivers:** Socket.io server with namespaces/rooms, spectator room implementation (`/spectator/:id`), WebSocket client integration in frontend, server-authoritative game state, heartbeat/ping-pong, exponential backoff reconnection, basic state broadcast (mock data).
**Uses:** Socket.io 4.8.x, rooms pattern
**Implements:** Game State Machine pattern (INIT → AWAITING → PROCESS → RESOLVE)
**Avoids:** WebSocket connection leaks, reconnection storms, state desynchronization

### Phase 3: AI Integration
**Rationale:** AI agent processing must be rate-limited and cached before connecting to game logic. Cost explosion is a real financial risk.
**Delivers:** OpenAI/Anthropic API clients, queue-based processing (p-queue for demo), rate limiting (30 requests/min), response caching (5 min TTL), circuit breaker pattern, prompt engineering for governance decisions, decision parser/validation.
**Uses:** openai 4.98.x, @anthropic-ai/sdk 0.50.x, p-queue
**Avoids:** API cost explosion, rate limit cascading failures, latency breaking game flow

### Phase 4: Game Logic
**Rationale:** Once real-time layer and AI integration exist, the actual game mechanics can be implemented with confidence in the foundations.
**Delivers:** Linear map with checkpoints (10-15 spaces), simultaneous turn system (all agents answer, then all move), question/checkpoint system using v1.0 scenarios, movement resolution with conflict handling (agents can "tie" and both advance), win condition detection, leaderboard persistence, demo agent tournament (StrictBot/LenientBot/BalancedBot).
**Addresses:** Visual map, simultaneous movement, demo agent tournament, leaderboard, move history
**Implements:** CQRS Lite (separate read/write models for spectator optimization)
**Avoids:** Concurrent processing race conditions, message ordering issues

### Phase 5: Spectator Experience
**Rationale:** In a spectator-only product, the viewing interface IS the product. This phase brings all components together into the user-facing experience.
**Delivers:** Spectator view UI (HTML/CSS/JS), real-time map visualization with agent tokens, turn indicator and game phase display, question display with answer choices, immediate feedback (correct/incorrect), agent decision reasoning display, stakeholder impact visualization (from v1.0), leaderboard UI, game session management (create/join/spectate), error handling and recovery.
**Addresses:** All table stakes features, agent reasoning display, stakeholder impact visualization
**Avoids:** Frontend/backend API mismatch (already solved in Phase 1)

### Phase 6: Polish & Launch
**Rationale:** Optimization and edge cases after core experience works end-to-end.
**Delivers:** Response caching for common scenarios, agent personality profiles, end-to-end testing, deployment automation, monitoring (memory, connections, API costs), documentation.
**Avoids:** Underestimating DevOps (already addressed in Phase 1 with Docker Compose)

### Phase Ordering Rationale

**Why this order:**
1. **Infrastructure before features** — Phase 1 establishes CORS, database, deployment. Without these, Phase 2-5 can't integrate.
2. **Real-time before game logic** — Socket.io must exist before game state can be synchronized. Phase 2's connection management patterns enable everything else.
3. **AI integration isolated** — Phase 3 handles rate limiting and caching as a separate concern before connecting to game flow. This prevents the "API cost surprise" scenario.
4. **Game logic after foundations** — Phase 4 can focus on rules/mechanics because state management (Phase 2) and AI processing (Phase 3) are solved.
5. **Spectator experience last** — UI polish benefits from working backend. Building UI before backend leads to API mismatch (Pitfall 9).

**Grouping rationale:**
- Phases 1-2 are "backend infrastructure"
- Phase 3 is "external integration" (AI APIs)
- Phase 4 is "game domain logic"
- Phase 5 is "frontend/UX"
- Phase 6 is "production readiness"

**How this avoids pitfalls:**
- Phase 1: Strict CORS config prevents API mismatch later
- Phase 2: Heartbeat/ping-pong prevents connection leaks from day one
- Phase 3: Queue + rate limiter prevents cost explosion
- Phase 4: State machine + sequential queue prevents race conditions
- Phase 5: OpenAPI contract prevents frontend/backend drift

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (Game Logic):** Simultaneous turn resolution patterns — "what happens when agents land on same space" needs specific design choice (tie both advance? collision resolution?)
- **Phase 3 (AI Integration):** Prompt engineering for governance question answering — specific prompt patterns for getting structured decisions from GPT-4o/Claude
- **Phase 4 (Scoring System):** How to convert v1.0's 4-pillar impact scores into racing points — needs translation layer design

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Express + SQLite + CORS are well-documented patterns
- **Phase 2 (Real-Time Core):** Socket.io rooms and state machine patterns are standard
- **Phase 5 (Spectator Experience):** Mostly UI composition of existing v1.0 components

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official docs verified (npm, Socket.io, OpenAI, Anthropic), multiple 2025-2026 sources confirm Node.js + Socket.io for real-time games |
| Features | MEDIUM-HIGH | Table stakes well-documented from racing/trivia games; differentiators (AEL integration) have no direct precedents but combine established patterns |
| Architecture | MEDIUM-HIGH | Static-dynamic split is established pattern; Socket.io scaling patterns well-documented; game state machine is standard for turn-based games |
| Pitfalls | HIGH | WebSocket connection management, rate limiting, and state synchronization are well-documented problems with established solutions from 2025-2026 sources |

**Overall confidence:** MEDIUM-HIGH

Research provides solid foundation for all major decisions. The primary uncertainty is the novel combination of AEL governance + competitive racing — this creates opportunity for differentiation but requires validation during implementation.

### Gaps to Address

| Gap | How to Handle |
|-----|---------------|
| Simultaneous turn conflict resolution | Needs design decision during Phase 4 planning: allow ties (both advance), implement collision resolution, or use speed-based priority |
| AI agent decision latency under load | Test during Phase 3: measure p50/p95/p99 latency, validate 5s timeout is appropriate, tune fallback strategies |
| Scoring translation (4 pillars → race points) | Validate during Phase 4: prototype scoring algorithm with sample scenarios, test with demo agents |
| Spectator UX heatmap (what draws attention) | Add analytics in Phase 5 to validate assumptions: track where spectators look, how long they watch, when they drop off |
| Concurrent game sessions on free tier | Test during Phase 1: verify Render free tier handles expected load, plan upgrade path if needed |

## Sources

### Primary (HIGH confidence)
- Socket.io Docs (v4) — Rooms, namespaces, reconnection patterns
- OpenAI Node SDK (v4.98.0) — API integration, rate limit handling
- Anthropic SDK (v0.50.4) — Claude 3.5 integration
- Render Free Tier Docs — Hosting limits, deployment patterns
- OneUptime Blog (Jan 2026) — WebSocket reconnection logic, performance, state management
- Ably Documentation — WebSocket scaling patterns

### Secondary (MEDIUM confidence)
- "Railway vs Heroku vs Render 2025" — Platform comparison
- "Building Real-Time Multiplayer Games with Socket.io" — JackJS.com
- Arena Protocol, AgentArcade, Microsoft Agents League — AI competition platform patterns
- BoardGame.io — Turn-based game state management patterns
- "Simultaneous Turns Analysis" (kvachev.com) — Parallel multiplayer design

### Tertiary (LOW confidence)
- CATArena research paper — Academic validation of competitive agent evaluation (indirectly applicable)
- VIBES research paper — Spectator interaction patterns (livestreaming domain, not games)

---

*Research completed: 2026-02-24*
*Ready for roadmap: yes*
