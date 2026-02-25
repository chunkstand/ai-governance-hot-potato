/**
 * Connection Status Manager for AI Arena
 * Handles connection status indicator and spectator list UI
 */

class ConnectionStatusManager {
    constructor(options = {}) {
        this.socketClient = options.socketClient || window.socketClient;
        this.containerSelector = options.container || '#connection-status-container';
        this.spectatorPanelSelector = options.spectatorPanel || '#spectator-panel';
        this.gameMode = options.gameMode || 'spectator';
        
        this.elements = {};
        this.spectators = new Map();
        this.currentSpectatorId = null;
        
        this._init();
    }

    /**
     * Initialize the connection status manager
     */
    _init() {
        this._findOrCreateElements();
        this._bindEvents();
        this._renderInitialState();
    }

    /**
     * Find existing elements or create them if they don't exist
     */
    _findOrCreateElements() {
        // Connection status indicator
        let statusContainer = document.querySelector(this.containerSelector);
        if (!statusContainer) {
            statusContainer = this._createStatusContainer();
        }
        this.elements.statusContainer = statusContainer;
        
        // Spectator panel
        let spectatorPanel = document.querySelector(this.spectatorPanelSelector);
        if (!spectatorPanel) {
            spectatorPanel = this._createSpectatorPanel();
        }
        this.elements.spectatorPanel = spectatorPanel;
    }

    /**
     * Create the connection status container element
     */
    _createStatusContainer() {
        const container = document.createElement('div');
        container.id = 'connection-status-container';
        container.className = 'connection-status';
        container.innerHTML = `
            <div class="status-indicator">
                <span class="status-dot" id="connection-status-dot"></span>
                <span class="status-text" id="connection-status-text">Offline</span>
            </div>
            <span class="connection-details" id="connection-details"></span>
        `;
        
        // Insert into game board header or body
        const gameBoard = document.getElementById('gameBoard');
        if (gameBoard) {
            const header = gameBoard.querySelector('.game-header');
            if (header) {
                header.appendChild(container);
            } else {
                gameBoard.insertBefore(container, gameBoard.firstChild);
            }
        } else {
            document.body.appendChild(container);
        }
        
        return container;
    }

    /**
     * Create the spectator panel element
     */
    _createSpectatorPanel() {
        const panel = document.createElement('div');
        panel.id = 'spectator-panel';
        panel.className = 'spectator-panel';
        panel.innerHTML = `
            <div class="spectator-header">
                <h3>👥 Spectators</h3>
                <span class="spectator-count" id="spectator-count">0 watching</span>
            </div>
            <div class="spectator-list-container">
                <ul class="spectator-list" id="spectator-list">
                    <li class="spectator-empty">Not connected to server</li>
                </ul>
            </div>
            <div class="spectator-controls">
                <button id="spectator-toggle-btn" class="btn btn-small btn-spectator">
                    👁️ Spectate
                </button>
            </div>
        `;
        
        // Insert into sidebar or main content
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            // Insert after decision history or at top of sidebar
            const firstChild = sidebar.firstChild;
            if (firstChild) {
                sidebar.insertBefore(panel, firstChild);
            } else {
                sidebar.appendChild(panel);
            }
        } else {
            // Insert into main content area
            const main = document.querySelector('main');
            if (main) {
                main.insertBefore(panel, main.firstChild);
            }
        }
        
