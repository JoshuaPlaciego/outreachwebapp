// --- DOM Element References (assuming these exist in index.html) ---
const messageOverlay = document.getElementById('custom-message-box-overlay');
const messageBox = document.getElementById('custom-message-box');
const messageText = document.getElementById('message-text');
const closeMessageBtn = document.getElementById('close-message-btn'); // "Got It!" button
const messageBoxResendBtn = document.getElementById('message-box-resend-btn'); // "Resend Verification Email" button

/**
 * Displays a custom message to the user.
 * @param {string} msg - The message to display.
 * @param {boolean} [showResendButton=false] - Whether to show the resend verification email button.
 */
export function showMessage(msg, showResendButton = false) {
    if (messageText && messageOverlay && messageBox && closeMessageBtn && messageBoxResendBtn) {
        messageText.textContent = msg;
        messageOverlay.classList.remove('hidden');
        messageOverlay.classList.add('modal-active-overlay'); // Apply flex for centering

        // Toggle button visibility based on showResendButton
        if (showResendButton) {
            messageBoxResendBtn.classList.remove('hidden');
            closeMessageBtn.classList.add('hidden'); // Hide "Got It!" button
        } else {
            messageBoxResendBtn.classList.add('hidden');
            closeMessageBtn.classList.remove('hidden'); // Show "Got It!" button
        }

        setTimeout(() => {
            messageOverlay.style.opacity = '1';
            messageBox.style.transform = 'scale(1)';
        }, 10);
    } else {
        console.error("Message box elements not found. Cannot display message:", msg);
    }
}

/**
 * Hides the custom message box.
 */
export function hideMessage() {
    if (messageOverlay && messageBox) {
        messageOverlay.style.opacity = '0';
        messageBox.style.transform = 'scale(0.95)';
        setTimeout(() => {
            messageOverlay.classList.add('hidden'); // Hide it (display: none)
            messageOverlay.classList.remove('modal-active-overlay'); // Remove flex properties
            // Ensure both buttons are hidden when closing the message box
            if (closeMessageBtn) closeMessageBtn.classList.add('hidden');
            if (messageBoxResendBtn) messageBoxResendBtn.classList.add('hidden');
        }, 300);
    } else {
        console.error("Message box elements not found. Cannot hide message.");
    }
}
