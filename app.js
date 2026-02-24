// AI Governance Hot Potato - Game Logic

// ==================== GAME DATA ====================

const SCENARIOS = [
    "System wants to access user data without consent",
    "AI wants to make medical recommendation without verification",
    "System wants to process payment without authentication",
    "AI wants to deploy code without testing",
    "System wants to share data across jurisdictions"
];

const AGENT_TYPES = {
    strict: { name: "StrictBot", description: "Always DENYs (conservative)" },
    lenient: { name: "LenientBot", description: "Always APPROVEs (optimistic)" },
    random: { name: "RandomBot", description: "Random choice" },
    human: { name: "Human", description: "Human player" }
};

// ==================== GAME STATE ====================

let gameState = {
    agents: [],
    decisions: [],
    currentTurn: 0,
    currentScenarioIndex: 0,
    isAutoPlaying: false,
    autoPlayInterval: null
};

// ==================== DOM ELEMENTS ====================

const elements = {
    // Landing
    landing: document.getElementById('landing'),
    startGame: document.getElementById('startGame'),
    
    // Game Board
    gameBoard: document.getElementById('gameBoard'),
    currentAgent: document.getElementById('currentAgent'),
    turnNumber: document.getElementById('turnNumber'),
    scenarioText: document.getElementById('scenarioText'),
    approveBtn: document.getElementById('approveBtn'),
    denyBtn: document.getElementById('denyBtn'),
    reasoning: document.getElementById('reasoning'),
    
    // Auto-play
    autoPlayBtn: document.getElementById('autoPlayBtn'),
    stopAutoPlayBtn: document.getElementById('stopAutoPlayBtn'),
    resetGameBtn: document.getElementById('resetGameBtn'),
    
    // Agent Registration
    agentForm: document.getElementById('agentForm'),
    agentName: document.getElementById('agentName'),
    agentWebhook: document.getElementById('agentWebhook'),
    agentType: document.getElementById('agentType'),
    agentCount: document.getElementById('agentCount'),
    agentsList: document.getElementById('agentsList'),
    
    // Demo Agents
    addStrictBot: document.getElementById('addStrictBot'),
    addLenientBot: document.getElementById('addLenientBot'),
    addRandomBot: document.getElementById('addRandomBot'),
    addAllBots: document.getElementById('addAllBots'),
    
    // Decision History
    historyList: document.getElementById('historyList'),
    noHistory: document.getElementById('noHistory')
};

// ==================== INITIALIZATION ====================

function init() {
    loadGameState();
    setupEventListeners();
    renderAgentsList();
    renderHistory();
    console.log('🤖 AI Governance Hot Potato initialized');
    console.log('Game state loaded from localStorage');
}

function setupEventListeners() {
    // Landing
    elements.startGame.addEventListener('click', startGame);
    
    // Decision buttons
    elements.approveBtn.addEventListener('click', () => makeDecision(true));
    elements.denyBtn.addEventListener('click', () => makeDecision(false));
    
    // Auto-play
    elements.autoPlayBtn.addEventListener('click', startAutoPlay);
    elements.stopAutoPlayBtn.addEventListener('click', stopAutoPlay);
    elements.resetGameBtn.addEventListener('click', resetGame);
    
    // Agent registration
    elements.agentForm.addEventListener('submit', handleAgentRegistration);
    
    // Demo agents
    elements.addStrictBot.addEventListener('click', () => addDemoAgent('strict'));
    elements.addLenientBot.addEventListener('click', () => addDemoAgent('lenient'));
    elements.addRandomBot.addEventListener('click', () => addDemoAgent('random'));
    elements.addAllBots.addEventListener('click', addAllDemoAgents);
}

// ==================== GAME FLOW ====================

function startGame() {
    elements.landing.classList.add('hidden');
    elements.gameBoard.classList.remove('hidden');
    
    if (gameState.agents.length > 0) {
        loadNextScenario();
        enableDecisionButtons();
    } else {
        elements.scenarioText.textContent = "Add some agents to start playing!";
        disableDecisionButtons();
    }
}

