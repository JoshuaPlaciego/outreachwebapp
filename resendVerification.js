// resendVerification.js

import { sendEmailVerification } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

/**
 * Resends the verification email to the given user.
 * @param {object} user - The Firebase user object.
 * @param {function} showMessage - A function to display a message to the user.
 */
export async function resendVerification(user, showMessage) {
    if (!user) {
        console.error("No user object provided for resendVerification");
        showMessage("Resend failed: No user found.");
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
