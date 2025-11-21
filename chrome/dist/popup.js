
// FAQ Data embedded for simplicity - Updated for 2024/2025
const FAQ_DATA = [
    {
        "question": "What is Prolific?",
        "answer": "Prolific is a platform that connects researchers with participants for academic and industry studies. You earn money by sharing your insights and experiences in research studies."
    },
    {
        "question": "How do I get paid?",
        "answer": "Prolific pays via PayPal (through Hyperwallet). You can cash out once you reach £6 or $6. After your first 4 cashouts, payments are typically instant! Researchers have up to 22 days to approve studies, but it's usually much faster."
    },
    {
        "question": "How often can I withdraw money?",
        "answer": "You can withdraw once every 24 hours (resets at midnight UTC). NEW: If you recently updated your PayPal address or have fewer than 4 cashouts, there's a 72-hour cool-off period between withdrawals for security."
    },
    {
        "question": "What is the minimum hourly rate?",
        "answer": "Prolific enforces a minimum of $8/£6 per hour, but researchers are encouraged to pay at least $12/£9 per hour. Studies must meet these minimums to be posted on the platform."
    },
    {
        "question": "Why do I see no studies?",
        "answer": "Study availability depends on your demographics and researcher needs. Prolific uses 'adaptive rate limiting' to prioritize participants who haven't taken studies recently, ensuring fresh participant pools for researchers."
    },
    {
        "question": "What is adaptive rate limiting?",
        "answer": "When many participants are active but few studies are available, Prolific prioritizes those who've spent less time on studies recently. When studies fill slowly, limits are loosened. This ensures fair distribution and 'naivety' in research."
    },
    {
        "question": "What does 'Multiple submissions allowed' mean?",
        "answer": "You can take the study more than once if spots are available. This works like batch jobs - complete one submission, then you can reserve another spot if available."
    },
    {
        "question": "Why do I see studies with 1 spot that are full?",
        "answer": "These are often studies where a participant returned their submission or timed out. The spot becomes available briefly and is quickly taken by another user. This extension helps you catch these!"
    },
    {
        "question": "How do I avoid rejections?",
        "answer": "Take appropriate time to complete studies, answer all questions thoroughly, pay attention to instructions and attention checks, give thoughtful responses (especially for open-ended questions), and don't use AI assistance unless specifically requested."
    },
    {
        "question": "Is my data safe?",
        "answer": "Yes! Prolific uses identity verification, requires PayPal only for payment, and keeps your identity anonymous from researchers. They only see demographic info and your anonymous Prolific ID. Data is never shared with third-party advertisers."
    },
    {
        "question": "What if I have an issue with a study?",
        "answer": "Contact the researcher first through Prolific's messaging system. If not resolved within 7 days, submit a support request to the Prolific team. They'll investigate and help resolve the issue."
    }
];

