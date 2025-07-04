import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// --- Global State Variables (specific to login page) ---
let authError = ''; // State for authentication errors
let infoMessage = ''; // New state for informational/success messages

// --- DOM Element References (specific to login.html) ---
const authSection = document.getElementById('auth-section');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const signupBtn = document.getElementById('signup-btn');
const signinBtn = document.getElementById('signin-btn');
const authErrorDiv = document.getElementById('auth-error');
const authErrorMessageSpan = document.getElementById('auth-error-message');
const infoMessageDiv = document.getElementById('info-message');
const infoMessageTextSpan = document.getElementById('info-message-text');
const emailVerificationMessageDiv = document.getElementById('email-verification-message');
const verificationEmailDisplay = document.getElementById('verification-email-display');
const inlineResendLink = document.getElementById('inline-resend-link');


// --- Functions (specific to login page) ---

/**
 * Displays the email verification message box.
 * When this message is shown, any existing authentication error message will be hidden.
 * @param {string} email The email address to display in the message.
 */
function showEmailVerificationMessage(email) {
    // Ensure all necessary elements exist before attempting to manipulate them
    if (emailVerificationMessageDiv && verificationEmailDisplay && inlineResendLink) {
        // Update only the dynamic email part, the rest of the message is static in HTML
        verificationEmailDisplay.textContent = email;
        emailVerificationMessageDiv.classList.remove('hidden');

        // Show the inline resend link
        inlineResendLink.classList.remove('hidden');

        // Explicitly hide the authentication error message and info message when showing verification message
        // This is done to ensure the verification message takes precedence if the user is unverified.
        if (authErrorDiv) {
            authErrorDiv.classList.add('hidden');
            authErrorMessageSpan.textContent = ''; // Clear content too
        }
        if (infoMessageDiv) {
            infoMessageDiv.classList.add('hidden');
            infoMessageTextSpan.textContent = ''; // Clear content too
        }
    } else {
        console.error("One or more DOM elements for email verification message are missing.");
    }
}

/**
 * Hides the email verification message box.
 */
function hideEmailVerificationMessage() {
    if (emailVerificationMessageDiv && verificationEmailDisplay) {
        emailVerificationMessageDiv.classList.add('hidden');
        verificationEmailDisplay.textContent = ''; // Clear email content
        // Hide the inline resend link
        if (inlineResendLink) inlineResendLink.classList.add('hidden');
    }
}

/**
 * Renders the current state of the authentication form, including error and info messages.
 * This function now exclusively manages the red and green message boxes.
 * The yellow verification message is managed separately.
 */
function renderAuthForm() {
    // Manage auth error message (red box)
    if (authErrorDiv && authErrorMessageSpan) {
        if (authError) {
            authErrorDiv.classList.remove('hidden');
            authErrorMessageSpan.textContent = authError;
            // If an auth error is present, hide info message
            if (infoMessageDiv) infoMessageDiv.classList.add('hidden');
        } else {
            authErrorDiv.classList.add('hidden');
            authErrorMessageSpan.textContent = '';
        }
    }

    // Manage info/success message (green box)
    if (infoMessageDiv && infoMessageTextSpan) {
        if (infoMessage) {
            infoMessageDiv.classList.remove('hidden');
            infoMessageTextSpan.textContent = infoMessage;
            // If an info message is present, hide auth error message
            if (authErrorDiv) authErrorDiv.classList.add('hidden');
        } else {
            infoMessageDiv.classList.add('hidden');
            infoMessageTextSpan.textContent = '';
        }
    }

    // The email verification message's visibility is controlled independently by
    // showEmailVerificationMessage/hideEmailVerificationMessage and is NOT
    // managed by this renderAuthForm function for hiding purposes.
}

/**
 * Handles user sign-up with email and password.
 * This function is designed to be simple, clear, and robust.
 */
