
// FAQ Data embedded for simplicity - Updated for 2024/2025
// FAQ Data now loaded from i18n


document.addEventListener('DOMContentLoaded', async function () {
    // Initialize UI
    setupTabs();
    await setupSettings();
    // Initialize language system (i18n)
    await initializeLanguage();
    setupLanguageSwitcher();
    setupHistory();
    setupFAQ();

    // Initialize currency system
    await initializeCurrency();
    setupCurrencySwitcher();

    // Load Data
    await loadStudies();
    await updateStats();
    await loadHistory(); // Load History Data

    // Clear badge
    chrome.action.setBadgeText({ text: '' });

    // Listen for changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync') {
            if (changes.currency) {
                updateStats();
                loadStudies();
                loadHistory();
            }
            if (changes.language) {
                // Reload data to apply new translations to dynamic content
                loadStudies();
                loadHistory();
                // Static content is handled by i18n.js
            }
        } else if (namespace === 'local') {
            if (changes.currentStudies) {
                loadStudies();
                updateStats();
            }
            if (changes.studyHistory) {
                loadHistory();
            }
        }
    });

    // Setup Simulation
    setupSimulation();
});

function setupTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and panes
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

            // Add active class to clicked tab
            tab.classList.add('active');

            // Show corresponding pane
            const tabId = tab.getAttribute('data-tab');
            const pane = document.getElementById(tabId || '');
            if (pane) pane.classList.add('active');
        });
    });
}

