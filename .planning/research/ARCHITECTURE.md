# Architecture Research: AI Arena v1.1

**Domain:** Real-time multiplayer game backend with AI agent integration
**Researched:** 2026-02-24
**Confidence:** MEDIUM-HIGH (multiple authoritative sources from 2025-2026)

## System Overview

### New Architecture (v1.1)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        GitHub Pages (Static)                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Existing Game Frontend                        │   │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────────────────┐  │   │
│  │  │  HTML/CSS  │  │    JS      │  │    Spectator View       │  │   │
│  │  │   (UI)     │  │  (Client)  │  │  (New Real-time Layer)  │  │   │
│  │  └─────┬──────┘  └─────┬──────┘  └───────────┬──────────────┘  │   │
│  │        │               │                      │                  │   │
│  │        │         fetch() │ WebSocket          │                  │   │
│  └────────┼───────────────┼──────────────────────┼──────────────────┘   │
└───────────┼───────────────┼──────────────────────┼────────────────────────┘
            │               │                      │
            │         CORS-enabled               ws://
            │               │                      │
            ▼               ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Backend Server (Node.js)                          │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Express.js API Layer                          │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │    │
│  │  │ Game Session │  │  AI Service  │  │   Spectator API      │  │    │
│  │  │   Manager    │  │    Router    │  │  (Join/View/Stats)   │  │    │
│  │  └──────┬───────┘  └──────┬───────┘  └───────────┬──────────┘  │    │
│  │         │                 │                      │              │    │
│  └─────────┼─────────────────┼──────────────────────┼──────────────┘    │
│            │                 │                      │                   │
│  ┌─────────┴─────────────────┴──────────────────────┴───────────────┐  │
│  │              Socket.io WebSocket Server                           │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │  Rooms: /game/:sessionId  │  /spectator/:sessionId          │ │  │
│  │  │  Events: agent:move, agent:decision, game:state-update      │ │  │
│  └────┬─────────────────────────────────────────────────────────────┘ │  │
│       │                                                                │
│  ┌────┴─────────────────────────────────────────────────────────────┐ │
│  │                    AI Agent Service Layer                         │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────┐  │ │
│  │  │ OpenAI API  │  │Anthropic API│  │  Rate Limiter / Queue     │  │ │
│  │  │   Client    │  │   Client    │  │   (BullMQ / p-queue)      │  │ │
│  │  └──────┬──────┘  └──────┬──────┘  └────────────┬─────────────┘  │ │
│  │         │                  │                      │                │ │
│  │         └──────────────────┼──────────────────────┘                │ │
│  │                            │                                         │ │
│  │  ┌─────────────────────────┴─────────────────────────────────────┐   │ │
│  │  │                    Batch Processor                             │   │ │
│  │  │         (Process multiple agent decisions concurrently)          │   │ │
│  └──────────────────────────────────────────────────────────────────┘   │ │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │                    Game State Machine                              │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │   │
│  │  │  INIT    │→ │ AWAITING │→ │ PROCESS  │→│ RESOLVE  │        │   │
│  │  │          │  │ DECISIONS│  │ MOVES    │  │ OUTCOMES │        │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │   │
│  │         ↑__________________________________________│              │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
            │
            │ SQLite / PostgreSQL
            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Database Layer                                    │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │   │
│  │  │Game Sessions │  │Agent Decisions│  │ Leaderboard / History    │ │   │
│  │  │  (state)     │  │   (log)      │  │   (analytics)            │ │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘ │   │
│  └───────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation Notes |
|-----------|----------------|---------------------|
| **Static Frontend** | UI rendering, spectator view, API/WebSocket client | Stays on GitHub Pages; adds WebSocket client capability |
| **Express.js API** | REST endpoints for game management, agent registration | Stateless, CORS-enabled for GitHub Pages origin |
| **Socket.io Server** | Real-time bidirectional communication with spectators | Rooms per game session, namespaces for concerns |
| **AI Service Layer** | Abstract OpenAI/Anthropic APIs, handle rate limiting | Queue-based processing to respect API limits |
| **Batch Processor** | Execute multiple agent decisions concurrently | Controls concurrency to prevent rate limit errors |
| **Game State Machine** | Manage game phases, coordinate agent turns, resolve outcomes | Deterministic state transitions, persisted to DB |
| **Database** | Persist game state, decision history, leaderboard | SQLite for demo simplicity, PostgreSQL for scale |

## Integration: Static Frontend ↔ Dynamic Backend

### The Challenge

