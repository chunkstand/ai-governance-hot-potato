const DEFAULT_AGENTS = [
    {
        key: 'strict',
        name: 'StrictBot',
        color: '#FF6B6B',
        typeAliases: ['DEMO_STRICT', 'STRICT']
    },
    {
        key: 'lenient',
        name: 'LenientBot',
        color: '#4ECDC4',
        typeAliases: ['DEMO_LENIENT', 'LENIENT']
    },
    {
        key: 'balanced',
        name: 'BalancedBot',
        color: '#45B7D1',
        typeAliases: ['DEMO_BALANCED', 'BALANCED']
    },
    {
        key: 'gpt-4',
        name: 'GPT-4',
        color: '#FFD166',
        typeAliases: ['GPT_4', 'GPT-4', 'OPENAI_GPT4']
    }
];

const NAME_LOOKUP = new Map(
    DEFAULT_AGENTS.flatMap(agent => [
        [agent.name.toLowerCase(), agent],
        ...agent.typeAliases.map(type => [type.toLowerCase(), agent])
    ])
);

function resolveAgents(stateAgents = []) {
    const used = new Set();
    const normalized = DEFAULT_AGENTS.map(defaultAgent => {
        let match = stateAgents.find(agent => {
            if (used.has(agent)) return false;
            const typeMatch = (agent.type || '').toLowerCase();
            const nameMatch = (agent.name || '').toLowerCase();
            return NAME_LOOKUP.get(typeMatch) === defaultAgent || NAME_LOOKUP.get(nameMatch) === defaultAgent;
        });

        if (!match) {
            match = stateAgents.find(agent => !used.has(agent));
        }

        if (match) {
            used.add(match);
        }

        return {
            id: match?.id || defaultAgent.key,
            name: defaultAgent.name,
            color: match?.color || defaultAgent.color,
            position: match?.position ?? 0,
            score: match?.score ?? 0,
            isConnected: match?.isConnected !== false
        };
    });

    return normalized;
}

function sortAgents(agents) {
    return [...agents].sort((a, b) => {
        if (b.position !== a.position) return b.position - a.position;
        return b.score - a.score;
    });
}

class Leaderboard {
    constructor(options = {}) {
        this.socketClient = options.socketClient || window.socketClient;
        this.container = document.querySelector(options.container || '#leaderboard-container');
        this.agents = resolveAgents();
        this._bindEvents();
        this.render();
    }

    _bindEvents() {
        if (!this.socketClient) {
            console.warn('[Leaderboard] Socket client not available');
            return;
        }

        this.socketClient.on('game:state', (state) => {
            this.handleStateUpdate(state);
        });
    }

    handleStateUpdate(state) {
        this.agents = resolveAgents(state?.agents || []);
        this.render();
    }

    render() {
        if (!this.container) return;

        const sortedAgents = sortAgents(this.agents);
        const rows = sortedAgents.map((agent, index) => {
            const rank = index + 1;
            const statusClass = agent.isConnected ? 'is-online' : 'is-offline';

            return `
                <div class="leaderboard-row ${statusClass}" data-agent-id="${agent.id}">
                    <div class="leaderboard-rank">#${rank}</div>
                    <div class="leaderboard-agent">
                        <span class="agent-swatch" style="background:${agent.color}"></span>
                        <span class="agent-name">${agent.name}</span>
                    </div>
                    <div class="leaderboard-checkpoint">Checkpoint ${agent.position}</div>
                    <div class="leaderboard-score">${agent.score}</div>
                </div>
            `;
        }).join('');

        this.container.innerHTML = `
            <div class="leaderboard-list">
                ${rows}
            </div>
        `;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Leaderboard };
} else {
    window.Leaderboard = Leaderboard;
}

export { Leaderboard };