async function setupSettings() {
    // Load saved settings
    const settings = await chrome.storage.sync.get([
        'refreshRate', 'minPayRate', 'audio', 'volume',
        'showNotification', 'audioActive', 'focusProlific',
        'minPay', 'hideUnderOneDollar', 'useWhitelist', 'extensionDarkMode', 'randomRefresh'
    ]);

    // Helper to set input values
    const setVal = (id, val, defaultVal) => {
        const el = document.getElementById(id);
        if (el) {
            if (el.type === 'checkbox') el.checked = val !== undefined ? val : defaultVal;
            else el.value = val !== undefined ? val : defaultVal;
        }
    };

    setVal('refreshRate', settings.refreshRate, 60);
    setVal('randomRefresh', settings.randomRefresh, false); // Default false
    setVal('minPayRate', settings.minPayRate, 0);
    setVal('selectAudio', settings.audio, 'alert1.mp3');
    setVal('volume', settings.volume, 100);
    setVal('showNotification', settings.showNotification, true);
    setVal('audioActive', settings.audioActive, true);
    setVal('focusProlific', settings.focusProlific, false);
    setVal('darkMode', settings.darkMode, false);


    // Study Filters
    setVal('minPay', settings.minPay, 0);
    setVal('hideUnderOneDollar', settings.hideUnderOneDollar, false);
    setVal('useWhitelist', settings.useWhitelist, false);

    // Extension Dark Mode
    setVal('extensionDarkMode', settings.extensionDarkMode, false);
    if (settings.extensionDarkMode) {
        document.body.classList.add('extension-dark-mode');
    }

    // Add event listeners to save on change
    const inputs = ['refreshRate', 'minPayRate', 'volume', 'minPay'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', (e) => {
                chrome.storage.sync.set({ [id]: parseFloat(e.target.value) });
            });
        }
    });

    const checkboxes = ['showNotification', 'audioActive', 'focusProlific', 'randomRefresh', 'darkMode', 'hideUnderOneDollar', 'useWhitelist', 'extensionDarkMode'];
    checkboxes.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', (e) => {
                const target = e.target;
                chrome.storage.sync.set({ [id]: target.checked });

                // Toggle disable state of refresh rate input if random is checked
                if (id === 'randomRefresh') {
                    const refreshRateInput = document.getElementById('refreshRate');
                    if (refreshRateInput) refreshRateInput.disabled = target.checked;
                }



                // Toggle dark mode on Prolific website
                if (id === 'darkMode') {
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        if (tabs[0] && tabs[0].id) {
                            chrome.tabs.sendMessage(tabs[0].id, {
                                target: 'content',
                                type: 'toggle-dark-mode',
                                data: target.checked
                            });
                        }
                    });
                }

                // Toggle extension dark mode
                if (id === 'extensionDarkMode') {
                    if (target.checked) {
                        document.body.classList.add('extension-dark-mode');
                    } else {
                        document.body.classList.remove('extension-dark-mode');
                    }
                }
            });
        }
    });

    // Auto-Refresh Start/Stop Button
    const toggleButton = document.getElementById('toggleAutoRefresh');
    const refreshStatus = document.getElementById('refreshStatus');
    let isRefreshRunning = false;

    if (toggleButton && refreshStatus) {
        toggleButton.addEventListener('click', async () => {
            isRefreshRunning = !isRefreshRunning;

            // Update button and status
            if (isRefreshRunning) {
                toggleButton.textContent = currentTranslations['stopAutoRefresh']?.message || '⏸️ Stop Auto-Refresh';
                toggleButton.classList.remove('btn-primary');
                toggleButton.classList.add('btn-danger');
                refreshStatus.textContent = currentTranslations['autoRefreshRunning']?.message || 'Auto-refresh is running...';
                refreshStatus.style.color = '#1e8e3e';

                // Get refresh settings
                const refreshRateInput = document.getElementById('refreshRate');
                const randomRefreshInput = document.getElementById('randomRefresh');
                const refreshRate = refreshRateInput ? parseInt(refreshRateInput.value) || 60 : 60;
                const randomRefresh = randomRefreshInput ? randomRefreshInput.checked : false;

                // Send start message to background script
                chrome.runtime.sendMessage({
                    target: 'background',
                    type: 'start-auto-refresh',
                    data: { refreshRate, randomRefresh }
                });
            } else {
                toggleButton.textContent = currentTranslations['startAutoRefresh']?.message || '▶️ Start Auto-Refresh';
                toggleButton.classList.remove('btn-danger');
                toggleButton.classList.add('btn-primary');
                refreshStatus.textContent = currentTranslations['autoRefreshStopped']?.message || 'Auto-refresh is stopped';
                refreshStatus.style.color = '#5f6368';

                // Send stop message to background script
                chrome.runtime.sendMessage({
                    target: 'background',
                    type: 'stop-auto-refresh'
                });
            }

            // Save state
            await chrome.storage.sync.set({ autoRefreshRunning: isRefreshRunning });
        });

        // Load initial state
        chrome.storage.sync.get('autoRefreshRunning', (result) => {
            isRefreshRunning = result.autoRefreshRunning || false;
            if (isRefreshRunning) {
                toggleButton.textContent = currentTranslations['stopAutoRefresh']?.message || '⏸️ Stop Auto-Refresh';
                toggleButton.classList.remove('btn-primary');
                toggleButton.classList.add('btn-danger');
                refreshStatus.textContent = currentTranslations['autoRefreshRunning']?.message || 'Auto-refresh is running...';
                refreshStatus.style.color = '#1e8e3e';
            }
        });
    }

    // Initial state for refresh rate input
    // Disable refresh rate input if random is checked
    const refreshRateInput = document.getElementById('refreshRate');
    const randomRefreshInput = document.getElementById('randomRefresh');
    if (refreshRateInput) refreshRateInput.disabled = settings.randomRefresh;

    const selectAudio = document.getElementById('selectAudio');
    if (selectAudio) {
        selectAudio.addEventListener('change', (e) => {
            chrome.storage.sync.set({ audio: e.target.value });
        });
    }

    // Test Audio
    const playAudioBtn = document.getElementById('playAudio');
    if (playAudioBtn) {
        playAudioBtn.addEventListener('click', async () => {
            const audio = document.getElementById('selectAudio').value;
            const volume = parseFloat(document.getElementById('volume').value) / 100;

            // Send message to background to play sound (using offscreen)
            await chrome.runtime.sendMessage({
                type: 'play-sound',
                target: 'background',
                data: { audio, volume } // Pass data if supported by background handler
            });
        });
    }
}

