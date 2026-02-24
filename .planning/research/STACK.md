# Technology Stack: v1.1 AI Arena

**Project:** AI Governance Hot Potato - v1.1 AI Arena Milestone
**Domain:** Real-time multiplayer AI arena with WebSocket updates, AI agent integration, and spectator mode
**Researched:** 2026-02-24
**Confidence:** HIGH (verified with official docs, npm registries, and multiple sources)

## Executive Summary

For v1.1 AI Arena, we're adding a **Node.js + Express + Socket.io** backend to support real-time AI agent competitions while keeping the existing GitHub Pages frontend. This stack prioritizes:

1. **Familiarity** — Team already knows JavaScript from v1.0
2. **Ecosystem fit** — Socket.io is the battle-tested standard for real-time games
3. **Cost** — Render free tier covers hobby/demo needs
4. **Simplicity** — Single-server architecture, no premature optimization

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Node.js | 20.x LTS | Runtime | LTS stability, native fetch, async/await |
| Express | 4.x | Web framework | Minimal, familiar, huge ecosystem |
| Socket.io | 4.8.x | WebSocket + real-time | Automatic reconnection, rooms, fallbacks |

**Rationale:**
- **Node.js + Express**: Team already uses JavaScript for v1.0 frontend. No context-switching between languages. Express is the de facto standard for Node APIs.
- **Socket.io over native `ws`**: Socket.io provides critical features for games: automatic reconnection with exponential backoff, HTTP long-polling fallback (crucial for users behind corporate proxies), room-based broadcasting, and message acknowledgements. Native `ws` is lighter but requires rebuilding all these features manually. For a demo/side project, Socket.io's 10.4 kB client bundle is worth the DX savings.

### Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| PostgreSQL | 15+ | Game state, sessions, history | Structured data, ACID, Render free tier available |
| node-postgres (pg) | 8.x | Node.js driver | Async/await support, mature, performant |

**Rationale:**
- **PostgreSQL over MongoDB/SQLite**: Game data is relational (sessions → agents → moves → decisions). PostgreSQL provides ACID guarantees for game state consistency. 
- **Render free PostgreSQL**: 1GB storage, perfect for demo. 30-day expiration is acceptable for v1.1 (data is ephemeral per-session anyway).
- **SQLite not suitable**: Render free tier uses ephemeral filesystem — SQLite file would be lost on every spin-down.

### AI Integration

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| openai | 4.98.x | OpenAI API client | Official SDK, streaming support, types |
| @anthropic-ai/sdk | 0.50.x | Anthropic API client | Official SDK, Claude 3.5 Sonnet support |

**Rationale:**
- Both SDKs support streaming responses (useful for showing "thinking" states to spectators)
- **Cost management**: Implement response caching and rate limiting to control API spend
- **Model choice**: GPT-4o-mini and Claude 3.5 Haiku for cost-effective agent decisions (~$0.10-0.30 per 1K decisions)

### Infrastructure

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Render | N/A | Hosting platform | Free tier (750 hrs/mo), GitHub integration, managed PostgreSQL |
| GitHub Pages | N/A | Static frontend hosting | Already using, stays unchanged |
| cors | 2.x | Express middleware | Required for GitHub Pages → Render communication |

**Rationale:**
- **Render over Railway/Heroku**: 
  - Heroku eliminated free tier in 2024
  - Railway is usage-based ($5/mo minimum)
  - Render: 750 free instance hours/month, free PostgreSQL, automatic deploys from GitHub
- **Spin-down acceptable**: Render free tier spins down after 15 min idle (1 min cold start). For a demo arena with active spectators, this is acceptable. For always-on, upgrade to $7/mo starter.

### Development Tools

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| dotenv | 16.x | Environment variables | Standard for local dev, API key management |
| nodemon | 3.x | Dev auto-reload | DX improvement for backend development |
| vitest/jest | Latest | Testing | Unit tests for game logic, API handlers |

## Installation

```bash
# Create backend directory
mkdir backend && cd backend
npm init -y

# Core dependencies
npm install express@4 socket.io@4.8 pg@8 openai@4.98 @anthropic-ai/sdk@0.50 cors@2 dotenv@16

# Dev dependencies
npm install -D nodemon@3 vitest@latest
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     GITHUB PAGES                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Existing HTML/CSS/JS Frontend                       │  │
│  │  - Game board visualization                          │  │
│  │  - Spectator mode UI                                 │  │
│  │  - WebSocket client (Socket.io)                      │  │
│  └─────────────────────────────────────────────────────┘  │
│                    chunkstand.github.io                     │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS + WebSocket (wss://)
                     │ CORS enabled
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      RENDER BACKEND                         │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Node.js + Express                                  │  │
│  │  ┌───────────────────────────────────────────────┐ │  │
│  │  │ Socket.io Server                               │ │  │
│  │  │ - Room management (game sessions)              │ │  │
│  │  │ - Broadcasting (agent moves to spectators)    │ │  │
│  │  │ - Reconnection handling                        │ │  │
│  │  └───────────────────────────────────────────────┘ │  │
│  │  ┌───────────────────────────────────────────────┐ │  │
│  │  │ REST API                                       │ │  │
│  │  │ - Session creation/management                  │ │  │
│  │  │ - Agent registration                           │ │  │
│  │  │ - Leaderboard/history                          │ │  │
│  │  └───────────────────────────────────────────────┘ │  │
│  └─────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  PostgreSQL (Render managed)                       │  │
│  │  - Game sessions, agent states, moves, decisions  │  │
│  └─────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  AI Service Layer                                    │  │
│  │  - OpenAI API calls (gpt-4o-mini)                  │  │
│  │  - Anthropic API calls (claude-3.5-haiku)          │  │
│  │  - Response caching, rate limiting                  │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Integration Points

### Frontend → Backend Connection

Since GitHub Pages (frontend) and Render (backend) are different origins, CORS is required:

**Backend CORS Configuration:**
```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'https://chunkstand.github.io',           // GitHub Pages
    'https://agentgameworks.com',              // Custom domain (future)
    'http://localhost:3000'                    // Local dev
  ],
  methods: ['GET', 'POST'],
  credentials: true
}));
```

**Frontend Socket.io Client:**
```javascript
// In existing HTML/JS frontend
const socket = io('https://your-service.onrender.com', {
  transports: ['websocket', 'polling'],  // Fallback for proxies
  reconnection: true,
  reconnectionAttempts: 5
});
```

### WebSocket Message Patterns

For real-time agent position updates and spectator mode:

```javascript
// Server → Client: Agent movement broadcast
socket.emit('agent:move', {
  gameId: 'session-123',
  agentId: 'agent-456',
  position: { x: 5, y: 3 },
  timestamp: Date.now()
});

