/**
 * Client-side Game State Manager for AI Arena
 * Receives and renders server-authoritative game state
 */

class GameStateManager {
    constructor(options = {}) {
        this.socketClient = options.socketClient || window.socketClient;
        this.currentState = null;
        this.eventHandlers = new Map();
        
        // UI element selectors
        this.ui = {
            gameStatus: options.gameStatus || '#game-status',
            agentsContainer: options.agentsContainer || '#agents-container',
            currentQuestion: options.currentQuestion || '#current-question',
            spectatorList: options.spectatorList || '#spectator-list',
            roundInfo: options.roundInfo || '#round-info',
        };
        
        this._init();
    }

    /**
     * Initialize the game state manager
     */
    _init() {
        this._bindEvents();
        console.log('[GameStateManager] Initialized');
    }

    /**
     * Bind to socket client events
     */
    _bindEvents() {
        if (!this.socketClient) {
            console.warn('[GameStateManager] No socket client available');
            return;
        }

        // Listen for game state updates
        this.socketClient.on('game:state', (data) => {
            this.handleStateUpdate(data);
        });

        // Listen for spectator events
        this.socketClient.on('spectator:joined', (data) => {
            this._updateSpectatorList();
        });

        this.socketClient.on('spectator:left', (data) => {
            this._updateSpectatorList();
        });

        this.socketClient.on('spectator:list', (data) => {
            if (this.currentState) {
                this.currentState.spectators = data.spectators || [];
                this._updateSpectatorList();
            }
        });
    }

    /**
     * Handle incoming game state update from server
     * @param {Object} state - Full game state from server
     */
    handleStateUpdate(state) {
        console.log('[GameStateManager] Received state update:', state);
        
        // Store current state
        this.currentState = state;
        
        // Emit state update event
        this._emit('state:update', state);
        
        // Render updated state
        this.renderGameState();
    }

    /**
     * Get current cached game state
     * @returns {Object|null} Current game state
     */
    getCurrentState() {
        return this.currentState;
    }

    /**
     * Get current game status
     * @returns {string|null} Game status
     */
    getGameStatus() {
        return this.currentState?.gameSession?.status || null;
    }

    /**
     * Get agents in current game
     * @returns {Array} Array of agent objects
     */
    getAgents() {
        return this.currentState?.agents || [];
    }

    /**
     * Get agent by ID
     * @param {string} agentId - Agent ID
     * @returns {Object|null} Agent object
     */
    getAgent(agentId) {
        return this.currentState?.agents?.find(a => a.id === agentId) || null;
    }

    /**
     * Get current question
     * @returns {Object|null} Current question
     */
    getCurrentQuestion() {
        return this.currentState?.currentQuestion || null;
    }

    /**
     * Get spectators
     * @returns {Array} Array of spectator objects
     */
    getSpectators() {
        return this.currentState?.spectators || [];
    }

    /**
     * Get current round
     * @returns {number} Current round number
     */
    getRound() {
        return this.currentState?.round || 1;
    }

    /**
     * Render the current game state to UI
     */
    renderGameState() {
        if (!this.currentState) {
            console.log('[GameStateManager] No state to render');
            return;
        }

        this._renderGameStatus();
        this._renderAgents();
        this._renderCurrentQuestion();
        this._renderSpectatorList();
        this._renderRoundInfo();

        console.log('[GameStateManager] Rendered game state', {
            agents: this.currentState.agents?.length || 0,
            spectators: this.currentState.spectators?.length || 0,
            status: this.currentState.gameSession?.status,
        });
    }

    /**
     * Render game status
     */
    _renderGameStatus() {
        const element = document.querySelector(this.ui.gameStatus);
        if (!element) return;

        const status = this.currentState?.gameSession?.status || 'UNKNOWN';
        const statusText = this._formatStatus(status);
        
        element.innerHTML = `
            <span class="game-status-badge status-${status.toLowerCase().replace('_', '-')}">
                ${statusText}
            </span>
        `;
    }

    /**
     * Format game status for display
     */
    _formatStatus(status) {
        const statusMap = {
            'INIT': 'Initializing',
            'AWAITING_ANSWERS': 'Awaiting Answers',
            'PROCESSING': 'Processing',
            'RESOLVED': 'Resolved',
            'FINISHED': 'Finished',
        };
        return statusMap[status] || status;
    }