GitHub Pages serves static content from `chunkstand.github.io` (or custom domain). The backend runs on a different origin (e.g., `ai-arena-backend.onrender.com`). Browsers enforce Same-Origin Policy for security.

### Solution: CORS-Enabled Backend

```javascript
// Backend: Express.js CORS configuration
const cors = require('cors');

const corsOptions = {
  origin: [
    'https://chunkstand.github.io',           // GitHub Pages
    'https://agentgameworks.com',            // Custom domain (when ready)
    'http://localhost:3000'                   // Local development
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true                          // If using cookies/sessions
};

app.use(cors(corsOptions));
```

### Frontend Integration Pattern

```javascript
// Frontend: API client utility
const API_BASE = 'https://ai-arena-backend.onrender.com';
const WS_BASE = 'wss://ai-arena-backend.onrender.com';

// REST API calls
async function createGameSession() {
  const response = await fetch(`${API_BASE}/api/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return response.json();
}

// WebSocket connection for real-time updates
const socket = io(WS_BASE, {
  query: { sessionId: 'game-123', role: 'spectator' }
});

socket.on('agent:move', (data) => {
  updateMapVisualization(data.agentId, data.position);
});

socket.on('game:state-update', (state) => {
  updateSpectatorView(state);
});
```

### WebSocket Room Strategy

| Room Pattern | Purpose | Example |
|-------------|---------|---------|
| `/game/:id` | All participants in a game | `game-abc-123` |
| `/spectator/:id` | Spectators watching a game | `spectator-abc-123` |
| `/agent/:id` | Direct messages to specific agent | `agent-agent-001` |

## Game State Synchronization

### Data Flow: Agent Decision → Movement → Broadcast

```
Agent Turn Triggered
       ↓
┌──────────────────────┐
│  Game State Machine  │
│  transitions to      │
│  AWAITING_DECISIONS  │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│  Batch Processor     │
│  calls AI APIs       │
│  (with rate limiting)│
└──────────┬───────────┘
           ↓
┌──────────────────────┐     ┌──────────────────────┐
│  AI Response         │────→│  Decision Parser     │
│  (JSON decision)     │     │  validates format    │
└──────────────────────┘     └──────────┬───────────┘
                                          ↓
                               ┌──────────────────────┐
                               │  Game State Machine    │
                               │  transitions to        │
                               │  PROCESS_MOVES         │
                               └──────────┬───────────┘
                                          ↓
                               ┌──────────────────────┐
                               │  Update positions      │
                               │  Check win conditions  │
                               │  Persist to DB         │
                               └──────────┬───────────┘
                                          ↓
┌─────────────────────────────────────────┴─────────────────────────┐
│                     Socket.io Broadcast                            │
│  io.to('game-abc-123').emit('game:state-update', newState)       │
│  io.to('spectator-abc-123').emit('agent:move', moveData)        │
└───────────────────────────────────────────────────────────────────┘
           ↓
┌───────────────────────────────────────────────────────────────────┐
│                     All Connected Clients                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Spectator 1 │  │ Spectator 2 │  │ Spectator 3 │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└───────────────────────────────────────────────────────────────────┘
```

## Concurrent AI Agent Management

### The Rate Limiting Challenge

OpenAI/Anthropic APIs have strict rate limits:
- **Requests per minute (RPM):** 60-500 depending on tier
- **Tokens per minute (TPM):** 40,000-2M depending on tier
- **Concurrent requests:** Limited by rate limits

**Problem:** 8 agents making simultaneous decisions = 8 API calls. If running 3 game sessions concurrently = 24 calls/minute. Easy to hit limits.

### Solution: Queue-Based Processing

```javascript
// Using BullMQ with Redis
const { Queue, Worker } = require('bullmq');
const { Redis } = require('ioredis');

const connection = new Redis(process.env.REDIS_URL);

// Queue for AI decision requests
const aiDecisionQueue = new Queue('ai-decisions', { connection });

// Rate-limited worker: max 10 jobs per 10 seconds = 60 RPM
const worker = new Worker('ai-decisions', async (job) => {
  const { agentId, scenario, gameSessionId } = job.data;
  
  // Call OpenAI/Anthropic API
  const decision = await callAIAgent(agentId, scenario);
  
  // Emit result to game state manager
  await processAgentDecision(gameSessionId, agentId, decision);
  
}, {
  connection,
  limiter: {
    max: 10,           // Max jobs
    duration: 10000    // Per 10 seconds
  },
  concurrency: 3       // Process up to 3 concurrently (stays under limits)
});

