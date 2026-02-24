# Feature Landscape: v1.1 AI Arena

**Domain:** AI Agent Competition / Map-based Governance Game  
**Researched:** February 24, 2026  
**Confidence:** MEDIUM (WebSearch verified, no direct product precedents for AEL + map hybrid)

---

## Executive Summary

The v1.1 AI Arena transforms the turn-based AEL governance game into a **real-time competitive racing experience** where AI agents navigate a map by answering governance questions. Research reveals this is an emerging genre with few direct precedents — most similar experiences come from AI competition platforms (Kaggle Game Arena, Microsoft Agents League, AgentArcade) combined with traditional board game mechanics.

**Key insight:** The novelty of this feature set creates opportunity for differentiation, but requires careful attention to table stakes borrowed from both AI competition platforms and racing games. The spectator experience is critical — humans watch AI agents compete, making the viewing interface as important as the gameplay itself.

---

## Table Stakes

Features every map-based competitive game MUST have. Missing these = product feels broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Visual Map with Agent Positions** | Core of "map-based" concept — spectators must see where agents are | Medium | SVG/Canvas-based board with tokens. Research shows racing games universally display positions visually. |
| **Turn/Move Indicator** | Spectators need to know whose turn it is and what phase we're in | Low | Progress bar, "Round 3 of 10", current agent highlight |
| **Question Display with Clear Choices** | Trivia-as-gates mechanic requires readable questions with distinct options | Low | Multiple choice format is table stakes (research shows 90%+ of trivia games use this) |
| **Immediate Answer Feedback** | Agents and spectators need to know if answer was correct without delay | Low | Visual indicator (green/red) within 1 second |
| **Leaderboard / Standings** | Competitive games require clear ranking — who is winning | Low | Sorted list with position, score, and progress percentage |
| **Agent Identification** | Must distinguish between competing agents visually | Low | Colors, icons, avatars, or agent names on tokens |
| **Game Session State** | Spectators need to know if game is waiting, in-progress, or finished | Low | "Waiting for agents...", "Round 3 of 10", "Game Complete" |
| **Move History / Trail** | Shows where agents have been — adds narrative to the race | Medium | Path highlighting, breadcrumb trail, or turn-by-turn log |
| **Score Display** | Real-time score updates tied to map progress | Low | Numeric display with delta indicators (+50 points) |
| **Connection Status** | For real-time gameplay, users need to know if agents are connected | Low | Online/offline indicator per agent |

**Critical dependency:** These features build directly on v1.0's existing stakeholder impact visualization and decision tracking. The AEL pillars provide the scoring rubric for questions.

---

## Differentiators

Features that set AI Arena apart from generic competition platforms.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **AEL Governance Questions** | Educational differentiation — agents compete on ethics/governance knowledge, not just speed | Medium | Unique to this domain. Transforms v1.0 scenarios into checkpoint questions. Research: No other AI arena uses governance evaluation as the skill test. |
| **Four-Pillar Scoring Integration** | Connects map progress to v1.0's AEL framework (Consent, Transparency, Fairness, Alignment) | Medium | Scoring rubric uses existing v1.0 pillar weights |
| **Batch Simultaneous Movement** | "All agents move at once" reduces spectator waiting vs sequential turns | High | Research insight: Simultaneous turns add complexity (conflict resolution) but dramatically improve pacing. Best of both worlds: turn-based strategy + real-time feel. |
| **Stakeholder Impact Visualization** | Brings v1.0's "Users/Organization/Society/Trust" impacts into the racing context | Low | Reuse v1.0 component, contextualized for "who benefits from this agent's decision" |
| **Agent Decision Reasoning Display** | Show WHY each agent chose their answer — builds trust and educational value | Medium | Unique to educational AI arenas. Research shows spectators want to understand agent logic, not just outcomes. |
| **Human Spectator-Only Mode** | Explicitly NOT a player mode — humans watch AI compete, placing this between esports and education | Low | Positions this as "AI sport" rather than game. Research: Arena Protocol, AgentArcade use this positioning successfully. |
| **Demo Agent Tournament System** | v1.0's StrictBot/LenientBot/RandomBot/BalancedBot can race each other for testing | Low | Immediate content without requiring external AI agents |
| **Replay / Game History** | Review past races with full decision trees — educational value and debugging | Medium | Critical for educational positioning. Allows "study" of agent strategies. |

**Strategic recommendation:** The combination of **AEL governance + simultaneous movement + reasoning display** creates a unique "AI sport meets ethics education" positioning that doesn't exist in the market.

---

## Anti-Features

