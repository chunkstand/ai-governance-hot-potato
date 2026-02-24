# Phase 4: Real-Time Core - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

WebSocket infrastructure operational with Socket.io server providing namespace/room support for game isolation, spectator room implementation for live viewing, WebSocket client integration in the existing frontend HTML/JS, server-authoritative game state broadcast to all connected spectators, 30-second heartbeat/ping-pong for connection health monitoring, exponential backoff reconnection with jitter, and connection status indicators showing online/offline per spectator.

This phase delivers the real-time communication layer that enables Phase 5 (AI Integration) and Phase 6 (Game Logic) to function with live updates. Without this infrastructure, no real-time spectator experience is possible.

</domain>

<decisions>
## Implementation Decisions

### Connection Recovery Behavior
- **Reconnection delay:** Short delay (1-3 seconds) before reconnection attempts to avoid server hammering
- **Manual reconnect:** Only after automatic reconnection fails (max retries exceeded)
- **Visual feedback during disconnect:** Claude's discretion (subtle indicator vs overlay)
- **Maximum reconnection attempts:** Claude's discretion

### Room and Namespace Structure
- **Namespace organization:** Multiple namespaces for different purposes (e.g., `/game`, `/spectator`, `/admin`)
- **Room naming convention:** Sequential numbers (game:001, game:002, etc.) — human-readable and simple
- **Room cleanup strategy:** Auto-cleanup on disconnect — room destroyed when last person leaves
- **Spectator room access pattern:** Claude's discretion (same room vs separate spectator rooms)

### State Broadcast Strategy
- **Broadcast content:** Full game state (not deltas) — simpler, reliable, ensures consistency
- **State priority:** Critical state first — agent positions and scores before chat/messages
- **Broadcast throttling:** Claude's discretion (immediate vs debounced vs fixed interval)
- **Late-joining spectators:** Claude's discretion (full state dump vs replay vs join-from-now)

### Spectator View Integration
- **Integration location:** Existing game page (index.html) with spectator mode/view — not a separate page
- **Connection status visibility:** Full list — show all connected spectators with their connection status
- **Status UI placement:** Claude's discretion (top-right, bottom bar, or near game board)
- **Visual style:** Claude's discretion (colored dot, text+icon, or full status bar)

### Claude's Discretion
The following areas are left to Claude's implementation judgment:
- Visual feedback style during disconnect (subtle indicator vs blocking overlay)
- Maximum reconnection attempt count
- Spectator room access pattern (same room with permissions vs mirrored rooms)
- Broadcast throttling strategy (immediate, debounced, or fixed interval)
- Late-joining spectator handling (full state vs replay vs current-only)
- Connection status UI placement and visual design
- Heartbeat/ping-pong implementation details
- Exponential backoff algorithm specifics

</decisions>

<specifics>
## Specific Ideas

- **Sequential room numbers** (game:001, game:002) are preferred over UUIDs for human readability
- **Multiple namespaces** keep concerns separated (game logic vs spectator viewing)
- **Full state broadcast** ensures late-joining spectators see current state immediately
- **Critical-first priority** means agent positions update before chat messages
- **Auto-cleanup** prevents orphaned rooms when spectators leave
- **Existing game page** should support both "play" and "spectate" modes
- **Full spectator list** creates sense of community and validates connection health

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 4 scope (WebSocket infrastructure only).

Game mechanics, AI integration, map visualization, and leaderboards belong in Phases 5-7 respectively.

</deferred>

---

*Phase: 04-real-time-core*
*Context gathered: 2026-02-24*