function updateAutoRefreshStatus(isEnabled) {
    const statusEl = document.getElementById('autoRefreshStatus');
    if (statusEl) {
        statusEl.textContent = isEnabled ? (currentTranslations['autoRefreshActive']?.message || 'Auto-refresh is active.') : '';
    }
}

function setupFAQ() {
    const container = document.getElementById('faq-container');
    if (!container) return;
    container.innerHTML = ''; // Clear existing content
    // Dynamically load FAQ from translations
    let i = 1;
    while (currentTranslations[`faq_q${i}`]) {
        const questionText = currentTranslations[`faq_q${i}`].message;
        const answerText = currentTranslations[`faq_a${i}`].message;
        const div = document.createElement('div');
        div.className = 'faq-item';
        div.innerHTML = `
            <div class="faq-question">
                ${questionText}
                <span>▼</span>
            </div>
            <div class="faq-answer">${answerText}</div>
        `;
        const question = div.querySelector('.faq-question');
        if (question) {
            question.addEventListener('click', () => {
                div.classList.toggle('open');
                const arrow = div.querySelector('span');
                if (arrow)
                    arrow.textContent = div.classList.contains('open') ? '▲' : '▼';
            });
        }
        container.appendChild(div);
        i++;
    }
}

async function loadStudies() {
    const result = await chrome.storage.local.get("currentStudies");
    const studies = result.currentStudies || [];
    const container = document.getElementById('studies-container');
    const countEl = document.getElementById('studies-count');
    const searchInput = document.getElementById('search-studies');

    if (countEl) countEl.textContent = studies.length.toString();

    const render = async (list) => {
        if (!container) return;
        container.innerHTML = '';
        if (list.length === 0) {
            const settings = await chrome.storage.sync.get('autoRefreshEnabled');
            const statusText = settings.autoRefreshEnabled ? (currentTranslations['autoRefreshActive']?.message || 'Auto-refresh is active.') : (currentTranslations['autoRefreshDisabled']?.message || 'Auto-refresh is disabled.');
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <div data-i18n="noStudies">${currentTranslations['noStudies']?.message || 'No studies available right now.'}</div>
                    <div style="font-size: 12px; margin-top: 8px;" id="autoRefreshStatus">${statusText}</div>
                </div>`;
            return;
        }

        list.forEach(study => {
            const card = document.createElement('div');
            card.className = 'card study-card';

            // Header
            const header = document.createElement('div');
            header.className = 'study-header';

            const title = document.createElement('h3');
            title.className = 'study-title';
            title.textContent = study.title || currentTranslations['untitledStudy']?.message || 'Untitled Study';

            const researcher = document.createElement('span');
            researcher.className = 'study-researcher';
            researcher.textContent = study.researcher || currentTranslations['unknownResearcher']?.message || 'Unknown Researcher';

            header.appendChild(title);
            header.appendChild(researcher);

            // Details
            const details = document.createElement('div');
            details.className = 'study-details';

            const createDetail = (label, value) => {
                const item = document.createElement('div');
                item.className = 'detail-item';
                const labelSpan = document.createElement('span');
                labelSpan.className = 'detail-label';
                labelSpan.textContent = label;
                const valueSpan = document.createElement('span');
                valueSpan.className = 'detail-value';
                valueSpan.textContent = value;
                item.appendChild(labelSpan);
                item.appendChild(valueSpan);
                return item;
            };

            details.appendChild(createDetail(currentTranslations['pay']?.message || 'Pay:', study.reward || 'N/A'));
            details.appendChild(createDetail(currentTranslations['rate']?.message || 'Rate:', `${study.rewardPerHour || 'N/A'}/hr`));
            details.appendChild(createDetail(currentTranslations['time']?.message || 'Time:', study.time || 'N/A'));

            // Actions
            const actions = document.createElement('div');
            actions.className = 'study-actions';

            const link = document.createElement('a');
            link.href = `https://app.prolific.com/studies/${study.id}`;
            link.target = '_blank';
            link.className = 'btn btn-primary';
            link.textContent = currentTranslations['openStudy']?.message || 'Open Study';

            actions.appendChild(link);

            card.appendChild(header);
            card.appendChild(details);
            card.appendChild(actions);
            container.appendChild(card);
        });
    };

    // Initial render
    render(studies);

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = studies.filter(s =>
                (s.title && s.title.toLowerCase().includes(term)) ||
                (s.researcher && s.researcher.toLowerCase().includes(term))
            );
            render(filtered);
        });
    }
}

