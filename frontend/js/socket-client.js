/**
 * Socket.io Client Module for AI Arena Frontend
 * Manages WebSocket connection to backend spectator namespace
 */

class SocketClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.connectionState = 'disconnected'; // 'connected', 'connecting', 'disconnected', 'reconnecting', 'error'
        this.eventHandlers = new Map();
        this.spectators = new Map(); // Map of spectatorId -> spectatorData
        this.backendUrl = this._detectBackendUrl();
        
        // Reconnection state tracking
        this.reconnectionAttempt = 0;
        this.maxReconnectionAttempts = 10;
        this.reconnectionDelay = 0;
    }

    /**
     * Auto-detect backend URL based on environment
     * @returns {string} Backend WebSocket URL
     */
    _detectBackendUrl() {
        // Check for explicit config (if available)
        if (typeof window.AI_ARENA_CONFIG !== 'undefined' && window.AI_ARENA_CONFIG.backendUrl) {
            return window.AI_ARENA_CONFIG.backendUrl;
        }

        // Production/staging detection
        const hostname = window.location.hostname;
        
        // Local development
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3000';
        }

        // Staging environment
        if (hostname.includes('staging') || hostname.includes('dev')) {
            return 'https://ai-arena-backend-staging.onrender.com';
        }

        // Production environment (GitHub Pages or custom domain)
        return 'https://ai-arena-backend-staging.onrender.com';
    }

    /**
     * Connect to the WebSocket server
     * @param {string} sessionId - Optional game session ID to join
     * @returns {Promise} Resolves when connected, rejects on error
     */
    connect(sessionId = null) {
        return new Promise((resolve, reject) => {
            if (this.isConnected) {
                console.log('[SocketClient] Already connected');
                resolve(this.socket);
                return;
            }

            if (typeof io === 'undefined') {
                reject(new Error('Socket.io client library not loaded. Please load from CDN first.'));
                return;
            }

            this.connectionState = 'connecting';
            this._emitStateChange();

            const options = {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 10, // Max 10 retries per RTC-06
                reconnectionDelay: 1000, // Initial 1 second (will be randomized 1-3s)
                reconnectionDelayMax: 30000, // Cap at 30 seconds
                randomizationFactor: 0.5, // 50% jitter (matches server algorithm)
                timeout: 10000,
            };

            // Connect to /spectator namespace
            this.socket = io(`${this.backendUrl}/spectator`, options);

            // Connection events
            this.socket.on('connect', () => {
                console.log('[SocketClient] Connected to spectator namespace');
                this.isConnected = true;
                this.connectionState = 'connected';
                this._emitStateChange();

                // Join session if provided
                if (sessionId) {
                    this.joinSession(sessionId);
                }

                resolve(this.socket);
            });

            this.socket.on('disconnect', (reason) => {
                console.log('[SocketClient] Disconnected:', reason);
                this.isConnected = false;
                this.connectionState = 'disconnected';
                this._emitStateChange();
            });

            this.socket.on('connect_error', (error) => {
                console.error('[SocketClient] Connection error:', error.message);
                this.connectionState = 'error';
                this._emitStateChange();
                reject(error);
            });

            this.socket.on('reconnect', (attemptNumber) => {
                console.log('[SocketClient] Reconnected after', attemptNumber, 'attempts');
                this.isConnected = true;
                this.connectionState = 'connected';
                this.reconnectionAttempt = 0; // Reset on successful reconnect
                this.reconnectionDelay = 0;
                this._emitStateChange();
                this._emit('reconnect:success', { attempt: attemptNumber });
            });

            this.socket.on('reconnect_attempt', (attemptNumber) => {
                this.reconnectionAttempt = attemptNumber;
                // Calculate exponential backoff delay
                this.reconnectionDelay = Math.min(1000 * Math.pow(2, attemptNumber), 30000);
                console.log('[SocketClient] Reconnection attempt', attemptNumber, 'next delay:', this.reconnectionDelay);
                this.connectionState = 'reconnecting';
                this._emitStateChange();
                this._emit('reconnect:attempt', { 
                    attempt: attemptNumber, 
                    maxAttempts: this.maxReconnectionAttempts,
                    delay: this.reconnectionDelay 
                });
            });

            this.socket.on('reconnect_error', (error) => {
                console.error('[SocketClient] Reconnection error:', error.message);
                this.connectionState = 'error';
                this._emitStateChange();
                this._emit('reconnect:error', { error: error.message, attempt: this.reconnectionAttempt });
            });

            this.socket.on('reconnect_failed', () => {
                console.error('[SocketClient] Reconnection failed after max attempts');
                this.connectionState = 'error';
                this._emitStateChange();
                this._emit('reconnect:failed', { 
                    attempts: this.maxReconnectionAttempts,
                    manualRetryAvailable: true 
                });
            });

            // Spectator-specific events
            this.socket.on('spectator:joined', (data) => {
                console.log('[SocketClient] Spectator joined:', data);
                this.spectators.set(data.spectatorId, data);
                this._emit('spectator:joined', data);
            });

            this.socket.on('spectator:left', (data) => {
                console.log('[SocketClient] Spectator left:', data);
                this.spectators.delete(data.spectatorId);
                this._emit('spectator:left', data);
            });

            this.socket.on('spectator:list', (data) => {
                console.log('[SocketClient] Spectator list updated:', data);
                this.spectators.clear();
                if (data.spectators && Array.isArray(data.spectators)) {
                    data.spectators.forEach(spectator => {
                        this.spectators.set(spectator.spectatorId, spectator);
                    });
                }
                this._emit('spectator:list', data);
            });

            // Game state events
            this.socket.on('game:state', (data) => {
                console.log('[SocketClient] Game state update:', data);
                this._emit('game:state', data);
            });

            this.socket.on('game:turn', (data) => {
                console.log('[SocketClient] Turn update:', data);
                this._emit('game:turn', data);
            });

            this.socket.on('game:decision', (data) => {
                console.log('[SocketClient] Decision made:', data);
                this._emit('game:decision', data);
            });

            this.socket.on('game:roundEnd', (data) => {
                console.log('[SocketClient] Round ended:', data);
                this._emit('game:roundEnd', data);
            });

            this.socket.on('answer:submitted', (data) => {
                console.log('[SocketClient] Answer submitted:', data);
                this._emit('answer:submitted', data);
            });

            // Error handling
            this.socket.on('error', (error) => {
                console.error('[SocketClient] Socket error:', error);
                this._emit('error', error);
            });

            // Server heartbeat ping
            this.socket.on('ping', (data) => {
                // Respond with pong immediately
                this.socket.emit('pong', { timestamp: data.timestamp });
            });
        });
    }

    /**
     * Disconnect from the WebSocket server
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            this.connectionState = 'disconnected';
            this.spectators.clear();
            this._emitStateChange();
            console.log('[SocketClient] Disconnected manually');
        }
    }

    /**
     * Join a game session as spectator
     * @param {string} sessionId - The game session ID
     */
    joinSession(sessionId) {
        if (!this.isConnected) {
            console.warn('[SocketClient] Cannot join session - not connected');
            return;
        }
        console.log('[SocketClient] Joining session:', sessionId);
        this.socket.emit('session:join', { sessionId });
    }

    /**
     * Leave current game session
     */
    leaveSession() {
        if (!this.isConnected) {
            console.warn('[SocketClient] Cannot leave session - not connected');
            return;
        }
        console.log('[SocketClient] Leaving current session');
        this.socket.emit('session:leave');
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
     * @param {Function} callback - Event handler to remove (optional - removes all if not provided)
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
     * Emit an event to the server
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        if (!this.isConnected) {
            console.warn('[SocketClient] Cannot emit - not connected');
            return;
        }
        this.socket.emit(event, data);
    }

    /**
     * Emit connection state change to all listeners
     */
    _emitStateChange() {
        this._emit('connection:state', {
            state: this.connectionState,
            isConnected: this.isConnected,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Emit event to all registered handlers
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    _emit(event, data) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('[SocketClient] Error in event handler:', error);
                }
            });
        }
    }

    /**
     * Get current connection state
     * @returns {Object} Connection state info
     */
    getConnectionState() {
        return {
            state: this.connectionState,
            isConnected: this.isConnected,
            backendUrl: this.backendUrl,
            spectatorCount: this.spectators.size,
            spectators: Array.from(this.spectators.values()),
            // Reconnection state
            reconnectionAttempt: this.reconnectionAttempt,
            maxReconnectionAttempts: this.maxReconnectionAttempts,
            reconnectionDelay: this.reconnectionDelay,
            remainingAttempts: this.maxReconnectionAttempts - this.reconnectionAttempt
        };
    }
}

// Create singleton instance
const socketClient = new SocketClient();

// Export for module systems and global access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SocketClient, socketClient };
} else {
    window.SocketClient = SocketClient;
    window.socketClient = socketClient;
}
