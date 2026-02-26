import './socket-client.js';
import { MapRenderer } from './map-renderer.js';
import { Leaderboard } from './leaderboard.js';
import { QuestionDisplay } from './question-display.js';
import { ReasoningPanel } from './reasoning-panel.js';

const socketClient = window.socketClient;
let mapRenderer = null;

const ui = {
    loadingOverlay: document.getElementById('loading-overlay'),
    connectionOverlay: document.getElementById('connection-overlay'),
    connectionTitle: document.getElementById('connection-title'),
    connectionMessage: document.getElementById('connection-message'),
    connectionStatus: document.getElementById('connection-status'),
    gameIdDisplay: document.getElementById('game-id-display'),
    gameStatusBadge: document.getElementById('game-status-badge'),
};

const state = {
    hasState: false,
    gameId: null,
};

function getGameIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('game') || 'demo-game';
}

function setOverlayVisibility(element, visible) {
    if (!element) return;
    element.classList.toggle('hidden', !visible);
}

function updateLoadingOverlay() {
    setOverlayVisibility(ui.loadingOverlay, !state.hasState);
}

function updateGameIdDisplay(gameId) {
    if (ui.gameIdDisplay) {
        ui.gameIdDisplay.textContent = `Game: ${gameId || '--'}`;
    }
}

function formatGameStatus(status) {
    const normalized = status || 'INIT';
    if (['INIT', 'AWAITING_ANSWERS'].includes(normalized)) {
        return { label: 'Waiting', className: 'waiting' };
    }
    if (['PROCESSING', 'RESOLVED'].includes(normalized)) {
        return { label: 'Playing', className: 'playing' };
    }
    if (normalized === 'FINISHED') {
        return { label: 'Complete', className: 'complete' };
    }
    return { label: normalized, className: 'waiting' };
}

function updateGameStatusBadge(status) {
    if (!ui.gameStatusBadge) return;
    const { label, className } = formatGameStatus(status);
    ui.gameStatusBadge.innerHTML = `
        <span class="game-status-badge status-${className}">${label}</span>
    `;
}

function updateConnectionOverlay(connectionState) {
    if (!ui.connectionOverlay) return;

    const status = connectionState.state || 'disconnected';
    const statusText = status.replace('-', ' ');

    const messages = {
        connected: {
            title: 'Connected',
            message: 'Live connection established. Waiting for game updates...',
        },
        connecting: {
            title: 'Connecting',
            message: 'Attempting to reach the arena server.',
        },
        reconnecting: {
            title: 'Reconnecting',
            message: 'Connection interrupted. Retrying shortly...',
        },
        disconnected: {
            title: 'Disconnected',
            message: 'Unable to reach the arena. Check network or try again later.',
        },
        error: {
            title: 'Connection Error',
            message: 'Server connection failed. Please refresh to retry.',
        },
    };

    const { title, message } = messages[status] || messages.disconnected;

    if (ui.connectionTitle) ui.connectionTitle.textContent = title;
    if (ui.connectionMessage) ui.connectionMessage.textContent = message;
    if (ui.connectionStatus) ui.connectionStatus.textContent = `Status: ${statusText}`;

    setOverlayVisibility(ui.connectionOverlay, status !== 'connected');
}

function bindSocketEvents() {
    if (!socketClient) {
        console.warn('[Spectator] Socket client not available');
        return;
    }

    socketClient.on('connection:state', (connectionState) => {
        updateConnectionOverlay(connectionState);
    });

    socketClient.on('game:state', (data) => {
        state.hasState = true;
        updateLoadingOverlay();
        if (data?.gameSession?.id) {
            updateGameIdDisplay(data.gameSession.id);
        }
        updateGameStatusBadge(data?.gameSession?.status);
    });

    socketClient.on('error', (error) => {
        console.error('[Spectator] Socket error:', error);
        updateConnectionOverlay({ state: 'error' });
    });
}

async function connectToGame() {
    state.gameId = getGameIdFromUrl();
    updateGameIdDisplay(state.gameId);
    updateLoadingOverlay();

    try {
        await socketClient.connect();
        socketClient.emit('watch-game', { gameId: state.gameId });

        if (socketClient.socket) {
            socketClient.socket.on('watching-game', (payload) => {
                if (payload?.gameId) {
                    updateGameIdDisplay(payload.gameId);
                }
            });
        }
    } catch (error) {
        console.error('[Spectator] Connection failed:', error);
        updateConnectionOverlay({ state: 'error' });
    }
}

function initSpectatorView() {
    bindSocketEvents();

    new Leaderboard({
        socketClient,
        container: '#leaderboard-container'
    });

    new QuestionDisplay({
        socketClient,
        container: '#question-display'
    });

    new ReasoningPanel({
        socketClient,
        container: '#reasoning-panel'
    });

    mapRenderer = new MapRenderer({
        container: '#map-container',
        socketClient,
    });

    connectToGame();
}

document.addEventListener('DOMContentLoaded', () => {
    state.hasState = false;
    updateLoadingOverlay();
    updateConnectionOverlay({ state: 'connecting' });
    initSpectatorView();
});