async function handleSignUp() {
    // Clear previous messages and errors visually at the very start of the attempt
    authError = ''; // Clear internal auth error state
    infoMessage = ''; // Clear internal info message state
    renderAuthForm(); // Immediately hide any existing auth/info messages visually

    const email = authEmailInput.value;
    const password = authPasswordInput.value;

    // Client-side validation for immediate feedback
    if (!email || !password) {
        authError = 'Email and password are required for sign up.';
        renderAuthForm(); // Display new error
        return; // Exit early, fields will be cleared in finally block
    }
    if (password.length < 6) {
        authError = 'Password must be at least 6 characters long.';
        renderAuthForm(); // Display new error
        return; // Exit early, fields will be cleared in finally block
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(window.auth, email, password);
        const user = userCredential.user;

        await sendEmailVerification(user);
        
        infoMessage = `Account created for ${user.email}! A verification email has been sent to your address. Please verify your email and then sign in.`;
        
        // Removed: await window.auth.signOut(); // This line was removed to keep the user signed in (unverified) after signup.

    } catch (error) {
        console.error("Sign Up Error:", error);
        if (error.code === 'auth/email-already-in-use') {
            authError = 'This email is already registered. Please sign in or use a different email.';
        } else if (error.code === 'auth/invalid-email') {
            authError = 'Invalid email address format.';
        } else if (error.code === 'auth/weak-password') {
            authError = 'Password is too weak. Please choose a stronger password.';
        } else {
            authError = `Sign Up Failed: ${error.message}`;
        }
    } finally {
        authEmailInput.value = '';
        authPasswordInput.value = '';
        renderAuthForm();
    }
}

/**
 * Handles user sign-in with email and password.
 */
async function handleSignIn() {
    // Clear previous messages and errors visually at the very start of the attempt
    authError = '';
    infoMessage = '';
    renderAuthForm();

    const email = authEmailInput.value;
    const password = authPasswordInput.value;

    if (!email || !password) {
        authError = 'Email and password are required for sign in.';
        renderAuthForm();
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(window.auth, email, password);
        const user = userCredential.user;

        await user.reload();

        if (!user.emailVerified) {
            showEmailVerificationMessage(user.email);
            // DO NOT sign out here. Keep the user signed in on the login page.
        } else {
            authError = '';
            infoMessage = 'Successfully signed in and email verified!';
            hideEmailVerificationMessage();
        }
    } catch (error) {
        console.error("Sign In Error:", error);
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            authError = 'Invalid email or password. Please check your credentials and try again.';
        } else if (error.code === 'auth/user-disabled') {
            authError = 'Your account has been disabled. Please contact support.';
        } else {
            authError = `Sign In Failed: ${error.message}`;
        }
    } finally {
        authEmailInput.value = '';
        authPasswordInput.value = '';
        renderAuthForm();
    }
}

/**
 * Handles resending the email verification.
 */
async function handleResendVerificationEmail() {
    authError = '';
    infoMessage = '';
    renderAuthForm();

    const user = window.auth.currentUser;
    if (user) {
        try {
            await sendEmailVerification(user);
            infoMessage = 'Verification email re-sent! Please check your inbox.';
            renderAuthForm();
        } catch (error) {
            console.error("Resend Verification Error:", error);
            authError = `Failed to resend verification email: ${error.message}`;
            renderAuthForm();
        }
    } else {
        authError = 'No user is currently signed in to resend verification.';
        renderAuthForm();
    }
}

/**
 * Initializes the login page specific elements and listeners.
 * Called by main.js after Firebase is initialized.
 * @param {object|null} user The current Firebase user object, or null if not logged in.
 */
export function initLoginPage(user) {
    if (authSection) authSection.classList.remove('hidden');

    // This is the primary control for the email verification message
    if (user && !user.emailVerified) {
        showEmailVerificationMessage(user.email);
    } else {
        hideEmailVerificationMessage();
    }

    if (signupBtn) signupBtn.addEventListener('click', handleSignUp);
    if (signinBtn) signinBtn.addEventListener('click', handleSignIn);
    if (inlineResendLink) {
        inlineResendLink.addEventListener('click', (e) => {
            e.preventDefault();
            handleResendVerificationEmail();
        });
    }
    
    // Initial render of the form's error/info messages (not the verification message)
    renderAuthForm();
}
