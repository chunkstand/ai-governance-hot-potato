# Domain Pitfalls: v1.1 AI Arena Migration

**Domain:** Real-time multiplayer game with AI agents and backend integration
**Researched:** 2026-02-24
**Confidence:** HIGH

## Critical Pitfalls

Mistakes that cause rewrites, major bugs, or production outages.

### Pitfall 1: WebSocket Connection Leaks and Memory Exhaustion

**What goes wrong:**
Each WebSocket connection consumes ~100-200 bytes in Node.js plus ~16KB in TCP socket buffers (8KB send + 8KB receive). At 100,000 concurrent connections, that's 1.6GB+ before application logic. Connection leaks occur when:
- Clients disconnect but server doesn't clean up socket references
- No heartbeat/ping-pong mechanism detects dead connections
- Server crashes don't properly close all connections
- Load balancer timeouts silently drop connections without server awareness

**Why it happens:**
Node.js event-driven architecture means every connection holds callbacks, buffers, and event listeners in memory. Unlike HTTP request-response cycles that clean up automatically, WebSockets are long-lived. Without explicit cleanup, these accumulate.

**Consequences:**
- Memory usage grows until server crashes (OOM kills)
- New connections fail when file descriptor limits reached
- Performance degrades non-linearly as GC struggles
- Need emergency infrastructure rewrite mid-project

**Prevention:**
```javascript
// Implement heartbeat/ping-pong
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const HEARTBEAT_TIMEOUT = 60000;  // 60 seconds

function startHeartbeat(ws) {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  
  const interval = setInterval(() => {
    if (!ws.isAlive) {
      clearInterval(interval);
      ws.terminate(); // Force close, don't wait for graceful close
      return;
    }
    ws.isAlive = false;
    ws.ping();
  }, HEARTBEAT_INTERVAL);
  
  ws.on('close', () => clearInterval(interval));
}

// Explicit cleanup on all close paths
ws.on('close', () => {
  gameRooms.delete(ws.gameRoomId);
  userSockets.delete(ws.userId);
  // Remove from all data structures
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
  ws.terminate(); // Don't leave in limbo
});
```

**Detection:**
- Monitor `process.memoryUsage()` - heap growth over time
- Track active connection count vs expected count
- Alert on file descriptor usage (`ulimit -n`)
- Watch for connection count increasing while user count stable

**Phase to address:** Phase 1 - Infrastructure (must be built in from day 1)

---

### Pitfall 2: Reconnection Storms Overwhelming the Server

**What goes wrong:**
When server restarts or network blips, thousands of clients reconnect simultaneously. Without backoff, this creates a thundering herd:
- Server comes back online
- 500+ clients try to reconnect instantly
- Server overwhelmed, crashes or rejects connections
- Clients retry immediately, creating retry storm
- Cascading failure, server never recovers

**Why it happens:**
Clients typically implement simple reconnection: `onclose -> reconnect()`. In production with many clients, this creates synchronized waves of reconnection attempts that amplify any outage.

**Consequences:**
- Server recovery takes 10x longer than necessary
- Legitimate new connections can't get through
- False sense of "DDoS attack" when it's just reconnections
- Platform may rate-limit or ban your service

**Prevention:**
```javascript
class ResilientWebSocket {
  constructor(url) {
    this.url = url;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.baseDelay = 1000;
    this.maxDelay = 30000;
  }
  
  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('failed');
      return;
    }
    
    // Exponential backoff with jitter
    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000,
      this.maxDelay
    );
    
    this.reconnectAttempts++;
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }
  
  onOpen() {
    this.reconnectAttempts = 0; // Reset on successful connection
  }
}
```

**Detection:**
- Metrics on connection attempts per second
- Track reconnection success rate
- Monitor server CPU/memory during "recovery" periods
- Alert on >100 connections/second from single IP range

**Phase to address:** Phase 2 - Real-time Core (client-side reconnection logic)

---

