// API Keys
const API_CONFIG = {
    manusAI: 'YOUR_MANUS_API_KEY',
    cometAPI: 'YOUR_COMET_API_KEY',
    cohere: 'YOUR_COHERE_API_KEY'
};

const BACKEND_URL = 'http://localhost:5000/api';

// Application State
let appState = {
    ideas: [],
    validations: [],
    logs: [],
    activeSection: 'dashboard'
};

// Initialize Charts
let overviewChart, trendChart, sentimentChart;

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    initEventListeners();
});

async function initDashboard() {
    const ctxOverview = document.getElementById('overviewChart').getContext('2d');

    if (overviewChart) overviewChart.destroy();

    overviewChart = new Chart(ctxOverview, {
        type: 'doughnut',
        data: {
            labels: ['Validated', 'In Progress', 'Failed', 'New'],
            datasets: [{
                data: [45, 25, 10, 20],
                backgroundColor: ['#00e676', '#7c4dff', '#ff5252', '#00e5ff'],
                borderWidth: 0
            }]
        },
        options: {
            plugins: {
                legend: { position: 'bottom', labels: { color: '#fff' } }
            }
        }
    });

    // Fetch from MongoDB
    try {
        const response = await fetch(`${BACKEND_URL}/ideas`);
        const ideas = await response.json();

        const list = document.getElementById('recent-ideas');
        list.innerHTML = '';

        if (!Array.isArray(ideas) || ideas.length === 0) {
            list.innerHTML = `<p style="color: var(--text-muted); padding: 20px;">${ideas.error ? 'Error fetching: ' + ideas.error : 'No ideas forged yet. Start a new forge!'}</p>`;
            return;
        }

        ideas.slice(0, 5).forEach(idea => {
            const item = document.createElement('div');
            item.className = 'glass-card';
            item.style.padding = '15px 25px';
            item.style.marginBottom = '10px';
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h4 style="color: var(--text-main);">${idea.name}</h4>
                    <div style="display: flex; gap: 20px; align-items: center;">
                        <span class="badge badge-score">${idea.score || 0}% Score</span>
                        <span style="font-size: 0.8rem; color: var(--text-muted);">${new Date(idea.createdAt || idea.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
            `;
            list.appendChild(item);
        });
    } catch (err) {
        console.error("Supabase Fetch Error:", err);
    }
}

function initEventListeners() {
    document.getElementById('generateBtn').addEventListener('click', handleGeneration);
}

async function handleGeneration() {
    const input = document.getElementById('userInput').value;
    const problem = document.getElementById('problemStatement').value;

    if (!input) {
        alert("Please enter a keyword or industry focus!");
        return;
    }

    const logSection = document.getElementById('processing-log');
    logSection.style.display = 'block';

    try {
        updateStep('step-manus', 'running');

        const response = await fetch(`${BACKEND_URL}/forge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input, problem })
        });

        if (!response.ok) throw new Error("Forge request failed");

        const refinedIdeas = await response.json();

        updateStep('step-manus', 'done');
        updateStep('step-cohere', 'done');
        updateStep('step-comet', 'done');

        displayResults(refinedIdeas);
        initDashboard(); // Refresh dashboard list

    } catch (error) {
        console.error("Forge Process Failed:", error);
        alert("Backend connection failed. Check your Supabase configuration!");
    }
}

function updateStep(id, status) {
    const el = document.getElementById(id);
    if (!el) return;
    if (status === 'running') {
        el.innerHTML = `<i class="fas fa-circle-notch fa-spin" style="color: var(--accent-secondary);"></i> Processing...`;
        el.style.color = '#fff';
    } else {
        el.innerHTML = `<i class="fas fa-check-circle" style="color: var(--accent-success);"></i> Completed`;
        el.style.color = 'var(--accent-success)';
    }
}

function displayResults(ideas) {
    const container = document.getElementById('results-display');
    container.innerHTML = '';

    ideas.forEach(idea => {
        const card = document.createElement('div');
        card.className = 'glass-card idea-card animate-fade-in';
        card.innerHTML = `
            <div class="card-header">
                <div>
                    <span class="tool-tag">ManusAI</span>
                    <span class="tool-tag">Cohere</span>
                </div>
                <span class="badge badge-score">${idea.score}% Score</span>
            </div>
            <h3>${idea.name}</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem; margin: 15px 0;">${idea.description}</p>
            <div style="display: flex; gap: 8px;">
                ${(idea.tags || ['AI', 'Scalable']).map(t => `<span class="tool-tag">${t}</span>`).join('')}
            </div>
            <button class="generate-btn" style="margin-top: 20px; font-size: 0.9rem; padding: 10px;" onclick="validateIdea('${idea.name}')">
                Analyze Feasibility
            </button>
        `;
        container.appendChild(card);
    });
}

// Section Switching
window.showSection = function (sectionId, link) {
    if (link) {
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
    }

    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    document.getElementById(`${sectionId}-section`).style.display = 'block';

    const pageTitle = sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
    document.getElementById('page-title').innerText = `${pageTitle} View`;

    if (sectionId === 'market') initMarketCharts();
    if (sectionId === 'tracking') populateCometLogs();
    if (sectionId === 'validation') populateValidation();
};

function initMarketCharts() {
    if (trendChart) trendChart.destroy();
    if (sentimentChart) sentimentChart.destroy();

    const ctxTrend = document.getElementById('trendChart').getContext('2d');
    trendChart = new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Market Interest (Owlytics)',
                data: [12, 19, 35, 42, 65, 82],
                borderColor: '#7c4dff',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(124, 77, 255, 0.1)'
            }]
        },
        options: { plugins: { legend: { labels: { color: '#fff' } } }, scales: { y: { grid: { color: '#333' } }, x: { grid: { color: '#333' } } } }
    });

    const ctxSenti = document.getElementById('sentimentChart').getContext('2d');
    sentimentChart = new Chart(ctxSenti, {
        type: 'radar',
        data: {
            labels: ['Price', 'UX', 'Speed', 'Security', 'Features'],
            datasets: [{
                label: 'Public Sentiment',
                data: [85, 90, 75, 95, 80],
                borderColor: '#00e5ff',
                backgroundColor: 'rgba(0, 229, 255, 0.2)'
            }]
        },
        options: { plugins: { legend: { labels: { color: '#fff' } } }, scales: { r: { grid: { color: '#333' }, pointLabels: { color: '#fff' } } } }
    });
}

function populateValidation() {
    const container = document.getElementById('validation-cards');
    container.innerHTML = `
        <div class="glass-card idea-card">
            <h3>Feasibility Score</h3>
            <div style="font-size: 3rem; color: var(--accent-success); margin: 20px 0;">88/100</div>
            <p>IdeaProof: Low competition observed in the targeting niche.</p>
        </div>
        <div class="glass-card idea-card">
            <h3>Risk Factor</h3>
            <div style="font-size: 3rem; color: #ff5252; margin: 20px 0;">Low</div>
            <p>Regulatory risks are minimal for this sector.</p>
        </div>
    `;
}

function populateCometLogs() {
    const list = document.getElementById('comet-logs');
    list.innerHTML = `
        <tr>
            <td style="padding: 15px;">#EXP-992</td>
            <td>Cohere Refine-v2</td>
            <td><span class="badge" style="background: rgba(0, 230, 118, 0.15); color: var(--accent-success);">Success</span></td>
            <td>94.2%</td>
            <td>Today</td>
        </tr>
    `;
}

window.validateIdea = function (name) {
    showSection('validation');
}
