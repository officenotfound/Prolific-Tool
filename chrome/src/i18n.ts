// Translation System - Accessible i18n Implementation

interface Translations {
    [key: string]: {
        message: string;
        description?: string;
    };
}

let currentTranslations: Translations = {};
let currentLanguage: string = 'en';

// Load translations from language file
async function loadTranslations(lang: string): Promise<Translations> {
    try {
        const response = await fetch(`../_locales/${lang}/messages.json`);
        const translations = await response.json();
        return translations;
    } catch (error) {
        console.error(`Failed to load translations for ${lang}:`, error);
        // Fallback to English
        if (lang !== 'en') {
            return await loadTranslations('en');
        }
        return {};
    }
}

// Apply translations to UI elements
function applyTranslations(translations: Translations): void {
    // Translate elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (key && translations[key] && translations[key].message) {
            element.textContent = translations[key].message;
        }
    });

    // Translate placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        if (key && translations[key] && translations[key].message) {
            (element as HTMLInputElement).placeholder = translations[key].message;
        }
    });

    // Translate ARIA labels
    document.querySelectorAll('[data-i18n-aria]').forEach(element => {
        const key = element.getAttribute('data-i18n-aria');
        if (key && translations[key] && translations[key].message) {
            element.setAttribute('aria-label', translations[key].message);
        }
    });
}

// Initialize language system
async function initializeLanguage(): Promise<void> {
    // Load saved language preference
    const result = await chrome.storage.sync.get('language');
    currentLanguage = result.language || 'en';

    // Load and apply translations
    currentTranslations = await loadTranslations(currentLanguage);
    applyTranslations(currentTranslations);

    // Update language button states
    updateLanguageButtons(currentLanguage);
}

// Update language button states
function updateLanguageButtons(lang: string): void {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        const btnLang = btn.getAttribute('data-lang');
        const isActive = btnLang === lang;

        btn.setAttribute('aria-checked', String(isActive));
        btn.setAttribute('tabindex', isActive ? '0' : '-1');

        if (isActive) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Switch language
async function switchLanguage(lang: string): Promise<void> {
    if (!lang) return;
    currentLanguage = lang;

    // Save preference
    await chrome.storage.sync.set({ language: lang });

    // Load and apply new translations
    currentTranslations = await loadTranslations(lang);
    applyTranslations(currentTranslations);

    // Update button states
    updateLanguageButtons(lang);

    // Announce to screen readers
    const langBtn = document.querySelector(`.lang-btn[data-lang="${lang}"] span:not(.flag)`);
    if (langBtn && langBtn.textContent) {
        announceToScreenReader(`Language changed to ${langBtn.textContent}`);
    }
}

// Announce to screen readers (accessibility)
function announceToScreenReader(message: string): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);

    // Remove after announcement
    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}

// Setup language switcher with keyboard navigation
function setupLanguageSwitcher(): void {
    const langButtons = document.querySelectorAll('.lang-btn') as NodeListOf<HTMLElement>;

    langButtons.forEach((btn, index) => {
        // Click/Enter/Space handler
        btn.addEventListener('click', () => {
            const lang = btn.getAttribute('data-lang');
            if (lang) switchLanguage(lang);
        });

        // Keyboard navigation
        btn.addEventListener('keydown', (e: KeyboardEvent) => {
            let targetIndex = index;

            switch (e.key) {
                case 'ArrowRight':
                case 'ArrowDown':
                    e.preventDefault();
                    targetIndex = (index + 1) % langButtons.length;
                    break;

                case 'ArrowLeft':
                case 'ArrowUp':
                    e.preventDefault();
                    targetIndex = (index - 1 + langButtons.length) % langButtons.length;
                    break;

                case 'Home':
                    e.preventDefault();
                    targetIndex = 0;
                    break;

                case 'End':
                    e.preventDefault();
                    targetIndex = langButtons.length - 1;
                    break;

                case 'Enter':
                case ' ':
                    e.preventDefault();
                    const lang = btn.getAttribute('data-lang');
                    if (lang) switchLanguage(lang);
                    return;

                default:
                    return;
            }

            // Focus the target button
            langButtons[targetIndex].focus();
        });
    });
}

// Add screen reader only class to CSS
const style = document.createElement('style');
style.textContent = `
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
    }
`;
document.head.appendChild(style);