### Pitfall 3: OpenAI/Anthropic API Cost Explosion and Rate Limits

**What goes wrong:**
AI APIs charge per token and enforce strict rate limits:
- **OpenAI:** 20 requests/minute on free tier, $0.002-0.06 per 1K tokens depending on model
- **Anthropic:** RPM and TPM limits, 529 overloaded errors when at capacity
- No caching means identical agent decisions cost repeatedly
- No rate limiting means queue builds up, then everything fails at once

**Why it happens:**
During development with single user, costs seem manageable. In production with concurrent games running:
- 10 concurrent games × 4 agents × 20 moves = 800 API calls
- Each call ~1000 tokens = 800K tokens per "arena session"
- At $0.03/1K tokens = $24 per session
- Run 100 sessions = $2,400 unexpectedly

**Consequences:**
- Surprise $500+ bill first month
- Rate limit errors (429) cascade into game failures
- Agent decisions timeout, breaking game flow
- Forced to add emergency throttling that degrades UX

**Prevention:**
```javascript
// Implement token bucket rate limiter
class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }
  
  async acquire() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldest = this.requests[0];
      const wait = this.windowMs - (now - oldest);
      await sleep(wait);
      return this.acquire();
    }
    
    this.requests.push(now);
  }
}

// Cache common responses
const responseCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getAgentDecision(scenario, agentConfig) {
  const cacheKey = hash(scenario.id + agentConfig.personality);
  
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.decision;
  }
  
  const decision = await callOpenAIWithRetry(scenario, agentConfig);
  responseCache.set(cacheKey, { decision, time: Date.now() });
  return decision;
}

// Implement circuit breaker for API failures
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }
  
  async execute(fn) {
    if (this.state === 'OPEN') {
      throw new Error('Circuit breaker is OPEN');
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      setTimeout(() => { this.state = 'HALF_OPEN'; }, this.timeout);
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
}
```

**Detection:**
- Monitor API costs daily during development
- Track rate limit error rates (should be <0.1%)
- Alert on average response time degradation
- Log token usage per game session

**Phase to address:** Phase 3 - AI Integration (must be designed before any API calls)

---

### Pitfall 4: Game State Desynchronization Between Clients and Server

**What goes wrong:**
In real-time games, state can diverge:
- Client shows agent at position X, server thinks position Y
- Move validation happens on stale state
- Two agents "win" simultaneously because of race condition
- Spectators see different game than what's actually happening

**Why it happens:**
With latency (even 100ms), what client sees is RTT/2 ms behind server. If client predicts movement (for responsiveness) without server reconciliation, states diverge. Without server authority, clients can cheat or drift.

**Consequences:**
- "I clearly won but it says I lost" user complaints
- Leaderboard disputes and accusations of cheating
- Game feels buggy and unfair
- Can't run competitive tournaments reliably

**Prevention:**
```javascript
// Server-authoritative architecture
class GameRoom {
  constructor() {
    this.state = {
      agents: new Map(),
      currentTurn: 0,
      lastUpdate: Date.now(),
      tick: 0
    };
    this.pendingMoves = []; // Queue for concurrent processing
  }
  
  // Single tick - process all moves atomically
  processTick() {
    this.state.tick++;
    
    // Sort moves by timestamp, apply in order
    const moves = this.pendingMoves.sort((a, b) => a.timestamp - b.timestamp);
    this.pendingMoves = [];
    
    for (const move of moves) {
      if (this.isValidMove(move)) {
        this.applyMove(move);
      }
    }
    
    // Broadcast authoritative state
    this.broadcast({
      type: 'STATE_UPDATE',
      tick: this.state.tick,
      state: this.getStateSnapshot(),
      timestamp: Date.now()
    });
  }
  
  isValidMove(move) {
    // Validate against server state, not client claim
    const agent = this.state.agents.get(move.agentId);
    if (!agent) return false;
    if (agent.position !== move.fromPosition) return false; // Client was out of sync
    if (this.state.currentTurn !== move.agentId) return false; // Not their turn
    return true;
  }
}

// Client reconciliation
class GameClient {
  handleStateUpdate(serverState) {
    // If server disagrees with our prediction, snap to server
    for (const [agentId, serverAgent] of serverState.agents) {
      const localAgent = this.localState.agents.get(agentId);
      if (localAgent && this.hasSignificantDifference(localAgent, serverAgent)) {
        // Interpolate smoothly rather than snap
        this.interpolateTo(serverAgent);
      }
    }
  }
}
```

