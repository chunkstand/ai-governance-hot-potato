// AI Governance Hot Potato - Game Logic with AEL Framework

// ==================== GAME DATA ====================

const SCENARIOS = [
    {
        text: "AI system wants to analyze user emails to improve product recommendations",
        defaultImpacts: { users: -2, org: 5, society: 1, trust: -3 }
    },
    {
        text: "Deploy an AI chatbot for customer service without human oversight capability",
        defaultImpacts: { users: -5, org: 8, society: -2, trust: -5 }
    },
    {
        text: "Use facial recognition for building access control with opt-in consent",
        defaultImpacts: { users: 2, org: 6, society: 1, trust: 3 }
    },
    {
        text: "AI-generated content platform without clear labeling of synthetic media",
        defaultImpacts: { users: -4, org: 7, society: -5, trust: -6 }
    },
    {
        text: "Automated credit scoring system with explainability requirements and bias audits",
        defaultImpacts: { users: 3, org: 4, society: 4, trust: 5 }
    },
    {
        text: "AI surveillance system monitoring employee productivity metrics continuously",
        defaultImpacts: { users: -6, org: 5, society: -3, trust: -7 }
    },
    {
        text: "Open-source AI model release with safety guidelines and usage restrictions",
        defaultImpacts: { users: 4, org: 3, society: 6, trust: 4 }
    }
];

const AEL_PILLARS = {
    consent: { name: "User Consent & Safety", weight: 1.0 },
    transparency: { name: "Transparency & Accountability", weight: 0.9 },
    fairness: { name: "Fairness & Inclusion", weight: 0.9 },
    alignment: { name: "Alignment & Control", weight: 1.0 }
};

const AGENT_TYPES = {
    strict: { name: "StrictBot", description: "Conservative - prefers DENY" },
    lenient: { name: "LenientBot", description: "Optimistic - prefers APPROVE" },
    random: { name: "RandomBot", description: "Random choice" },
    balanced: { name: "BalancedBot", description: "Uses AEL framework" },
    human: { name: "Human", description: "Human player" }
};

// ==================== GAME STATE ====================

