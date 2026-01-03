/**
 * Internationalization (i18n) Module
 * Handles language loading, translation, and persistence
 */

// Supported languages
const SUPPORTED_LANGUAGES = [
    'en', 'es', 'zh', 'hi', 'ar', 'pt', 'bn', 'ru', 
    'ja', 'de', 'fr', 'ko', 'it', 'tr', 'pl', 'cs', 'sk'
];

// Language display names (in their native form)
const LANGUAGE_NAMES = {
    en: 'English',
    es: 'Español',
    zh: '中文',
    hi: 'हिन्दी',
    ar: 'العربية',
    pt: 'Português',
    bn: 'বাংলা',
    ru: 'Русский',
    ja: '日本語',
    de: 'Deutsch',
    fr: 'Français',
    ko: '한국어',
    it: 'Italiano',
    tr: 'Türkçe',
    pl: 'Polski',
    cs: 'Čeština',
    sk: 'Slovenčina'
};

// Current translations storage
let currentTranslations = {};
let currentLanguage = 'en';

/**
 * Get cookie value by name
 */
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

/**
 * Set cookie with 1 year expiration
 */
function setCookie(name, value) {
    const date = new Date();
    date.setTime(date.getTime() + (365 * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/;SameSite=Lax`;
}

/**
 * Detect preferred language from browser settings
 * Returns language code if supported, otherwise 'en'
 */
function getPreferredLanguage() {
    // First check cookie
    const savedLang = getCookie('lang');
    if (savedLang && SUPPORTED_LANGUAGES.includes(savedLang)) {
        return savedLang;
    }
    
    // Then check browser language
    const browserLang = navigator.language || navigator.userLanguage;
    if (browserLang) {
        // Try exact match first (e.g., 'cs')
        const shortLang = browserLang.split('-')[0].toLowerCase();
        if (SUPPORTED_LANGUAGES.includes(shortLang)) {
            return shortLang;
        }
    }
    
    // Fallback to English
    return 'en';
}

/**
 * Load translations for a specific language
 */
async function loadLanguage(lang) {
    if (!SUPPORTED_LANGUAGES.includes(lang)) {
        console.warn(`Language '${lang}' not supported, falling back to English`);
        lang = 'en';
    }
    
    try {
        const response = await fetch(`locales/${lang}.js`);
        if (!response.ok) {
            throw new Error(`Failed to load language file: ${response.status}`);
        }
        const text = await response.text();
        
        // Parse the JS module (extract the object from "export default {...}")
        const match = text.match(/export\s+default\s+({[\s\S]*});?\s*$/);
        if (match) {
            // Use Function constructor to safely evaluate the object literal
            currentTranslations = new Function(`return ${match[1]}`)();
        } else {
            throw new Error('Invalid translation file format');
        }
        
        currentLanguage = lang;
        setCookie('lang', lang);
        
        return true;
    } catch (error) {
        console.error(`Error loading language '${lang}':`, error);
        
        // If not English, try falling back to English
        if (lang !== 'en') {
            return loadLanguage('en');
        }
        
        return false;
    }
}

/**
 * Translate a key with optional interpolation
 * Usage: t('key') or t('validation.minLength', 5, 3)
 * Placeholders: {0}, {1}, {2}, etc.
 */
function t(key, ...args) {
    let text = currentTranslations[key];
    
    if (text === undefined) {
        console.warn(`Translation missing for key: ${key}`);
        return key; // Return key as fallback
    }
    
    // Replace placeholders {0}, {1}, etc. with arguments
    if (args.length > 0) {
        args.forEach((arg, index) => {
            text = text.replace(new RegExp(`\\{${index}\\}`, 'g'), arg);
        });
    }
    
    return text;
}

/**
 * Get current language code
 */
function getCurrentLanguage() {
    return currentLanguage;
}

/**
 * Change language and re-translate page
 */
async function setLanguage(lang) {
    if (lang === currentLanguage) return;
    
    const success = await loadLanguage(lang);
    if (success) {
        translatePage();
        // Dispatch event for app.js to re-render dynamic content
        document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    }
}

/**
 * Translate all elements with data-i18n attribute
 */
function translatePage() {
    // Translate text content
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });
    
    // Translate placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key);
    });
    
    // Translate titles (tooltips)
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        el.title = t(key);
    });
    
    // Translate aria-labels
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
        const key = el.getAttribute('data-i18n-aria');
        el.setAttribute('aria-label', t(key));
    });
    
    // Update language picker display
    updateLanguagePicker();
}

/**
 * Update language picker dropdown to show current language
 */
function updateLanguagePicker() {
    const pickerBtn = document.getElementById('languagePickerBtn');
    if (pickerBtn) {
        pickerBtn.textContent = currentLanguage.toUpperCase();
    }
    
    // Update active state in dropdown
    document.querySelectorAll('.language-option').forEach(el => {
        const lang = el.getAttribute('data-lang');
        el.classList.toggle('active', lang === currentLanguage);
    });
}

/**
 * Initialize i18n system
 * Call this on page load
 */
async function initI18n() {
    const preferredLang = getPreferredLanguage();
    await loadLanguage(preferredLang);
    translatePage();
    
    // Set up language picker event listeners
    document.querySelectorAll('.language-option').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const lang = el.getAttribute('data-lang');
            setLanguage(lang);
        });
    });
}

// Export for use in other modules
window.i18n = {
    t,
    getCurrentLanguage,
    setLanguage,
    initI18n,
    translatePage,
    SUPPORTED_LANGUAGES,
    LANGUAGE_NAMES
};
