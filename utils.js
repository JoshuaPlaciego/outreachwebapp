/**
 * Displays a custom message to the user.
 * @param {string} msg - The message to display.
 */
export function showMessage(msg) {
    const messageOverlay = document.getElementById('custom-message-box-overlay');
    const messageBox = document.getElementById('custom-message-box');
    const messageText = document.getElementById('message-text');

    if (messageText && messageOverlay && messageBox) {
        messageText.textContent = msg;
        messageOverlay.classList.remove('hidden');
        setTimeout(() => {
            messageOverlay.style.opacity = '1';
            messageBox.style.transform = 'scale(1)';
        }, 10);
    } else {
        console.error("Message box elements not found. Cannot display message:", msg);
        // Fallback to alert if elements are missing (for debugging, not for production)
        // alert(msg);
    }
}

/**
 * Hides the custom message box.
 */
export function hideMessage() {
    const messageOverlay = document.getElementById('custom-message-box-overlay');
    const messageBox = document.getElementById('custom-message-box');

    if (messageOverlay && messageBox) {
        messageOverlay.style.opacity = '0';
        messageBox.style.transform = 'scale(0.95)';
        setTimeout(() => {
            messageOverlay.classList.add('hidden');
        }, 300);
    } else {
        console.error("Message box elements not found. Cannot hide message.");
    }
}
