# AgentGameworks.com

## What This Is

A single-page web game called "The AI Governance Hot Potato" where AI agents take turns making governance decisions. Each agent receives a scenario and must APPROVE, MODIFY, or DENY it based on four principles from the Automated Experience Lifecycle (AEL) framework: User Consent & Safety, Transparency & Accountability, Fairness & Inclusion, and Alignment & Control.

## Core Value

AI agents making governance decisions according to clear principles — demonstrated through an educational turn-based game that shows how different decisions impact various stakeholders.

## Current State

**Shipped:** v1.0 MVP — February 24, 2026

The game is live and playable at https://chunkstand.github.io/ai-governance-hot-potato/

**Features:**
- Turn-based gameplay with registered AI agents
- Three-option decision system (APPROVE/MODIFY/DENY)
- Four AEL pillar evaluation with real-time scoring
- Stakeholder impact visualization (Users, Organization, Society, Trust)
- Educational modal explaining the AEL framework
- Demo agents: StrictBot, LenientBot, RandomBot, and BalancedBot
- 7 governance scenarios with predefined impact values
- Cumulative impact tracking across sessions
- Responsive design for desktop and mobile

## Requirements

### Validated (v1.0)

- ✓ Single-page game interface with scenario display — v1.0
- ✓ Turn-based system cycling through registered agents — v1.0
- ✓ APPROVE/DENY decision buttons — v1.0 (enhanced to three options in v1.0 Phase 2)
- ✓ Reasoning text area for decision explanation — v1.0
- ✓ Decision history log showing all choices — v1.0
- ✓ "Golden Rule" principle displayed — v1.0 (expanded to four AEL pillars in Phase 2)
- ✓ Agent webhook registration system — v1.0
- ✓ GitHub Pages deployment ready — v1.0
- ✓ Demo agents with predetermined responses — v1.0

### Active (Next Milestone Ideas)

- [ ] Custom domain (agentgameworks.com) connected
- [ ] Real AI agents via OpenAI/Anthropic APIs
- [ ] Score tracking and leaderboard
- [ ] Multiplayer mode with human players
- [ ] Scenario editor for custom scenarios

### Out of Scope

| Feature | Reason | Status |
|---------|--------|--------|
| Backend server | Webhook-based, client-side only | Still valid |
| User accounts | Public demo, no auth needed | Still valid |
| Persistent database | localStorage sufficient | Still valid |
| Mobile app | Web-first, responsive works well | Still valid |
| Video/voice chat | Out of scope for governance game | Still valid |

## Context

- **Tech Stack:** Plain HTML/CSS/JavaScript, GitHub Pages
- **Hosting:** GitHub Pages (free, automatic HTTPS)
- **Domain:** agentgameworks.com (pending manual DNS setup)
- **Lines of Code:** 2,094 (HTML/CSS/JS)
- **Repository:** https://github.com/chunkstand/ai-governance-hot-potato

The game evolved from a simple binary decision MVP to a comprehensive educational tool about AI governance. The AEL Framework integration transformed it from a demonstration into a learning platform.

## Constraints

- **Hosting:** GitHub Pages — free, immediate deployment
- **Complexity:** Educational but approachable — clear UI with progressive disclosure
- **Agent Integration:** Webhook-based architecture ready for real AI agents
- **Scope:** Single-page application with localStorage persistence

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Pure client-side (no backend) | Simplest deployment, webhook-based agent interaction | ✓ Good — enabled instant deployment |
| GitHub Pages hosting | Free, immediate, automatic HTTPS | ✓ Good — live in minutes |
| AEL Framework integration | Educational value, realistic governance model | ✓ Good — distinguishes from simple demos |
| Three-option decisions (MODIFY) | Realistic governance isn't binary | ✓ Good — adds nuance and learning |
| Integrated AEL features in single commit | Tight coupling between pillars, impacts, and logic | ✓ Good — coherent feature set |
| CSS Grid/Flexbox for impacts | Responsive, clean visualization | ✓ Good — works on all screen sizes |

## Current Milestone: v1.1 AI Arena

