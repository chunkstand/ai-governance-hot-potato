import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import type { 
  CreateGameSessionInput, 
  GameSession, 
  GameSessionSummary,
  Agent,
  GameSessionStatus,
  GameMode,
  AgentType 
} from '../types';

const router = Router();

/**
 * API Routes
 * 
 * Game session management endpoints
 * Per requirement INF-06: API contract documented (OpenAPI/JSON Schema for endpoints)
 */

// Validation helpers
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_STATUSES: GameSessionStatus[] = ['INIT', 'AWAITING_ANSWERS', 'PROCESSING', 'RESOLVED', 'FINISHED'];
const VALID_MODES: GameMode[] = ['demo', 'ai'];
const VALID_AGENT_TYPES: AgentType[] = ['AI', 'HUMAN', 'DEMO_STRICT', 'DEMO_LENIENT', 'DEMO_BALANCED'];
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

function validateSessionInput(body: any): { valid: boolean; errors: Array<{ field: string; message: string }> } {
  const errors: Array<{ field: string; message: string }> = [];

  // Validate mode
  if (!body.mode) {
    errors.push({ field: 'mode', message: 'Mode is required' });
  } else if (!VALID_MODES.includes(body.mode)) {
    errors.push({ field: 'mode', message: `Mode must be one of: ${VALID_MODES.join(', ')}` });
  }

  // Validate agents
  if (!body.agents) {
    errors.push({ field: 'agents', message: 'Agents array is required' });
  } else if (!Array.isArray(body.agents)) {
    errors.push({ field: 'agents', message: 'Agents must be an array' });
  } else if (body.agents.length === 0) {
    errors.push({ field: 'agents', message: 'At least one agent is required' });
  } else if (body.agents.length > 8) {
    errors.push({ field: 'agents', message: 'Maximum 8 agents allowed' });
  } else {
    // Validate each agent
    body.agents.forEach((agent: any, index: number) => {
      if (!agent.name || typeof agent.name !== 'string' || agent.name.trim() === '') {
        errors.push({ field: `agents[${index}].name`, message: 'Agent name is required' });
      } else if (agent.name.length > 50) {
        errors.push({ field: `agents[${index}].name`, message: 'Agent name must be 50 characters or less' });
      }

      if (!agent.type) {
        errors.push({ field: `agents[${index}].type`, message: 'Agent type is required' });
      } else if (!VALID_AGENT_TYPES.includes(agent.type)) {
        errors.push({ field: `agents[${index}].type`, message: `Type must be one of: ${VALID_AGENT_TYPES.join(', ')}` });
      }

      if (agent.color && !HEX_COLOR_REGEX.test(agent.color)) {
        errors.push({ field: `agents[${index}].color`, message: 'Color must be a valid hex code (e.g., #FF4444)' });
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

// Transform Prisma GameSession to API response format
function transformGameSession(session: any): GameSession {
  return {
    id: session.id,
    status: session.status as GameSessionStatus,
    mode: session.mode as GameMode | undefined,
    agents: session.agents?.map(transformAgent) || [],
    moves: session.moves || [],
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    finishedAt: session.finishedAt?.toISOString() || null,
  };
}

function transformAgent(agent: any): Agent {
  return {
    id: agent.id,
    name: agent.name,
    type: agent.type as AgentType,
    color: agent.color,
    position: agent.position,
    score: agent.score,
    gameSessionId: agent.gameSessionId,
    decisions: agent.decisions || [],
    moves: agent.moves || [],
    createdAt: agent.createdAt.toISOString(),
  };
}

/**
 * GET /api/sessions
 * List active game sessions with optional filtering
 */
router.get('/sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, limit = '10' } = req.query;

    // Validate status if provided
    if (status && !VALID_STATUSES.includes(status as GameSessionStatus)) {
      res.status(400).json({
        error: `Invalid status value. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
      return;
    }

    // Parse and validate limit
    const limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      res.status(400).json({
        error: 'Limit must be a number between 1 and 100',
      } );
      return;
    }

    // Build query
    const where: any = {};
    if (status) {
      where.status = status;
    }

    // Query sessions with agent count
    const sessions = await prisma.gameSession.findMany({
      where,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { agents: true },
        },
      },
    });

    // Transform to summary format
    const summaries: GameSessionSummary[] = sessions.map((session: any) => ({
      id: session.id,
      status: session.status as GameSessionStatus,
      agentCount: session._count.agents,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    }));

    res.json(summaries);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sessions
 * Create a new game session
 */
router.post('/sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate input
    const { valid, errors } = validateSessionInput(req.body);
    if (!valid) {
      res.status(400).json({
        error: 'Validation failed',
        details: errors,
      } );
      return;
    }

    const { mode: _mode, agents }: CreateGameSessionInput = req.body;

    // Create session with agents in a transaction
    const session = await prisma.$transaction(async (tx) => {
      // Create the session
      const newSession = await tx.gameSession.create({
        data: {
          status: 'INIT',
          agents: {
            create: agents.map((agent) => ({
              name: agent.name.trim(),
              type: agent.type,
              color: agent.color || getDefaultColor(agent.type),
              position: 0,
              score: 0,
            })),
          },
        },
        include: {
          agents: true,
        },
      });

      return newSession;
    });

    // Transform and return
    res.status(201).json(transformGameSession(session));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sessions/:id
 * Get a specific game session by ID
 */
router.get('/sessions/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!isValidUUID(id)) {
      res.status(400).json({
        error: 'Invalid session ID format. Expected UUID.',
      } );
      return;
    }

    // Query session
    const session = await prisma.gameSession.findUnique({
      where: { id },
      include: {
        agents: {
          include: {
            decisions: true,
            moves: true,
          },
        },
        moves: true,
      },
    });

    if (!session) {
      res.status(404).json({
        error: 'Game session not found',
      } );
      return;
    }

    res.json(transformGameSession(session));
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/sessions/:id
 * Delete a game session
 */
router.delete('/sessions/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!isValidUUID(id)) {
      res.status(400).json({
        error: 'Invalid session ID format. Expected UUID.',
      } );
      return;
    }

    // Check if session exists
    const existingSession = await prisma.gameSession.findUnique({
      where: { id },
    });

    if (!existingSession) {
      res.status(404).json({
        error: 'Game session not found',
      } );
      return;
    }

    // Delete session (cascades to agents, decisions, moves via Prisma)
    await prisma.gameSession.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sessions/:id/start
 * Start a game session (transition from INIT to AWAITING_ANSWERS)
 */
router.post('/sessions/:id/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!isValidUUID(id)) {
      res.status(400).json({
        error: 'Invalid session ID format. Expected UUID.',
      } );
      return;
    }

    // Find session
    const session = await prisma.gameSession.findUnique({
      where: { id },
      include: { agents: true },
    });

    if (!session) {
      res.status(404).json({
        error: 'Game session not found',
      } );
      return;
    }

    // Check if session can be started
    if (session.status !== 'INIT') {
      res.status(400).json({
        error: `Cannot start session. Current status: ${session.status}`,
      } );
      return;
    }

    // Check if there are agents
    if (session.agents.length === 0) {
      res.status(400).json({
        error: 'Cannot start session. No agents registered.',
      } );
      return;
    }

    // Update status
    const updatedSession = await prisma.gameSession.update({
      where: { id },
      data: { status: 'AWAITING_ANSWERS' },
      include: { agents: true },
    });

    res.json(transformGameSession(updatedSession));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sessions/:id/agents
 * List all agents in a session
 */
router.get('/sessions/:id/agents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!isValidUUID(id)) {
      res.status(400).json({
        error: 'Invalid session ID format. Expected UUID.',
      } );
      return;
    }

    // Check if session exists
    const session = await prisma.gameSession.findUnique({
      where: { id },
    });

    if (!session) {
      res.status(404).json({
        error: 'Game session not found',
      } );
      return;
    }

    // Get agents
    const agents = await prisma.agent.findMany({
      where: { gameSessionId: id },
      include: {
        decisions: true,
        moves: true,
      },
    });

    res.json(agents.map(transformAgent));
  } catch (error) {
    next(error);
  }
});

// Helper function to get default color based on agent type
function getDefaultColor(type: AgentType): string {
  const colors: Record<AgentType, string> = {
    'AI': '#9B59B6',        // Purple
    'HUMAN': '#3498DB',     // Blue
    'DEMO_STRICT': '#E74C3C',    // Red
    'DEMO_LENIENT': '#2ECC71',   // Green
    'DEMO_BALANCED': '#F39C12',  // Orange
    'DEMO_RANDOM': '#1ABC9C',    // Teal
  };
  return colors[type] || '#95A5A6'; // Default gray
}

export { router as apiRouter };
