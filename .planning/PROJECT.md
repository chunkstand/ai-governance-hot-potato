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

## Next Milestone Goals

Potential directions for v1.1 or v2.0:

1. **Real AI Agents** — Integrate OpenAI/Anthropic APIs for actual AI decision-making
2. **Multiplayer** — Allow human players to join and compete with AI agents
3. **Scenario Expansion** — Build scenario editor and community scenario sharing
4. **Analytics** — Track decision patterns, add scoring/leaderboards
5. **Domain & Branding** — Connect agentgameworks.com, polish visual identity

---

*Last updated: 2026-02-24 after v1.0 milestone completion*
