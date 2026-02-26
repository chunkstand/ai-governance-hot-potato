const DEFAULT_AGENTS = [
    { key: 'strict', name: 'StrictBot' },
    { key: 'lenient', name: 'LenientBot' },
    { key: 'balanced', name: 'BalancedBot' },
    { key: 'gpt-4', name: 'GPT-4' }
];

function resolveAgents(stateAgents = []) {
    if (!Array.isArray(stateAgents) || stateAgents.length === 0) {
        return DEFAULT_AGENTS.map(agent => ({ id: agent.key, name: agent.name }));
    }

    return stateAgents.map(agent => ({
        id: agent.id || agent.name || agent.type || 'agent',
        name: agent.name || agent.type || 'Agent'
    }));
}

function extractReasoning(agent = {}) {
    const reasoning = agent.reasoningSummary || agent.reasoning || agent.lastDecision?.reasoningSummary || '';
    const confidence = agent.confidence ?? agent.lastDecision?.confidence;
    return { reasoning, confidence };
}

class ReasoningPanel {
    constructor(options = {}) {
        this.socketClient = options.socketClient || window.socketClient;
        this.container = document.querySelector(options.container || '#reasoning-panel');
        this.roundEnded = false;
        this.selectedAgentId = null;
        this.stateAgents = [];

        this._bindEvents();
        this._bindSelection();
        this.render();
    }

    _bindEvents() {
        if (!this.socketClient) {
            console.warn('[ReasoningPanel] Socket client not available');
            return;
        }

        this.socketClient.on('game:state', (state) => {
            this.handleStateUpdate(state);
        });

        this.socketClient.on('game:roundEnd', (payload) => {
            this.handleRoundEnd(payload);
        });
    }

    _bindSelection() {
        if (!this.container) return;
        this.container.addEventListener('click', (event) => {
            const button = event.target?.closest('[data-agent-id]');
            if (!button) return;
            this.selectedAgentId = button.dataset.agentId;
            this.render();
        });
    }

    handleStateUpdate(state) {
        this.stateAgents = state?.agents || [];
        this.roundEnded = ['RESOLVED', 'FINISHED'].includes(state?.gameSession?.status);
        if (!this.selectedAgentId && this.stateAgents.length) {
            this.selectedAgentId = this.stateAgents[0]?.id;
        }
        this.render();
    }

    handleRoundEnd(payload) {
        if (payload?.agents) {
            this.stateAgents = payload.agents;
        }
        this.roundEnded = true;
        if (!this.selectedAgentId && this.stateAgents.length) {
            this.selectedAgentId = this.stateAgents[0]?.id;
        }
        this.render();
    }

    render() {
        if (!this.container) return;

        if (!this.roundEnded) {
            this.container.innerHTML = '<div class="empty-state">Reasoning appears after each round.</div>';
            return;
        }

        const agents = resolveAgents(this.stateAgents);
        if (!this.selectedAgentId && agents.length) {
            this.selectedAgentId = agents[0].id;
        }

        const buttons = agents.map(agent => {
            const isActive = agent.id === this.selectedAgentId;
            return `
                <button class="reasoning-agent-button ${isActive ? 'is-active' : ''}" data-agent-id="${agent.id}" type="button" aria-pressed="${isActive}">
                    ${agent.name}
                </button>
            `;
        }).join('');

        const selectedAgent = this.stateAgents.find(agent => agent.id === this.selectedAgentId) || {};
        const { reasoning, confidence } = extractReasoning(selectedAgent);
        const confidenceText = typeof confidence === 'number' ? `${Math.round(confidence * 100)}% confidence` : 'Confidence unavailable';
        const reasoningText = reasoning && reasoning.trim().length > 0 ? reasoning : 'No reasoning provided.';

        this.container.innerHTML = `
            <div class="reasoning-panel-body">
                <div class="reasoning-agent-selector">
                    ${buttons}
                </div>
                <div class="reasoning-content">
                    <div class="reasoning-text">${reasoningText}</div>
                    <div class="reasoning-confidence">${confidenceText}</div>
                </div>
            </div>
        `;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ReasoningPanel };
} else {
    window.ReasoningPanel = ReasoningPanel;
}

export { ReasoningPanel };
