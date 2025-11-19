type StudyContent = {
    id: string | null;
    title: string | null;
    researcher: string | null;
    reward: string | null;
    rewardPerHour: string | null;
    time: string | null;
    timeInMinutes: number | null;
    createdAt: string | null;
    // History tracking fields
    firstSeen?: string;
    lastSeen?: string;
    clicked?: boolean;
    completed?: boolean;
    completedDate?: string | null;
    actualPay?: number | null;
    status?: 'pending' | 'approved' | 'rejected';
};

type StudyHistory = {
    studies: StudyContent[];
    lastUpdated: string;
};

const targetSelector = 'div[data-testid="studies-list"]';
let globalObserver: MutationObserver | null = null;
let globalInterval: number | null = null;
let isProcessing: boolean = false;

const NUMBER_OF_STUDIES_TO_STORE = 100;
const REWARD = "reward";
const REWARD_PER_HOUR = "rewardPerHour";
const TIME = 'time';
const NAME_BLACKLIST = "nameBlacklist";
const RESEARCHER_BLACKLIST = "researcherBlacklist";

function handleContentMessages(message: { target: string; type: any; data?: any; }): Promise<void> {
    if (message.target !== "content" && message.target !== 'everything') {
        return Promise.resolve();
    }
    switch (message.type) {
        case "change-alert-type":
            if (message.data === "website") {
                observeStudyChanges();
            } else {
                disconnectObserver();
            }
            return Promise.resolve();
        case "toggle-dark-mode":
            toggleDarkMode(message.data);
            return Promise.resolve();
        case "toggle-auto-refresh":
            handleAutoRefreshToggle(message.data);
            return Promise.resolve();
        default:
            return Promise.resolve();
    }
}

function isObserverActive(): boolean {
    return globalObserver !== null;
}

function disconnectObserver() {
    globalObserver?.disconnect();
    globalObserver = null;

    if (globalInterval !== null) {
        clearInterval(globalInterval);
        globalInterval = null;
    }
}

chrome.runtime.onMessage.addListener(handleContentMessages);
void observeStudyChanges();
void initDarkMode();

async function initDarkMode() {
    const result = await chrome.storage.sync.get("darkMode");
    if (result["darkMode"]) {
        document.body.classList.add("prolific-dark-mode");
    }
}

function toggleDarkMode(enable: boolean) {
    if (enable) {
        document.body.classList.add("prolific-dark-mode");
    } else {
        document.body.classList.remove("prolific-dark-mode");
    }
}

async function observeStudyChanges(): Promise<void> {
    if (isObserverActive()) return;

    globalObserver = new MutationObserver(async (mutationsList) => {
        const targetNode = document.querySelector(targetSelector);
        if (!targetNode || isProcessing) return;

        const hasChanges = mutationsList.some(mutation =>
            mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0 || mutation.type === 'childList'
        );

        if (hasChanges) {
            await extractAndSendStudies(targetNode);
        }
    });

    globalObserver.observe(document.body, { childList: true, subtree: true });

    // Setup polling fallback
    const result = await chrome.storage.sync.get(["refreshRate", "autoRefreshEnabled"]);
    const autoRefreshEnabled = result["autoRefreshEnabled"] !== undefined ? result["autoRefreshEnabled"] : false;
    const refreshRate = result["refreshRate"];

    if (autoRefreshEnabled && refreshRate && refreshRate > 0) {
        startAutoRefresh(refreshRate);
    }
}

function handleAutoRefreshToggle(enable: boolean) {
    if (enable) {
        chrome.storage.sync.get(["refreshRate"], (result) => {
            const refreshRate = result["refreshRate"] ?? 60;
            startAutoRefresh(refreshRate);
        });
    } else {
        stopAutoRefresh();
    }
}

function startAutoRefresh(intervalSeconds: number) {
    stopAutoRefresh(); // Clear existing first
    const timer = intervalSeconds * 1000;
    globalInterval = setInterval(async () => {
        const node = await waitForElement(targetSelector);
        if (node && !isProcessing) {
            await extractAndSendStudies(node);
        }
    }, timer);
}

function stopAutoRefresh() {
    if (globalInterval !== null) {
        clearInterval(globalInterval);
        globalInterval = null;
    }
}