// Add batch of agent decisions
async function queueAgentDecisions(agents, scenario, sessionId) {
  const jobs = agents.map(agent => ({
    name: 'ai-decision',
    data: {
      agentId: agent.id,
      scenario,
      gameSessionId: sessionId
    },
    opts: {
      attempts: 3,                    // Retry on failure
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    }
  }));
  
  await aiDecisionQueue.addBulk(jobs);
}
```

### Alternative: p-queue (Simpler, No Redis)

```javascript
// For demo/small scale without Redis
const PQueue = require('p-queue');

const aiQueue = new PQueue({
  concurrency: 2,      // Max 2 concurrent API calls
  interval: 60000,   // Per minute
  intervalCap: 30    // Max 30 calls per minute
});

async function processAgentDecision(agent, scenario) {
  return aiQueue.add(async () => {
    const decision = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: buildPrompt(agent, scenario)
    });
    return parseDecision(decision);
  });
}
```

### Batch Processing Strategy

| Approach | Pros | Cons | When to Use |
|----------|------|------|-------------|
| **Sequential** | Simple, guaranteed rate limit compliance | Slow (8 agents × 2s = 16s per turn) | Testing, <4 agents |
| **Limited Concurrency** | Balance speed/safety | Slightly complex | 4-10 agents, production |
| **Full Parallel** | Fastest | Risk of rate limits | Cached responses, own model |
| **BullMQ** | Production-grade, retries, monitoring | Requires Redis | Multiple game sessions |
| **p-queue** | Simple, no infrastructure | Limited features | Demo, single session |

## Database Strategy

### SQLite (Recommended for v1.1 Demo)

```javascript
// Using better-sqlite3 for synchronous operations
const Database = require('better-sqlite3');
const db = new Database('/data/game-state.db');

// Schema
const schema = `
CREATE TABLE IF NOT EXISTS game_sessions (
  id TEXT PRIMARY KEY,
  status TEXT CHECK(status IN ('waiting', 'active', 'completed')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  winner_id TEXT
);

CREATE TABLE IF NOT EXISTS agent_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  agent_id TEXT,
  turn_number INTEGER,
  position_before TEXT,
  decision JSON,
  position_after TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leaderboard (
  agent_id TEXT PRIMARY KEY,
  wins INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER
);
`;

db.exec(schema);
```

**Why SQLite for v1.1:**
- Zero setup, single file
- Sufficient for demo scale (10-100 concurrent users)
- Works on Render/Railway free tier with disk persistence
- Can migrate to PostgreSQL later without code changes (via Prisma/ORM)

### PostgreSQL (Future Scale)

- Use when: >100 concurrent spectators, multiple concurrent games, need analytics
- Managed options: Railway PostgreSQL ($5/mo), Supabase free tier, Neon

## Architectural Patterns

### Pattern 1: Game State Machine

**What:** Explicit state machine managing game phases
**When to use:** Any turn-based or phase-based game
**Trade-offs:** More code upfront, but eliminates race conditions

```javascript
const gameStates = {
  WAITING_FOR_PLAYERS: 'waiting',
  AWAITING_DECISIONS: 'awaiting_decisions',
  PROCESSING_MOVES: 'processing_moves',
  RESOLVING_OUTCOMES: 'resolving_outcomes',
  GAME_OVER: 'game_over'
};

class GameStateMachine {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.state = gameStates.WAITING_FOR_PLAYERS;
    this.agents = new Map();
    this.pendingDecisions = new Map();
  }

  async transition(newState, data) {
    // Validate transition is allowed
    if (!this.isValidTransition(this.state, newState)) {
      throw new Error(`Invalid transition: ${this.state} → ${newState}`);
    }

    // Execute exit actions for current state
    await this.onExitState(this.state);

    // Update state
    this.state = newState;

    // Execute entry actions for new state
    await this.onEnterState(newState, data);

    // Persist to database
    await this.persistState();

    // Broadcast to spectators
    this.broadcastStateChange();
  }

  async onEnterState(state, data) {
    switch(state) {
      case gameStates.AWAITING_DECISIONS:
        // Start timer, queue AI API calls
        await this.startDecisionPhase();
        break;
      case gameStates.PROCESSING_MOVES:
        // Resolve all agent moves
        await this.resolveMoves();
        break;
    }
  }
}
```

### Pattern 2: CQRS Lite (Command Query Responsibility Segregation)

**What:** Separate read and write models
**When to use:** When spectators need different data than the game engine
**Trade-offs:** More complexity, better performance

```javascript
// Commands (mutations)
class GameCommands {
  async createSession(config) { }
  async submitDecision(sessionId, agentId, decision) { }
  async advanceTurn(sessionId) { }
}

