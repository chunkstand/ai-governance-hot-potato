/**
 * Reconnection UI Component for AI Arena
 * Provides visual feedback during reconnection attempts with exponential backoff
 */

class ReconnectionUI {
    constructor(options = {}) {
        this.socketClient = options.socketClient || window.socketClient;
        this.container = null;
        this.isVisible = false;
        this.retryCount = 0;
        this.maxRetries = 10;
        this.countdownInterval = null;
        this.nextAttemptTime = 0;
        
        this._init();
    }

    /**
     * Initialize the reconnection UI
     */
    _init() {
        this._createContainer();
        this._bindEvents();
        this.hide();
    }

    /**
     * Create the reconnection UI container
     */
    _createContainer() {
        // Check if container already exists
        this.container = document.getElementById('reconnection-overlay');
        if (this.container) return;

        // Create overlay container
        this.container = document.createElement('div');
        this.container.id = 'reconnection-overlay';
        this.container.className = 'reconnection-overlay';
        this.container.innerHTML = `
            <div class="reconnection-content">
                <div class="reconnection-icon">
                    <span class="spinner"></span>
                </div>
                <div class="reconnection-text">
                    <h3 class="reconnection-title">Reconnecting...</h3>
                    <p class="reconnection-status" id="reconnection-status">
                        Attempt <span id="retry-current">0</span> of <span id="retry-max">10</span>
                    </p>
                    <div class="reconnection-progress">
                        <div class="progress-bar-container">
                            <div class="progress-bar" id="reconnection-progress-bar"></div>
                        </div>
                        <span class="countdown" id="reconnection-countdown">Next attempt in 1s</span>
                    </div>
                </div>
                <div class="reconnection-actions" id="reconnection-actions" style="display: none;">
                    <button id="manual-reconnect-btn" class="btn btn-primary btn-large">
                        Reconnect Now
                    </button>
                    <p class="reconnection-help">Connection lost. Click to try again.</p>
                </div>
            </div>
        `;

        // Append to body
        document.body.appendChild(this.container);

        // Bind manual reconnect button
        const manualBtn = this.container.querySelector('#manual-reconnect-btn');
        if (manualBtn) {
            manualBtn.addEventListener('click', () => this._handleManualReconnect());
        }
    }

    /**
     * Bind to socket client events
     */
    _bindEvents() {
        if (!this.socketClient) {
            console.warn('[ReconnectionUI] No socket client available');
            return;
        }

        // Listen for reconnection attempt
        this.socketClient.on('reconnect:attempt', (data) => {
            this.retryCount = data.attempt;
            this.maxRetries = data.maxAttempts;
            this._showReconnectionAttempt(data);
        });

        // Listen for successful reconnection
        this.socketClient.on('reconnect:success', () => {
            this._showReconnectionSuccess();
        });

        // Listen for reconnection failure
        this.socketClient.on('reconnect:failed', () => {
            this._showReconnectionFailed();
        });

        // Listen for connection state changes
        this.socketClient.on('connection:state', (state) => {
            if (state.state === 'disconnected' && !state.isConnected) {
                // Disconnected - show if not already reconnecting
                if (this.retryCount > 0) {
                    this.show();
                }
            } else if (state.state === 'connected') {
                // Connected - hide UI
                this.hide();
            }
        });
    }

    /**
     * Show reconnection attempt UI
     * @param {Object} data - Reconnection attempt data
     */
    _showReconnectionAttempt(data) {
        this.show();
        
        // Update attempt counter
        const currentEl = this.container.querySelector('#retry-current');
        const maxEl = this.container.querySelector('#retry-max');
        if (currentEl) currentEl.textContent = data.attempt;
        if (maxEl) maxEl.textContent = data.maxAttempts;

        // Update title
        const titleEl = this.container.querySelector('.reconnection-title');
        if (titleEl) titleEl.textContent = 'Reconnecting...';

        // Show progress, hide manual actions
        const progressEl = this.container.querySelector('.reconnection-progress');
        const actionsEl = this.container.querySelector('#reconnection-actions');
        if (progressEl) progressEl.style.display = 'block';
        if (actionsEl) actionsEl.style.display = 'none';

        // Update progress bar
        this._updateProgressBar(data.attempt, data.maxAttempts);

        // Start countdown
        this._startCountdown(data.delay);
    }

    /**
     * Update progress bar based on retry count
     */
    _updateProgressBar(current, max) {
        const progressBar = this.container.querySelector('#reconnection-progress-bar');
        if (progressBar) {
            const percentage = (current / max) * 100;
            progressBar.style.width = `${percentage}%`;
        }
    }