let gameState = {
    agents: [],
    decisions: [],
    currentTurn: 0,
    currentScenarioIndex: 0,
    isAutoPlaying: false,
    autoPlayInterval: null,
    pillarRatings: {
        consent: 5,
        transparency: 5,
        fairness: 5,
        alignment: 5
    },
    cumulativeImpacts: {
        users: 0,
        org: 0,
        society: 0,
        trust: 0
    }
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
    
    // AEL Pillar Sliders
    consentSlider: document.getElementById('consentSlider'),
    consentValue: document.getElementById('consentValue'),
    transparencySlider: document.getElementById('transparencySlider'),
    transparencyValue: document.getElementById('transparencyValue'),
    fairnessSlider: document.getElementById('fairnessSlider'),
    fairnessValue: document.getElementById('fairnessValue'),
    alignmentSlider: document.getElementById('alignmentSlider'),
    alignmentValue: document.getElementById('alignmentValue'),
    pillarAverage: document.getElementById('pillarAverage'),
    recommendation: document.getElementById('recommendation'),
    
    // Impact Visualization
    impactUsers: document.getElementById('impactUsers'),
    impactUsersScore: document.getElementById('impactUsersScore'),
    impactOrg: document.getElementById('impactOrg'),
    impactOrgScore: document.getElementById('impactOrgScore'),
    impactSociety: document.getElementById('impactSociety'),
    impactSocietyScore: document.getElementById('impactSocietyScore'),
    impactTrust: document.getElementById('impactTrust'),
    impactTrustScore: document.getElementById('impactTrustScore'),
    
    // Decision buttons
    approveBtn: document.getElementById('approveBtn'),
    modifyBtn: document.getElementById('modifyBtn'),
    denyBtn: document.getElementById('denyBtn'),
    reasoning: document.getElementById('reasoning'),
    
    // Modification panel
    modificationPanel: document.getElementById('modificationPanel'),
    modConsent: document.getElementById('modConsent'),
    modTransparency: document.getElementById('modTransparency'),
    modHumanReview: document.getElementById('modHumanReview'),
    modAuditing: document.getElementById('modAuditing'),
    modSafeguards: document.getElementById('modSafeguards'),
    modReasoning: document.getElementById('modReasoning'),
    
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
    noHistory: document.getElementById('noHistory'),
    
    // Modal and Tooltip
    modal: document.getElementById('educationalModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalBody: document.getElementById('modalBody'),
    tooltip: document.getElementById('tooltip')
};

// ==================== INITIALIZATION ====================

function init() {
    loadGameState();
    setupEventListeners();
    setupPillarSliders();
    setupTooltips();
    setupModal();
    renderAgentsList();
    renderHistory();
    updateImpactVisualization();
    console.log('🤖 AI Governance Hot Potato with AEL Framework initialized');
    console.log('Game state loaded from localStorage');
}

function setupEventListeners() {
    // Landing
    elements.startGame.addEventListener('click', startGame);
    
    // Decision buttons
    elements.approveBtn.addEventListener('click', () => makeDecision('APPROVED'));
    elements.modifyBtn.addEventListener('click', () => handleModifyClick());
    elements.denyBtn.addEventListener('click', () => makeDecision('DENIED'));
    
    // Auto-play
    elements.autoPlayBtn.addEventListener('click', startAutoPlay);
    elements.stopAutoPlayBtn.addEventListener('click', stopAutoPlay);
    elements.resetGameBtn.addEventListener('click', resetGame);
    
    // Agent registration
    elements.agentForm.addEventListener('submit', handleAgentRegistration);
    
    // Educational
    document.getElementById('learnAelBtn').addEventListener('click', () => {
        openModal('AEL Framework');
    });
    elements.addLenientBot.addEventListener('click', () => addDemoAgent('lenient'));
    elements.addRandomBot.addEventListener('click', () => addDemoAgent('random'));
    document.getElementById('addBalancedBot').addEventListener('click', () => addDemoAgent('balanced'));
    elements.addAllBots.addEventListener('click', addAllDemoAgents);
}

function setupPillarSliders() {
    const sliders = [
        { el: elements.consentSlider, display: elements.consentValue, pillar: 'consent' },
        { el: elements.transparencySlider, display: elements.transparencyValue, pillar: 'transparency' },
        { el: elements.fairnessSlider, display: elements.fairnessValue, pillar: 'fairness' },
        { el: elements.alignmentSlider, display: elements.alignmentValue, pillar: 'alignment' }
    ];
    
    sliders.forEach(({ el, display, pillar }) => {
        el.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            display.textContent = value;
            gameState.pillarRatings[pillar] = value;
            updatePillarSummary();
            updateImpactVisualization();
            saveGameState();
        });
    });
    
    updatePillarSummary();
}

function setupTooltips() {
    const tooltipTriggers = document.querySelectorAll('.tooltip-trigger');
    
    tooltipTriggers.forEach(trigger => {
        trigger.addEventListener('mouseenter', (e) => {
            const text = e.target.dataset.tooltip;
            elements.tooltip.textContent = text;
            elements.tooltip.classList.remove('hidden');
            
            const rect = e.target.getBoundingClientRect();
            elements.tooltip.style.left = `${rect.left + rect.width / 2}px`;
            elements.tooltip.style.top = `${rect.top - 10}px`;
            elements.tooltip.style.transform = 'translate(-50%, -100%)';
        });
        
        trigger.addEventListener('mouseleave', () => {
            elements.tooltip.classList.add('hidden');
        });
    });
}

function setupModal() {
    // Close modal on X click
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    
    // Close modal on outside click
    elements.modal.addEventListener('click', (e) => {
        if (e.target === elements.modal) closeModal();
    });
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !elements.modal.classList.contains('hidden')) {
            closeModal();
        }
    });
}

function openModal(title, content) {
    elements.modalTitle.textContent = title;
    if (content) elements.modalBody.innerHTML = content;
    elements.modal.classList.remove('hidden');
}

function closeModal() {
    elements.modal.classList.add('hidden');
}

// ==================== GAME FLOW ====================

function startGame() {
    elements.landing.classList.add('hidden');
    elements.gameBoard.classList.remove('hidden');
    
    if (gameState.agents.length > 0) {
        loadNextScenario();
        enableDecisionButtons();
    } else {
        elements.scenarioText.textContent = "Add some agents to start playing! Use the demo bots to get started.";
        disableDecisionButtons();
    }
}

