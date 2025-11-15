// This script runs inside the matched web page.
// We must redeclare the key here to access the stored data.
const CURRENT_WARNING_MESSAGE_KEY = 'currentWarningMessage';

/**
 * Creates and displays a full-screen, non-blocking modal with a warning.
 * @param {string} specificWarning The custom dark pattern message for the site.
 */
function displayWarningModal(specificWarning) {
    // Check if the modal is already present to prevent multiple injections
    if (document.getElementById('extension-warning-modal')) {
        return;
    }

    // 1. Create the modal container
    const modal = document.createElement('div');
    modal.id = 'extension-warning-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(255, 0, 0, 0.95);
        z-index: 99999;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        color: white;
        font-family: Arial, sans-serif;
        text-align: center;
        backdrop-filter: blur(8px);
    `;

    // 2. Create the content box
    const contentBox = document.createElement('div');
    contentBox.style.cssText = `
        background-color: #333;
        padding: 40px 60px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        max-width: 90%;
        animation: fadeIn 0.5s ease-out;
    `;

    // 3. Add the title and general message
    const title = document.createElement('h1');
    title.textContent = 'WARNING: Restricted Website Detected';
    title.style.cssText = 'font-size: 2.5em; margin-bottom: 20px; border-bottom: 2px solid white; padding-bottom: 10px;';

    const generalMessage = document.createElement('p');
    generalMessage.textContent = `The website you are currently visiting (${window.location.hostname}) is on a monitored list. The reason for the warning is:`;
    generalMessage.style.cssText = 'font-size: 1.2em; margin-bottom: 10px;';

    // 4. Add the SPECIFIC Dark Pattern Message
    const specificWarningElement = document.createElement('p');
    specificWarningElement.textContent = specificWarning || "No specific warning provided. Proceed with extreme caution.";
    specificWarningElement.style.cssText = 'font-size: 1.5em; font-weight: bold; color: #ffeb3b; margin-bottom: 30px; padding: 10px; border: 1px solid #ffeb3b; border-radius: 5px;';


    // 5. Add the close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Acknowledge and Close';
    closeButton.style.cssText = `
        padding: 10px 20px;
        font-size: 1.1em;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: background-color 0.3s, transform 0.1s;
    `;
    closeButton.onmouseover = () => closeButton.style.backgroundColor = '#0056b3';
    closeButton.onmouseout = () => closeButton.style.backgroundColor = '#007bff';
    closeButton.onclick = () => {
        modal.remove(); // Remove the modal from the DOM
    };

    // 6. Assemble the modal
    contentBox.appendChild(title);
    contentBox.appendChild(generalMessage);
    contentBox.appendChild(specificWarningElement); 
    contentBox.appendChild(closeButton);
    modal.appendChild(contentBox);
    
    // 7. Add a simple CSS animation keyframe
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);

    // 8. Append to the body to display it
    document.body.appendChild(modal);
}

// Main logic for the content script:
// 1. Read the message from storage
chrome.storage.local.get(CURRENT_WARNING_MESSAGE_KEY, (result) => {
    const message = result[CURRENT_WARNING_MESSAGE_KEY];
    
    if (message) {
        // 2. Display the modal with the message
        displayWarningModal(message);
    }

    // 3. IMPORTANT: Delete the temporary message from storage
    chrome.storage.local.remove(CURRENT_WARNING_MESSAGE_KEY, () => {
        // Clean up complete.
    });
});