// Queries (reads)
class GameQueries {
  async getSpectatorView(sessionId) {
    // Optimized projection for spectators
    return {
      mapState: ...,      // Current positions
      recentEvents: ...,  // Last 10 moves
      leaderboard: ...     // Current standings
    };
  }

  async getAgentView(sessionId, agentId) {
    // Only what this agent needs
    return {
      myPosition: ...,
      visibleNeighbors: ...,
      currentScenario: ...
    };
  }
}
```

### Pattern 3: Event Sourcing Lite

**What:** Store events as source of truth, derive state
**When to use:** Need full history, replay capability
**Trade-offs:** More storage, powerful audit/debugging

```javascript
// Events are the source of truth
const events = [
  { type: 'GAME_STARTED', timestamp: '2026-02-24T10:00:00Z', data: { agents: [...] } },
  { type: 'AGENT_DECIDED', timestamp: '2026-02-24T10:00:05Z', data: { agentId: 'A1', decision: {...} } },
  { type: 'AGENT_MOVED', timestamp: '2026-02-24T10:00:06Z', data: { agentId: 'A1', from: 0, to: 3 } },
  // ...
];

// Current state is a reduction of events
function computeCurrentState(events) {
  return events.reduce((state, event) => {
    switch(event.type) {
      case 'AGENT_MOVED':
        state.positions[event.data.agentId] = event.data.to;
        return state;
      // ...
    }
  }, initialState);
}
```

**Recommendation for v1.1:** Use Pattern 1 (State Machine) with event logging for history. Full CQRS/Event Sourcing is overkill for demo scale.

## Build Order (Dependency-Based)

```
Phase 1: Foundation (Week 1)
├── 1.1 Project scaffold (Express + TypeScript)
├── 1.2 Database setup (SQLite schema)
├── 1.3 Basic REST API (create/join game endpoints)
└── 1.4 CORS configuration (test with GitHub Pages)

Phase 2: Real-Time Layer (Week 1-2)
├── 2.1 Socket.io setup with namespaces
├── 2.2 Spectator room implementation
├── 2.3 Frontend WebSocket client integration
└── 2.4 Basic state broadcast (mock data)

Phase 3: AI Integration (Week 2)
├── 3.1 OpenAI API client with error handling
├── 3.2 Rate limiter implementation (p-queue or BullMQ)
├── 3.3 Prompt engineering for governance decisions
├── 3.4 Decision parser and validation
└── 3.5 Agent decision → game state integration

Phase 4: Game Logic (Week 2-3)
├── 4.1 Map/board data structure
├── 4.2 Question/checkpoint system
├── 4.3 Movement resolution logic
├── 4.4 Win condition detection
└── 4.5 Leaderboard persistence

Phase 5: Integration & Polish (Week 3)
├── 5.1 Frontend spectator view (HTML/CSS)
├── 5.2 Real-time map visualization
├── 5.3 Game session management UI
├── 5.4 Error handling and recovery
├── 5.5 Deploy to Render/Railway
└── 5.6 End-to-end testing

