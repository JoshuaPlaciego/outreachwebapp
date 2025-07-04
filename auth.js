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
const authErrorDiv = document.getElementById('auth-error');
const authErrorMessage = document.getElementById('auth-error-message');
const verificationMessageDiv = document.getElementById('email-verification-message');
const verificationEmailDisplay = document.getElementById('verification-email-display');
const inlineResendLink = document.getElementById('inline-resend-link');

// Message Box Elements
const messageOverlay = document.getElementById('custom-message-box-overlay');
const messageBox = document.getElementById('custom-message-box');
const messageText = document.getElementById('message-text');
const closeMessageBtn = document.getElementById('close-message-btn');

// --- Utility Functions ---

/**
 * Displays a custom message to the user.
 * @param {string} msg - The message to display.
 */
function showMessage(msg) {
    messageText.textContent = msg;
    messageOverlay.classList.remove('hidden');
    setTimeout(() => {
        messageOverlay.style.opacity = '1';
        messageBox.style.transform = 'scale(1)';
    }, 10);
}

/**
 * Hides the custom message box.
 */
function hideMessage() {
    messageOverlay.style.opacity = '0';
    messageBox.style.transform = 'scale(0.95)';
    setTimeout(() => {
        messageOverlay.classList.add('hidden');
    }, 300);
}

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
    authErrorDiv.classList.add('hidden');
    verificationMessageDiv.classList.add('hidden');
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        authErrorMessage.textContent = "Email and password cannot be empty.";
        authErrorDiv.classList.remove('hidden');
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
        showMessage("Sign-up successful! A verification email has been sent to your inbox. Please verify to sign in.");
        // Sign out to force user to verify first, then they can sign in to dashboard
        await signOut(auth);
    } catch (error) {
        authErrorMessage.textContent = error.message;
        authErrorDiv.classList.remove('hidden');
    }
}

/**
 * Handles user sign-in.
 */
async function handleSignIn() {
    authErrorDiv.classList.add('hidden');
    verificationMessageDiv.classList.add('hidden');
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        authErrorMessage.textContent = "Email and password cannot be empty.";
        authErrorDiv.classList.remove('hidden');
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will handle the redirect if successful and verified
    } catch (error) {
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
        // We need to sign in the user temporarily to get the user object
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
                authErrorDiv.classList.add('hidden');
                switchView('auth-view');
            }
        } else {
            // User is signed out, show auth view
            switchView('auth-view');
            verificationMessageDiv.classList.add('hidden');
            authErrorDiv.classList.add('hidden');
            // No need to reset form here as it's the initial state of the login page
        }
    });

    // Initial check for custom token (if applicable, though null in this setup for GitHub Pages)
    // This block is primarily for environments like Canvas that inject a token.
    // For GitHub Pages, the onAuthStateChanged listener handles initial state.
    try {
        const initialAuthToken = null; // No custom token for direct GitHub Pages deployment
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            switchView('auth-view'); // Ensure auth view is shown initially if no user/token
        }
    } catch (error) {
        console.error("Error during initial session check:", error);
        switchView('auth-view');
        showMessage("Session validation failed. Please sign in again.");
    }
}

// Run the app
main();