async function extractAndSendStudies(targetNode: Element): Promise<void> {
    try {
        if (isProcessing) return;
        isProcessing = true;
        const studies = await extractStudies(targetNode);
        if (studies.length > 0) {
            void chrome.runtime.sendMessage({
                target: "background",
                type: "new-studies",
                data: studies,
            });
        }
    } finally {
        isProcessing = false;
    }
}

async function waitForElement(selector: string): Promise<Element | null> {
    return new Promise((resolve) => {
        const observer = new MutationObserver(() => {
            const target = document.querySelector(selector);
            if (target) {
                observer.disconnect();
                resolve(target);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        const target = document.querySelector(selector);
        if (target) {
            observer.disconnect();
            resolve(target);
        }
    });
}

async function extractStudies(targetNode: Element): Promise<StudyContent[]> {
    const studyElements = targetNode.querySelectorAll("li[class='list-item']");
    const storageValues = await chrome.storage.sync.get([
        "trackIds",
        "studyHistoryLen",
        REWARD,
        REWARD_PER_HOUR,
        TIME,
        NAME_BLACKLIST,
        RESEARCHER_BLACKLIST,
        "minPay",
        "hideUnderOneDollar",
        "useWhitelist",
        "researcherWhitelist",
    ]);
    const localValues = await chrome.storage.local.get([
        "currentStudies",
    ]);

    const shouldIgnoreOldStudies: boolean = storageValues["trackIds"] ?? true;
    if (!studyElements || studyElements.length === 0) {
        if (!shouldIgnoreOldStudies) {
            await chrome.storage.local.set({ ["currentStudies"]: [] });
        }
        return [];
    }

    let studies: StudyContent[] = [];
    const numberOfStudiesToStore = storageValues["studyHistoryLen"] ?? NUMBER_OF_STUDIES_TO_STORE;
    let savedStudies: StudyContent[] = localValues["currentStudies"] ?? [];
    const reward: number = storageValues[REWARD] ?? 0;
    const rewardPerHour: number = storageValues[REWARD_PER_HOUR] ?? 0;
    const time: number = storageValues[TIME] ?? 0;
    const nameBlacklist: string[] = storageValues[NAME_BLACKLIST] ?? [];
    const researcherBlacklist: string[] = storageValues[RESEARCHER_BLACKLIST] ?? [];
    const minPay: number = storageValues["minPay"] ?? 0;
    const hideUnderOneDollar: boolean = storageValues["hideUnderOneDollar"] ?? false;
    const useWhitelist: boolean = storageValues["useWhitelist"] ?? false;
    const researcherWhitelist: string[] = storageValues["researcherWhitelist"] ?? [];
    const studyIds = savedStudies.map((study) => study.id);

    function shouldIncludeStudy(study: StudyContent) {
        // Existing filters
        if (reward && study.reward && getFloatValueFromMoneyStringContent(study.reward) < reward) return false;
        if (time && study.timeInMinutes && study.timeInMinutes < time) return false;
        if (nameBlacklist.some((name) => study.title?.toLowerCase().includes(name))) return false;
        if (researcherBlacklist.some((researcher) => study.researcher?.toLowerCase().includes(researcher))) return false;
        if (rewardPerHour && study.rewardPerHour && getFloatValueFromMoneyStringContent(study.rewardPerHour) < rewardPerHour) return false;

        // NEW FILTERS - TOS Compliant (passive filtering only)
        // Minimum pay filter
        if (minPay > 0 && study.reward) {
            const payAmount = getFloatValueFromMoneyStringContent(study.reward);
            if (payAmount < minPay) return false;
        }

        // Quick filter: Hide studies under £1
        if (hideUnderOneDollar && study.reward) {
            const payAmount = getFloatValueFromMoneyStringContent(study.reward);
            if (payAmount < 1.0) return false;
        }

        // Researcher whitelist (when enabled, ONLY show whitelisted researchers)
        if (useWhitelist && researcherWhitelist.length > 0) {
            const researcherName = study.researcher?.toLowerCase() ?? "";
            const isWhitelisted = researcherWhitelist.some((researcher) =>
                researcherName.includes(researcher.toLowerCase())
            );
            if (!isWhitelisted) return false;
        }

        return true;
    }

    function shouldFilterStudies() {
        return reward > 0 || rewardPerHour > 0 || time > 0 || nameBlacklist.length > 0 || researcherBlacklist.length > 0 || minPay > 0 || hideUnderOneDollar || (useWhitelist && researcherWhitelist.length > 0);
    }

    studyElements.forEach((study) => {
        const id = study.getAttribute("data-testid")?.split("-")[1];
        if (!id || studyIds?.includes(id)) return;
        const title = getTextContent(study, '[data-testid="title"]');
        const researcher = getTextContent(study, '[data-testid="host"]')?.split(" ").slice(1).join(" ") || null;
        const reward = getTextContent(study, '[data-testid="study-tag-reward"]');
        const rewardPerHour = getTextContent(study, '[data-testid="study-tag-reward-per-hour"]')?.replace("/hr", "") || null;
        const time = getTextContent(study, '[data-testid="study-tag-completion-time"]');
        const timeInMinutes = parseTimeContent(time);
        studies.push({
            id,
            title,
            researcher,
            reward,
            rewardPerHour,
            time,
            timeInMinutes,
            createdAt: new Date().toISOString(),
        });
    });

    if (shouldFilterStudies()) {
        studies = studies.filter((study) => shouldIncludeStudy(study));
    }

    // PHASE 2: Log studies to history
    await logStudiesToHistory(studies);

    if (shouldIgnoreOldStudies) {
        savedStudies = [...savedStudies, ...studies];
    } else {
        savedStudies = studies;
    }
    if (savedStudies.length > numberOfStudiesToStore) {
        savedStudies = savedStudies.slice(-numberOfStudiesToStore);
    }
    if (studies.length > 0) {
        await chrome.storage.local.set({ "currentStudies": savedStudies });
    }

    return studies;
}

// PHASE 2: Study History Logging
async function logStudiesToHistory(newStudies: StudyContent[]): Promise<void> {
    if (newStudies.length === 0) return;

    const historyData = await chrome.storage.local.get("studyHistory");
    let history: StudyHistory = historyData["studyHistory"] || { studies: [], lastUpdated: new Date().toISOString() };

    const now = new Date().toISOString();

    newStudies.forEach(newStudy => {
        if (!newStudy.id) return;

        // Check if study already exists in history
        const existingIndex = history.studies.findIndex(s => s.id === newStudy.id);

        if (existingIndex >= 0) {
            // Update existing study
            history.studies[existingIndex].lastSeen = now;
            // Preserve history fields
            history.studies[existingIndex] = {
                ...newStudy,
                firstSeen: history.studies[existingIndex].firstSeen,
                lastSeen: now,
                clicked: history.studies[existingIndex].clicked,
                completed: history.studies[existingIndex].completed,
                completedDate: history.studies[existingIndex].completedDate,
                actualPay: history.studies[existingIndex].actualPay,
                status: history.studies[existingIndex].status
            };
        } else {
            // Add new study to history
            history.studies.push({
                ...newStudy,
                firstSeen: now,
                lastSeen: now,
                clicked: false,
                completed: false,
                completedDate: null,
                actualPay: null,
                status: 'pending'
            });
        }
    });

    // Keep only last 500 studies (configurable)
    const maxHistorySize = 500;
    if (history.studies.length > maxHistorySize) {
        history.studies = history.studies.slice(-maxHistorySize);
    }

    history.lastUpdated = now;
    await chrome.storage.local.set({ "studyHistory": history });
}

function getTextContent(element: Element | null, selector: string): string | null {
    return element?.querySelector(selector)?.textContent || null;
}

function parseTimeContent(value: string | null): number {
    if (!value) return 0;
    const hourMatch = value.match(/(\d+)\s*hour/);
    const minMatch = value.match(/(\d+)\s*min/);

    const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
    const minutes = minMatch ? parseInt(minMatch[1], 10) : 0;

    return hours * 60 + minutes;
}

function getFloatValueFromMoneyStringContent(value: string): number {
    const firstWord = value.split(" ")[0];
    if (firstWord.charAt(0) === '£') {
        // Convert GBP to USD (1 GBP ≈ 1.27 USD as of 2024)
        return parseFloat(firstWord.slice(1)) * 1.27;
    } else if (firstWord.charAt(0) === '$') {
        // Already in USD
        return parseFloat(firstWord.slice(1));
    } else {
        return 0;
    }
}

// Helper function to format amount as USD
function formatAsUSD(amount: number): string {
    return `$${amount.toFixed(2)}`;
}

// Helper function to convert GBP string to USD string
function convertToUSD(moneyString: string | null): string {
    if (!moneyString) return "$0.00";
    const amount = getFloatValueFromMoneyStringContent(moneyString);
    return formatAsUSD(amount);
}
