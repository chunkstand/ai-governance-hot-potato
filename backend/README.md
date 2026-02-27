# AI Governance Arena - Backend API

Backend API for the AI Governance Arena - a real-time multiplayer game where AI agents compete by answering governance questions using the AEL (Automated Experience Lifecycle) framework.

## Overview

This backend provides:
- REST API for game session management
- CORS-enabled endpoints for GitHub Pages frontend integration
- Interactive API documentation (Swagger UI)
- Health monitoring for Render deployment
- PostgreSQL database with Prisma ORM

## Requirements

- Node.js >= 20.0.0
- PostgreSQL 15+ database
- GitHub Pages frontend at `chunkstand.github.io` (for CORS)

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your database connection and CORS origin:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/aiarena
# Support multiple origins in development (comma-separated)
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
OPENAI_API_KEY=your-openai-key  # For Phase 5 AI integration
ANTHROPIC_API_KEY=your-anthropic-key  # For Phase 5 AI integration
```

**Note**: For production (GitHub Pages), set:
```env
CORS_ORIGIN=https://chunkstand.github.io
```

### 3. Set Up Database

```bash
# Run database migrations
npm run db:migrate

# Generate Prisma client
npm run db:generate
```

### 4. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or your configured PORT).

## API Documentation

### Interactive Documentation (Swagger UI)

Once the server is running, visit:
- http://localhost:3000/docs

### Raw OpenAPI Specification

- http://localhost:3000/openapi.json

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check with database status |
| GET | `/docs` | Swagger UI documentation |
| GET | `/openapi.json` | Raw OpenAPI specification |
| GET | `/api/sessions` | List game sessions |
| POST | `/api/sessions` | Create new game session |
| GET | `/api/sessions/:id` | Get session details |
| DELETE | `/api/sessions/:id` | Delete game session |
| POST | `/api/sessions/:id/start` | Start game session |
| GET | `/api/sessions/:id/agents` | List agents in session |

### Example: Create Game Session

```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{
    "mode": "demo",
    "agents": [
      {"name": "StrictBot", "type": "DEMO_STRICT", "color": "#FF4444"},
      {"name": "LenientBot", "type": "DEMO_LENIENT", "color": "#44FF44"},
      {"name": "BalancedBot", "type": "DEMO_BALANCED", "color": "#4444FF"}
    ]
  }'
```

## CORS Configuration

The backend is configured to allow requests from the GitHub Pages frontend.

**Production CORS Origin**: `https://chunkstand.github.io`

**Development**: Multiple origins supported via comma-separated list in `.env`:
```env
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

### Testing CORS

1. **Automated Tests**:
   ```bash
   npm test
   ```

2. **Manual Browser Test**:
   Open `frontend/test-cors.html` in a browser with the backend running.

3. **cURL Test**:
   ```bash
   curl -H "Origin: https://chunkstand.github.io" \
        -H "Access-Control-Request-Method: POST" \
        -X OPTIONS http://localhost:3000/api/sessions
   ```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm start` | Start production server |
| `npm run build` | Compile TypeScript to dist/ |
| `npm run typecheck` | Run TypeScript type checking |
| `npm test` | Run test suite |
| `npm run db:migrate` | Run database migrations |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:studio` | Open Prisma Studio GUI |

## Database Schema

### GameSession
- `id`: UUID primary key
- `status`: INIT | AWAITING_ANSWERS | PROCESSING | RESOLVED | FINISHED
- `createdAt/updatedAt`: Timestamps
- `agents`: Related Agent[]
- `moves`: Related Move[]

### Agent
- `id`: UUID primary key
- `name`: Display name
- `type`: AI | HUMAN | DEMO_STRICT | DEMO_LENIENT | DEMO_BALANCED
- `color`: Hex color code for UI
- `position`: Current position on game map
- `score`: Current score

### Decision
- `id`: UUID primary key
- `questionId`: Reference to question
- `answer`: A | B | C | D
- `reasoning`: Text explanation
- `timeMs`: Answer time in milliseconds

### Move
- `id`: UUID primary key
- `fromPosition/toPosition`: Position tracking
- `spacesMoved`: Number of spaces

## Deployment

### Render (Production)

The backend deploys automatically to Render when you push to the `main` branch:

- **Staging**: https://ai-arena-backend-staging.onrender.com
- **Production**: https://ai-arena-backend-prod.onrender.com

See [deployment.md](./docs/deployment.md) for:
- Render blueprint import steps
- Environment variable configuration
- Auto-deploy pipeline behavior
- Manual rollback procedures

### Troubleshooting

See [troubleshooting.md](./docs/troubleshooting.md) for:
- Health check failure resolution
- AI API failure recovery
- Database connection troubleshooting
- WebSocket disconnect analysis
- Common error codes

### API Reference

See [api-reference.md](./docs/api-reference.md) for:
- REST endpoint documentation
- WebSocket namespace details
- Example curl requests
- Error response formats

## Project Structure

```
backend/
├── src/
│   ├── config/           # Environment configuration
│   ├── lib/             # Prisma client
│   ├── middleware/      # CORS, error handling
│   ├── routes/          # API routes (health, docs, api)
│   ├── types/           # TypeScript interfaces
│   └── index.ts         # Express server entry
├── tests/               # Test suite
├── prisma/
│   └── schema.prisma    # Database schema
├── openapi.yaml         # OpenAPI specification
├── render.yaml          # Render deployment config
└── package.json
```

## Requirements Coverage

This implementation covers:
- **INF-03**: CORS configured for GitHub Pages
- **INF-06**: API documented with OpenAPI specification

## Next Steps

See Phase 4 (Real-Time Core) for WebSocket implementation and Phase 5 for AI integration.

## License

MIT
