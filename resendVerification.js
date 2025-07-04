// resendVerification.js

import { sendEmailVerification } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

/**
 * Resends the verification email for a given user.
 * @param {User} user - The Firebase user object.
 * @param {function} showMessage - A callback to display user feedback.
 */
export async function resendVerification(user, showMessage) {
    if (!user) {
        console.error("No user provided to resend verification.");
        showMessage("Error: No user available to resend verification email.");
        return;
    }

    try {
        await sendEmailVerification(user);
        showMessage("Verification email resent successfully. Please check your inbox.");
    } catch (error) {
        console.error("Resend verification error:", error);
        showMessage(`Resend failed: ${error.message}`);
    }
}