function loadNextScenario() {
    // Cycle through scenarios
    gameState.currentScenarioIndex = (gameState.currentScenarioIndex + 1) % SCENARIOS.length;
    const scenario = SCENARIOS[gameState.currentScenarioIndex];
    elements.scenarioText.textContent = scenario.text;
    
    // Reset pillar ratings to neutral
    resetPillarRatings();
    
    // Update turn info
    gameState.currentTurn++;
    elements.turnNumber.textContent = gameState.currentTurn;
    
    // Get current agent
    const currentAgent = gameState.agents[(gameState.currentTurn - 1) % gameState.agents.length];
    elements.currentAgent.textContent = currentAgent.name;
    
    // Hide modification panel
    elements.modificationPanel.classList.add('hidden');
    clearModificationCheckboxes();
    
    console.log(`Turn ${gameState.currentTurn}: ${currentAgent.name}'s turn`);
    console.log(`Scenario: ${scenario.text}`);
    
    // Auto-decide for demo bots
    if (currentAgent.type !== 'human') {
        setTimeout(() => autoDecide(currentAgent), 800);
    }
}

function resetPillarRatings() {
    gameState.pillarRatings = { consent: 5, transparency: 5, fairness: 5, alignment: 5 };
    elements.consentSlider.value = 5;
    elements.consentValue.textContent = 5;
    elements.transparencySlider.value = 5;
    elements.transparencyValue.textContent = 5;
    elements.fairnessSlider.value = 5;
    elements.fairnessValue.textContent = 5;
    elements.alignmentSlider.value = 5;
    elements.alignmentValue.textContent = 5;
    updatePillarSummary();
    updateImpactVisualization();
}

function updatePillarSummary() {
    const ratings = gameState.pillarRatings;
    const average = ((ratings.consent + ratings.transparency + ratings.fairness + ratings.alignment) / 4).toFixed(1);
    elements.pillarAverage.textContent = average;
    
    // Update recommendation
    elements.recommendation.className = 'recommendation';
    if (average >= 7) {
        elements.recommendation.textContent = 'Strong candidate for approval';
        elements.recommendation.classList.add('approve');
    } else if (average >= 4) {
        elements.recommendation.textContent = 'Consider modifications';
        elements.recommendation.classList.add('modify');
    } else {
        elements.recommendation.textContent = 'Likely should be denied';
        elements.recommendation.classList.add('deny');
    }
}

function calculateImpacts(decision) {
    const scenario = SCENARIOS[gameState.currentScenarioIndex];
    const ratings = gameState.pillarRatings;
    const avgPillar = (ratings.consent + ratings.transparency + ratings.fairness + ratings.alignment) / 4;
    
    let impacts = { ...scenario.defaultImpacts };
    
    // Adjust impacts based on decision type
    if (decision === 'APPROVED') {
        // If approved with low pillar scores, negative impacts are amplified
        if (avgPillar < 5) {
            impacts.users *= 1.5;
            impacts.trust *= 1.3;
        }
    } else if (decision === 'DENIED') {
        // If denied, flip the impacts (denying a bad thing is positive)
        impacts.users = Math.abs(scenario.defaultImpacts.users) * (scenario.defaultImpacts.users < 0 ? 1 : -0.5);
        impacts.org = -Math.abs(impacts.org) * 0.5; // Org always loses a bit when denied
        impacts.society = Math.abs(scenario.defaultImpacts.society) * (scenario.defaultImpacts.society < 0 ? 1 : -0.3);
        impacts.trust = Math.abs(scenario.defaultImpacts.trust) * (scenario.defaultImpacts.trust < 0 ? 1 : -0.3);
    } else if (decision === 'MODIFIED') {
        // Modification reduces negative impacts and maintains some positive
        impacts.users = Math.abs(scenario.defaultImpacts.users) * 0.3;
        impacts.org *= 0.7;
        impacts.society = Math.abs(scenario.defaultImpacts.society) * 0.5;
        impacts.trust = Math.abs(scenario.defaultImpacts.trust) * 0.4;
        
        // Add bonus for good pillar ratings
        if (avgPillar > 6) {
            impacts.trust += 2;
            impacts.society += 1;
        }
    }
    
    return impacts;
}