async function updateStats() {
    const result = await chrome.storage.local.get("currentStudies");
    const studies = result.currentStudies || [];
    const currency = await getUserCurrency();

    let totalGBP = 0;
    studies.forEach(s => {
        if (s.reward) {
            const val = parseFloat(s.reward.replace(/[^0-9.]/g, ''));
            if (!isNaN(val)) {
                // Prolific usually pays in GBP, but sometimes USD.
                // If it's USD ($), convert to approx GBP (0.8) for the base sum.
                // If it's GBP (£) or anything else (default), treat as GBP.
                if (s.reward.includes('$')) totalGBP += val * 0.8;
                else totalGBP += val;
            }
        }
    });

    const convertedTotal = convertFromGBP(totalGBP, currency);
    const formatted = formatCurrency(convertedTotal, currency);

    const totalEarnings = document.getElementById('total-earnings');
    const earningsSummary = document.getElementById('earnings-summary');
    if (totalEarnings) totalEarnings.textContent = formatted;
    if (earningsSummary) earningsSummary.textContent = formatted;
}

// --- History Logic ---

function setupHistory() {
    const clearBtn = document.getElementById('clear-history');
    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            if (confirm(currentTranslations['confirmClearHistory']?.message || 'Are you sure you want to clear your study history?')) {
                await chrome.storage.local.set({ studyHistory: { studies: [], lastUpdated: new Date().toISOString() } });
                await loadHistory();
            }
        });
    }
}

async function loadHistory() {
    const result = await chrome.storage.local.get("studyHistory");
    const history = result.studyHistory || { studies: [], lastUpdated: new Date().toISOString() };
    const studies = history.studies.reverse(); // Show newest first
    const container = document.getElementById('history-container');
    const countEl = document.getElementById('history-count');
    const searchInput = document.getElementById('search-history');

    if (countEl) countEl.textContent = studies.length.toString();

    const render = (list) => {
        if (!container) return;
        container.innerHTML = '';
        if (list.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📜</div>
                    <div data-i18n="noHistory">${currentTranslations['noHistory']?.message || 'No study history yet.'}</div>
                </div>`;
            return;
        }

        list.forEach(study => {
            const card = document.createElement('div');
            card.className = 'card study-card';
            if (study.completed) {
                card.classList.add('completed-study');
                card.style.opacity = '0.7';
            }

            const lastSeen = study.lastSeen ? new Date(study.lastSeen).toLocaleString() : 'Unknown';

            // Header
            const header = document.createElement('div');
            header.className = 'study-header';

            const title = document.createElement('h3');
            title.className = 'study-title';
            title.textContent = study.title || currentTranslations['untitledStudy']?.message || 'Untitled Study';

            if (study.completed) {
                const badge = document.createElement('span');
                badge.style.cssText = 'background:#e6fffa; color:#00796b; padding:2px 6px; border-radius:4px; font-size:10px; margin-left: 8px;';
                badge.textContent = currentTranslations['completed']?.message || 'Completed';
                title.appendChild(badge);
            }

            const researcher = document.createElement('span');
            researcher.className = 'study-researcher';
            researcher.textContent = study.researcher || currentTranslations['unknownResearcher']?.message || 'Unknown Researcher';

            header.appendChild(title);
            header.appendChild(researcher);

            // Details
            const details = document.createElement('div');
            details.className = 'study-details';

            const createDetail = (label, value, style) => {
                const item = document.createElement('div');
                item.className = 'detail-item';
                const labelSpan = document.createElement('span');
                labelSpan.className = 'detail-label';
                labelSpan.textContent = label;
                const valueSpan = document.createElement('span');
                valueSpan.className = 'detail-value';
                valueSpan.textContent = value;
                if (style) valueSpan.style.cssText = style;
                item.appendChild(labelSpan);
                item.appendChild(valueSpan);
                return item;
            };

            details.appendChild(createDetail(currentTranslations['pay']?.message || 'Pay:', study.reward || 'N/A'));
            details.appendChild(createDetail(currentTranslations['lastSeen']?.message || 'Last Seen:', lastSeen, 'font-size: 10px;'));

            // Actions
            const actions = document.createElement('div');
            actions.className = 'study-actions';
            actions.style.cssText = 'display: flex; gap: 8px;';

            const link = document.createElement('a');
            link.href = `https://app.prolific.com/studies/${study.id}`;
            link.target = '_blank';
            link.className = 'btn btn-primary';
            link.style.flex = '1';
            link.textContent = currentTranslations['open']?.message || 'Open';
            actions.appendChild(link);

            if (!study.completed) {
                const doneBtn = document.createElement('button');
                doneBtn.className = 'btn btn-secondary mark-complete-btn';
                doneBtn.setAttribute('data-id', study.id);
                doneBtn.style.cssText = 'flex: 1; padding: 4px;';
                doneBtn.textContent = currentTranslations['markCompleted']?.message || 'Done';
                actions.appendChild(doneBtn);
            }

            card.appendChild(header);
            card.appendChild(details);
            card.appendChild(actions);
            container.appendChild(card);
        });

        // Add event listeners for Mark Complete buttons
        document.querySelectorAll('.mark-complete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                if (id) {
                    await markStudyCompleted(id);
                    await loadHistory(); // Reload to update UI
                }
            });
        });
    };

    // Initial render
    render(studies);

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = studies.filter(s =>
                (s.title && s.title.toLowerCase().includes(term)) ||
                (s.researcher && s.researcher.toLowerCase().includes(term))
            );
            render(filtered);
        });
    }
}

