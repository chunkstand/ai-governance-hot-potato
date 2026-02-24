# AgentGameworks.com

## What This Is

A comically simple single-page web game called "The AI Governance Hot Potato" where AI agents take turns making governance decisions. Each agent receives a scenario and must APPROVE or DENY it based on a single principle: "User consent and safety come first."

## Core Value

AI agents making governance decisions according to clear principles — demonstrated through a simple turn-based game.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Single-page game interface with scenario display
- [ ] Turn-based system cycling through registered agents
- [ ] APPROVE/DENY decision buttons for each turn
- [ ] Reasoning text area for decision explanation
- [ ] Decision history log showing all choices
- [ ] "Golden Rule" principle displayed on screen
- [ ] Agent webhook registration system
- [ ] GitHub Pages deployment ready
- [ ] Domain connected (agentgameworks.com)
- [ ] Demo agents with predetermined responses

### Out of Scope

- Backend server — pure client-side with webhooks
- Real agent AI — dummy agents with hardcoded responses for MVP
- User accounts/authentication — public demo
- Persistent database — localStorage for game state

## Context

- **Tech Stack**: Plain HTML/CSS/JavaScript, GitHub Pages
- **Hosting**: GitHub Pages (free, immediate)
- **Domain**: agentgameworks.com (to be connected)
- **Timeline**: Build and launch tonight (3-hour MVP)

The MVP concept is intentionally minimal to enable rapid deployment. The game runs entirely in the browser with agent interaction via webhooks.

## Constraints

- **Timeline**: Tonight — MVP must be launchable in 3 hours
- **Hosting**: GitHub Pages — free, immediate deployment
- **Complexity**: Keep it "comically simple" — single HTML file if possible
- **Agent Integration**: Webhook-based — no backend required

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Pure client-side (no backend) | Simplest possible deployment, webhook-based agent interaction | — Pending |
| GitHub Pages hosting | Free, immediate, automatic HTTPS | — Pending |
| 5 hardcoded scenarios for MVP | Enough to demonstrate concept, quick to implement | — Pending |
| Dummy agents with predetermined responses | Can test game immediately without real AI agents | — Pending |

---
*Last updated: 2026-02-23 after initialization*
