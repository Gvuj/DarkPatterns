// --- CONFIGURATION ---
const URL_LIST_SOURCE = "https://raw.githubusercontent.com/Gvuj/teste25/refs/heads/main/webs.txt";
const STORAGE_KEY = 'restrictedWebsitesData';
const CURRENT_WARNING_MESSAGE_KEY = 'currentWarningMessage'; // KEY for communication with content.js
const REFRESH_PERIOD_MINUTES = 1; // Set to 1 minute for rapid testing.

/**
 * Fetches the list of websites and messages from the remote source and saves it as a map.
 */
async function fetchAndSaveWebsites() {
    console.log('--- FETCH START ---');
    try {
        const response = await fetch(URL_LIST_SOURCE);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const text = await response.text();
        const websiteMap = {};

        // 1. Split text into lines, filter comments, and filter empty lines
        const lines = text.split('\n')
                          .map(line => line.trim())
                          .filter(line => line.length > 0 && !line.startsWith('#'));

        // 2. Parse each line into a key (pattern) and a value (message)
        lines.forEach(line => {
            // Split only on the first colon to keep the rest of the message intact
            const parts = line.split(/:(.*)/s).map(s => s.trim()); 
            if (parts.length >= 2 && parts[0] && parts[1]) {
                const pattern = parts[0];
                const message = parts[1];
                websiteMap[pattern] = message;
            }
        });

        await chrome.storage.local.set({ [STORAGE_KEY]: websiteMap });
        console.log(`SUCCESS: Loaded and saved ${Object.keys(websiteMap).length} websites and messages.`);
    } catch (error) {
        console.error('FAILED: Failed to fetch website list:', error);
    }
    console.log('--- FETCH END ---');
}

/**
 * Setup function: Runs only once when the service worker is activated.
 */
function setupBackgroundTasks() {
    fetchAndSaveWebsites();
    chrome.alarms.create('refreshWebsites', { periodInMinutes: REFRESH_PERIOD_MINUTES });
}


// Ensures setup runs only when the chrome API is fully ready (Manifest V3 fix).
chrome.runtime.onInstalled.addListener(setupBackgroundTasks);
chrome.runtime.onStartup.addListener(setupBackgroundTasks);


// Listener for the alarm to trigger the refresh
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'refreshWebsites') {
        console.log('Alarm triggered, refreshing list...');
        fetchAndSaveWebsites();
    }
});

/**
 * Checks the tab's URL against the stored list and injects the content script if a match is found.
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Only proceed when the page is fully loaded and we have a valid HTTP/HTTPS URL
    if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
        const data = await chrome.storage.local.get(STORAGE_KEY);
        const restrictedWebsiteMap = data[STORAGE_KEY] || {};
        const currentUrl = tab.url;
        
        let matchingMessage = null;

        // Loop through the map keys (the website patterns)
        for (const restrictedPattern in restrictedWebsiteMap) {
            if (Object.hasOwnProperty.call(restrictedWebsiteMap, restrictedPattern)) {
                // Construct regex pattern for matching
                const escapedPattern = restrictedPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*');
                const pattern = new RegExp(`^https?:\/\/${escapedPattern}.*$`, 'i');

                if (pattern.test(currentUrl)) {
                    matchingMessage = restrictedWebsiteMap[restrictedPattern];
                    break; 
                }
            }
        }

        if (matchingMessage) {
            console.warn(`MATCH FOUND for ${currentUrl}. Saving message to storage and injecting content script.`);
            
            try {
                // 1. SAVE the message to a temporary storage key
                await chrome.storage.local.set({ [CURRENT_WARNING_MESSAGE_KEY]: matchingMessage });

                // 2. INJECT the content script file (using storage for communication)
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content.js'], 
                });
                
            } catch (e) {
                console.error('Failed to inject content script (permissions error?):', e);
            }
        }
    }
});