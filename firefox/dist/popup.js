
// FAQ Data embedded for simplicity - Updated for 2024/2025
const FAQ_DATA = [
    {
        "question": "What is Prolific?",
        "answer": "Prolific is a platform that connects researchers with participants for academic and industry studies. You earn money by sharing your insights and experiences in research studies."
    },
    {
        "question": "How do I get started?",
        "answer": "Sign up on Prolific, verify your email and ID (using Onfido), complete 'Your first study' (practice), and fill out your 'About You' demographics. You may be placed on a waitlist initially - this can range from days to months depending on researcher demand for your demographic."
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
    setupSettings();
    setupFAQ();

    // Load Data
    await loadStudies();
    updateStats();

    // Clear badge
    chrome.browserAction.setBadgeText({ text: '' });
});

function setupTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        // Remove active class from all tabs and panes
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

        // Add active class to clicked tab
        tab.classList.add('active');

        // Show corresponding pane
        const tabId = tab.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
    });
}

async function setupSettings() {
    // Load saved settings
    const settings = await chrome.storage.sync.get([
        'refreshRate', 'minPayRate', 'audio', 'volume',
        'showNotification', 'audioActive', 'focusProlific', 'autoRefreshEnabled',
        'minPay', 'hideUnderOneDollar', 'useWhitelist', 'extensionDarkMode'
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
        document.getElementById(id).addEventListener('change', (e) => {
            chrome.storage.sync.set({ [id]: parseFloat(e.target.value) });
        });
    });

    const checkboxes = ['showNotification', 'audioActive', 'focusProlific', 'randomRefresh', 'darkMode', 'autoRefreshEnabled', 'hideUnderOneDollar', 'useWhitelist', 'extensionDarkMode'];
    checkboxes.forEach(id => {
        document.getElementById(id).addEventListener('change', (e) => {
            chrome.storage.sync.set({ [id]: e.target.checked });

            // Toggle disable state of refresh rate input if random is checked
            if (id === 'randomRefresh') {
                document.getElementById('refreshRate').disabled = e.target.checked;
            }

            // Toggle disable state of refresh inputs if auto-refresh is unchecked
            if (id === 'autoRefreshEnabled') {
                const isEnabled = e.target.checked;
                document.getElementById('refreshRate').disabled = !isEnabled || settings.randomRefresh;
                document.getElementById('randomRefresh').disabled = !isEnabled;
                updateAutoRefreshStatus(isEnabled);
            }

            // Toggle dark mode on Prolific website
            if (id === 'darkMode') {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]) {
                        chrome.tabs.sendMessage(tabs[0].id, {
                            target: 'content',
                            type: 'toggle-dark-mode',
                            data: e.target.checked
                        });
                    }
                });
            }

            // Toggle extension dark mode
            if (id === 'extensionDarkMode') {
                if (e.target.checked) {
                    document.body.classList.add('extension-dark-mode');
                } else {
                    document.body.classList.remove('extension-dark-mode');
                }
            }
        });
    });

    // Initial state for refresh rate input
    const autoRefreshEnabled = settings.autoRefreshEnabled !== undefined ? settings.autoRefreshEnabled : false;
    document.getElementById('refreshRate').disabled = !autoRefreshEnabled || settings.randomRefresh;
    document.getElementById('randomRefresh').disabled = !autoRefreshEnabled;
    updateAutoRefreshStatus(autoRefreshEnabled);

    document.getElementById('selectAudio').addEventListener('change', (e) => {
        chrome.storage.sync.set({ audio: e.target.value });
    });

    // Test Audio
    document.getElementById('playAudio').addEventListener('click', async () => {
        const audio = document.getElementById('selectAudio').value;
        const volume = document.getElementById('volume').value / 100;

        // Send message to background to play sound (using offscreen)
        await chrome.runtime.sendMessage({
            type: 'play-sound',
            target: 'background',
            data: { audio, volume } // Pass data if supported by background handler
        });
    });
}

function updateAutoRefreshStatus(isEnabled) {
    const statusEl = document.getElementById('autoRefreshStatus');
    if (statusEl) {
        statusEl.textContent = isEnabled ? 'Auto-refresh is active.' : '';
    }
}

function setupFAQ() {
    const container = document.getElementById('faq-container');
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

        div.querySelector('.faq-question').addEventListener('click', () => {
            div.classList.toggle('open');
            const arrow = div.querySelector('span');
            arrow.textContent = div.classList.contains('open') ? '▲' : '▼';
        });

        container.appendChild(div);
    });
}

async function loadStudies() {
    const result = await chrome.storage.local.get("currentStudies");
    const studies = result.currentStudies || [];
    const container = document.getElementById('studies-container');
    const countEl = document.getElementById('studies-count');
    const searchInput = document.getElementById('search-studies');

    countEl.textContent = studies.length;

    const render = (list) => {
        container.innerHTML = '';
        if (list.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <div>No studies available right now.</div>
                    <div style="font-size: 12px; margin-top: 8px;" id="autoRefreshStatus"></div>
                </div>`;
            return;
        }

        list.forEach(study => {
            const card = document.createElement('div');
            card.className = 'card study-card';
            card.innerHTML = `
                <div class="study-header">
                    <h3 class="study-title">${study.title || 'Untitled Study'}</h3>
                    <span class="study-researcher">${study.researcher || 'Unknown Researcher'}</span>
                </div>
                <div class="study-details">
                    <div class="detail-item">
                        <span class="detail-label">Pay:</span>
                        <span class="detail-value">${study.reward || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Rate:</span>
                        <span class="detail-value">${study.rewardPerHour || 'N/A'}/hr</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Time:</span>
                        <span class="detail-value">${study.time || 'N/A'}</span>
                    </div>
                </div>
                <div class="study-actions">
                    <a href="https://app.prolific.com/studies/${study.id}" target="_blank" class="btn btn-primary">Open Study</a>
                </div>
            `;
            container.appendChild(card);
        });
    };

    // Initial render
    render(studies);

    // Search functionality
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = studies.filter(s =>
            (s.title && s.title.toLowerCase().includes(term)) ||
            (s.researcher && s.researcher.toLowerCase().includes(term))
        );
        render(filtered);
    });
}

async function updateStats() {
    const result = await chrome.storage.local.get("currentStudies");
    const studies = result.currentStudies || [];

    let total = 0;
    studies.forEach(s => {
        // Parse reward string like "£1.50" or "$2.00"
        if (s.reward) {
            const val = parseFloat(s.reward.replace(/[^0-9.]/g, ''));
            if (!isNaN(val)) {
                // Simple assumption: if it contains $, convert to £ roughly or just sum raw numbers
                // The original code had a helper for this, we'll simplify for now or try to match logic
                // Original: if $ multiply by 0.8.
                if (s.reward.includes('$')) total += val * 0.8;
                else total += val;
            }
        }
    });

    const formatted = `£${total.toFixed(2)}`;
    document.getElementById('total-earnings').textContent = formatted;
    document.getElementById('earnings-summary').textContent = formatted;
}