        return panel;
    }

    /**
     * Bind event listeners to socket client
     */
    _bindEvents() {
        if (!this.socketClient) {
            console.warn('[ConnectionStatusManager] No socket client available');
            return;
        }

        // Connection state changes
        this.socketClient.on('connection:state', (state) => {
            this.updateConnectionStatus(state);
        });

        // Spectator events
        this.socketClient.on('spectator:joined', (data) => {
            this.spectators.set(data.spectatorId, data);
            this.updateSpectatorList();
        });

        this.socketClient.on('spectator:left', (data) => {
            this.spectators.delete(data.spectatorId);
            this.updateSpectatorList();
        });

        this.socketClient.on('spectator:list', (data) => {
            this.spectators.clear();
            if (data.spectators && Array.isArray(data.spectators)) {
                data.spectators.forEach(spectator => {
                    this.spectators.set(spectator.spectatorId, spectator);
                });
            }
            this.updateSpectatorList();
        });

        // Game events
        this.socketClient.on('game:state', (data) => {
            this._updateGameState(data);
        });

        // Reconnection events
        this.socketClient.on('reconnect:attempt', (data) => {
            this._updateReconnectionStatus(data);
        });

        this.socketClient.on('reconnect:success', () => {
            this._clearReconnectionStatus();
        });

        this.socketClient.on('reconnect:failed', () => {
            this._showReconnectionFailed();
        });

        // UI event listeners
        const toggleBtn = this.elements.spectatorPanel.querySelector('#spectator-toggle-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this._toggleSpectatorMode());
        }
    }

    /**
     * Render initial state
     */
    _renderInitialState() {
        this.updateConnectionStatus({
            state: 'disconnected',
            isConnected: false
        });
        this.updateSpectatorList();
    }

    /**
     * Update the connection status indicator
     * @param {Object} state - Connection state object
     */
    updateConnectionStatus(state) {
        const dot = this.elements.statusContainer.querySelector('#connection-status-dot');
        const text = this.elements.statusContainer.querySelector('#connection-status-text');
        const details = this.elements.statusContainer.querySelector('#connection-details');

        // Remove all state classes
        dot.className = 'status-dot';
        text.className = 'status-text';

        // Define state configurations
        const stateConfig = {
            'connected': {
                dotClass: 'status-connected',
                text: 'Online',
                details: 'Real-time updates active'
            },
            'connecting': {
                dotClass: 'status-connecting',
                text: 'Connecting...',
                details: 'Establishing connection'
            },
            'disconnected': {
                dotClass: 'status-disconnected',
                text: 'Offline',
                details: 'Not connected to server'
            },
            'reconnecting': {
                dotClass: 'status-reconnecting',
                text: 'Reconnecting...',
                details: 'Attempting to reconnect'
            },
            'error': {
                dotClass: 'status-error',
                text: 'Error',
                details: 'Connection failed'
            }
        };

        const config = stateConfig[state.state] || stateConfig['disconnected'];
        
        dot.classList.add(config.dotClass);
        text.textContent = config.text;
        
        if (details) {
            details.textContent = config.details;
        }

        // Update spectator panel button state
        const toggleBtn = this.elements.spectatorPanel.querySelector('#spectator-toggle-btn');
        if (toggleBtn) {
            if (state.isConnected) {
                toggleBtn.textContent = '👁️ Watching';
                toggleBtn.classList.add('active');
            } else {
                toggleBtn.textContent = '👁️ Spectate';
                toggleBtn.classList.remove('active');
            }
        }
    }

    /**
     * Update the spectator list display
     */
    updateSpectatorList() {
        const countElement = this.elements.spectatorPanel.querySelector('#spectator-count');
        const listElement = this.elements.spectatorPanel.querySelector('#spectator-list');

        const count = this.spectators.size;
        countElement.textContent = `${count} watching`;

        if (count === 0) {
            listElement.innerHTML = `
                <li class="spectator-empty">
                    ${this.socketClient?.isConnected ? 'No spectators yet' : 'Not connected'}
                </li>
            `;
            return;
        }

        const spectatorItems = Array.from(this.spectators.values()).map((spectator, index) => {
            const isCurrentUser = spectator.spectatorId === this.currentSpectatorId;
            const number = index + 1;
            
            return `
                <li class="spectator-item ${isCurrentUser ? 'spectator-current' : ''}">
                    <span class="spectator-number">${number}</span>
                    <span class="spectator-name">
                        ${isCurrentUser ? 'You' : `Spectator ${number}`}
                    </span>
                    <span class="spectator-status-indicator ${spectator.isConnected !== false ? 'online' : 'offline'}"></span>
                </li>
            `;
        });

        listElement.innerHTML = spectatorItems.join('');
    }

    /**
     * Update game state display
     * @param {Object} data - Game state data
     */
    _updateGameState(data) {
        // Could update turn indicator, agent badges, etc.
        // For now, just log to console (future enhancement)
        console.log('[ConnectionStatusManager] Game state updated:', data);
        
        // Update agent connection status in spectator list if available
        if (data.agents && this.elements.spectatorPanel) {
            this._emit('game:state', data);
        }
    }

    /**
     * Update reconnection status display
     * @param {Object} data - Reconnection attempt data
     */
    _updateReconnectionStatus(data) {
        const details = this.elements.statusContainer.querySelector('#connection-details');
        if (details) {
            const remaining = data.maxAttempts - data.attempt;
            details.textContent = `Reconnecting... Attempt ${data.attempt} of ${data.maxAttempts} (${remaining} left)`;
        }
    }

    /**
     * Clear reconnection status (successful reconnect)
     */
    _clearReconnectionStatus() {
        // Status will be updated by the main connection:state handler
        console.log('[ConnectionStatusManager] Reconnection successful');
    }

    /**
     * Show reconnection failed status
     */
    _showReconnectionFailed() {
        const details = this.elements.statusContainer.querySelector('#connection-details');
        if (details) {
            details.textContent = 'Reconnection failed. Click "Reconnect Now" to try again.';
        }
    }

    /**
     * Toggle spectator mode
     */
    _toggleSpectatorMode() {
        if (!this.socketClient) {
            console.warn('[ConnectionStatusManager] Cannot toggle - no socket client');
            return;
        }

        if (this.socketClient.isConnected) {
            this.socketClient.disconnect();
        } else {
            this.socketClient.connect().catch(error => {
                console.error('[ConnectionStatusManager] Failed to connect:', error);
            });
        }
    }

    /**
     * Show the connection status UI
     */
    show() {
        this.elements.statusContainer.classList.remove('hidden');
        this.elements.spectatorPanel.classList.remove('hidden');
    }

    /**
     * Hide the connection status UI
     */
    hide() {
        this.elements.statusContainer.classList.add('hidden');
        this.elements.spectatorPanel.classList.add('hidden');
    }

    /**
     * Connect to a specific session
     * @param {string} sessionId - Game session ID
     */
    async connectToSession(sessionId) {
        if (!this.socketClient) {
            console.warn('[ConnectionStatusManager] No socket client available');
            return;
        }

        try {
            await this.socketClient.connect(sessionId);
            console.log('[ConnectionStatusManager] Connected to session:', sessionId);
        } catch (error) {
            console.error('[ConnectionStatusManager] Failed to connect to session:', error);
        }
    }

    /**
     * Disconnect from current session
     */
    disconnect() {
        if (this.socketClient) {
            this.socketClient.disconnect();
        }
    }

    /**
     * Set current user spectator ID
     * @param {string} spectatorId - Current spectator ID
     */
    setCurrentSpectatorId(spectatorId) {
        this.currentSpectatorId = spectatorId;
        this.updateSpectatorList();
    }

    /**
     * Get current connection info
     * @returns {Object} Connection status info
     */
    getStatus() {
        return {
            isConnected: this.socketClient?.isConnected || false,
            state: this.socketClient?.connectionState || 'disconnected',
            spectatorCount: this.spectators.size,
            spectators: Array.from(this.spectators.values())
        };
    }
}

/**
 * Update connection status UI element directly
 * @param {string} state - Connection state ('connected', 'connecting', 'disconnected', 'reconnecting', 'error')
 * @param {string} message - Optional custom message
 */
function updateConnectionStatus(state, message = null) {
    const manager = window.connectionStatusManager;
    if (manager) {
        manager.updateConnectionStatus({
            state: state,
            isConnected: state === 'connected'
        });
    }
}

/**
 * Render spectator list
 * @param {Array} spectators - Array of spectator objects
 */
function renderSpectatorList(spectators) {
    const manager = window.connectionStatusManager;
    if (manager) {
        manager.spectators.clear();
        spectators.forEach(s => manager.spectators.set(s.spectatorId, s));
        manager.updateSpectatorList();
    }
}

// Export for module systems and global access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        ConnectionStatusManager, 
        updateConnectionStatus, 
        renderSpectatorList 
    };
} else {
    window.ConnectionStatusManager = ConnectionStatusManager;
    window.updateConnectionStatus = updateConnectionStatus;
    window.renderSpectatorList = renderSpectatorList;
}