document.addEventListener('DOMContentLoaded', async function () {
    // Initialize UI
    setupTabs();
    await setupSettings();
    setupFAQ();
    setupHistory(); // Initialize History

    // Initialize language system (i18n)
    await initializeLanguage();
    setupLanguageSwitcher();

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
        }
    });
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
        'showNotification', 'audioActive', 'focusProlific', 'autoRefreshEnabled',
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
    setVal('autoRefreshEnabled', settings.autoRefreshEnabled, false);

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

    const checkboxes = ['showNotification', 'audioActive', 'focusProlific', 'randomRefresh', 'darkMode', 'autoRefreshEnabled', 'hideUnderOneDollar', 'useWhitelist', 'extensionDarkMode'];
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

                // Toggle disable state of refresh inputs if auto-refresh is unchecked
                if (id === 'autoRefreshEnabled') {
                    const isEnabled = target.checked;
                    const refreshRateInput = document.getElementById('refreshRate');
                    const randomRefreshInput = document.getElementById('randomRefresh');
                    if (refreshRateInput) refreshRateInput.disabled = !isEnabled || settings.randomRefresh;
                    if (randomRefreshInput) randomRefreshInput.disabled = !isEnabled;
                    updateAutoRefreshStatus(isEnabled);
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
            const enableAutoRefresh = document.getElementById('autoRefreshEnabled').checked;

            if (!enableAutoRefresh) {
                alert('Please enable "Enable Auto-Refresh" checkbox first!');
                return;
            }

            isRefreshRunning = !isRefreshRunning;

            // Update button and status
            if (isRefreshRunning) {
                toggleButton.textContent = '⏸️ Stop Auto-Refresh';
                toggleButton.classList.remove('btn-primary');
                toggleButton.classList.add('btn-danger');
                refreshStatus.textContent = 'Auto-refresh is running...';
                refreshStatus.style.color = '#1e8e3e';
            } else {
                toggleButton.textContent = '▶️ Start Auto-Refresh';
                toggleButton.classList.remove('btn-danger');
                toggleButton.classList.add('btn-primary');
                refreshStatus.textContent = 'Auto-refresh is stopped';
                refreshStatus.style.color = '#5f6368';
            }

            // Save state
            await chrome.storage.sync.set({ autoRefreshRunning: isRefreshRunning });

            // Send message to content script to start/stop refresh
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0] && tabs[0].id) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        target: 'content',
                        type: 'toggle-auto-refresh',
                        data: isRefreshRunning
                    });
                }
            });
        });

        // Load initial state
        chrome.storage.sync.get('autoRefreshRunning', (result) => {
            isRefreshRunning = result.autoRefreshRunning || false;
            if (isRefreshRunning) {
                toggleButton.textContent = '⏸️ Stop Auto-Refresh';
                toggleButton.classList.remove('btn-primary');
                toggleButton.classList.add('btn-danger');
                refreshStatus.textContent = 'Auto-refresh is running...';
                refreshStatus.style.color = '#1e8e3e';
            }
        });
    }

    // Initial state for refresh rate input
    const autoRefreshEnabled = settings.autoRefreshEnabled !== undefined ? settings.autoRefreshEnabled : false;
    const refreshRateInput = document.getElementById('refreshRate');
    const randomRefreshInput = document.getElementById('randomRefresh');
    if (refreshRateInput) refreshRateInput.disabled = !autoRefreshEnabled || settings.randomRefresh;
    if (randomRefreshInput) randomRefreshInput.disabled = !autoRefreshEnabled;
    updateAutoRefreshStatus(autoRefreshEnabled);

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
        statusEl.textContent = isEnabled ? 'Auto-refresh is active.' : '';
    }
}

function setupFAQ() {
    const container = document.getElementById('faq-container');
    if (!container) return;

    FAQ_DATA.forEach(item => {
        const div = document.createElement('div');
        div.className = 'faq-item';
        div.innerHTML = `
            <div class="faq-question">
                ${item.question}
                <span>▼</span>
            </div>
            <div class="faq-answer">${item.answer}</div>
        `;

        const question = div.querySelector('.faq-question');
        if (question) {
            question.addEventListener('click', () => {
                div.classList.toggle('open');
                const arrow = div.querySelector('span');
                if (arrow) arrow.textContent = div.classList.contains('open') ? '▲' : '▼';
            });
        }

        container.appendChild(div);
    });
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
            const statusText = settings.autoRefreshEnabled ? 'Auto-refresh is active.' : 'Auto-refresh is disabled.';
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <div data-i18n="noStudies">No studies available right now.</div>
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
            title.textContent = study.title || 'Untitled Study';

            const researcher = document.createElement('span');
            researcher.className = 'study-researcher';
            researcher.textContent = study.researcher || 'Unknown Researcher';

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
            if (confirm('Are you sure you want to clear your study history?')) {
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
                    <div data-i18n="noHistory">No study history yet.</div>
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
            title.textContent = study.title || 'Untitled Study';

            if (study.completed) {
                const badge = document.createElement('span');
                badge.style.cssText = 'background:#e6fffa; color:#00796b; padding:2px 6px; border-radius:4px; font-size:10px; margin-left: 8px;';
                badge.textContent = 'Completed';
                title.appendChild(badge);
            }

            const researcher = document.createElement('span');
            researcher.className = 'study-researcher';
            researcher.textContent = study.researcher || 'Unknown Researcher';

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
