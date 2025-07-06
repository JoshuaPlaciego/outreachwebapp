// --- DOM Element References (assuming these exist in index.html and dashboard.html) ---
const messageOverlay = document.getElementById('custom-message-box-overlay');
const messageBox = document.getElementById('custom-message-box');
const messageText = document.getElementById('message-text');
const closeMessageBtn = document.getElementById('close-message-btn'); // "Got It!" button
const messageBoxResendBtn = document.getElementById('message-box-resend-btn'); // "Resend Verification Email" button
const messageBoxLogoutBtn = document.getElementById('message-box-logout-btn'); // New: "Logout" button

/**
 * Displays a custom message to the user.
 * @param {string} msg - The message to display.
 * @param {boolean} [showResendButton=false] - Whether to show the resend verification email button.
 * @param {boolean} [showLogoutButton=false] - Whether to show the logout button.
 */
export function showMessage(msg, showResendButton = false, showLogoutButton = false) {
    if (messageText && messageOverlay && messageBox && closeMessageBtn && messageBoxResendBtn && messageBoxLogoutBtn) {
        messageText.textContent = msg;
        messageOverlay.classList.remove('hidden');
        messageOverlay.classList.add('modal-active-overlay'); // Apply flex for centering

        // Toggle button visibility based on parameters
        if (showResendButton) {
            messageBoxResendBtn.classList.remove('hidden');
        } else {
            messageBoxResendBtn.classList.add('hidden');
        }

        if (showLogoutButton) {
            messageBoxLogoutBtn.classList.remove('hidden');
        } else {
            messageBoxLogoutBtn.classList.add('hidden');
        }

        // The "Got It!" button is shown only if neither resend nor logout buttons are shown
        if (!showResendButton && !showLogoutButton) {
            closeMessageBtn.classList.remove('hidden');
        } else {
            closeMessageBtn.classList.add('hidden');
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
            // Ensure all buttons are hidden when closing the message box
            if (closeMessageBtn) closeMessageBtn.classList.add('hidden');
            if (messageBoxResendBtn) messageBoxResendBtn.classList.add('hidden');
            if (messageBoxLogoutBtn) messageBoxLogoutBtn.classList.add('hidden'); // New: Hide logout button
        }, 300);
    } else {
        console.error("Message box elements not found. Cannot hide message.");
    }
}
