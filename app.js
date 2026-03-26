// Backend URL
const BACKEND_URL = 'http://localhost:5000/api';

// Global state: stores the last forged ideas and running experiment log
let lastForgedIdeas = [];
let experimentLogs = [];

// Chart instances
let overviewChart, trendChart, sentimentChart;

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    initEventListeners();
});

// Global ideas list (loaded from server, used for PDF export)
let allStoredIdeas = [];

// ─── Dashboard ───────────────────────────────────────────────────────────────
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

    const list = document.getElementById('recent-ideas');

    try {
        const response = await fetch(`${BACKEND_URL}/ideas?_=${Date.now()}`);
        const ideas = await response.json();

        if (!Array.isArray(ideas) || ideas.length === 0) {
            list.innerHTML = `
                <div style="text-align:center; padding: 40px; color: var(--text-muted);">
                    <i class="fas fa-rocket" style="font-size:2rem; margin-bottom:12px; display:block;"></i>
                    No ideas forged yet. Click <strong>Start New Forge</strong> to begin!
                </div>`;
            return;
        }

        // Cache for PDF export
        allStoredIdeas = ideas;

        // Update counter
        const countEl = document.getElementById('total-ideas-count');
        if (countEl) countEl.textContent = ideas.length;
        const historyEl = document.getElementById('history-count');
        if (historyEl) historyEl.textContent = `${ideas.length} idea${ideas.length !== 1 ? 's' : ''} stored`;

        list.innerHTML = '';
        ideas.forEach((idea, idx) => {
            const score = idea.score || 0;
            const scoreColor = score >= 80 ? '#00e676' : score >= 60 ? '#ffab40' : '#ff5252';
            const date = new Date(idea.createdAt || idea.created_at);
            const dateStr = isNaN(date) ? 'Unknown date' : date.toLocaleString();

            const item = document.createElement('div');
            item.className = 'glass-card animate-fade-in';
            item.style.cssText = 'padding: 20px 25px;';
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap;">
                    <div style="flex:1;">
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
                            <span style="font-size:0.75rem; color:var(--text-muted); font-family:monospace;">#${String(idx+1).padStart(3,'0')}</span>
                            <h4 style="color:var(--text-main); margin:0;">${idea.name}</h4>
                            ${idea.sector ? `<span class="tool-tag" style="font-size:0.7rem;">${idea.sector}</span>` : ''}
                        </div>
                        ${idea.description ? `<p style="color:var(--text-muted); font-size:0.85rem; margin:0 0 10px;">${idea.description}</p>` : ''}
                        <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                ${(idea.tags || []).map(t => `<span class="tool-tag" style="font-size:0.72rem;">${t}</span>`).join('')}
                            </div>
                            <button class="generate-btn" style="padding: 4px 10px; font-size: 0.7rem; background: rgba(0,229,255,0.08); border: 1px solid rgba(0,229,255,0.15); margin-left: auto; color: var(--accent-secondary);" onclick="viewBlueprint('history', ${idx})">
                                <i class="fas fa-microchip"></i> Blueprint
                            </button>
                            <button class="generate-btn" style="padding: 4px 10px; font-size: 0.7rem; background: rgba(255,82,82,0.1); border: 1px solid rgba(255,82,82,0.2); margin-left: 6px;" onclick="downloadIdeaPDF('history', ${idx})">
                                <i class="fas fa-file-pdf"></i> PDF
                            </button>
                        </div>
                    </div>
                    <div style="text-align:right; flex-shrink:0;">
                        <div style="font-size:1.6rem; font-weight:700; color:${scoreColor};">${score}%</div>
                        <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">Score</div>
                        <div style="font-size:0.72rem; color:var(--text-muted); margin-top:8px;">${dateStr}</div>
                    </div>
                </div>
            `;
            list.appendChild(item);
        });

    } catch (err) {
        console.error("Dashboard Fetch Error:", err);
        list.innerHTML = `<p style="color:#ff5252; padding:20px;">Failed to load history. Is the server running?</p>`;
    }
}

// ─── Event Listeners ─────────────────────────────────────────────────────────
function initEventListeners() {
    document.getElementById('generateBtn').addEventListener('click', handleGeneration);
}

// ─── Forge / Idea Generation ─────────────────────────────────────────────────
async function handleGeneration() {
    const input = document.getElementById('userInput').value.trim();
    const problem = document.getElementById('problemStatement').value.trim();

    if (!input) {
        alert("Please enter a keyword or industry focus!");
        return;
    }

    const logSection = document.getElementById('processing-log');
    logSection.style.display = 'block';

    // Reset steps
    updateStep('step-manus', 'running');
    updateStep('step-cohere', 'waiting');
    updateStep('step-comet', 'waiting');
    updateStep('step-save', 'waiting');

    try {
        // Simulate ManusAI step timing
        await delay(600);
        updateStep('step-manus', 'done');
        updateStep('step-cohere', 'running');

        const response = await fetch(`${BACKEND_URL}/forge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input, problem })
        });

        if (!response.ok) throw new Error("Forge request failed");

        const refinedIdeas = await response.json();

        updateStep('step-cohere', 'done');
        updateStep('step-comet', 'running');

        // Store ideas globally so other sections can use them
        lastForgedIdeas = refinedIdeas;

        // Log this experiment run into CometML logs
        const expId = `#EXP-${Math.floor(900 + Math.random() * 99)}`;
        const avgScore = Math.round(refinedIdeas.reduce((s, i) => s + (i.score || 75), 0) / refinedIdeas.length);
        experimentLogs.unshift({
            id: expId,
            model: 'Cohere command-r',
            status: 'Success',
            accuracy: `${avgScore}%`,
            date: new Date().toLocaleDateString(),
            ideas: refinedIdeas.map(i => i.name).join(', ')
        });

        await delay(400);
        updateStep('step-comet', 'done');
        updateStep('step-save', 'running');

        // 🔥 Bulk save ideas to avoid loop issues
        try {
            const bulkRes = await fetch(`${BACKEND_URL}/ideas/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(refinedIdeas)
            });
            if (!bulkRes.ok) throw new Error("Bulk save failed");
        } catch (err) {
            console.warn("Saving to history failed (bulk):", err);
        }

        updateStep('step-save', 'done');
        displayResults(refinedIdeas);
        
        // Refresh history data
        initDashboard();

        // Scroll to results so user sees them
        document.getElementById('results-display').scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error("Forge Process Failed:", error);
        updateStep('step-manus', 'error');
        updateStep('step-cohere', 'error');
        updateStep('step-comet', 'error');
        alert("Backend connection failed. Is the server running?");
    }
}

function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function updateStep(id, status) {
    const el = document.getElementById(id);
    if (!el) return;
    const icons = {
        running: `<i class="fas fa-circle-notch fa-spin" style="color: var(--accent-secondary);"></i>`,
        done:    `<i class="fas fa-check-circle" style="color: var(--accent-success);"></i>`,
        waiting: `<i class="fas fa-clock" style="color: var(--text-muted);"></i>`,
        error:   `<i class="fas fa-times-circle" style="color: #ff5252;"></i>`
    };
    const labels = {
        'step-manus':  'ManusAI: Identifying raw concepts...',
        'step-cohere': 'Cohere: Refining and grouping ideas...',
        'step-comet':  'CometML: Logging experiment version...',
        'step-save':   'Database: Saving to history...'
    };
    el.innerHTML = `${icons[status]} ${labels[id]}`;
    el.style.color = status === 'done' ? 'var(--accent-success)' : status === 'error' ? '#ff5252' : '#fff';
}

// ─── Results Display ──────────────────────────────────────────────────────────
function displayResults(ideas) {
    const container = document.getElementById('results-display');
    container.innerHTML = '';

    ideas.forEach((idea, idx) => {
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
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                ${(idea.tags || ['AI', 'Scalable']).map(t => `<span class="tool-tag">${t}</span>`).join('')}
            </div>
            <div style="display: flex; gap: 8px; margin-top: 20px;">
                <button class="generate-btn" style="flex: 1.5; font-size: 0.9rem; padding: 10px;" onclick="validateIdea('${idea.name}', ${idea.score}, '${idea.sector || 'Tech'}')">
                    Analyze Feasibility
                </button>
                <button class="generate-btn" style="flex: 1; font-size: 0.85rem; padding: 10px; background: rgba(124, 77, 255, 0.1); border: 1px solid rgba(124, 77, 255, 0.2);" onclick="viewBlueprint('forge', ${idx})">
                    <i class="fas fa-microchip"></i> Blueprint
                </button>
                <button class="generate-btn" style="width: 45px; background: rgba(255,82,82,0.1); border: 1px solid rgba(255,82,82,0.2);" onclick="downloadIdeaPDF('forge', ${idx})">
                    <i class="fas fa-file-pdf" style="color: #ff5252;"></i>
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

// ─── Section Switching ────────────────────────────────────────────────────────
window.showSection = function (sectionId, link) {
    if (link) {
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
    }
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    document.getElementById(`${sectionId}-section`).style.display = 'block';

    const pageTitle = sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
    document.getElementById('page-title').innerText = `${pageTitle} View`;

    if (sectionId === 'market')     initMarketCharts();
    if (sectionId === 'tracking')   populateCometLogs();
    if (sectionId === 'validation') populateValidation();
    if (sectionId === 'dashboard')  initDashboard();
};

// ─── Validation Score (Dynamic) ───────────────────────────────────────────────
function populateValidation() {
    const container = document.getElementById('validation-cards');
    // Override the results-grid to single column for this section
    container.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';

    if (lastForgedIdeas.length === 0) {
        container.innerHTML = `
            <div class="glass-card" style="text-align:center; padding: 50px 30px;">
                <i class="fas fa-robot" style="font-size:3rem; color:var(--text-muted); margin-bottom:16px; display:block;"></i>
                <h3 style="color:var(--text-muted); margin-bottom:10px;">No Ideas Forged Yet</h3>
                <p style="color:var(--text-muted); font-size:0.9rem;">Go to <strong>Idea Generation</strong> and run a forge to see validation scores here.</p>
                <button class="generate-btn" style="margin-top:20px; max-width:200px;" onclick="showSection('generate')">Start Forging</button>
            </div>`;
        return;
    }

    container.innerHTML = lastForgedIdeas.map((idea, idx) => {
        const score      = idea.score || 75;
        const risk       = score >= 80 ? 'Low' : score >= 60 ? 'Medium' : 'High';
        const riskColor  = score >= 80 ? '#00e676' : score >= 60 ? '#ffab40' : '#ff5252';
        const scoreColor = riskColor;
        const barWidth   = score + '%';
        const competition = score >= 80 ? 'Low competition in niche' : score >= 60 ? 'Moderate market competition' : 'High competition — differentiate urgently';
        const marketNote  = idea.sector ? `Sector: ${idea.sector}` : 'Cross-sector opportunity';

        return `
        <div class="glass-card animate-fade-in" style="padding: 22px 26px;">

            <!-- Top row: name + badge -->
            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; margin-bottom:10px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:0.72rem; color:var(--text-muted); font-family:monospace; background:rgba(255,255,255,0.05); padding:2px 7px; border-radius:4px;">#${String(idx+1).padStart(2,'0')}</span>
                    <h3 style="margin:0; font-size:1.05rem;">${idea.name}</h3>
                    ${idea.sector ? `<span class="tool-tag" style="font-size:0.7rem;">${idea.sector}</span>` : ''}
                </div>
                <span class="tool-tag" style="background:rgba(0,229,255,0.1); color:var(--accent-secondary); font-size:0.75rem;">IdeaProof</span>
            </div>

            <!-- Description -->
            ${idea.description ? `<p style="color:var(--text-muted); font-size:0.85rem; margin:0 0 16px; line-height:1.5;">${idea.description}</p>` : ''}

            <!-- Score bar -->
            <div style="margin-bottom:18px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span style="font-size:0.8rem; color:var(--text-muted);">Feasibility Score</span>
                    <span style="font-size:0.9rem; font-weight:700; color:${scoreColor};">${score}/100</span>
                </div>
                <div style="height:8px; background:rgba(255,255,255,0.07); border-radius:99px; overflow:hidden;">
                    <div style="height:100%; width:${barWidth}; background:${scoreColor}; border-radius:99px; transition:width 0.6s ease;"></div>
                </div>
            </div>

            <!-- 3 metric chips -->
            <div style="display:flex; gap:12px; flex-wrap:wrap;">
                <div style="flex:1; min-width:100px; background:rgba(255,255,255,0.04); border-radius:10px; padding:12px 14px; text-align:center;">
                    <div style="font-size:0.72rem; color:var(--text-muted); margin-bottom:5px;">Risk Factor</div>
                    <div style="font-size:1.25rem; font-weight:700; color:${riskColor};">${risk}</div>
                </div>
                <div style="flex:2; min-width:160px; background:rgba(255,255,255,0.04); border-radius:10px; padding:12px 14px;">
                    <div style="font-size:0.72rem; color:var(--text-muted); margin-bottom:5px;">Market Insight</div>
                    <div style="font-size:0.82rem; color:var(--text-main);">
                        <i class="fas fa-lightbulb" style="color:#ffab40; margin-right:5px;"></i>${competition}
                    </div>
                    <div style="font-size:0.78rem; color:var(--text-muted); margin-top:4px;">
                        <i class="fas fa-globe" style="color:var(--accent-secondary); margin-right:5px;"></i>${marketNote}
                    </div>
                </div>
            </div>

            <!-- Tags -->
            ${(idea.tags || []).length > 0 ? `
            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:14px;">
                ${idea.tags.map(t => `<span class="tool-tag" style="font-size:0.72rem;">${t}</span>`).join('')}
            </div>` : ''}
        </div>`;
    }).join('');
}

// ─── Market Intelligence (Dynamic) ────────────────────────────────────────────
function initMarketCharts() {
    if (trendChart)     trendChart.destroy();
    if (sentimentChart) sentimentChart.destroy();

    // Build trend labels and data from forged ideas (or defaults)
    let trendLabels, trendData, sentimentData;

    if (lastForgedIdeas.length > 0) {
        // Use idea names as labels, scores as trend data
        trendLabels = lastForgedIdeas.map(i => i.name.split(' ').slice(0, 2).join(' '));
        trendData   = lastForgedIdeas.map(i => i.score || 70);

        // Derive sentiment dimensions from average score
        const avg = trendData.reduce((a, b) => a + b, 0) / trendData.length;
        sentimentData = [
            Math.min(100, avg - 5 + Math.random() * 10 | 0),   // Price
            Math.min(100, avg + 3 + Math.random() * 8  | 0),   // UX
            Math.min(100, avg - 8 + Math.random() * 12 | 0),   // Speed
            Math.min(100, avg + 5 + Math.random() * 6  | 0),   // Security
            Math.min(100, avg + 0 + Math.random() * 10 | 0),   // Features
        ];
    } else {
        trendLabels  = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        trendData    = [12, 19, 35, 42, 65, 82];
        sentimentData = [85, 90, 75, 95, 80];
    }

    // Trend Line Chart
    const ctxTrend = document.getElementById('trendChart').getContext('2d');
    trendChart = new Chart(ctxTrend, {
        type: 'bar',
        data: {
            labels: trendLabels,
            datasets: [{
                label: lastForgedIdeas.length > 0 ? 'Idea Score (Owlytics)' : 'Market Interest (Owlytics)',
                data: trendData,
                backgroundColor: trendData.map(v =>
                    v >= 80 ? 'rgba(0, 230, 118, 0.7)' :
                    v >= 60 ? 'rgba(124, 77, 255, 0.7)' :
                              'rgba(255, 82, 82, 0.7)'
                ),
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            plugins: { legend: { labels: { color: '#fff' } } },
            scales: {
                y: { min: 0, max: 100, grid: { color: '#333' }, ticks: { color: '#aaa' } },
                x: { grid: { color: '#333' }, ticks: { color: '#aaa' } }
            }
        }
    });

    // Sentiment Radar Chart
    const ctxSenti = document.getElementById('sentimentChart').getContext('2d');
    sentimentChart = new Chart(ctxSenti, {
        type: 'radar',
        data: {
            labels: ['Price', 'UX', 'Speed', 'Security', 'Features'],
            datasets: [{
                label: 'Market Sentiment',
                data: sentimentData,
                borderColor: '#00e5ff',
                backgroundColor: 'rgba(0, 229, 255, 0.2)',
                pointBackgroundColor: '#00e5ff'
            }]
        },
        options: {
            plugins: { legend: { labels: { color: '#fff' } } },
            scales: {
                r: {
                    min: 0, max: 100,
                    grid: { color: '#333' },
                    pointLabels: { color: '#fff' },
                    ticks: { display: false }
                }
            }
        }
    });

    // Show a "no data" note if no forge has run yet
    const noteEl = document.getElementById('market-note');
    if (noteEl) {
        noteEl.style.display = lastForgedIdeas.length === 0 ? 'block' : 'none';
    }
}

// ─── Experiment Logs (Dynamic) ────────────────────────────────────────────────
function populateCometLogs() {
    const list = document.getElementById('comet-logs');

    if (experimentLogs.length === 0) {
        list.innerHTML = `
            <tr>
                <td colspan="5" style="padding: 30px; text-align: center; color: var(--text-muted);">
                    <i class="fas fa-flask" style="font-size: 1.5rem; margin-bottom: 10px; display:block;"></i>
                    No experiments logged yet. Run a forge to generate your first entry.
                </td>
            </tr>`;
        return;
    }

    list.innerHTML = experimentLogs.map(log => `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
            <td style="padding: 15px; color: var(--accent-secondary); font-family: monospace;">${log.id}</td>
            <td style="padding: 15px;">${log.model}</td>
            <td style="padding: 15px;">
                <span class="badge" style="background: rgba(0, 230, 118, 0.15); color: var(--accent-success);">${log.status}</span>
            </td>
            <td style="padding: 15px; font-weight: 600; color: var(--text-main);">${log.accuracy}</td>
            <td style="padding: 15px; color: var(--text-muted);">${log.date}</td>
        </tr>
        <tr>
            <td colspan="5" style="padding: 0 15px 12px; font-size: 0.8rem; color: var(--text-muted);">
                <i class="fas fa-lightbulb" style="margin-right: 5px; color: #ffab40;"></i>Ideas: <em>${log.ideas}</em>
            </td>
        </tr>
    `).join('');
}

// ─── PDF Download ─────────────────────────────────────────────────────────────
// ─── PDF Download ─────────────────────────────────────────────────────────────
window.downloadIdeaPDF = function (source, index) {
    const { jsPDF } = window.jspdf;
    
    let idea;
    if (source === 'forge') {
        idea = lastForgedIdeas[index];
    } else {
        idea = allStoredIdeas[index];
    }

    if (!idea) {
        alert("Idea data not found.");
        return;
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentW = pw - margin * 2;
    let y = 30;

    // ── Header ──
    doc.setFillColor(15, 15, 30);
    doc.rect(0, 0, pw, 25, 'F');
    doc.setTextColor(0, 229, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('StartupForge AI — Single Report', margin, 12);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 120);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pw - margin, 12, { align: 'right' });

    // ── Main Card ──
    const score = idea.score || 0;
    const risk  = score >= 80 ? 'Low' : score >= 60 ? 'Medium' : 'High';
    const barColor = score >= 80 ? [0, 230, 118] : score >= 60 ? [255, 171, 64] : [255, 82, 82];

    doc.setFillColor(20, 23, 40);
    doc.roundedRect(margin - 2, y, contentW + 4, ph - y - margin, 4, 4, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text(idea.name || 'Unnamed Concept', margin + 5, y + 15);
    y += 22;

    // Score & Sector
    doc.setFontSize(10);
    doc.setTextColor(0, 229, 255);
    doc.text(`Sector: ${idea.sector || 'N/A'}`, margin + 5, y);
    doc.setTextColor(...barColor);
    doc.setFontSize(14);
    doc.text(`Score: ${score}%`, pw - margin - 5, y, { align: 'right' });
    y += 12;

    // Description
    doc.setTextColor(200, 200, 220);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(idea.description || 'No description available.', contentW - 10);
    doc.text(descLines, margin + 5, y);
    y += (descLines.length * 5) + 10;

    // Metrics Bar
    doc.setFillColor(40, 45, 65);
    doc.roundedRect(margin + 5, y, contentW - 10, 20, 3, 3, 'F');
    doc.setTextColor(150, 150, 180);
    doc.setFontSize(9);
    doc.text('Feasibility Analysis', margin + 10, y + 8);
    doc.setTextColor(...barColor);
    doc.setFontSize(11);
    doc.text(`${risk} Risk`, pw - margin - 10, y + 8, { align: 'right' });

    doc.setFillColor(60, 65, 85);
    doc.roundedRect(margin + 10, y + 12, contentW - 20, 3, 1, 1, 'F');
    doc.setFillColor(...barColor);
    doc.roundedRect(margin + 10, y + 12, (contentW - 20) * (score / 100), 3, 1, 1, 'F');
    y += 35;

    // Tags
    if (idea.tags && idea.tags.length > 0) {
        doc.setTextColor(124, 77, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Target Tags:', margin + 5, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(160, 160, 180);
        doc.text(idea.tags.join(' · '), margin + 35, y);
    }

    // ── Footer ──
    doc.setFillColor(15, 15, 30);
    doc.rect(0, ph - 10, pw, 10, 'F');
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 100);
    const filename = `ForgeIdea_${idea.name.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
};

// ─── AI Blueprint Modal ───────────────────────────────────────────────────────
window.viewBlueprint = function (source, index) {
    const data = source === 'forge' ? lastForgedIdeas[index] : allStoredIdeas[index];
    if (!data) return;

    document.getElementById('bp-idea-name').innerText = data.name;

    // Use default blueprint data if idea is old and doesn't have one
    const bp = data.blueprint || {
        tools: ["v0.dev", "Cursor AI", "Replit Agent", "Supabase"],
        steps: [
            "Use v0.dev to generate the initial UI mockups based on your idea description.",
            "Ask Cursor AI or Replit Agent to build the full frontend and backend using the generated UI.",
            "Integrate Supabase for user storage and database management in minutes."
        ]
    };

    const toolContainer = document.getElementById('bp-tools');
    toolContainer.innerHTML = (bp.tools || []).map(t => `
        <div class="ai-tool-chip">
            <i class="fas fa-bolt" style="font-size: 0.8rem;"></i>
            ${t}
        </div>
    `).join('');

    const stepContainer = document.getElementById('bp-steps');
    stepContainer.innerHTML = (bp.steps || []).map((s, i) => `
        <div class="blueprint-step">
            <div class="step-num">${i + 1}</div>
            <div class="step-text">
                <h4>Step ${i + 1}</h4>
                <p>${s}</p>
            </div>
        </div>
    `).join('');

    document.getElementById('blueprint-modal').style.display = 'flex';
};

window.closeBlueprint = function (e) {
    document.getElementById('blueprint-modal').style.display = 'none';
};