// Server → All spectators: Game state update
io.to('spectators:session-123').emit('game:state', {
  agents: [...],
  turn: 'agent-456',
  question: {...}
});

// Client → Server: Spectator joins
socket.emit('spectator:join', { gameId: 'session-123' });
```

### Database Schema (Simplified)

```sql
-- Game sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  status VARCHAR(20), -- 'waiting', 'active', 'completed'
  created_at TIMESTAMP DEFAULT NOW(),
  config JSONB
);

-- Agents in a session
CREATE TABLE agents (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  name VARCHAR(100),
  ai_provider VARCHAR(20), -- 'openai', 'anthropic', 'demo'
  ai_model VARCHAR(50),
  position INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0
);

-- Moves/decisions
CREATE TABLE moves (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  agent_id UUID REFERENCES agents(id),
  position INTEGER,
  decision VARCHAR(20), -- 'APPROVE', 'MODIFY', 'DENY'
  reasoning TEXT,
  question_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Backend Framework | Node.js/Express | Python/FastAPI | Team JS expertise, shared types with frontend |
| WebSocket Library | Socket.io | Native `ws` | `ws` requires manual reconnection, room management, fallback logic |
| Database | PostgreSQL | MongoDB | Game data is relational; PostgreSQL on Render free tier |
| Hosting | Render | Railway | Railway usage-based pricing ($5/mo min); Render has true free tier |
| Frontend Hosting | GitHub Pages | Vercel/Netlify | Already using, works great, free |

## What NOT to Add

| Technology | Why Avoid | What to Use Instead |
|------------|-----------|---------------------|
| Redis | Overkill for single-server hobby project | In-memory Map + PostgreSQL persistence |
| Docker | Adds complexity without benefit at this scale | Direct Node.js deploy on Render |
| Kubernetes | Massive overkill | Render's managed platform |
| Microservices | Unnecessary complexity | Single monolithic server |
| JWT Auth | Simple demo doesn't need full auth | Session tokens or simple API keys |
| GraphQL | REST + Socket.io covers all needs | Express REST routes |
| TypeScript (backend) | Adds build step for small project | Plain JavaScript for v1.1 |

## Cost Estimates (Hobby/Demo Scale)

| Service | Free Tier | Paid (if needed) |
|---------|-----------|------------------|
| Render Web Service | 750 hrs/mo | $7/mo starter |
| Render PostgreSQL | 1GB, 30-day limit | $15/mo starter |
| GitHub Pages | Unlimited | Free |
| OpenAI API | N/A | ~$0.10-0.30 per 1K decisions (GPT-4o-mini) |
| Anthropic API | N/A | ~$0.25-0.80 per 1K decisions (Claude Haiku) |

**Monthly estimate for active demo (100 games/day):**
- Render: $0 (free tier sufficient)
- AI APIs: ~$5-15 (depending on models used)
- **Total: $5-15/month**

## Implementation Checklist

- [ ] Initialize Node.js backend with Express
- [ ] Add Socket.io server with CORS configuration
- [ ] Create PostgreSQL schema on Render
- [ ] Implement OpenAI/Anthropic API clients with rate limiting
- [ ] Add game session management (create, join, spectate)
- [ ] Implement WebSocket message handlers for agent moves
- [ ] Add batch gameplay processing logic
- [ ] Update frontend to connect to backend WebSocket
- [ ] Deploy to Render and test CORS from GitHub Pages

## Sources

### Official Documentation
- Socket.io Docs: https://socket.io/docs/v4/ (HIGH confidence)
- OpenAI Node SDK: https://www.npmjs.com/package/openai v4.98.0 (HIGH confidence)
- Anthropic SDK: https://www.npmjs.com/package/@anthropic-ai/sdk v0.50.4 (HIGH confidence)
- ws library GitHub: https://github.com/websockets/ws v8.19.0 (HIGH confidence)
- Render Free Tier: https://docs.render.com/free (HIGH confidence)

### Research Articles
- "Railway vs Heroku vs Render: Complete Platform Comparison 2025" — Deploy.me (MEDIUM confidence)
- "Postgres vs. MongoDB: a Complete Comparison in 2025" — Bytebase (MEDIUM confidence)
- "Building Real-Time Multiplayer Games with Socket.io" — JackJS.com (MEDIUM confidence)
- Multiple GitHub open-source game projects using Socket.io + Node.js (MEDIUM confidence)

### Version Verification
- All package versions verified via npm registry as of 2026-02-24
- Node.js 20.x is current LTS (verified via nodejs.org)
