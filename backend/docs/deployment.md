# Deployment Guide

Deploy the AI Governance Arena backend to Render.

## Prerequisites

- GitHub repository with backend code
- Render account (free tier compatible)

## Option 1: Render Blueprint Import (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Select the `backend/render.yaml` file
5. Configure required environment variables:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `ANTHROPIC_API_KEY`: Your Anthropic API key
6. Click "Apply"

Render will create:
- 2 web services (staging, production)
- 2 PostgreSQL databases
- Auto-deploy pipeline

## Option 2: Manual Setup

### 1. Create Databases

Create two PostgreSQL databases on Render:
- `ai-arena-db-staging` (free tier)
- `ai-arena-db-prod` (free tier)

### 2. Create Web Services

Create two web services:
- `ai-arena-backend-staging`
- `ai-arena-backend-prod`

Configure each with:
- Build Command: `npm install && npm run build && npx prisma migrate deploy && npx prisma generate`
- Start Command: `npm start`
- Health Check Path: `/health`

### 3. Environment Variables

Set for each service:

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | staging or production |
| `PORT` | 3000 |
| `DATABASE_URL` | From Render PostgreSQL connection string |
| `CORS_ORIGIN` | `https://chunkstand.github.io` |
| `OPENAI_API_KEY` | Your OpenAI API key |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |

## Auto-Deploy Pipeline

The backend is configured for automatic deployments:

| Branch | Service | Behavior |
|--------|---------|----------|
| `main` | Production | Auto-deploys on push |
| Any | Staging | Auto-deploys on push |

### Deployment Flow

1. Push code to `main` branch
2. Render detects change → starts build
3. Build runs: install → typecheck → migrate → deploy
4. Health check confirms service health
5. Traffic switches to new version

### Manual Rollback

If deployment fails:

1. Go to Render Dashboard → your service
2. Click "Deploys" tab
3. Find last known good deploy
4. Click "Redeploy" next to that version

## Verification

After deployment, verify:

```bash
# Health check
curl https://ai-arena-backend-prod.onrender.com/health

# Should return:
# {"status":"ok","database":"connected","timestamp":"..."}
```

## Troubleshooting

See [troubleshooting.md](./troubleshooting.md) for common deployment issues.