**Detection:**
- Assert state checksums between server and clients
- Log when reconciliation is needed (>5% of updates = problem)
- Track "impossible" game events (negative scores, out-of-bounds positions)
- Monitor client-side prediction accuracy

**Phase to address:** Phase 2 - Real-time Core (core architecture decision)

---

### Pitfall 5: Concurrent Agent Processing Race Conditions

**What goes wrong:**
When multiple agents act simultaneously:
- Agent A reads position (5, 5), decides to move to (6, 5)
- Agent B reads same position (5, 5), decides to move to (5, 6)
- Both write simultaneously, one overwrites the other
- Or both move to same target cell, collision not detected

**Why it happens:**
Node.js is single-threaded but async I/O means interleaving between awaits. Two `processAgentTurn()` calls can be "in flight" simultaneously, each reading state before the other writes.

**Consequences:**
- Agents clip through each other or occupy same space
- "Impossible" game states with negative values or duplicates
- Intermittent bugs that only happen under load
- Data corruption in leaderboard or game history

**Prevention:**
```javascript
// Sequential processing with queue
class AgentProcessor {
  constructor() {
    this.processingQueue = Promise.resolve();
  }
  
  async processAgentTurn(agentId, gameRoom) {
    // Chain to existing queue - guarantees sequential execution
    this.processingQueue = this.processingQueue.then(async () => {
      const agent = gameRoom.getAgent(agentId);
      const decision = await this.getAIDecision(agent, gameRoom.state);
      
      // Lock game state during modification
      return gameRoom.withLock(async () => {
        if (this.isValidDecision(decision, gameRoom.state)) {
          gameRoom.applyDecision(agentId, decision);
        }
        return decision;
      });
    });
    
    return this.processingQueue;
  }
}

// Or use atomic operations with Redis
async function processAgentMove(gameId, agentId, move) {
  const lockKey = `game:${gameId}:lock`;
  const lock = await redisClient.set(lockKey, 'locked', {
    NX: true, // Only if not exists
    EX: 5     // Auto-expire after 5 seconds
  });
  
  if (!lock) {
    throw new Error('Game is being modified by another process');
  }
  
  try {
    const gameState = await redisClient.get(`game:${gameId}:state`);
    const newState = applyMove(JSON.parse(gameState), agentId, move);
    await redisClient.set(`game:${gameId}:state`, JSON.stringify(newState));
    return newState;
  } finally {
    await redisClient.del(lockKey);
  }
}
```

**Detection:**
- Add assertions for "impossible" states in test environment
- Log all concurrent modifications to same game entity
- Use property-based testing to find race conditions
- Monitor for state validation failures

**Phase to address:** Phase 4 - Game Logic (batch processing implementation)

---

### Pitfall 6: Free Tier Backend Platform Limitations (Sleep/Wake, Cold Starts)

**What goes wrong:**
Free tier hosting has hidden constraints:
- **Render free tier:** Service sleeps after 15 minutes of inactivity, 30-second cold start
- **Railway:** Usage-based billing can spike unexpectedly
- **Heroku:** Free dynos sleep, limited hours per month
- WebSocket connections drop when service sleeps
- AI agent mid-decision when server sleeps = lost game state

**Why it happens:**
Free tiers are designed for development/demo, not production. Render's "spin down after inactivity" seems fine for HTTP APIs but breaks WebSocket games where persistent connections are required.

