const DEFAULT_AGENTS = [
    { key: 'strict', name: 'StrictBot' },
    { key: 'lenient', name: 'LenientBot' },
    { key: 'balanced', name: 'BalancedBot' },
    { key: 'gpt-4', name: 'GPT-4' }
];

function optionLetter(index) {
    return String.fromCharCode(65 + index);
}

function normalizeAnswers(records = []) {
    const answers = new Map();
    records.forEach(record => {
        if (!record?.agentId) return;
        answers.set(record.agentId, {
            answer: record.answer,
            isCorrect: record.isCorrect === true
        });
    });
    return answers;
}

function extractRoundAnswers(state, currentQuestion) {
    const history = Array.isArray(state?.moveHistory) ? state.moveHistory : [];
    const round = state?.round ?? null;
    const filtered = history.filter(record => {
        if (!record) return false;
        if (currentQuestion?.id) {
            return record.questionId === currentQuestion.id;
        }
        if (round !== null && typeof record.round === 'number') {
            return record.round === round;
        }
        return true;
    });

    const answers = normalizeAnswers(filtered);
    const correctEntry = filtered.find(record => record.isCorrect === true);
    const correctAnswer = correctEntry?.answer || null;

    return { answers, correctAnswer };
}

function resolveAgentList(stateAgents = []) {
    if (!Array.isArray(stateAgents) || stateAgents.length === 0) {
        return DEFAULT_AGENTS.map(agent => ({ id: agent.key, name: agent.name }));
    }

    return stateAgents.map(agent => ({
        id: agent.id || agent.name || agent.type || 'agent',
        name: agent.name || agent.type || 'Agent'
    }));
}

class QuestionDisplay {
    constructor(options = {}) {
        this.socketClient = options.socketClient || window.socketClient;
        this.container = document.querySelector(options.container || '#question-display');
        this.panel = this.container?.closest('.question-panel');
        this.currentQuestion = null;
        this.answersByAgent = new Map();
        this.correctAnswer = null;
        this.expanded = false;
        this.roundResolved = false;

        if (this.panel) {
            this.panel.dataset.expanded = 'false';
        }

        this._bindEvents();
        this._bindToggle();
        this.render();
    }

    _bindEvents() {
        if (!this.socketClient) {
            console.warn('[QuestionDisplay] Socket client not available');
            return;
        }

        this.socketClient.on('game:state', (state) => {
            this.handleStateUpdate(state);
        });

        this.socketClient.on('answer:submitted', (payload) => {
            this.handleAnswerSubmitted(payload);
        });

        this.socketClient.on('game:roundEnd', (payload) => {
            this.handleRoundEnd(payload);
        });
    }

    _bindToggle() {
        if (!this.container) return;
        this.container.addEventListener('click', (event) => {
            const target = event.target;
            if (target?.closest('.question-toggle')) {
                event.preventDefault();
                this.setExpanded(!this.expanded);
            }
        });
    }

    handleStateUpdate(state) {
        const nextQuestion = state?.currentQuestion || null;
        const questionChanged = nextQuestion?.id && nextQuestion?.id !== this.currentQuestion?.id;

        this.currentQuestion = nextQuestion;
        this.roundResolved = ['RESOLVED', 'FINISHED'].includes(state?.gameSession?.status);

        if (questionChanged) {
            this.correctAnswer = null;
            this.answersByAgent = new Map();
            this.setExpanded(false);
        }

        const { answers, correctAnswer } = extractRoundAnswers(state, this.currentQuestion);
        this.answersByAgent = answers;
        if (this.roundResolved) {
            this.correctAnswer = correctAnswer;
        }

        this.render(state?.agents || []);
    }

    handleAnswerSubmitted(payload) {
        if (!payload?.agentId) return;
        this.answersByAgent.set(payload.agentId, {
            answer: payload.answer,
            isCorrect: payload.isCorrect === true
        });
        this.render(payload?.agents || []);
    }

    handleRoundEnd(payload) {
        if (payload?.correctAnswer) {
            this.correctAnswer = payload.correctAnswer;
        }
        this.roundResolved = true;
        this.render(payload?.agents || []);
    }

    setExpanded(expanded) {
        this.expanded = expanded;
        if (this.panel) {
            this.panel.dataset.expanded = String(expanded);
        }
        this.render();
    }

    render(stateAgents = []) {
        if (!this.container) return;

        if (!this.currentQuestion) {
            this.container.innerHTML = '<div class="empty-state">No active question yet.</div>';
            return;
        }

        const optionsHtml = (this.currentQuestion.options || []).map((option, index) => {
            const letter = optionLetter(index);
            const isCorrect = this.roundResolved && this.correctAnswer === letter;
            const optionClass = isCorrect ? 'question-option is-correct' : 'question-option';

            return `
                <div class="${optionClass}" data-answer="${letter}">
                    <span class="option-letter">${letter}</span>
                    <span class="option-text">${option}</span>
                    ${isCorrect ? '<span class="option-result">✓ Correct</span>' : ''}
                </div>
            `;
        }).join('');

        const toggleLabel = this.expanded ? 'Hide options' : 'Show options';
        const agents = resolveAgentList(stateAgents);
        const feedbackRows = agents.map(agent => {
            const answerData = this.answersByAgent.get(agent.id);
            const hasAnswer = Boolean(answerData?.answer);
            const statusClass = hasAnswer ? (answerData.isCorrect ? 'is-correct' : 'is-wrong') : 'is-pending';
            const statusText = hasAnswer ? (answerData.isCorrect ? '✓' : '✕') : '…';
            const answerText = hasAnswer ? `Answered ${answerData.answer}` : 'Awaiting answer';

            return `
                <div class="answer-feedback-row ${statusClass}">
                    <span class="answer-agent">${agent.name}</span>
                    <span class="answer-status">${statusText}</span>
                    <span class="answer-text">${answerText}</span>
                </div>
            `;
        }).join('');

        this.container.innerHTML = `
            <div class="question-card">
                <div class="question-text">${this.currentQuestion.text}</div>
                <button class="question-toggle" type="button">${toggleLabel}</button>
                <div class="question-options">
                    ${optionsHtml}
                </div>
                <div class="answer-feedback">
                    <div class="answer-feedback-title">Answer feedback</div>
                    ${feedbackRows}
                </div>
            </div>
        `;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { QuestionDisplay };
} else {
    window.QuestionDisplay = QuestionDisplay;
}

export { QuestionDisplay };