    /**
     * Render agents positions and scores
     */
    _renderAgents() {
        const element = document.querySelector(this.ui.agentsContainer);
        if (!element) return;

        const agents = this.currentState?.agents || [];
        
        if (agents.length === 0) {
            element.innerHTML = '<p class="no-agents">No agents in game</p>';
            return;
        }

        // Sort by position (leader first)
        const sortedAgents = [...agents].sort((a, b) => b.position - a.position);

        const agentsHtml = sortedAgents.map((agent, index) => {
            const rank = index + 1;
            const isLeader = rank === 1;
            const isConnected = agent.isConnected !== false;
            
            return `
                <div class="agent-card ${isLeader ? 'agent-leader' : ''} ${!isConnected ? 'agent-disconnected' : ''}" 
                     style="border-left-color: ${agent.color || '#ccc'}">
                    <div class="agent-rank">#${rank}</div>
                    <div class="agent-info">
                        <div class="agent-name">
                            ${agent.name}
                            <span class="agent-connection-status ${isConnected ? 'online' : 'offline'}" 
                                  title="${isConnected ? 'Online' : 'Offline'}"></span>
                        </div>
                        <div class="agent-type">${this._formatAgentType(agent.type)}</div>
                    </div>
                    <div class="agent-stats">
                        <div class="agent-position">
                            <span class="stat-value">${agent.position}</span>
                            <span class="stat-label">pos</span>
                        </div>
                        <div class="agent-score">
                            <span class="stat-value">${agent.score}</span>
                            <span class="stat-label">pts</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        element.innerHTML = agentsHtml;
    }

    /**
     * Format agent type for display
     */
    _formatAgentType(type) {
        const typeMap = {
            'AI': 'AI Agent',
            'HUMAN': 'Human Player',
            'DEMO_STRICT': 'Conservative',
            'DEMO_LENIENT': 'Progressive',
            'DEMO_BALANCED': 'Balanced',
        };
        return typeMap[type] || type;
    }

    /**
     * Render current question
     */
    _renderCurrentQuestion() {
        const element = document.querySelector(this.ui.currentQuestion);
        if (!element) return;

        const question = this.currentState?.currentQuestion;
        
        if (!question) {
            element.innerHTML = '<p class="no-question">No active question</p>';
            return;
        }

        const optionsHtml = question.options?.map((option, index) => `
            <div class="question-option">
                <span class="option-letter">${String.fromCharCode(65 + index)})</span>
                <span class="option-text">${option}</span>
            </div>
        `).join('') || '';

        element.innerHTML = `
            <div class="question-card">
                <div class="question-text">${question.text}</div>
                <div class="question-options">
                    ${optionsHtml}
                </div>
            </div>
        `;
    }

    /**
     * Update spectator list
     */
    _updateSpectatorList() {
        const element = document.querySelector(this.ui.spectatorList);
        if (!element) return;

        const spectators = this.currentState?.spectators || [];
        const count = spectators.length;
        
        if (count === 0) {
            element.innerHTML = '<li class="spectator-empty">No spectators</li>';
        } else {
            element.innerHTML = spectators.map((spec, index) => `
                <li class="spectator-item">
                    <span class="spectator-number">${index + 1}</span>
                    <span class="spectator-id">${spec.id?.substring(0, 8) || 'Unknown'}</span>
                </li>
            `).join('');
        }
    }

    /**
     * Render round information
     */
    _renderRoundInfo() {
        const element = document.querySelector(this.ui.roundInfo);
        if (!element) return;

        const round = this.currentState?.round || 1;
        
        element.innerHTML = `
            <span class="round-label">Round</span>
            <span class="round-value">${round}</span>
        `;
    }

    /**
     * Register an event handler
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     */
    on(event, callback) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(callback);
    }

    /**
     * Remove an event handler
     * @param {string} event - Event name
     * @param {Function} callback - Event handler to remove
     */
    off(event, callback) {
        if (!this.eventHandlers.has(event)) return;
        
        if (!callback) {
            this.eventHandlers.delete(event);
        } else {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(callback);
            if (index !== -1) {
                handlers.splice(index, 1);
            }
        }
    }

    /**
     * Emit event to registered handlers
     */
    _emit(event, data) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('[GameStateManager] Error in event handler:', error);
                }
            });
        }
    }

    /**
     * Clear current game state
     */
    clearState() {
        this.currentState = null;
        console.log('[GameStateManager] State cleared');
    }
}

/**
 * Handle game state update (convenience function)
 * @param {Object} state - Game state from server
 */
function handleStateUpdate(state) {
    if (window.gameStateManager) {
        window.gameStateManager.handleStateUpdate(state);
    }
}

/**
 * Render game state (convenience function)
 */
function renderGameState() {
    if (window.gameStateManager) {
        window.gameStateManager.renderGameState();
    }
}

/**
 * Initialize game state manager
 * @param {Object} options - Configuration options
 * @returns {GameStateManager} GameStateManager instance
 */
function initGameState(options = {}) {
    // Check if already initialized
    if (window.gameStateManager) {
        console.log('[GameStateManager] Using existing instance');
        return window.gameStateManager;
    }

    const manager = new GameStateManager(options);
    window.gameStateManager = manager;
    return manager;
}

// Export for module systems and global access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        GameStateManager, 
        handleStateUpdate, 
        renderGameState,
        initGameState 
    };
} else {
    window.GameStateManager = GameStateManager;
    window.handleStateUpdate = handleStateUpdate;
    window.renderGameState = renderGameState;
    window.initGameState = initGameState;
}