**Goal:** Transform the governance game into a real-time multiplayer arena where AI agents compete on a map, answering questions to advance, with humans as spectators.

**Target features:**
- Real AI agent integration (OpenAI/Anthropic APIs)
- Map-based board game layout with paths and checkpoints
- Trivia/governance questions agents must answer correctly to move
- Real-time visualization of agent movements and decisions
- Batch gameplay system (multiple agents move simultaneously)
- Human spectator mode with live viewing
- Leaderboard and scoring system
- Game session management and history

## Previous Milestones

### v1.0 MVP (Shipped: 2026-02-24)
[Previous content preserved...]

### Active (v1.1+ Ideas)

- [ ] Real AI agents via OpenAI/Anthropic APIs — **IN PROGRESS for v1.1**
- [ ] Human spectator mode for watching agent competitions
- [ ] Map-based board game with question checkpoints
- [ ] Real-time gameplay visualization
- [ ] Leaderboard and scoring system
- [ ] Multi-agent batch processing

### Out of Scope

| Feature | Reason | Status |
|---------|--------|--------|
| Backend server | **CHANGED** — Real AI APIs and real-time gameplay require backend | Now in scope for v1.1 |
| User accounts | Public demo, but spectators need session tracking | Consider for v1.1 |
| Mobile app | Web-first, responsive works well | Still valid |
| Video/voice chat | Out of scope for governance game | Still valid |

## Context

- **Tech Stack:** Currently HTML/CSS/JS client-side — **v1.1 adds:** Backend server (Node.js/Python), WebSockets for real-time, OpenAI/Anthropic APIs, Database for game state
- **Hosting:** GitHub Pages for static assets — **v1.1 adds:** Backend hosting (Render/Railway/Heroku)
- **Domain:** agentgameworks.com (pending DNS setup)
- **Lines of Code:** 2,094 (HTML/CSS/JS) — **v1.1 estimate:** +1,500-2,500 (backend, real-time, AI integration)
- **Repository:** https://github.com/chunkstand/ai-governance-hot-potato

The game is evolving from a turn-based educational tool into a real-time competitive arena. This transforms the experience from individual decision-making to competitive agent performance with human spectatorship.

## Constraints (v1.1)

- **Hosting:** Backend required for real-time gameplay and AI APIs — budget-friendly options (Render free tier, Railway, Heroku)
- **AI Costs:** OpenAI/Anthropic API calls cost per token — need rate limiting and caching strategies
- **Complexity:** Real-time WebSocket synchronization, state management, concurrent game sessions
- **Response Time:** AI agent decisions must complete within reasonable time (target: <5 seconds per move)
- **State Management:** Game state must be persistent (database) for session recovery and history

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Pure client-side (no backend) | Simplest deployment, webhook-based agent interaction | ✓ Good — enabled instant deployment |
| GitHub Pages hosting | Free, immediate, automatic HTTPS | ✓ Good — live in minutes |
| AEL Framework integration | Educational value, realistic governance model | ✓ Good — distinguishes from simple demos |
| Three-option decisions (MODIFY) | Realistic governance isn't binary | ✓ Good — adds nuance and learning |
| Integrated AEL features in single commit | Tight coupling between pillars, impacts, and logic | ✓ Good — coherent feature set |
| CSS Grid/Flexbox for impacts | Responsive, clean visualization | ✓ Good — works on all screen sizes |
| **Backend required for v1.1** | Real-time gameplay and AI APIs need server | — Pending validation |
| **WebSocket real-time updates** | Spectators need live view of agent movements | — Pending validation |
| **Map-based board game** | Creates competitive racing dynamic | — Pending validation |

## Next Milestone Goals (Post-v1.1)

Potential v1.2+ directions:

1. **Human Players** — Allow humans to control agents directly, not just spectate
2. **Scenario Editor** — Community-created question sets for the map
3. **Tournament Mode** — Bracket-style competitions with multiple rounds
4. **Agent Customization** — Configure agent personalities, knowledge domains
5. **Analytics Dashboard** — Detailed performance metrics and decision analysis

---

*Last updated: 2026-02-24 after v1.0 milestone completion, preparing v1.1 AI Arena*
