// Currency Conversion System with Real-Time Rates
// Uses exchangerate-api.com (free tier: 1,500 requests/month)

const SUPPORTED_CURRENCIES = ['USD', 'CAD', 'GBP', 'EUR', 'AUD', 'NZD'];

const CURRENCY_SYMBOLS: { [key: string]: string } = {
    'USD': '$',
    'CAD': 'CA$',
    'GBP': '£',
    'EUR': '€',
    'AUD': 'A$',
    'NZD': 'NZ$'
};

const CURRENCY_NAMES: { [key: string]: string } = {
    'USD': 'US Dollar',
    'CAD': 'Canadian Dollar',
    'GBP': 'British Pound',
    'EUR': 'Euro',
    'AUD': 'Australian Dollar',
    'NZD': 'New Zealand Dollar'
};

// Fallback rates if API fails (approximate as of 2024)
const FALLBACK_RATES: { [key: string]: number } = {
    'USD': 1.27,
    'CAD': 1.73,
    'GBP': 1.00,
    'EUR': 1.16,
    'AUD': 1.93,
    'NZD': 2.08
};

let currentCurrency = 'USD';
let exchangeRates = { ...FALLBACK_RATES };
let lastRateUpdate: string | null = null;

// Fetch real-time exchange rates from free API
async function fetchExchangeRates(): Promise<boolean> {
    try {
        // Using exchangerate-api.com (free tier, no API key needed for basic use)
        const response = await fetch('https://open.er-api.com/v6/latest/GBP');

        if (!response.ok) {
            throw new Error('Failed to fetch exchange rates');
        }

        const data = await response.json();

        if (data.result === 'success' && data.rates) {
            // Extract only the currencies we support
            const newRates: { [key: string]: number } = {};
            SUPPORTED_CURRENCIES.forEach(currency => {
                if (data.rates[currency]) {
                    newRates[currency] = data.rates[currency];
                }
            });

            // Update rates and timestamp
            exchangeRates = { ...FALLBACK_RATES, ...newRates };
            lastRateUpdate = new Date().toISOString();

            // Save to storage for offline use
            await chrome.storage.local.set({
                exchangeRates: exchangeRates,
                lastRateUpdate: lastRateUpdate
            });

            console.log('Exchange rates updated successfully');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Failed to fetch exchange rates, using fallback:', error);

        // Try to load cached rates from storage
        const cached = await chrome.storage.local.get(['exchangeRates', 'lastRateUpdate']);
        if (cached.exchangeRates) {
            exchangeRates = cached.exchangeRates;
            lastRateUpdate = cached.lastRateUpdate;
        }

        return false;
    }
}

// Check if rates need updating (update every 24 hours)
async function updateRatesIfNeeded(): Promise<void> {
    const result = await chrome.storage.local.get('lastRateUpdate');
    const lastUpdate = result.lastRateUpdate ? new Date(result.lastRateUpdate) : null;

    if (!lastUpdate || (Date.now() - lastUpdate.getTime()) > 24 * 60 * 60 * 1000) {
        await fetchExchangeRates();
    } else {
        // Load cached rates
        const cached = await chrome.storage.local.get('exchangeRates');
        if (cached.exchangeRates) {
            exchangeRates = cached.exchangeRates;
            lastRateUpdate = result.lastRateUpdate;
        }
    }
}

// Convert amount from GBP to target currency
function convertFromGBP(amountGBP: number, targetCurrency: string): number {
    const rate = exchangeRates[targetCurrency] || FALLBACK_RATES[targetCurrency] || 1;
    return amountGBP * rate;
}

// Format currency with appropriate symbol
function formatCurrency(amount: number, currency: string): string {
    const symbol = CURRENCY_SYMBOLS[currency] || '$';
    return `${symbol}${amount.toFixed(2)}`;
}

// Parse Prolific amount string (e.g., "£5.00" or "$5.00")
function parseProlificAmount(moneyString: string): number {
    if (!moneyString) return 0;
    const match = moneyString.match(/[£$€]?([\d.]+)/);
    if (match) {
        return parseFloat(match[1]);
    }
    return 0;
}

// Get user's selected currency
async function getUserCurrency(): Promise<string> {
    const result = await chrome.storage.sync.get('currency');
    return result.currency || 'USD';
}

// Set user's currency preference
async function setUserCurrency(currency: string): Promise<boolean> {
    if (SUPPORTED_CURRENCIES.includes(currency)) {
        currentCurrency = currency;
        await chrome.storage.sync.set({ currency: currency });
        return true;
    }
    return false;
}

// Initialize currency system
async function initializeCurrency(): Promise<void> {
    // Load user preference
    currentCurrency = await getUserCurrency();

    // Update rates if needed
    await updateRatesIfNeeded();

    // Update currency button states
    updateCurrencyButtons(currentCurrency);

    // Display last update time
    displayLastUpdateTime();
}

// Update currency button states
function updateCurrencyButtons(currency: string): void {
    document.querySelectorAll('.currency-btn').forEach(btn => {
        const btnCurrency = btn.getAttribute('data-currency');
        const isActive = btnCurrency === currency;

        btn.setAttribute('aria-checked', String(isActive));
        btn.setAttribute('tabindex', isActive ? '0' : '-1');

        if (isActive) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Display last rate update time
function displayLastUpdateTime(): void {
    const updateElement = document.getElementById('rate-update-time');
    if (updateElement && lastRateUpdate) {
        const updateDate = new Date(lastRateUpdate);
        const now = new Date();
        const diffHours = Math.floor((now.getTime() - updateDate.getTime()) / (1000 * 60 * 60));

        if (diffHours < 1) {
            updateElement.textContent = 'Updated: Just now';
        } else if (diffHours < 24) {
            updateElement.textContent = `Updated: ${diffHours}h ago`;
        } else {
            updateElement.textContent = `Updated: ${Math.floor(diffHours / 24)}d ago`;
        }
    }
}

// Switch currency
async function switchCurrency(currency: string | null): Promise<void> {
    if (!currency) return;
    await setUserCurrency(currency);
    updateCurrencyButtons(currency);

    // Refresh all displayed amounts
    // Note: refreshStudyAmounts is not defined in this module, but might be global
    // In TS we'd need to define it or pass it in. For now, we'll skip it or assume it's handled by popup.ts
    // if (typeof refreshStudyAmounts === 'function') {
    //     refreshStudyAmounts();
    // }

    // Announce to screen readers
    const currencyName = CURRENCY_NAMES[currency];
    announceToScreenReader(`Currency changed to ${currencyName}`);
}



// Setup currency switcher with keyboard navigation
function setupCurrencySwitcher(): void {
    const currencyButtons = document.querySelectorAll('.currency-btn') as NodeListOf<HTMLElement>;

    currencyButtons.forEach((btn, index) => {
        // Click/Enter/Space handler
        btn.addEventListener('click', () => {
            const currency = btn.getAttribute('data-currency');
            switchCurrency(currency);
        });

        // Keyboard navigation (same as language selector)
        btn.addEventListener('keydown', (e: KeyboardEvent) => {
            let targetIndex = index;

            switch (e.key) {
                case 'ArrowRight':
                case 'ArrowDown':
                    e.preventDefault();
                    targetIndex = (index + 1) % currencyButtons.length;
                    break;

                case 'ArrowLeft':
                case 'ArrowUp':
                    e.preventDefault();
                    targetIndex = (index - 1 + currencyButtons.length) % currencyButtons.length;
                    break;

                case 'Home':
                    e.preventDefault();
                    targetIndex = 0;
                    break;

                case 'End':
                    e.preventDefault();
                    targetIndex = currencyButtons.length - 1;
                    break;

                case 'Enter':
                case ' ':
                    e.preventDefault();
                    const currency = btn.getAttribute('data-currency');
                    switchCurrency(currency);
                    return;

                default:
                    return;
            }

            // Focus the target button
            currencyButtons[targetIndex].focus();
        });
    });

    // Manual refresh button
    const refreshBtn = document.getElementById('refresh-rates-btn') as HTMLButtonElement;
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.disabled = true;
            refreshBtn.textContent = 'Updating...';

            await fetchExchangeRates();
            displayLastUpdateTime();

            refreshBtn.disabled = false;
            refreshBtn.textContent = '🔄 Refresh Rates';

            announceToScreenReader('Exchange rates updated');
        });
    }
}