    /**
     * Start countdown timer for next attempt
     * @param {number} delay - Delay in milliseconds
     */
    _startCountdown(delay) {
        // Clear existing interval
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        this.nextAttemptTime = Date.now() + delay;
        const countdownEl = this.container.querySelector('#reconnection-countdown');

        this.countdownInterval = setInterval(() => {
            const remaining = Math.max(0, this.nextAttemptTime - Date.now());
            const seconds = Math.ceil(remaining / 1000);

            if (countdownEl) {
                countdownEl.textContent = `Next attempt in ${seconds}s`;
            }

            if (remaining <= 0) {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
            }
        }, 100);
    }

    /**
     * Show reconnection success
     */
    _showReconnectionSuccess() {
        const titleEl = this.container.querySelector('.reconnection-title');
        const statusEl = this.container.querySelector('.reconnection-status');
        const progressEl = this.container.querySelector('.reconnection-progress');

        if (titleEl) titleEl.textContent = 'Connected!';
        if (statusEl) statusEl.textContent = 'Reconnection successful';
        if (progressEl) progressEl.style.display = 'none';

        // Clear countdown
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }

        // Hide after a brief delay
        setTimeout(() => {
            this.hide();
            this.retryCount = 0;
        }, 1500);
    }

    /**
     * Show reconnection failed (max retries exceeded)
     */
    _showReconnectionFailed() {
        const titleEl = this.container.querySelector('.reconnection-title');
        const statusEl = this.container.querySelector('.reconnection-status');
        const progressEl = this.container.querySelector('.reconnection-progress');
        const actionsEl = this.container.querySelector('#reconnection-actions');

        if (titleEl) titleEl.textContent = 'Connection Lost';
        if (statusEl) statusEl.textContent = `Failed after ${this.maxRetries} attempts`;
        if (progressEl) progressEl.style.display = 'none';
        if (actionsEl) actionsEl.style.display = 'block';

        // Clear countdown
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }

        this.show();
    }

    /**
     * Handle manual reconnect button click
     */
    _handleManualReconnect() {
        console.log('[ReconnectionUI] Manual reconnect triggered');
        
        // Reset retry count
        this.retryCount = 0;
        
        // Update UI
        const titleEl = this.container.querySelector('.reconnection-title');
        if (titleEl) titleEl.textContent = 'Reconnecting...';
        
        // Trigger reconnect via socket client
        if (this.socketClient) {
            this.socketClient.connect().catch(error => {
                console.error('[ReconnectionUI] Manual reconnect failed:', error);
            });
        }
    }

    /**
     * Show the reconnection overlay
     */
    show() {
        if (!this.isVisible && this.container) {
            this.container.classList.add('visible');
            this.isVisible = true;
        }
    }

    /**
     * Hide the reconnection overlay
     */
    hide() {
        if (this.isVisible && this.container) {
            this.container.classList.remove('visible');
            this.isVisible = false;
        }
    }

    /**
     * Check if overlay is visible
     * @returns {boolean}
     */
    isShowing() {
        return this.isVisible;
    }

    /**
     * Get current retry information
     * @returns {Object}
     */
    getRetryInfo() {
        return {
            current: this.retryCount,
            max: this.maxRetries,
            remaining: this.maxRetries - this.retryCount
        };
    }

    /**
     * Manually trigger reconnect (for external use)
     */
    manualReconnect() {
        this._handleManualReconnect();
    }

    /**
     * Destroy the reconnection UI
     */
    destroy() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}

/**
 * Initialize reconnection UI
 * @param {Object} options - Configuration options
 * @returns {ReconnectionUI} ReconnectionUI instance
 */
function initReconnection(options = {}) {
    // Check if already initialized
    if (window.reconnectionUI) {
        console.log('[Reconnection] Using existing ReconnectionUI instance');
        return window.reconnectionUI;
    }

    const ui = new ReconnectionUI(options);
    window.reconnectionUI = ui;
    return ui;
}

/**
 * Trigger manual reconnect
 */
function manualReconnect() {
    if (window.reconnectionUI) {
        window.reconnectionUI.manualReconnect();
    } else if (window.socketClient) {
        window.socketClient.connect().catch(error => {
            console.error('[Reconnection] Manual reconnect failed:', error);
        });
    }
}

/**
 * Show reconnection UI manually
 */
function showReconnectUI() {
    if (window.reconnectionUI) {
        window.reconnectionUI.show();
    }
}

/**
 * Hide reconnection UI manually
 */
function hideReconnectUI() {
    if (window.reconnectionUI) {
        window.reconnectionUI.hide();
    }
}

// Export for module systems and global access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        ReconnectionUI, 
        initReconnection, 
        manualReconnect, 
        showReconnectUI, 
        hideReconnectUI 
    };
} else {
    window.ReconnectionUI = ReconnectionUI;
    window.initReconnection = initReconnection;
    window.manualReconnect = manualReconnect;
    window.showReconnectUI = showReconnectUI;
    window.hideReconnectUI = hideReconnectUI;
}
