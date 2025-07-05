/**
 * Displays a custom message to the user.
 * @param {string} msg - The message to display.
 * @param {boolean} [showResendButton=false] - Whether to show the resend verification email button.
 */
export function showMessage(msg, showResendButton = false) {
    const messageOverlay = document.getElementById('custom-message-box-overlay');
    const messageBox = document.getElementById('custom-message-box');
    const messageText = document.getElementById('message-text');
    const resendBtn = document.getElementById('message-box-resend-btn'); // Get the new resend button

    if (messageText && messageOverlay && messageBox && resendBtn) {
        messageText.textContent = msg;
        messageOverlay.classList.remove('hidden');
        messageOverlay.classList.add('modal-active-overlay'); // Apply flex for centering
        if (showResendButton) {
            resendBtn.classList.remove('hidden');
        } else {
            resendBtn.classList.add('hidden');
        }
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
    const resendBtn = document.getElementById('message-box-resend-btn'); // Get the resend button

    if (messageOverlay && messageBox && resendBtn) {
        messageOverlay.style.opacity = '0';
        messageBox.style.transform = 'scale(0.95)';
        resendBtn.classList.add('hidden'); // Always hide the resend button when closing
        setTimeout(() => {
            messageOverlay.classList.add('hidden'); // Hide it (display: none)
            messageOverlay.classList.remove('modal-active-overlay'); // Remove flex properties
        }, 300);
    } else {
        console.error("Message box elements not found. Cannot hide message.");
    }
}