Phase 6: Optimization (Week 4 - if time)
├── 6.1 Redis adapter for Socket.io scaling
├── 6.2 BullMQ production setup
├── 6.3 Response caching for common scenarios
├── 6.4 Agent personality profiles
└── 6.5 Tournament/bracket mode
```

**Critical Path:** 1.1 → 1.4 → 2.1 → 2.4 → 3.1 → 3.4 → 4.2 → 5.5

## Scaling Considerations

| Scale | Concurrent Users | Architecture Adjustments |
|-------|-----------------|--------------------------|
| **Demo** | 1-10 spectators | Single Node.js process, SQLite, p-queue |
| **Small** | 10-100 spectators | Single Node.js, SQLite, BullMQ with Redis |
| **Medium** | 100-1K spectators | Socket.io Redis adapter, PostgreSQL |
| **Large** | 1K+ spectators | Horizontal scaling, load balancer with sticky sessions |

### What Breaks First

1. **OpenAI API limits** → Implement aggressive caching, response queuing
2. **WebSocket connections** → Add Redis adapter, scale horizontally
3. **Database writes** → Add connection pooling, read replicas
4. **Memory usage** → Add response streaming, limit concurrent games

## Anti-Patterns to Avoid

### Anti-Pattern 1: Synchronous AI Calls in Game Loop

**What people do:** Call OpenAI API directly in game loop, block until response

```javascript
// BAD: Blocks entire game
for (const agent of agents) {
  const decision = await callOpenAI(agent.prompt);  // 2-5 seconds each!
  processDecision(decision);
}
// 8 agents × 3 seconds = 24 seconds of blocking!
```

**Why it's wrong:** 
- One slow AI response blocks all other agents
- No rate limiting = 429 errors
- Game appears frozen to spectators

**Do this instead:**
```javascript
// GOOD: Queue-based with timeout
const decisions = await Promise.allSettled(
  agents.map(agent => 
    Promise.race([
      aiQueue.add(() => callOpenAI(agent.prompt)),
      timeout(5000)  // Max 5 seconds per agent
    ])
  )
);
// Process all decisions together when ready
```

### Anti-Pattern 2: Storing WebSocket State in Memory Only

**What people do:** Keep game state only in JavaScript objects, no persistence

**Why it's wrong:**
- Server restart = all games lost
- Can't recover from crashes
- Can't scale horizontally

**Do this instead:**
- Persist game state to database after each phase transition
- Rebuild state from DB on server restart
- Use Redis for transient WebSocket room state

### Anti-Pattern 3: Broadcasting Everything to Everyone

**What people do:** `io.emit()` for all events

**Why it's wrong:**
- Spectators receive data meant for agents
- Wasted bandwidth
- Security: agents could see each other's "secret" decisions

**Do this instead:**
```javascript
// Use rooms for targeted broadcasting
io.to(`game:${sessionId}`).emit('state-update', publicState);
io.to(`spectator:${sessionId}`).emit('spectator-view', spectatorState);
socket.emit('your-decision-result', privateResult);  // Single agent
```

### Anti-Pattern 4: Ignoring API Error Handling

**What people do:** Assume AI API always succeeds

**Why it's wrong:**
- Rate limits will be hit
- Network errors happen
- Invalid JSON responses break parsing

**Do this instead:**
```javascript
async function callAIWithFallback(prompt) {
  const providers = [openai, anthropic];  // Try multiple
  
  for (const provider of providers) {
    try {
      return await callWithRetry(provider, prompt);
    } catch (err) {
      if (err.status === 429) continue;  // Try next provider
      throw err;
    }
  }
  
  // Ultimate fallback: deterministic decision
  return generateDeterministicDecision(prompt);
}
```

## Deployment Architecture

### Render (Recommended for v1.1)

```yaml
# render.yaml
services:
  - type: web
    name: ai-arena-backend
    runtime: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: ai-arena-db
          property: connectionString
      - key: OPENAI_API_KEY
        sync: false
      - key: ANTHROPIC_API_KEY
        sync: false

databases:
  - name: ai-arena-db
    databaseName: aiarena
    user: aiarena
```

**Render Benefits:**
- Free tier: Web service + SQLite (disk persists)
- Automatic HTTPS (required for WebSocket wss://)
- 100-minute timeout (vs Heroku's 30s)
- Simple Git-based deploys

### Alternative: Railway

- Usage-based pricing (can be cheaper for sporadic demo use)
- Better for high-traffic periods
- Requires credit card even for free tier

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| API key exposure | Store in env vars, never in frontend |
| CORS abuse | Whitelist only GitHub Pages + custom domain |
| Game state tampering | Validate all decisions server-side |
| DoS via game creation | Rate limit game creation per IP |
| Prompt injection | Sanitize agent responses, validate JSON schema |

## Sources

- **Socket.io Documentation** (socket.io/docs/v4/) — Rooms, Namespaces, Redis Adapter
- **OpenAI Rate Limiting Guide** (cookbook.openai.com) — Rate limit handling patterns
- **BullMQ Documentation** (docs.bullmq.io) — Queue patterns, rate limiting
- **Render Documentation** (render.com/docs) — Deployment patterns for Node.js
- **MDN CORS Guide** (developer.mozilla.org) — Cross-origin request handling
- **"How I processed 2,000 concurrent OpenAI requests"** (dev.to, Dec 2025) — Batch processing patterns
- **"Building a Real-Time Multiplayer Game Server with Socket.io and Redis"** (DEV Community, Oct 2025) — Scaling patterns
- **"Node.js vs Python for AI-First Backends"** (Groovy Web, Feb 2026) — Architecture decision guide

---

*Architecture research for: AI Arena v1.1 — Real-time AI governance game*
*Researched: 2026-02-24*
*Confidence: MEDIUM-HIGH — Based on current 2025-2026 documentation and production patterns*
