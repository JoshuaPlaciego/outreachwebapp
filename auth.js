// --- Firebase SDK Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    signOut,
    signInWithCustomToken
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// Import utility functions for messages
import { showMessage, hideMessage } from './utils.js';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD6gijBHmULvJBIjTaoNP9miVr2ZYCKDSg",
    authDomain: "outreachwebapp-139d4.firebaseapp.com",
    projectId: "outreachwebapp-139d4",
    storageBucket: "outreachwebapp-139d4.firebasestorage.app",
    messagingSenderId: "189767218255",
    appId: "1:189767218255:web:dd2f5925fdcb15ed9ba63a"
};

// --- App State & Config ---
let auth;

// --- DOM Element References ---
const loadingIndicator = document.getElementById('loading-indicator');
const authView = document.getElementById('auth-view');

// Auth View Elements
const emailInput = document.getElementById('auth-email');
const passwordInput = document.getElementById('auth-password');
const signupBtn = document.getElementById('signup-btn');
const signinBtn = document.getElementById('signin-btn');
const authErrorDiv = document.getElementById('auth-error'); // Still needed for specific auth error display
const authErrorMessage = document.getElementById('auth-error-message'); // Still needed for specific auth error display
const verificationMessageDiv = document.getElementById('email-verification-message'); // Still needed for specific verification message
const verificationEmailDisplay = document.getElementById('verification-email-display'); // Still needed for specific verification message
const inlineResendLink = document.getElementById('inline-resend-link');

// Message Box Elements (These are now handled by utils.js, but the close button still needs an event listener)
const closeMessageBtn = document.getElementById('close-message-btn');

// --- Utility Functions (moved to utils.js, keeping only switchView here) ---

/**
 * Switches the main view of the application.
 * @param {string} viewId - The ID of the view to show ('auth-view', 'loading-indicator').
 */
function switchView(viewId) {
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

// --- Authentication Logic ---

/**
 * Handles user sign-up.
 */
async function handleSignUp() {
    authErrorDiv.classList.add('hidden'); // Hide specific error div
    verificationMessageDiv.classList.add('hidden'); // Hide specific verification div
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showMessage("Email and password cannot be empty."); // Use generic message box
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
        showMessage("Sign-up successful! A verification email has been sent to your inbox. Please verify to sign in.");
        await signOut(auth); // Sign out to force user to verify first
    } catch (error) {
        // For specific auth errors, still use the dedicated div for more context
        authErrorMessage.textContent = error.message;
        authErrorDiv.classList.remove('hidden');
    }
}

/**
 * Handles user sign-in.
 */
async function handleSignIn() {
    authErrorDiv.classList.add('hidden'); // Hide specific error div
    verificationMessageDiv.classList.add('hidden'); // Hide specific verification div
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showMessage("Email and password cannot be empty."); // Use generic message box
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will handle the redirect if successful and verified
    } catch (error) {
        // For specific auth errors, still use the dedicated div for more context
        authErrorMessage.textContent = error.message;
        authErrorDiv.classList.remove('hidden');
    }
}

/**
 * Resends the verification email.
 */
async function resendVerification() {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) {
        showMessage("Please enter your email and password to resend the verification link.");
        return;
    }
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        if (userCredential.user && !userCredential.user.emailVerified) {
            await sendEmailVerification(userCredential.user);
            showMessage("Verification email resent successfully. Please check your inbox.");
        } else if (userCredential.user.emailVerified) {
            showMessage("Your email is already verified. You can now sign in.");
        }
        await signOut(auth); // Sign out again
    } catch (error) {
        showMessage(`Resend failed: ${error.message}`);
    }
}

// --- Event Listeners ---

/**
 * Attaches all primary event listeners for the authentication page.
 */
function attachEventListeners() {
    signupBtn.addEventListener('click', handleSignUp);
    signinBtn.addEventListener('click', handleSignIn);
    inlineResendLink.addEventListener('click', (e) => {
        e.preventDefault();
        resendVerification();
    });
    closeMessageBtn.addEventListener('click', hideMessage);
}

// --- Initialization ---

/**
 * Main function to initialize the authentication page.
 */
async function main() {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);

    attachEventListeners();

    // Handle authentication state
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            await user.reload(); // Get latest user state
            if (user.emailVerified) {
                // User is signed in and email is verified, redirect to dashboard
                window.location.href = 'dashboard.html';
            } else {
                // User is signed in but email is not verified, show verification message
                verificationEmailDisplay.textContent = user.email;
                verificationMessageDiv.classList.remove('hidden');
                authErrorDiv.classList.add('hidden'); // Hide auth error if verification is the issue
                switchView('auth-view');
                loadingIndicator.classList.add('hidden'); // Hide loading indicator once auth view is shown
            }
        } else {
            // User is signed out, show auth view
            switchView('auth-view');
            verificationMessageDiv.classList.add('hidden');
            authErrorDiv.classList.add('hidden');
            loadingIndicator.classList.add('hidden'); // Hide loading indicator once auth view is shown
        }
    });

    // Initial check for custom token (if applicable, though null in this setup for GitHub Pages)
    try {
        const initialAuthToken = null; // No custom token for direct GitHub Pages deployment
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            // If no initial token, the onAuthStateChanged listener will handle showing the auth-view
            // No need to explicitly call switchView('auth-view') here as onAuthStateChanged will do it.
        }
    } catch (error) {
        console.error("Error during initial session check:", error);
        showMessage("Session validation failed. Please sign in again."); // Use generic message box
        switchView('auth-view');
        loadingIndicator.classList.add('hidden'); // Hide loading indicator on error
    }
}

// Run the app
main();