function updateImpactVisualization() {
    const scenario = SCENARIOS[gameState.currentScenarioIndex];
    const ratings = gameState.pillarRatings;
    const avgPillar = (ratings.consent + ratings.transparency + ratings.fairness + ratings.alignment) / 4;
    
    // Calculate projected impacts based on current pillar ratings
    let projectedImpacts = { ...scenario.defaultImpacts };
    
    // Adjust based on how well the scenario aligns with pillars
    const alignmentFactor = (avgPillar - 5) / 5; // -1 to 1
    
    Object.keys(projectedImpacts).forEach(key => {
        projectedImpacts[key] = Math.round(projectedImpacts[key] * (1 + alignmentFactor * 0.3));
    });
    
    // Update UI
    updateImpactBar(elements.impactUsers, elements.impactUsersScore, projectedImpacts.users);
    updateImpactBar(elements.impactOrg, elements.impactOrgScore, projectedImpacts.org);
    updateImpactBar(elements.impactSociety, elements.impactSocietyScore, projectedImpacts.society);
    updateImpactBar(elements.impactTrust, elements.impactTrustScore, projectedImpacts.trust);
}

function updateImpactBar(barEl, scoreEl, value) {
    const absValue = Math.abs(value);
    const maxValue = 10;
    const percentage = Math.min((absValue / maxValue) * 100, 100);
    
    barEl.style.width = `${percentage}%`;
    scoreEl.textContent = value > 0 ? `+${value}` : value;
    
    // Remove old classes
    barEl.classList.remove('positive', 'negative', 'neutral');
    scoreEl.classList.remove('positive', 'negative', 'neutral');
    
    // Add appropriate class
    if (value > 0) {
        barEl.classList.add('positive');
        scoreEl.classList.add('positive');
    } else if (value < 0) {
        barEl.classList.add('negative');
        scoreEl.classList.add('negative');
    } else {
        barEl.classList.add('neutral');
        scoreEl.classList.add('neutral');
    }
}

function handleModifyClick() {
    elements.modificationPanel.classList.remove('hidden');
    elements.reasoning.focus();
}

function clearModificationCheckboxes() {
    elements.modConsent.checked = false;
    elements.modTransparency.checked = false;
    elements.modHumanReview.checked = false;
    elements.modAuditing.checked = false;
    elements.modSafeguards.checked = false;
    elements.modReasoning.value = '';
}

function getSelectedModifications() {
    const mods = [];
    if (elements.modConsent.checked) mods.push('Explicit user consent');
    if (elements.modTransparency.checked) mods.push('Transparency documentation');
    if (elements.modHumanReview.checked) mods.push('Human review checkpoint');
    if (elements.modAuditing.checked) mods.push('Audit logging');
    if (elements.modSafeguards.checked) mods.push('Safety guardrails');
    return mods;
}