async function markStudyCompleted(studyId) {
    const result = await chrome.storage.local.get("studyHistory");
    let history = result.studyHistory || { studies: [], lastUpdated: new Date().toISOString() };

    const index = history.studies.findIndex(s => s.id === studyId);
    if (index !== -1) {
        history.studies[index].completed = true;
        history.studies[index].completedDate = new Date().toISOString();
        history.studies[index].status = 'approved'; // Assume approved/completed for now
        await chrome.storage.local.set({ studyHistory: history });
    }
}

function setupSimulation() {
    const simulateBtn = document.getElementById('simulateStudies');
    if (simulateBtn) {
        simulateBtn.addEventListener('click', async () => {
            const studies = generateRandomStudies();
            await chrome.storage.local.set({ currentStudies: studies });

            // Switch to studies tab to see results
            const studiesTab = document.querySelector('[data-tab="studies"]');
            if (studiesTab) studiesTab.click();
        });
    }
}

function generateRandomStudies() {
    const count = Math.floor(Math.random() * 5) + 1; // 1 to 5 studies
    const studies = [];
    const researchers = ['University of Oxford', 'Stanford Lab', 'Behavioral Insights', 'Tech Research Corp', 'Cognitive Science Dept'];
    const titles = ['Decision Making Study', 'Short Survey on Habits', 'Visual Perception Task', 'Consumer Preferences', 'Language Processing'];

    for (let i = 0; i < count; i++) {
        const reward = (Math.random() * 5 + 0.5).toFixed(2);
        const time = Math.floor(Math.random() * 20) + 5;
        const hourly = (reward / (time / 60)).toFixed(2);

        studies.push({
            id: Math.random().toString(36).substring(7),
            title: titles[Math.floor(Math.random() * titles.length)],
            researcher: researchers[Math.floor(Math.random() * researchers.length)],
            reward: `£${reward}`,
            rewardPerHour: `£${hourly}/hr`,
            time: `${time} min`,
            timeInMinutes: time,
            createdAt: new Date().toISOString()
        });
    }
    return studies;
}