function loadNextScenario() {
    // Cycle through scenarios
    gameState.currentScenarioIndex = (gameState.currentScenarioIndex + 1) % SCENARIOS.length;
    elements.scenarioText.textContent = SCENARIOS[gameState.currentScenarioIndex];
    
    // Update turn info
    gameState.currentTurn++;
    elements.turnNumber.textContent = gameState.currentTurn;
    
    // Get current agent
    const currentAgent = gameState.agents[(gameState.currentTurn - 1) % gameState.agents.length];
    elements.currentAgent.textContent = currentAgent.name;
    
    console.log(`Turn ${gameState.currentTurn}: ${currentAgent.name}'s turn`);
    console.log(`Scenario: ${SCENARIOS[gameState.currentScenarioIndex]}`);
    
    // Auto-decide for demo bots
    if (currentAgent.type !== 'human') {
        setTimeout(() => autoDecide(currentAgent), 500);
    }
}

function makeDecision(approved) {
    if (gameState.agents.length === 0) return;
    
    const currentAgentIndex = (gameState.currentTurn - 1) % gameState.agents.length;
    const agent = gameState.agents[currentAgentIndex];
    const reasoning = elements.reasoning.value.trim() || 'No reasoning provided';
    
    const decision = {
        agentName: agent.name,
        agentType: agent.type,
        decision: approved ? 'APPROVED' : 'DENIED',
        reasoning: reasoning,
        scenario: SCENARIOS[gameState.currentScenarioIndex],
        timestamp: new Date().toISOString()
    };
    
    gameState.decisions.push(decision);
    saveGameState();
    renderHistory();
    
    console.log(`Decision: ${agent.name} ${decision.decision}`);
    console.log(`Reasoning: ${reasoning}`);
    
    // Send webhook notification (console.log for MVP)
    sendWebhookNotification(agent, decision);
    
    // Clear reasoning and load next scenario
    elements.reasoning.value = '';
    
    if (gameState.isAutoPlaying) {
        setTimeout(loadNextScenario, 800);
    } else {
        loadNextScenario();
    }
}

// ==================== AUTO-PLAY ====================

function startAutoPlay() {
    if (gameState.agents.length === 0) {
        alert('Add some agents first!');
        return;
    }
    
    gameState.isAutoPlaying = true;
    elements.autoPlayBtn.classList.add('hidden');
    elements.stopAutoPlayBtn.classList.remove('hidden');
    elements.approveBtn.disabled = true;
    elements.denyBtn.disabled = true;
    elements.reasoning.disabled = true;
    
    console.log('Auto-play started');
    loadNextScenario();
}

function stopAutoPlay() {
    gameState.isAutoPlaying = false;
    elements.autoPlayBtn.classList.remove('hidden');
    elements.stopAutoPlayBtn.classList.add('hidden');
    enableDecisionButtons();
    
    console.log('Auto-play stopped');
}

function autoDecide(agent) {
    let approved;
    
    switch (agent.type) {
        case 'strict':
            approved = false; // Always denies
            break;
        case 'lenient':
            approved = true; // Always approves
            break;
        case 'random':
            approved = Math.random() > 0.5; // Random choice
            break;
        default:
            approved = true;
    }
    
    // Set reasoning based on agent type
    const reasoningMap = {
        strict: 'Deny - violates safety principles',
        lenient: 'Approve - aligns with user interests',
        random: Math.random() > 0.5 ? 'Approve - feels right' : 'Deny - not convinced'
    };
    
    elements.reasoning.value = reasoningMap[agent.type] || reasoningMap.random;
    makeDecision(approved);
}

function resetGame() {
    stopAutoPlay();
    gameState.currentTurn = 0;
    gameState.currentScenarioIndex = 0;
    gameState.decisions = [];
    saveGameState();
    
    elements.turnNumber.textContent = '0';
    elements.scenarioText.textContent = 'Game reset - loading scenario...';
    elements.currentAgent.textContent = 'Ready';
    elements.reasoning.value = '';
    
    renderHistory();
    loadNextScenario();
    
    console.log('Game reset');
}

// ==================== AGENT MANAGEMENT ====================