**Consequences:**
- First spectator connects, waits 30 seconds for server to wake
- WebSocket connection established, then dropped when service sleeps
- Games in progress die when server spins down
- Players lose trust, think game is broken

**Prevention:**
```javascript
// Keep-alive ping to prevent sleep (Render-specific)
if (process.env.KEEP_ALIVE === 'true') {
  setInterval(() => {
    http.get(`http://localhost:${PORT}/health`);
  }, 14 * 60 * 1000); // Every 14 minutes
}

// Better: Use paid tier for production
// Render Starter: $7/month, never sleeps
// Railway: $5/month minimum, usage-based beyond

// Implement state persistence for recovery
class GameStateManager {
  async saveState(gameId, state) {
    await redisClient.setEx(
      `game:${gameId}:state`,
      3600, // 1 hour TTL
      JSON.stringify(state)
    );
    await postgres.query(
      'INSERT INTO game_snapshots (game_id, state, created_at) VALUES ($1, $2, NOW())',
      [gameId, state]
    );
  }
  
  async recoverGame(gameId) {
    // Try Redis first (fast)
    const redisState = await redisClient.get(`game:${gameId}:state`);
    if (redisState) return JSON.parse(redisState);
    
    // Fall back to database
    const dbState = await postgres.query(
      'SELECT state FROM game_snapshots WHERE game_id = $1 ORDER BY created_at DESC LIMIT 1',
      [gameId]
    );
    return dbState.rows[0]?.state;
  }
}
```

**Detection:**
- Monitor service uptime (should be 100%, not 99% with gaps)
- Track WebSocket connection duration averages
- Log "wake up" events and correlate with user complaints
- Test: Leave game idle 20 minutes, see if it dies

**Phase to address:** Phase 1 - Infrastructure (platform selection)

---

### Pitfall 7: Database Schema Migration Hell for Game State

**What goes wrong:**
Starting with simple schema, then needing to add:
- Agent move history for replay
- Multiple game types with different rules
- Spectator chat messages
- Player customization
- Tournaments and brackets

Each change requires migrations that:
- Lock tables (downtime)
- Break existing game sessions
- Require complex data transforms
- Don't work the same across local/dev/prod

**Why it happens:**
Game state is more complex than it first appears. Schema designed for v1.1 often doesn't anticipate v1.2+ needs. Using strict relational schemas with lots of foreign keys makes evolution painful.

**Consequences:**
- Migrations fail in production, requiring manual intervention
- Need to take game down to add features
- Technical debt accumulates, queries get slow
- Fear of schema changes prevents feature development

**Prevention:**
```javascript
// Use JSONB for flexible game state (PostgreSQL)
// Core tables remain stable, game logic stored as JSON

CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active',
  game_type VARCHAR(50),
  state JSONB NOT NULL, -- Flexible: evolves without migration
  settings JSONB DEFAULT '{}',
  version INTEGER DEFAULT 1
);

CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id),
  name VARCHAR(100),
  config JSONB, -- Personality, model settings, etc.
  stats JSONB,  -- Wins, losses, decision times
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id),
  agent_id UUID REFERENCES agents(id),
  turn_number INTEGER,
  decision JSONB, -- { action: 'move', target: [x, y], reason: '...' }
  timestamp TIMESTAMP DEFAULT NOW()
);

// Schema versioning in code
const STATE_VERSION = 2;

