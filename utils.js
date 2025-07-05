/**
 * Displays a custom message to the user.
 * @param {string} msg - The message to display.
 * @param {boolean} [showResendButton=false] - Whether to show the resend verification email button.
 */
export function showMessage(msg, showResendButton = false) {
    const messageOverlay = document.getElementById('custom-message-box-overlay');
    const messageBox = document.getElementById('custom-message-box');
    const messageText = document.getElementById('message-text');
    const gotItBtn = document.getElementById('close-message-btn'); // Renamed for clarity
    const resendBtn = document.getElementById('message-box-resend-btn');

    if (messageText && messageOverlay && messageBox && gotItBtn && resendBtn) {
        messageText.textContent = msg;
        messageOverlay.classList.remove('hidden');
        messageOverlay.classList.add('modal-active-overlay'); // Apply flex for centering

        // Toggle button visibility based on showResendButton
        if (showResendButton) {
            resendBtn.classList.remove('hidden');
            gotItBtn.classList.add('hidden'); // Hide "Got It!" button
        } else {
            resendBtn.classList.add('hidden');
            gotItBtn.classList.remove('hidden'); // Show "Got It!" button
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
    const gotItBtn = document.getElementById('close-message-btn'); // Renamed for clarity
    const resendBtn = document.getElementById('message-box-resend-btn');

    if (messageOverlay && messageBox && gotItBtn && resendBtn) {
        messageOverlay.style.opacity = '0';
        messageBox.style.transform = 'scale(0.95)';
        // Ensure both buttons are hidden when closing the message box
        gotItBtn.classList.add('hidden');
        resendBtn.classList.add('hidden');
        setTimeout(() => {
            messageOverlay.classList.add('hidden'); // Hide it (display: none)
            messageOverlay.classList.remove('modal-active-overlay'); // Remove flex properties
        }, 300);
    } else {
        console.error("Message box elements not found. Cannot hide message.");
    }
}