Features to explicitly NOT build — they add complexity without value or contradict the core concept.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Human as Active Player** | Contradicts "spectator" positioning — humans watch AI compete, not participate | Keep humans as spectators only. If participation wanted, that's v1.2+ scope. |
| **Complex Board Game Mechanics** | "Trap cards", "steal points", "roll again" mechanics distract from AEL focus | Keep map simple: linear or lightly branching path. Complexity should come from governance questions, not game mechanics. |
| **Real-Time Action (No Turns)** | Pure real-time requires faster AI inference than practical (<5s target), and loses educational pacing | Use simultaneous turns with resolution phase. Turn-based but all-at-once. |
| **Extensive Customization (Agent Appearance, Board Themes)** | Premature optimization — adds dev time without core value | Start with 2-3 board themes, minimal agent customization. Focus on gameplay depth first. |
| **Multi-Game Tournaments / Brackets** | Complex bracket logic for v1.1 — adds scope without proving core loop | Simple leaderboard aggregation across sessions. Full tournament mode = v1.2+ |
| **In-Game Chat / Social Features** | Spectator chat adds moderation burden; not core to educational mission | Spectator reactions (emoji), but no text chat in v1.1 |
| **Betting / Prediction Markets** | Regulatory complexity, not aligned with educational mission | Simple "who will win" poll without stakes |
| **Persistent Agent Progression / Leveling** | Adds RPG mechanics that distract from per-game evaluation | Each game is independent; history shows but doesn't modify future games |

---

## Feature Dependencies

```
Map Visualization
    └── Agent Position Tracking
        └── Batch Movement System
            ├── AI Agent Integration (OpenAI/Anthropic)
            ├── Demo Agent Logic (StrictBot/LenientBot/etc)
            └── Question Gate System
                ├── AEL Scenario Questions (v1.0 content)
                └── Scoring Rubric (v1.0 four pillars)
                    └── Leaderboard / Standings

Spectator Mode
    ├── Real-time Updates (WebSocket)
    ├── Game State Display (waiting/playing/complete)
    ├── Agent Reasoning Display
    └── Stakeholder Impact Visualization (v1.0 component)

Leaderboard System
    ├── Per-Game Scoring
    ├── Session History
    └── Replay Capability (post-game review)
```

**Key dependency chain:** The batch movement system is the critical path. Without simultaneous turns, spectator pacing suffers. But simultaneous turns require resolution logic for "what happens when two agents reach same space."

---

## User Expectations from Similar Experiences

### From AI Competition Platforms (Kaggle, AgentArcade, Arena Protocol)

| Expectation | How AI Arena Should Deliver |
|-------------|------------------------------|
| Clear agent identification | Color-coded tokens + agent name + avatar |
| Live leaderboard updates | Real-time sort as scores change |
| Agent stats/history | Win/loss record, average response time, favorite decisions |
| Replay capability | Watch past races with pause/rewind |
| ELO/ranking system | Skill-based matchmaking for competitive balance |

### From Racing/Board Games (Mario Kart, Trivial Pursuit)

| Expectation | How AI Arena Should Deliver |
|-------------|------------------------------|
| Clear start/finish | "GO" space and "FINISH" space on map |
| Progress visualization | Percentage complete, position markers |
| Obstacles/challenges | Questions act as gates — correct answer = advance |
| Catch-up mechanics | Consider "bonus spaces" or "shortcut paths" for trailing agents |
| Spectator excitement | Dramatic moments when agents answer simultaneously |

### From Educational Games (Kahoot, Quizizz)

| Expectation | How AI Arena Should Deliver |
|-------------|------------------------------|
| Clear question/answer display | Large text, high contrast, unambiguous choices |
| Immediate feedback | Visual + sound on correct/incorrect |
| Learning moment | Show WHY answer was right/wrong (explanation panel) |
| Pace control | Not too fast (can read question), not too slow (5-10s per question) |

---

## Complexity Assessment

| Feature Area | Complexity | Rationale |
|--------------|------------|-----------|
| **Map Visualization** | Medium | SVG paths, token positioning, animations. Well-understood patterns. |
| **Batch Movement System** | High | Conflict resolution, simultaneous turn logic, state synchronization. Requires careful design. |
| **AI Agent Integration** | Medium | API integration (OpenAI/Anthropic), response parsing, error handling. Well-documented patterns. |
| **Real-time Updates** | Medium | WebSocket implementation, state broadcasting, client sync. Standard but requires backend. |
| **Leaderboard System** | Low | Sorting, display, persistence. Straightforward with v1.0 scoring foundation. |
| **Spectator Interface** | Low | Mostly UI composition of existing v1.0 components (impacts, decisions). |
| **Question System** | Low | Multiple choice display, answer checking, v1.0 scenarios as content. |

**Total complexity: MEDIUM-HIGH** — The simultaneous movement system is the primary complexity driver. Everything else composes from standard patterns or v1.0 existing features.

---

## MVP Recommendation for v1.1

**Prioritize (Must Have for v1.1):**

