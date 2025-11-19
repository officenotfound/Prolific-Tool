"use strict";
const targetSelector = 'div[data-testid="studies-list"]';
let globalObserver = null;
let globalInterval = null;
let isProcessing = false;
const NUMBER_OF_STUDIES_TO_STORE = 100;
const REWARD = "reward";
const REWARD_PER_HOUR = "rewardPerHour";
const TIME = 'time';
const NAME_BLACKLIST = "nameBlacklist";
const RESEARCHER_BLACKLIST = "researcherBlacklist";
function handleContentMessages(message) {
    if (message.target !== "content" && message.target !== 'everything') {
        return Promise.resolve();
    }
    switch (message.type) {
        case "change-alert-type":
            if (message.data === "website") {
                observeStudyChanges();
            }
            else {
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
function isObserverActive() {
    return globalObserver !== null;
}
function disconnectObserver() {
    var _a;
    (_a = globalObserver) === null || _a === void 0 ? void 0 : _a.disconnect();
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
function toggleDarkMode(enable) {
    if (enable) {
        document.body.classList.add("prolific-dark-mode");
    }
    else {
        document.body.classList.remove("prolific-dark-mode");
    }
}
async function observeStudyChanges() {
    if (isObserverActive())
        return;
    globalObserver = new MutationObserver(async (mutationsList) => {
        const targetNode = document.querySelector(targetSelector);
        if (!targetNode || isProcessing)
            return;
        const hasChanges = mutationsList.some(mutation => mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0 || mutation.type === 'childList');
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
function handleAutoRefreshToggle(enable) {
    if (enable) {
        chrome.storage.sync.get(["refreshRate"], (result) => {
            var _a;
            const refreshRate = (_a = result["refreshRate"]) !== null && _a !== void 0 ? _a : 60;
            startAutoRefresh(refreshRate);
        });
    }
    else {
        stopAutoRefresh();
    }
}
function startAutoRefresh(intervalSeconds) {
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
async function extractAndSendStudies(targetNode) {
    try {
        if (isProcessing)
            return;
        isProcessing = true;
        const studies = await extractStudies(targetNode);
        if (studies.length > 0) {
            void chrome.runtime.sendMessage({
                target: "background",
                type: "new-studies",
                data: studies,
            });
        }
    }
    finally {
        isProcessing = false;
    }
}
async function waitForElement(selector) {
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
async function extractStudies(targetNode) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
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
    const shouldIgnoreOldStudies = (_a = storageValues["trackIds"]) !== null && _a !== void 0 ? _a : true;
    if (!studyElements || studyElements.length === 0) {
        if (!shouldIgnoreOldStudies) {
            await chrome.storage.local.set({ ["currentStudies"]: [] });
        }
        return [];
    }
    let studies = [];
    const numberOfStudiesToStore = (_b = storageValues["studyHistoryLen"]) !== null && _b !== void 0 ? _b : NUMBER_OF_STUDIES_TO_STORE;
    let savedStudies = (_c = localValues["currentStudies"]) !== null && _c !== void 0 ? _c : [];
    const reward = (_d = storageValues[REWARD]) !== null && _d !== void 0 ? _d : 0;
    const rewardPerHour = (_e = storageValues[REWARD_PER_HOUR]) !== null && _e !== void 0 ? _e : 0;
    const time = (_f = storageValues[TIME]) !== null && _f !== void 0 ? _f : 0;
    const nameBlacklist = (_g = storageValues[NAME_BLACKLIST]) !== null && _g !== void 0 ? _g : [];
    const researcherBlacklist = (_h = storageValues[RESEARCHER_BLACKLIST]) !== null && _h !== void 0 ? _h : [];
    const minPay = storageValues["minPay"] ?? 0;
    const hideUnderOneDollar = storageValues["hideUnderOneDollar"] ?? false;
    const useWhitelist = storageValues["useWhitelist"] ?? false;
    const researcherWhitelist = storageValues["researcherWhitelist"] ?? [];
    const studyIds = savedStudies.map((study) => study.id);
    function shouldIncludeStudy(study) {
        var _a, _b;
        // Existing filters
        if (reward && study.reward && getFloatValueFromMoneyStringContent(study.reward) < reward)
            return false;
        if (time && study.timeInMinutes && study.timeInMinutes < time)
            return false;
        if (nameBlacklist.some((name) => { var _a; return (_a = study.title) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(name); }))
            return false;
        if (researcherBlacklist.some((researcher) => { var _a; return (_a = study.researcher) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(researcher); }))
            return false;
        if (rewardPerHour && study.rewardPerHour && getFloatValueFromMoneyStringContent(study.rewardPerHour) < rewardPerHour)
            return false;
        // NEW FILTERS
        if (minPay > 0 && study.reward) {
            const payAmount = getFloatValueFromMoneyStringContent(study.reward);
            if (payAmount < minPay)
                return false;
        }
        if (hideUnderOneDollar && study.reward) {
            const payAmount = getFloatValueFromMoneyStringContent(study.reward);
            if (payAmount < 1.0)
                return false;
        }
        if (useWhitelist && researcherWhitelist.length > 0) {
            const researcherName = (_b = (_a = study.researcher) === null || _a === void 0 ? void 0 : _a.toLowerCase()) !== null && _b !== void 0 ? _b : "";
            const isWhitelisted = researcherWhitelist.some((researcher) => researcherName.includes(researcher.toLowerCase()));
            if (!isWhitelisted)
                return false;
        }
        return true;
    }
    function shouldFilterStudies() {
        return reward > 0 || rewardPerHour > 0 || time > 0 || nameBlacklist.length > 0 || researcherBlacklist.length > 0 || minPay > 0 || hideUnderOneDollar || (useWhitelist && researcherWhitelist.length > 0);
    }
    studyElements.forEach((study) => {
        var _a, _b, _c;
        const id = (_a = study.getAttribute("data-testid")) === null || _a === void 0 ? void 0 : _a.split("-")[1];
        if (!id || (studyIds === null || studyIds === void 0 ? void 0 : studyIds.includes(id)))
            return;
        const title = getTextContent(study, '[data-testid="title"]');
        const researcher = ((_b = getTextContent(study, '[data-testid="host"]')) === null || _b === void 0 ? void 0 : _b.split(" ").slice(1).join(" ")) || null;
        const reward = getTextContent(study, '[data-testid="study-tag-reward"]');
        const rewardPerHour = ((_c = getTextContent(study, '[data-testid="study-tag-reward-per-hour"]')) === null || _c === void 0 ? void 0 : _c.replace("/hr", "")) || null;
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
    await logStudiesToHistory(studies);
    if (shouldIgnoreOldStudies) {
        savedStudies = [...savedStudies, ...studies];
    }
    else {
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
async function logStudiesToHistory(newStudies) {
    if (newStudies.length === 0)
        return;
    const historyData = await chrome.storage.local.get("studyHistory");
    let history = historyData["studyHistory"] || { studies: [], lastUpdated: new Date().toISOString() };
    const now = new Date().toISOString();
    newStudies.forEach(newStudy => {
        if (!newStudy.id)
            return;
        const existingIndex = history.studies.findIndex(s => s.id === newStudy.id);
        if (existingIndex >= 0) {
            history.studies[existingIndex].lastSeen = now;
            history.studies[existingIndex] = Object.assign(Object.assign({}, newStudy), { firstSeen: history.studies[existingIndex].firstSeen, lastSeen: now, clicked: history.studies[existingIndex].clicked, completed: history.studies[existingIndex].completed, completedDate: history.studies[existingIndex].completedDate, actualPay: history.studies[existingIndex].actualPay, status: history.studies[existingIndex].status });
        }
        else {
            history.studies.push(Object.assign(Object.assign({}, newStudy), { firstSeen: now, lastSeen: now, clicked: false, completed: false, completedDate: null, actualPay: null, status: 'pending' }));
        }
    });
    const maxHistorySize = 500;
    if (history.studies.length > maxHistorySize) {
        history.studies = history.studies.slice(-maxHistorySize);
    }
    history.lastUpdated = now;
    await chrome.storage.local.set({ "studyHistory": history });
}
function getTextContent(element, selector) {
    var _a;
    return ((_a = element === null || element === void 0 ? void 0 : element.querySelector(selector)) === null || _a === void 0 ? void 0 : _a.textContent) || null;
}
function parseTimeContent(value) {
    if (!value)
        return 0;
    const hourMatch = value.match(/(\d+)\s*hour/);
    const minMatch = value.match(/(\d+)\s*min/);
    const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
    const minutes = minMatch ? parseInt(minMatch[1], 10) : 0;
    return hours * 60 + minutes;
}
function getFloatValueFromMoneyStringContent(value) {
    const firstWord = value.split(" ")[0];
    if (firstWord.charAt(0) === '£') {
        return parseFloat(firstWord.slice(1)) * 1.27;
    }
    else if (firstWord.charAt(0) === '$') {
        return parseFloat(firstWord.slice(1));
    }
    else {
        return 0;
    }
}
function formatAsUSD(amount) {
    return `$${amount.toFixed(2)}`;
}
function convertToUSD(moneyString) {
    if (!moneyString)
        return "$0.00";
    const amount = getFloatValueFromMoneyStringContent(moneyString);
    return formatAsUSD(amount);
}