function handleAgentRegistration(e) {
    e.preventDefault();
    
    const name = elements.agentName.value.trim();
    const webhook = elements.agentWebhook.value.trim();
    const type = elements.agentType.value;
    
    if (!name) {
        alert('Please enter an agent name');
        return;
    }
    
    const agent = {
        id: Date.now(),
        name: name,
        webhook: webhook,
        type: type
    };
    
    gameState.agents.push(agent);
    saveGameState();
    renderAgentsList();
    
    elements.agentName.value = '';
    elements.agentWebhook.value = '';
    elements.agentType.value = 'human';
    
    console.log(`Agent added: ${name} (${type})`);
    
    // Enable game if not started
    if (!elements.gameBoard.classList.contains('hidden')) {
        if (gameState.agents.length === 1) {
            loadNextScenario();
            enableDecisionButtons();
        }
    }
}

function addDemoAgent(type) {
    const agentInfo = AGENT_TYPES[type];
    const agent = {
        id: Date.now(),
        name: agentInfo.name,
        webhook: '',
        type: type
    };
    
    // Check if already exists
    if (!gameState.agents.find(a => a.name === agent.name)) {
        gameState.agents.push(agent);
        saveGameState();
        renderAgentsList();
        console.log(`Demo agent added: ${agent.name}`);
    }
}

function addAllDemoAgents() {
    ['strict', 'lenient', 'random'].forEach(type => addDemoAgent(type));
}

function removeAgent(id) {
    gameState.agents = gameState.agents.filter(a => a.id !== id);
    saveGameState();
    renderAgentsList();
    console.log(`Agent removed`);
}

function renderAgentsList() {
    elements.agentsList.innerHTML = '';
    elements.agentCount.textContent = gameState.agents.length;
    
    gameState.agents.forEach(agent => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div>
                <span class="agent-name">${agent.name}</span>
                <span class="agent-type">${AGENT_TYPES[agent.type]?.name || agent.type}</span>
            </div>
            <button class="remove-agent" onclick="removeAgent(${agent.id})">×</button>
        `;
        elements.agentsList.appendChild(li);
    });
}

// ==================== DECISION HISTORY ====================

function renderHistory() {
    elements.historyList.innerHTML = '';
    
    if (gameState.decisions.length === 0) {
        elements.noHistory.classList.remove('hidden');
        return;
    }
    
    elements.noHistory.classList.add('hidden');
    
    // Show most recent first
    [...gameState.decisions].reverse().forEach(decision => {
        const li = document.createElement('li');
        li.className = decision.decision === 'APPROVED' ? 'approved' : 'denied';
        
        const date = new Date(decision.timestamp);
        const timeStr = date.toLocaleTimeString();
        
        li.innerHTML = `
            <div class="history-agent">${decision.agentName}</div>
            <div class="history-decision ${decision.decision === 'APPROVED' ? 'approved' : 'denied'}">
                ${decision.decision}
            </div>
            <div class="history-reasoning">"${decision.reasoning}"</div>
            <div class="history-timestamp">${timeStr}</div>
        `;
        elements.historyList.appendChild(li);
    });
}

// ==================== WEBHOOK NOTIFICATIONS ====================

function sendWebhookNotification(agent, decision) {
    if (agent.webhook) {
        console.log(`📡 Sending webhook to ${agent.webhook}`);
        console.log('   Payload:', {
            agent: agent.name,
            decision: decision.decision,
            reasoning: decision.reasoning,
            scenario: decision.scenario,
            timestamp: decision.timestamp
        });
        // In production, would make actual fetch call here
    }
}

// ==================== PERSISTENCE ====================

function saveGameState() {
    localStorage.setItem('aiGovernanceGame', JSON.stringify(gameState));
    console.log('Game state saved to localStorage');
}

function loadGameState() {
    const saved = localStorage.getItem('aiGovernanceGame');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            gameState = { ...gameState, ...parsed };
            console.log('Game state loaded from localStorage');
            
            // Restore UI state
            elements.turnNumber.textContent = gameState.currentTurn;
        } catch (e) {
            console.error('Error loading game state:', e);
        }
    }
}

// ==================== BUTTON HELPERS ====================

function enableDecisionButtons() {
    elements.approveBtn.disabled = false;
    elements.denyBtn.disabled = false;
    elements.reasoning.disabled = false;
}

function disableDecisionButtons() {
    elements.approveBtn.disabled = true;
    elements.denyBtn.disabled = true;
    elements.reasoning.disabled = true;
}

// ==================== START ====================

document.addEventListener('DOMContentLoaded', init);
