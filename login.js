// login.js

import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { resendVerification } from "./resendVerification.js";

let auth;

export function initLoginPage(user) {
    auth = window.auth;

    const emailInput = document.getElementById('auth-email');
    const passwordInput = document.getElementById('auth-password');
    const signupBtn = document.getElementById('signup-btn');
    const signinBtn = document.getElementById('signin-btn');

    const authErrorDiv = document.getElementById('auth-error');
    const authErrorMessage = document.getElementById('auth-error-message');

    const verificationMessageDiv = document.getElementById('email-verification-message');
    const verificationEmailDisplay = document.getElementById('verification-email-display');
    const inlineResendLink = document.getElementById('inline-resend-link');

    function showAuthError(message) {
        authErrorMessage.textContent = message;
        authErrorDiv.classList.remove('hidden');
    }

    function hideAuthError() {
        authErrorDiv.classList.add('hidden');
        authErrorMessage.textContent = '';
    }

    function showVerificationMessage(email) {
        verificationEmailDisplay.textContent = email;
        verificationMessageDiv.classList.remove('hidden');
        inlineResendLink.classList.remove('hidden');
    }

    function hideVerificationMessage() {
        verificationMessageDiv.classList.add('hidden');
        verificationEmailDisplay.textContent = '';
        inlineResendLink.classList.add('hidden');
    }

    async function handleSignUp() {
        hideAuthError();
        hideVerificationMessage();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await sendEmailVerification(userCredential.user);
            window.showMessage("Sign-up successful. Verification email sent. Please check your inbox.");
            await signOut(auth);
        } catch (error) {
            console.error("Sign-up error:", error);
            showAuthError(error.message);
        }
    }

    async function handleSignIn() {
        hideAuthError();
        hideVerificationMessage();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            await userCredential.user.reload();

            if (!userCredential.user.emailVerified) {
                showVerificationMessage(email);
                window.showMessage("Your email is not verified. Please verify before proceeding.");
                await signOut(auth);
            }

        } catch (error) {
            console.error("Sign-in error:", error);
            showAuthError(error.message);
        }
    }

    signupBtn.addEventListener('click', handleSignUp);
    signinBtn.addEventListener('click', handleSignIn);

    inlineResendLink.addEventListener('click', async (e) => {
        e.preventDefault();

        try {
            const email = emailInput.value.trim();
            const password = passwordInput.value;

            const userCredential = await signInWithEmailAndPassword(auth, email, password);

            if (userCredential.user.emailVerified) {
                window.showMessage("Your email is already verified. Please sign in.");
                await signOut(auth);
                return;
            }

            await resendVerification(userCredential.user, window.showMessage);
            await signOut(auth);
        } catch (error) {
            console.error("Resend verification sign-in error:", error);
            showAuthError(error.message);
        }
    });

    // If user was passed in from onAuthStateChanged and is unverified
    if (user && !user.emailVerified) {
        showVerificationMessage(user.email);
    }
}
