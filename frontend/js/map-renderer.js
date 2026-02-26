const SVG_NS = 'http://www.w3.org/2000/svg';

const DEFAULT_AGENTS = [
    { id: 'strict', name: 'StrictBot', color: '#60a5fa', score: 0 },
    { id: 'lenient', name: 'LenientBot', color: '#f97316', score: 0 },
    { id: 'balanced', name: 'BalancedBot', color: '#34d399', score: 0 },
    { id: 'gpt4', name: 'GPT-4', color: '#a855f7', score: 0 },
];

const DEFAULT_CHECKPOINTS = [
    { id: 1, x: 120, y: 110, zone: 'north' },
    { id: 2, x: 280, y: 80, zone: 'north' },
    { id: 3, x: 440, y: 140, zone: 'north' },
    { id: 4, x: 620, y: 110, zone: 'north' },
    { id: 5, x: 780, y: 180, zone: 'east' },
    { id: 6, x: 700, y: 320, zone: 'east' },
    { id: 7, x: 520, y: 360, zone: 'central' },
    { id: 8, x: 360, y: 320, zone: 'central' },
    { id: 9, x: 220, y: 400, zone: 'west' },
    { id: 10, x: 140, y: 260, zone: 'west' },
];

const STATUS_LABELS = {
    INIT: 'Waiting',
    AWAITING_ANSWERS: 'Playing',
    PROCESSING: 'Playing',
    RESOLVED: 'Playing',
    FINISHED: 'Complete',
};

function createSvgElement(tag, attributes = {}) {
    const element = document.createElementNS(SVG_NS, tag);
    Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
    });
    return element;
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

export class MapRenderer {
    constructor(options = {}) {
        this.container =
            typeof options.container === 'string'
                ? document.querySelector(options.container)
                : options.container;
        this.socketClient = options.socketClient || window.socketClient;
        this.checkpoints = options.checkpoints || DEFAULT_CHECKPOINTS;
        this.agentNodes = new Map();
        this.legendList = null;
        this.statusBadge = null;

        this._init();
    }

    _init() {
        if (!this.container) {
            console.warn('[MapRenderer] Map container not found');
            return;
        }

        this._renderBaseMap();
        this.updateAgents(DEFAULT_AGENTS);
        this.updateStatus('INIT');

        if (this.socketClient) {
            this.socketClient.on('game:state', (state) => this.handleStateUpdate(state));
        }
    }

    _renderBaseMap() {
        this.container.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'map-wrapper';

        const svg = createSvgElement('svg', {
            viewBox: '0 0 1000 600',
            class: 'map-svg',
            role: 'img',
            'aria-label': 'AI Arena checkpoint map',
        });

        const zones = createSvgElement('g', { class: 'map-zones' });
        zones.appendChild(createSvgElement('polygon', {
            points: '60,60 420,40 520,160 220,200',
            class: 'map-zone map-zone-north',
        }));
        zones.appendChild(createSvgElement('polygon', {
            points: '520,160 940,140 900,360 560,380',
            class: 'map-zone map-zone-east',
        }));
        zones.appendChild(createSvgElement('polygon', {
            points: '140,240 520,200 560,520 120,520',
            class: 'map-zone map-zone-west',
        }));
        svg.appendChild(zones);

        const checkpointLayer = createSvgElement('g', { class: 'checkpoint-layer' });
        this.checkpoints.forEach((checkpoint) => {
            const glow = createSvgElement('circle', {
                cx: checkpoint.x,
                cy: checkpoint.y,
                r: '26',
                class: 'checkpoint-glow',
            });
            const core = createSvgElement('circle', {
                cx: checkpoint.x,
                cy: checkpoint.y,
                r: '12',
                class: 'checkpoint-core',
            });
            const label = createSvgElement('text', {
                x: checkpoint.x,
                y: checkpoint.y - 18,
                class: 'checkpoint-label',
            });
            label.textContent = checkpoint.id;
            checkpointLayer.appendChild(glow);
            checkpointLayer.appendChild(core);
            checkpointLayer.appendChild(label);
        });
        svg.appendChild(checkpointLayer);

        this.agentLayer = createSvgElement('g', { class: 'agent-layer' });
        svg.appendChild(this.agentLayer);

        wrapper.appendChild(svg);

        this.statusBadge = document.createElement('div');
        this.statusBadge.className = 'map-status-badge';
        wrapper.appendChild(this.statusBadge);

        const legend = document.createElement('div');
        legend.className = 'map-legend';
        legend.innerHTML = `
            <div class="legend-title">Agents</div>
            <div class="legend-list"></div>
        `;
        this.legendList = legend.querySelector('.legend-list');
        wrapper.appendChild(legend);

        this.container.appendChild(wrapper);
    }

