# Troubleshooting Runbook

Operational troubleshooting guide for AI Governance Arena backend.

## Health Check Failures

### Symptom: `curl /health` returns 500

**Diagnosis:**
```bash
curl https://ai-arena-backend-prod.onrender.com/health
```

**Causes:**
1. Database connection failed
2. Missing environment variables

**Resolution:**
1. Check DATABASE_URL is set in Render dashboard
2. Verify PostgreSQL database is running
3. Check service logs in Render dashboard

---

## AI API Failures

### Symptom: Tournament runs but agents don't move

**Diagnosis:**
Check logs for AI decision errors:
```bash
# In Render dashboard logs, look for:
# "AI decision failed for game X"
```

**Causes:**
1. Invalid or missing API keys
2. Rate limiting from provider
3. Network issues to AI API

**Resolution:**
1. Verify `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` are set
2. Check API keys are valid in provider dashboards
3. Review [OpenAI status](https://status.openai.com) / [Anthropic status](https://status.anthropic.com)

**Automatic Recovery:**
- System returns deterministic fallback answers
- Tournament continues without crashing
- Errors logged for operator review

---

## Database Connection Loss

### Symptom: 503 "Database unavailable" responses

**Diagnosis:**
```bash
curl -v https://ai-arena-backend-prod.onrender.com/api/sessions
# Returns: {"error": "Database unavailable"}
```

**Causes:**
1. PostgreSQL database paused (free tier sleeps after 90 days)
2. Database connection limit reached
3. Network connectivity issues

**Resolution:**
1. **If paused**: Log into Render dashboard, manually unpause database
2. **If at limit**: Check active connections in database metrics
3. **If network**: Verify Render service and database are in same region

**Prevention:**
- Render free tier databases pause after 90 days of inactivity
- Set up UptimeRobot to ping health endpoint regularly

---

## WebSocket Disconnect Spikes

### Symptom: High number of disconnect events in logs

**Diagnosis:**
Look for disconnect reasons in logs:
```
👁️  Spectator namespace disconnect: socket-id (reason: ping timeout)
🎮 Game namespace disconnect: socket-id (reason: transport close)
```

**Disconnect Reasons:**
| Reason | Meaning | Action |
|--------|---------|--------|
| `ping timeout` | Client didn't respond to server ping | Check client network |
| `transport close` | Underlying transport closed | Check network stability |
| `transport error` | Network error (websocket) | Check load balancer |
| `server disconnect` | Server intentionally disconnected | Expected during deploys |
| `client disconnect` | Client closed connection | Normal behavior |

**Resolution:**
1. For `ping timeout`: Increase client heartbeat interval
2. For `transport error`: Check for proxy/timeouts in load balancer
3. For spikes: Check for deployment or infrastructure issues

**Monitoring:**
- Connection status events emitted to rooms for dashboard monitoring
- Log aggregation should track disconnect rates

---

## High Response Times

### Symptom: API requests taking > 5 seconds

**Diagnosis:**
1. Check service metrics in Render dashboard
2. Look for slow database queries in logs

**Causes:**
1. Cold start (free tier spins down after 15 min)
2. Database query performance
3. AI API latency

**Resolution:**
1. **Cold start**: Upgrade to paid tier or expect ~30s first request
2. **Database**: Check for missing indexes, long queries
3. **AI latency**: Expected for AI calls, implement timeouts

---

## Common Error Codes

| Code | Meaning | Resolution |
|------|---------|-------------|
| 400 | Invalid request body | Check JSON syntax |
| 404 | Resource not found | Verify session ID |
| 503 | Database unavailable | Check database status |
| P1001 | Can't reach database | Check DATABASE_URL |
| P1002 | Database timeout | Database overloaded |

---

## Getting Help

1. Check service logs in Render dashboard
2. Verify environment variables in settings
3. Test locally with `npm run dev`
4. Review [deployment.md](./deployment.md)