function makeDecision(decision) {
    if (gameState.agents.length === 0) return;
    
    const currentAgentIndex = (gameState.currentTurn - 1) % gameState.agents.length;
    const agent = gameState.agents[currentAgentIndex];
    
    let reasoning = elements.reasoning.value.trim();
    let modifications = [];
    
    if (decision === 'MODIFIED') {
        modifications = getSelectedModifications();
        if (!reasoning) {
            reasoning = elements.modReasoning.value.trim() || 'Modifications applied without detailed reasoning';
        }
        if (modifications.length > 0) {
            reasoning = `[Modifications: ${modifications.join(', ')}] ${reasoning}`;
        }
    }
    
    if (!reasoning) {
        reasoning = 'No reasoning provided';
    }
    
    // Calculate impacts
    const impacts = calculateImpacts(decision);
    
    // Update cumulative impacts
    Object.keys(impacts).forEach(key => {
        gameState.cumulativeImpacts[key] += Math.round(impacts[key]);
    });
    
    const decisionRecord = {
        agentName: agent.name,
        agentType: agent.type,
        decision: decision,
        reasoning: reasoning,
        scenario: SCENARIOS[gameState.currentScenarioIndex].text,
        pillarRatings: { ...gameState.pillarRatings },
        impacts: impacts,
        cumulativeImpacts: { ...gameState.cumulativeImpacts },
        modifications: modifications,
        timestamp: new Date().toISOString()
    };
    
    gameState.decisions.push(decisionRecord);
    saveGameState();
    renderHistory();
    
    console.log(`Decision: ${agent.name} ${decision}`);
    console.log(`Reasoning: ${reasoning}`);
    console.log(`Impacts:`, impacts);
    console.log(`Cumulative impacts:`, gameState.cumulativeImpacts);
    
    // Send webhook notification
    sendWebhookNotification(agent, decisionRecord);
    
    // Clear reasoning and load next scenario
    elements.reasoning.value = '';
    
    if (gameState.isAutoPlaying) {
        setTimeout(loadNextScenario, 1200);
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
    elements.modifyBtn.disabled = true;
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
    const scenario = SCENARIOS[gameState.currentScenarioIndex];
    let decision;
    let reasoning;
    
    // Set pillar ratings based on agent type
    switch (agent.type) {
        case 'strict':
            // Strict bot: always low ratings, prefers DENY
            gameState.pillarRatings = { consent: 3, transparency: 3, fairness: 3, alignment: 3 };
            decision = 'DENIED';
            reasoning = 'Denied - insufficient safeguards for user safety and consent';
            break;
            
        case 'lenient':
            // Lenient bot: always high ratings, prefers APPROVE
            gameState.pillarRatings = { consent: 8, transparency: 8, fairness: 8, alignment: 8 };
            decision = 'APPROVED';
            reasoning = 'Approved - aligns with AEL principles and organizational goals';
            break;
            
        case 'balanced':
            // Balanced bot: uses AEL framework intelligently
            const hasNegativeImpact = scenario.defaultImpacts.users < -3 || scenario.defaultImpacts.trust < -3;
            const isMixed = Math.abs(scenario.defaultImpacts.users) < 3;
            
            if (hasNegativeImpact) {
                // Check if modifications could help
                if (scenario.defaultImpacts.org > 5) {
                    gameState.pillarRatings = { consent: 6, transparency: 7, fairness: 6, alignment: 7 };
                    decision = 'MODIFIED';
                    reasoning = 'Modified - requires additional safeguards for ethical compliance';
                    // Set some modifications
                    elements.modConsent.checked = true;
                    elements.modSafeguards.checked = true;
                } else {
                    gameState.pillarRatings = { consent: 3, transparency: 4, fairness: 3, alignment: 4 };
                    decision = 'DENIED';
                    reasoning = 'Denied - fails multiple AEL pillars, particularly user consent and safety';
                }
            } else if (isMixed) {
                gameState.pillarRatings = { consent: 6, transparency: 6, fairness: 6, alignment: 6 };
                decision = 'MODIFIED';
                reasoning = 'Modified - potential with transparency and oversight improvements';
                elements.modTransparency.checked = true;
                elements.modHumanReview.checked = true;
            } else {
                gameState.pillarRatings = { consent: 7, transparency: 7, fairness: 7, alignment: 7 };
                decision = 'APPROVED';
                reasoning = 'Approved - meets AEL framework requirements across all pillars';
            }
            break;
            
        case 'random':
        default:
            // Random bot: random ratings and decision
            gameState.pillarRatings = {
                consent: Math.floor(Math.random() * 6) + 3,
                transparency: Math.floor(Math.random() * 6) + 3,
                fairness: Math.floor(Math.random() * 6) + 3,
                alignment: Math.floor(Math.random() * 6) + 3
            };
            
            const avgRating = (gameState.pillarRatings.consent + gameState.pillarRatings.transparency + 
                              gameState.pillarRatings.fairness + gameState.pillarRatings.alignment) / 4;
            
            if (avgRating >= 7) {
                decision = 'APPROVED';
                reasoning = 'Approved - AEL ratings indicate acceptable alignment';
            } else if (avgRating >= 4) {
                decision = 'MODIFIED';
                reasoning = 'Modified - some concerns across AEL pillars';
                elements.modHumanReview.checked = Math.random() > 0.5;
                elements.modSafeguards.checked = Math.random() > 0.5;
            } else {
                decision = 'DENIED';
                reasoning = 'Denied - insufficient alignment with AEL principles';
            }
    }
    
    // Update UI sliders to match agent's ratings
    elements.consentSlider.value = gameState.pillarRatings.consent;
    elements.consentValue.textContent = gameState.pillarRatings.consent;
    elements.transparencySlider.value = gameState.pillarRatings.transparency;
    elements.transparencyValue.textContent = gameState.pillarRatings.transparency;
    elements.fairnessSlider.value = gameState.pillarRatings.fairness;
    elements.fairnessValue.textContent = gameState.pillarRatings.fairness;
    elements.alignmentSlider.value = gameState.pillarRatings.alignment;
    elements.alignmentValue.textContent = gameState.pillarRatings.alignment;
    
    updatePillarSummary();
    updateImpactVisualization();
    
    elements.reasoning.value = reasoning;
    
    // Show modification panel if needed
    if (decision === 'MODIFIED') {
        elements.modificationPanel.classList.remove('hidden');
    }
    
    setTimeout(() => makeDecision(decision), 300);
}

function resetGame() {
    stopAutoPlay();
    gameState.currentTurn = 0;
    gameState.currentScenarioIndex = 0;
    gameState.decisions = [];
    gameState.cumulativeImpacts = { users: 0, org: 0, society: 0, trust: 0 };
    resetPillarRatings();
    saveGameState();
    
    elements.turnNumber.textContent = '0';
    elements.scenarioText.textContent = 'Game reset - loading scenario...';
    elements.currentAgent.textContent = 'Ready';
    elements.reasoning.value = '';
    elements.modificationPanel.classList.add('hidden');
    clearModificationCheckboxes();
    
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
    ['strict', 'lenient', 'random', 'balanced'].forEach(type => addDemoAgent(type));
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
        
        // Determine class based on decision
        let decisionClass = '';
        if (decision.decision === 'APPROVED') decisionClass = 'approved';
        else if (decision.decision === 'MODIFIED') decisionClass = 'modified';
        else decisionClass = 'denied';
        
        li.className = decisionClass;
        
        const date = new Date(decision.timestamp);
        const timeStr = date.toLocaleTimeString();
        
        // Format impacts summary
        const impacts = decision.impacts || {};
        const impactSummary = Object.entries(impacts)
            .map(([key, val]) => `${key}: ${val > 0 ? '+' : ''}${Math.round(val)}`)
            .join(', ');
        
        li.innerHTML = `
            <div class="history-agent">${decision.agentName}</div>
            <div class="history-decision ${decisionClass}">
                ${decision.decision}
            </div>
            <div class="history-reasoning">"${decision.reasoning}"</div>
            <div class="history-impacts" style="font-size: 0.8rem; color: var(--text-secondary); margin: 5px 0;">
                Impacts: ${impactSummary}
            </div>
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
            pillarRatings: decision.pillarRatings,
            impacts: decision.impacts,
            cumulativeImpacts: decision.cumulativeImpacts,
            modifications: decision.modifications,
            timestamp: decision.timestamp
        });
        // In production, would make actual fetch call here
    }
}

// ==================== PERSISTENCE ====================

function saveGameState() {
    // Don't save pillar ratings as they should reset each turn
    const stateToSave = {
        agents: gameState.agents,
        decisions: gameState.decisions,
        currentTurn: gameState.currentTurn,
        currentScenarioIndex: gameState.currentScenarioIndex,
        isAutoPlaying: false, // Always reset autoplay on load
        cumulativeImpacts: gameState.cumulativeImpacts
    };
    localStorage.setItem('aiGovernanceGame', JSON.stringify(stateToSave));
    console.log('Game state saved to localStorage');
}

function loadGameState() {
    const saved = localStorage.getItem('aiGovernanceGame');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            gameState.agents = parsed.agents || [];
            gameState.decisions = parsed.decisions || [];
            gameState.currentTurn = parsed.currentTurn || 0;
            gameState.currentScenarioIndex = parsed.currentScenarioIndex || 0;
            gameState.isAutoPlaying = false;
            gameState.cumulativeImpacts = parsed.cumulativeImpacts || { users: 0, org: 0, society: 0, trust: 0 };
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
    elements.modifyBtn.disabled = false;
    elements.denyBtn.disabled = false;
    elements.reasoning.disabled = false;
}

function disableDecisionButtons() {
    elements.approveBtn.disabled = true;
    elements.modifyBtn.disabled = true;
    elements.denyBtn.disabled = true;
    elements.reasoning.disabled = true;
}

// ==================== START ====================

document.addEventListener('DOMContentLoaded', init);