    handleStateUpdate(state) {
        if (!state) return;
        const agents = state.agents || [];
        this.updateAgents(agents.length ? agents : DEFAULT_AGENTS);
        this.updateStatus(state?.gameSession?.status || 'INIT');
    }

    updateStatus(status) {
        if (!this.statusBadge) return;
        const label = STATUS_LABELS[status] || 'Waiting';
        const statusKey = label.toLowerCase();
        this.statusBadge.dataset.status = statusKey;
        this.statusBadge.textContent = `Phase: ${label}`;
    }

    updateAgents(agents = []) {
        if (!this.agentLayer) return;

        const agentList = agents.length ? agents : DEFAULT_AGENTS;
        const seenKeys = new Set();

        agentList.forEach((agent, index) => {
            const key = agent.id || agent.name || `agent-${index}`;
            seenKeys.add(key);

            if (!this.agentNodes.has(key)) {
                const token = this._createAgentToken(agent, key);
                this.agentNodes.set(key, token);
                this.agentLayer.appendChild(token);
            }

            this._updateAgentToken(this.agentNodes.get(key), agent, index);
        });

        Array.from(this.agentNodes.keys()).forEach((key) => {
            if (!seenKeys.has(key)) {
                const node = this.agentNodes.get(key);
                node?.remove();
                this.agentNodes.delete(key);
            }
        });

        this._renderLegend(agentList);
    }

    _createAgentToken(agent, key) {
        const group = createSvgElement('g', {
            class: 'agent-token',
            'data-agent-id': key,
        });

        const halo = createSvgElement('circle', {
            r: '22',
            class: 'agent-token-halo',
        });
        const core = createSvgElement('circle', {
            r: '16',
            class: 'agent-token-bg',
        });
        const icon = createSvgElement('text', {
            class: 'agent-token-icon',
            'text-anchor': 'middle',
            'dominant-baseline': 'central',
            y: '1',
        });
        icon.textContent = '🤖';

        group.appendChild(halo);
        group.appendChild(core);
        group.appendChild(icon);

        return group;
    }

    _updateAgentToken(node, agent, index) {
        if (!node) return;

        const color = agent.color || DEFAULT_AGENTS[index % DEFAULT_AGENTS.length].color;
        node.style.setProperty('--agent-color', color);

        const checkpointIndex = this._resolveCheckpointIndex(agent, index);
        const checkpoint = this.checkpoints[checkpointIndex];

        node.setAttribute('transform', `translate(${checkpoint.x} ${checkpoint.y})`);
    }

    _resolveCheckpointIndex(agent, index) {
        const position = Number.isFinite(agent.position)
            ? agent.position
            : Number.isFinite(agent.checkpoint)
                ? agent.checkpoint
                : 1;
        const normalized = clamp(position, 1, this.checkpoints.length);
        return normalized - 1;
    }

    _renderLegend(agents) {
        if (!this.legendList) return;

        this.legendList.innerHTML = agents
            .map((agent, index) => {
                const name = agent.name || DEFAULT_AGENTS[index % DEFAULT_AGENTS.length].name;
                const color = agent.color || DEFAULT_AGENTS[index % DEFAULT_AGENTS.length].color;
                const score = Number.isFinite(agent.score) ? agent.score : 0;

                return `
                    <div class="legend-row">
                        <span class="legend-swatch" style="background: ${color}"></span>
                        <span class="legend-name">${name}</span>
                        <span class="legend-score">${score} pts</span>
                    </div>
                `;
            })
            .join('');
    }
}