1. **Linear Map with Checkpoints** — Simplest viable board. 10-15 spaces, questions at each checkpoint.
2. **Simultaneous Turn System** — All agents answer same question, then all move. No conflict resolution needed (agents "tie" and both advance).
3. **OpenAI Integration** — One real AI agent type (GPT-4) for demonstration.
4. **Demo Agent Tournament** — StrictBot vs LenientBot vs BalancedBot racing each other.
5. **Basic Spectator View** — Map, positions, current question, scores, leaderboard.
6. **Decision Reasoning Display** — Show agent's explanation alongside move.

**Defer (v1.2+):**

- Branching paths with strategic choices
- Real AI vs Demo agent mixing (complexity in handling different response times)
- Replay system
- Advanced spectator features (betting, detailed stats)
- Multiple simultaneous games (spectator chooses which to watch)
- Tournament brackets

---

## Confidence Assessment

| Area | Confidence | Reasoning |
|------|------------|-----------|
| Table Stakes | HIGH | Well-established patterns from racing games, trivia games, and AI arenas. Multiple sources confirm. |
| Differentiators | MEDIUM | AEL integration is unique (no direct precedents found). Simultaneous turns have patterns but require adaptation. |
| Anti-Features | HIGH | Clear scope boundaries based on project constraints (educational mission, v1.1 timeline). |
| User Expectations | MEDIUM | Synthesized from adjacent domains (AI arenas + racing games + educational games). No direct "AEL racing game" precedent exists. |
| Complexity | MEDIUM | Batch movement system is the main unknown. Everything else is well-understood engineering. |

---

## Research Gaps & Phase-Specific Research Needed

| Phase | Research Needed | Why |
|-------|-----------------|-----|
| Architecture Design | Simultaneous turn resolution patterns | Need to select conflict resolution strategy for "what happens when agents land on same space" |
| AI Integration | OpenAI/Anthropic agent integration patterns | Specific prompt engineering for governance question answering |
| Scoring System | How to convert v1.0's 4-pillar impact into racing score | Translation layer between stakeholder impacts and race points |
| Spectator UX | Heatmap of what spectators actually watch | Analytics integration to validate assumptions about what draws attention |

---

## Sources

### AI Competition Platforms
- **Arena Protocol** (arena.openclawagentleague.com): "AI Agents Compete. Humans Spectate." — spectator-only positioning validation
- **Microsoft Agents League** (github.com/microsoft/agentsleague): "Live AI Battles, asynchronous community challenges" — competitive agent patterns
- **AgentArcade** (agentarcade.gg): "Watch AI agents manipulate, strategize, and outwit each other" — spectator experience focus
- **Kaggle Game Arena** (kaggle.com/blog): Multi-agent competition platform with leaderboards
- **CATArena** (arxiv.org/abs/2510.26852): "Evaluation of LLM Agents Through Iterative Tournament Competitions" — academic validation of competitive agent evaluation

### Game Mechanics Research
- **BoardGame.io** (boardgame.io): "State Management and Multiplayer Networking for Turn-Based Games" — simultaneous turn patterns
- **Simultaneous Turns Analysis** (kvachev.com/blog/posts/simultaneous-turns/): "Parallel Multiplayer" — design challenges and solutions
- **Real-Time Multiplayer Patterns** (medium.com/@daniel.mutuku404): "MathDash" — racing + question mechanics
- **Racing Game Mechanics** (juegostudio.com): Checkpoint systems, progress tracking, catch-up mechanics

### Spectator Mode Research
- **Interactive Live Streaming 2025** (videosdk.live): "Real-time engagement, live polls, gamification" — spectator feature patterns
- **VIBES Research** (arxiv.org/pdf/2504.09016): "Viewer Spatial Interactions as Direct Input for Livestreamed Content" — spectator interaction patterns
- **Realtime Fan Experiences** (ably.com): "Making them economically viable at scale" — technical patterns for spectator systems

### AI Agent Integration
- **Building Effective Agents** (anthropic.com/research): "Simple, composable patterns rather than complex frameworks" — Anthropic's agent best practices
- **Multi-Agent RPS System** (feng.lu): "Rock-Paper-Scissors tournaments pitting various AI models" — competitive agent integration pattern
- **GVGAI-LLM** (arxiv.org/abs/2508.08501): "Evaluating Large Language Model Agents with Infinite Games" — agent evaluation frameworks

---

## Key Takeaways for Roadmap

1. **Position as "AI Sport" not "Game"** — The spectator-only mode differentiates from traditional multiplayer games. Humans watch agents compete, placing this between esports and AI research.

2. **Simultaneous Turns are Critical** — Sequential turns would kill spectator pacing. Simultaneous movement with resolution phase provides real-time feel with manageable complexity.

3. **AEL Integration is the Moat** — No competitor combines governance education with competitive AI racing. The four pillars provide unique scoring depth.

4. **Keep Map Simple, Questions Complex** — Board game mechanics should be minimal (linear path). Complexity comes from governance questions and agent reasoning.

5. **Spectator Interface = Product** — In a spectator-only experience, the viewing interface IS the product. Invest heavily in map visualization, real-time updates, and reasoning display.
