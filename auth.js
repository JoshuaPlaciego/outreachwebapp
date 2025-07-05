// --- Firebase SDK Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    signOut,
    signInWithCustomToken,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";


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
let db;

// The appId is now derived directly from the firebaseConfig
const appId = firebaseConfig.appId;

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
const forgotPasswordLink = document.getElementById('forgot-password-link');

// Message Box Elements
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
    authErrorDiv.classList.add('hidden');
    verificationMessageDiv.classList.add('hidden');
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showMessage("Email and password cannot be empty.");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await sendEmailVerification(user);

        // Create a user document in Firestore
        const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, user.uid);
        await setDoc(userDocRef, {
            email: user.email,
            emailVerified: user.emailVerified, // Will be false initially
            createdAt: serverTimestamp()
        });

        // Sign out the user immediately after signup to force verification login
        await signOut(auth);
        showMessage("Sign-up successful! Please check your email to verify and then sign in.");

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
        showMessage("Email and password cannot be empty.");
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Reload user to get latest emailVerified status
        await user.reload();

        // Update Firestore user document's emailVerified status if it's now true
        if (user.emailVerified) {
            const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, user.uid);
            await updateDoc(userDocRef, {
                emailVerified: true,
                lastSignInTime: serverTimestamp()
            });
            // Redirect to dashboard, onAuthStateChanged will handle this
        } else {
            // If email is not verified, keep them on the auth page and show verification message
            // DO NOT signOut(auth) here, so auth.currentUser is available for resendVerification
            verificationEmailDisplay.textContent = user.email;
            verificationMessageDiv.classList.remove('hidden');
            authErrorDiv.classList.add('hidden');
            switchView('auth-view');
            loadingIndicator.classList.add('hidden');
            // No need for a separate showMessage here as the div provides context
        }

    } catch (error) {
        authErrorMessage.textContent = error.message;
        authErrorDiv.classList.remove('hidden');
    }
}

/**
 * Resends the verification email.
 */
async function resendVerification() {
    const user = auth.currentUser; // Get the currently signed-in user

    if (!user) {
        showMessage("Please sign in with the email you wish to verify, then try resending.");
        return;
    }

    // Ensure the email in the input matches the signed-in user's email for security
    // Or, if the input email is empty, use the signed-in user's email
    const emailToVerify = emailInput.value.trim() || user.email;

    if (user.email !== emailToVerify) {
        showMessage("The email in the input field does not match your signed-in account. Please ensure they match or sign in with the correct account.");
        return;
    }

    try {
        await sendEmailVerification(user);
        showMessage("Verification email resent successfully. Please check your inbox.");
    } catch (error) {
        showMessage(`Resend failed: ${error.message}`);
    }
}

/**
 * Handles the "Forgot Password" functionality.
 */
async function handleForgotPassword() {
    const email = emailInput.value.trim();
    if (!email) {
        showMessage("Please enter your email address to reset your password.");
        return;
    }
    try {
        await sendPasswordResetEmail(auth, email);
        showMessage("Password reset email sent! Please check your inbox for instructions.");
    } catch (error) {
        showMessage(`Password reset failed: ${error.message}`);
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
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        handleForgotPassword();
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
    db = getFirestore(app);

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
                loadingIndicator.classList.add('hidden');
            }
        } else {
            // User is signed out, show auth view
            switchView('auth-view');
            verificationMessageDiv.classList.add('hidden');
            authErrorDiv.classList.add('hidden');
            loadingIndicator.classList.add('hidden');
        }
    });

    // Initial check for custom token (if applicable, though null in this setup for GitHub Pages)
    try {
        const initialAuthToken = null;
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        }
    } catch (error) {
        console.error("Error during initial session check:", error);
        showMessage("Session validation failed. Please sign in again.");
        switchView('auth-view');
        loadingIndicator.classList.add('hidden');
    }
}

// Run the app
main();