function migrateState(state, fromVersion) {
  if (fromVersion === 1) {
    // Add new field with default
    state.newField = state.newField || 'default';
    // Rename old field
    state.agentPositions = state.positions;
    delete state.positions;
  }
  state.version = STATE_VERSION;
  return state;
}
```

**Detection:**
- Track migration execution time (should be <1 second)
- Test migrations on production-like data volumes
- Monitor query performance degradation over time
- Schema drift alerts (dev schema doesn't match prod)

**Phase to address:** Phase 1 - Infrastructure (database design)

---

### Pitfall 8: AI Agent Response Latency Breaking Game Flow

**What goes wrong:**
AI APIs have variable latency:
- Simple question: 500ms-2s
- Complex reasoning: 5-10s
- Anthropic Opus during peak: 30s+ with overloaded_error
- Game expects move in <3s, but agent takes 15s
- Spectators stare at frozen game, think it's broken

**Why it happens:**
Models have different speeds. OpenAI GPT-4o is fast but Claude 3 Opus is slow but smart. API load varies. No timeout handling means indefinite waits.

**Consequences:**
- Game stalls, spectators leave
- Timeout errors cascade to other agents
- "Slow" agents perceived as broken
- Forced to use worse models for speed

**Prevention:**
```javascript
// Aggressive timeouts with fallback
async function getAgentDecision(agent, scenario, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch('/api/agent/decide', {
      method: 'POST',
      body: JSON.stringify({ agent, scenario }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      // Fallback to simple heuristic or cached decision
      return getFallbackDecision(agent, scenario);
    }
    throw error;
  }
}

// Pre-generate decisions in background
class AgentPreloader {
  constructor() {
    this.decisionCache = new Map();
  }
  
  async preloadDecisions(game) {
    const promises = game.agents.map(async (agent) => {
      const decision = await getAgentDecision(agent, game.currentScenario);
      this.decisionCache.set(agent.id, decision);
    });
    
    // Don't block - let these populate in background
    Promise.all(promises).catch(err => {
      console.error('Preload failed:', err);
    });
  }
  
  getDecision(agentId) {
    return this.decisionCache.get(agentId);
  }
}

// Model selection by latency requirement
function selectModel(latencyRequirement) {
  if (latencyRequirement < 2000) {
    return 'gpt-4o-mini'; // Fast, cheap
  } else if (latencyRequirement < 5000) {
    return 'gpt-4o'; // Balanced
  } else {
    return 'claude-3-opus'; // Slow but smart
  }
}
```

**Detection:**
- Track p50, p95, p99 decision latency
- Alert on >10% of decisions exceeding timeout
- Monitor fallback decision usage rate
- User-reported "frozen game" correlation with slow API calls

**Phase to address:** Phase 3 - AI Integration (latency testing critical)

---

## Moderate Pitfalls

### Pitfall 9: Frontend/Backend API Mismatch During Development

**What goes wrong:**
- Frontend expects `/api/game/123/move` with `{direction: 'up'}`
- Backend implements `/api/games/123/moves` with `{action: 'move', direction: 'up'}`
- CORS errors when frontend (GitHub Pages) calls backend (Render)
- Authentication confusion: where do API keys go?

**Why it happens:**
Two separate codebases evolving independently without strict contract. CORS is often forgotten until first cross-origin request fails.

**Consequences:**
- Integration takes days of debugging
- Frontend blocks on backend decisions
- "Works on my machine" when backend running locally
- Security misconfigurations (CORS set to `*` in production)

**Prevention:**
```javascript
// Shared API contract (use OpenAPI/JSON Schema)
// api-contract.yaml
paths:
  /games/{gameId}/moves:
    post:
      parameters:
        - name: gameId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [action, agentId]
              properties:
                action:
                  type: string
                  enum: [move, answer, pass]
                agentId:
                  type: string
                  format: uuid

// Backend CORS - strict, not wildcard
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Generate client from contract
// Use tools like openapi-generator or orval
```

**Phase to address:** Phase 1 - Infrastructure (API contract definition)

---

### Pitfall 10: WebSocket Message Ordering and Delivery Guarantees

**What goes wrong:**
- Message A sent, then Message B
- Network hiccup, Message A retries, arrives after Message B
- Client processes out of order: sees "game over" then "agent moved"
- Or message lost entirely, client never sees critical state update

**Why it happens:**
WebSockets are TCP-based (ordered) but applications often implement:
- Async message handlers that execute out of order
- No sequence numbers or acknowledgments
- No replay/retrieval mechanism for missed messages

**Consequences:**
- Inconsistent game views between spectators
- "Ghost" agents that moved but weren't seen
- Decisions made on stale state
- Users need to refresh to "fix" view

**Prevention:**
```javascript
// Sequence numbers and acknowledgments
class ReliableWebSocket {
  constructor(ws) {
    this.ws = ws;
    this.sendSeq = 0;
    this.recvSeq = 0;
    this.pendingAcks = new Map();
    this.messageBuffer = []; // For reassembly
  }
  
  send(data) {
    const message = {
      seq: ++this.sendSeq,
      data,
      timestamp: Date.now()
    };
    
    this.pendingAcks.set(message.seq, {
      message,
      retries: 0,
      sentAt: Date.now()
    });
    
    this.ws.send(JSON.stringify(message));
    
    // Retransmit if not acknowledged
    setTimeout(() => this.checkAck(message.seq), 5000);
  }
  
  handleMessage(raw) {
    const message = JSON.parse(raw);
    
    // Send acknowledgment
    this.ws.send(JSON.stringify({ ack: message.seq }));
    
    // Process in order
    if (message.seq === this.recvSeq + 1) {
      this.process(message);
      this.recvSeq++;
      
      // Process buffered messages
      while (this.messageBuffer.length > 0 && 
             this.messageBuffer[0].seq === this.recvSeq + 1) {
        const buffered = this.messageBuffer.shift();
        this.process(buffered);
        this.recvSeq++;
      }
    } else if (message.seq > this.recvSeq + 1) {
      // Future message, buffer it
      this.messageBuffer.push(message);
      this.messageBuffer.sort((a, b) => a.seq - b.seq);
    }
    // else: duplicate or old message, ignore
  }
}

// For game state, use periodic full sync as safety net
setInterval(() => {
  broadcastFullState(); // Every 5 seconds, send complete state
}, 5000);
```

**Phase to address:** Phase 2 - Real-time Core (messaging protocol)

---

## Minor Pitfalls

### Pitfall 11: Storing API Keys in Client-Side Code

**What goes wrong:**
- OpenAI API key embedded in React/JS frontend
- Anyone can extract it from browser dev tools
- Attacker uses your key, racks up $1000 in charges
- Key rotation breaks production until redeploy

**Why it happens:**
V1.0 was client-side only, no backend. Migrating to AI APIs, developer puts key in frontend because that's where the code calling it is.

**Consequences:**
- Financial liability for API misuse
- Need emergency key rotation
- All client-side code must be rebuilt
- Security incident post-mortem

**Prevention:**
- Backend for Frontend (BFF) pattern: frontend calls your backend, backend calls AI APIs
- Store keys in environment variables on server only
- Use API gateway or proxy with rate limiting
- Never commit keys to git (use .env, gitignore)

**Phase to address:** Phase 1 - Infrastructure (security baseline)

---

### Pitfall 12: Underestimating DevOps Complexity

**What goes wrong:**
- v1.0: `git push` to GitHub Pages, automatic deploy
- v1.1: Need to deploy backend, database migrations, WebSocket servers
- Local development works, production has different env vars
- Database connection strings mismatch
- WebSocket fails because of wrong port/protocol

**Why it happens:**
Adding backend creates infrastructure complexity that didn't exist before. Dev/prod parity is harder with multiple services.

**Consequences:**
- "It works on my machine" debugging sessions
- Production-only bugs that are hard to reproduce
- Deployment anxiety, fewer deploys
- Hotfixes take longer, more downtime

**Prevention:**
```yaml
# docker-compose.yml for local dev matching prod
version: '3'
services:
  app:
    build: .
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/game
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=development
    ports:
      - "3000:3000"
    depends_on:
      - db
      - redis
  
  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=game
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

**Phase to address:** Phase 1 - Infrastructure (dev environment setup)

---

### Pitfall 13: Over-Engineering the Initial Architecture

**What goes wrong:**
- Read about "microservices" and decide to split into 5 services
- Set up Kubernetes, service mesh, complex deployment
- Spend 3 weeks on infrastructure before writing game logic
- Microservices don't communicate properly
- Debugging spans 5 log streams

**Why it happens:**
Excitement about new tech, wanting to "do it right" from start. But v1.1 should be simple monolith that can evolve.

**Consequences:**
- Project stalls before game playable
- Complex deployment blocks iteration
- Harder to reason about data flow
- Team knowledge siloed by service

**Prevention:**
- Start with monolith: single backend process
- One database, not sharded
- Deploy to single service on Render/Railway
- Add complexity only when metrics show need

**Phase to address:** Phase 1 - Infrastructure (architecture decisions)

---

## Phase-Specific Warnings

| Phase | Likely Pitfall | Mitigation |
|-------|---------------|------------|
| **1. Infrastructure** | Choosing wrong hosting platform (free tier limitations) | Test sleep/wake behavior, plan $7-20/month budget |
| **1. Infrastructure** | Database schema too rigid for game evolution | Use JSONB for flexible state, version your schemas |
| **2. Real-time Core** | WebSocket connection leaks | Implement heartbeat, explicit cleanup, monitor memory |
| **2. Real-time Core** | Reconnection storms | Exponential backoff with jitter, max retry limits |
| **2. Real-time Core** | State desynchronization | Server-authoritative with client reconciliation |
| **3. AI Integration** | API cost explosion | Rate limiting, caching, usage monitoring, budgets |
| **3. AI Integration** | Latency breaking game flow | Aggressive timeouts (5s), fallback strategies, fast models |
| **3. AI Integration** | Rate limit cascading failures | Circuit breaker pattern, queue with backoff |
| **4. Game Logic** | Race conditions in concurrent processing | Sequential queue or atomic Redis operations |
| **4. Game Logic** | Message ordering issues | Sequence numbers, acknowledgments, periodic full sync |
| **5. Spectator Mode** | Frontend/backend API mismatch | OpenAPI contract, CORS testing, shared types |
| **6. Polish** | Underestimating DevOps | Docker Compose for dev/prod parity, CI/CD pipeline |

---

## Integration-Specific Pitfalls (Client-Side → Backend Migration)

### The "It Was Working Before" Trap

When migrating from v1.0 (client-side only) to v1.1 (with backend):

1. **State management confusion**
   - v1.0: `localStorage`, global variables
   - v1.1: Redis, database, WebSocket state
   - **Risk:** Race between local state and server state
   - **Fix:** Single source of truth (server), local is cache only

2. **Authentication gap**
   - v1.0: No auth needed
   - v1.1: Need to identify agents/spectators
   - **Risk:** Anyone can connect to WebSocket, impersonate agents
   - **Fix:** JWT tokens in WebSocket handshake, validate on connection

3. **Asset serving assumptions**
   - v1.0: All static, served by GitHub Pages CDN
   - v1.1: Backend might serve frontend or be separate
   - **Risk:** CORS, cookie domains, routing confusion
   - **Fix:** Keep GitHub Pages for static, backend on subdomain/api

4. **Deployment coupling**
   - v1.0: Frontend deploy independent
   - v1.1: Frontend needs to know backend URL
   - **Risk:** Frontend deployed pointing to old backend
   - **Fix:** Environment-specific builds, feature flags

---

## Sources

### WebSocket & Real-time
- OneUptime: "How to Implement Reconnection Logic for WebSockets" (Jan 2026) - https://oneuptime.com/blog/post/2026-01-27-websocket-reconnection-logic/view
- OneUptime: "How to Fix WebSocket Performance Issues" (Jan 2026) - https://oneuptime.com/blog/post/2026-01-24-websocket-performance/view
- OneUptime: "How to Implement WebSocket Connections in Node.js with Socket.io and Scaling" (Jan 2026)
- Ably: "How to scale WebSockets for high-concurrency systems" - https://ably.com/topic/the-challenge-of-scaling-websockets
- Platformatic: "Scale WebSockets in Kubernetes with Node.js" (Feb 2026)
- Medium: "Real-Time at Scale, Without Regrets" by Syntal (Oct 2025)
- Medium: "Stop Using WebSockets for Everything" by Pradeep Mishra (Jan 2026)

### AI API Integration
- OneUptime: "How to Instrument OpenAI and Anthropic API Calls with OpenTelemetry" (Feb 2026)
- Anthropic Documentation: "Rate limits" - https://docs.anthropic.com/en/api/rate-limits
- OpenAI Documentation: "How to handle rate limits" - https://developers.openai.com/cookbook/examples/how_to_handle_rate_limits/
- Blog: "Migrating from OpenAI to Anthropic API: Fixing 400 Errors and System Prompts" (Feb 2026)
- Blog: "Fixing overloaded_error and Timeouts in Claude 3 Opus Python Integrations" (Feb 2026)
- Medium: "How To Fix OpenAI Rate Limits & Timeout Errors" by Puneet Bhatt (Dec 2023)

### Game State & Concurrency
- OneUptime: "How to Implement Game State Management with Redis" (Jan 2026)
- Unity Documentation: "Tricks and patterns to deal with latency" - https://docs.unity3d.com/Packages/com.unity.netcode.gameobjects@2.6/manual/learn/dealing-with-latency.html
- Gaffer On Games: "State Synchronization" by Glenn Fiedler
- Medium: "Building a Real-Time Multiplayer Game in Go: Architecture and Mental Models" by Daniel Mutuku (Feb 2026)
- GameDev StackExchange: "realtime multiplayer game database design" (Jun 2017)

### Backend Deployment
- Software Scout: "Railway vs Render 2026: Best Platform for Deploying Apps" (Feb 2026)
- DesignRevision: "Render vs Railway: Which Hosting Platform Should You Choose? (2026)" (Feb 2026)
- Back4app: "Best Heroku Alternatives in 2026" (Feb 2026)
- Nucamp: "Deploying Full Stack Apps in 2026: Vercel, Netlify, Railway, and Cloud Options" (Jan 2026)

### AI Latency in Real-time
- Arun Baby: "Real-Time Agent Pipelines" (Jan 2026) - https://www.arunbaby.com/ai-agents/0016-real-time-agent-pipelines/
- DEV Community: "Architecting Low-Latency, Real-Time AI Voice Agents: Challenges & Solutions" (Jan 2026)
- Medium: "Agentic AI and the Latency Challenge: Balancing Autonomy with Real-Time Performance" by Anil Sharma (Sep 2025)
- GetStream.io: "Why Real-Time Is the Missing Piece in Today's AI Agents" (Nov 2025)

### Node.js Concurrency
- Medium: "The 9 Node.js Concurrency Traps Seniors Still Hit" by Duckweave (Jan 2026)
- Medium: "Controlling Concurrency in Node.js: Worker Pools and HTTP Agents" by Vahid Najafi (Feb 2026)
- Medium: "Understanding and Avoiding Race Conditions in Node.js Applications" by Akash Thakur (Apr 2024)
- Medium: "Race Conditions in Node.js: A Practical Guide" by Ali Aghapour (Dec 2023)

### Security & Frontend Integration
- GitGuardian: "Stop Leaking API Keys: The Backend for Frontend (BFF) Pattern Explained" (Jan 2026)
- ZITADEL Docs: "Frontend and Back-end API Communication in ZITADEL" (Jan 2026)
- DigitalAPI: "Master API Security: Essential Best Practices for 2026"

**Confidence Assessment:**
- WebSocket pitfalls: HIGH (multiple authoritative sources, 2026 content)
- AI API integration: HIGH (official docs + recent implementation guides)
- Game state synchronization: HIGH (established patterns + recent implementations)
- Backend deployment: MEDIUM (platform-specific details may vary)
- AI latency: HIGH (specialized focus on real-time AI emerging in 2025-2026)
- Concurrency: HIGH (Node.js best practices well-documented)
