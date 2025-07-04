import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// --- Global State Variables (specific to login page) ---
let authError = ''; // State for authentication errors

// --- DOM Element References (specific to login.html) ---
const authSection = document.getElementById('auth-section');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const signupBtn = document.getElementById('signup-btn');
const signinBtn = document.getElementById('signin-btn');
const authErrorDiv = document.getElementById('auth-error');
const authErrorMessageSpan = document.getElementById('auth-error-message');
const emailVerificationMessageDiv = document.getElementById('email-verification-message');
const verificationMessageTextSpan = document.getElementById('verification-message-text');
// Removed references to resendVerificationBtn and refreshStatusBtn

// --- Functions (specific to login page) ---

/**
 * Displays the email verification message box.
 * When this message is shown, any existing authentication error message will be hidden.
 * @param {string} email The email address to display in the message.
 */
function showEmailVerificationMessage(email) {
    if (emailVerificationMessageDiv && verificationMessageTextSpan) {
        verificationMessageTextSpan.textContent = `Please verify your email address (${email}) to access the dashboard. Check your inbox for a verification link.`;
        emailVerificationMessageDiv.classList.remove('hidden');
        // Explicitly hide the authentication error message when showing verification message
        if (authErrorDiv) {
            authErrorDiv.classList.add('hidden');
            authErrorMessageSpan.textContent = ''; // Clear content too
        }
    }
}

/**
 * Hides the email verification message box.
 */
function hideEmailVerificationMessage() {
    if (emailVerificationMessageDiv && verificationMessageTextSpan) {
        emailVerificationMessageDiv.classList.add('hidden');
        verificationMessageTextSpan.textContent = '';
    }
}

/**
 * Renders the current state of the authentication form.
 * This function is now responsible for showing/hiding the auth error message,
 * and will also hide the email verification message if an auth error is present.
 */
function renderAuthForm() {
    if (authErrorDiv && authErrorMessageSpan) {
        if (authError) {
            authErrorDiv.classList.remove('hidden');
            authErrorMessageSpan.textContent = authError;
            // When an auth error is displayed, hide the email verification message
            hideEmailVerificationMessage();
        } else {
            authErrorDiv.classList.add('hidden');
            authErrorMessageSpan.textContent = '';
        }
    }
}

/**
 * Handles user sign-up with email and password.
 * This function is designed to be simple, clear, and robust.
 */
async function handleSignUp() {
    // Clear previous messages and errors visually at the very start of the attempt
    authError = ''; // Clear internal auth error state
    hideEmailVerificationMessage(); // Hide yellow verification message
    renderAuthForm(); // Hide red auth error message visually

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
        // 1. Create user account with Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(window.auth, email, password);
        const user = userCredential.user;

        // 2. Send email verification to the new user
        await sendEmailVerification(user);
        // Removed: window.showMessage(`Account created for ${user.email}! A verification email has been sent to your address. Please verify your email and then sign in.`);

        // 3. Clear any auth error if signup was successful (internal state)
        authError = '';
        // 4. Sign out the user
        await window.auth.signOut();

    } catch (error) {
        // Handle specific Firebase authentication errors
        console.error("Sign Up Error:", error);
        if (error.code === 'auth/email-already-in-use') {
            authError = 'This email is already registered. Please sign in or use a different email.';
        } else if (error.code === 'auth/invalid-email') {
            authError = 'Invalid email address format.';
        } else if (error.code === 'auth/weak-password') {
            authError = 'Password is too weak. Please choose a stronger password.';
        } else {
            authError = `Sign Up Failed: ${error.message}`; // Generic error for unexpected issues
        }
        // No need to call hideEmailVerificationMessage here, renderAuthForm handles it if authError is set
    } finally {
        // Blanket rule: Always clear input fields and re-render the form to reflect the latest state (errors or cleared fields)
        authEmailInput.value = '';
        authPasswordInput.value = '';
        renderAuthForm(); // Final render to display outcome (error or cleared state)
    }
}

/**
 * Handles user sign-in with email and password.
 * IMPORTANT: This function now only signs in. Routing based on email verification
 * status is handled by onAuthStateChanged in main.js.
 */
async function handleSignIn() {
    // Clear previous messages and errors visually at the very start of the attempt
    authError = ''; // Clear internal auth error state
    hideEmailVerificationMessage(); // Hide yellow verification message
    renderAuthForm(); // Hide red auth error message visually

    const email = authEmailInput.value;
    const password = authPasswordInput.value;

    if (!email || !password) {
        authError = 'Email and password are required for sign in.';
        renderAuthForm(); // Display new error
        return; // Exit early, fields will be cleared in finally block
    }

    try {
        // Set flag to indicate sign-in is in progress, deferring main.js routing
        window.isSigningIn = true;
        // Attempt to sign in the user
        await signInWithEmailAndPassword(window.auth, email, password);

    } catch (error) {
        console.error("Sign In Error:", error);
        authError = `Sign In Failed: ${error.message}`; // Set authError for other sign-in failures
    } finally {
        // Unset flag after sign-in attempt, allowing main.js to proceed with routing
        window.isSigningIn = false;
        // Blanket rule: Always clear input fields and re-render the form to reflect the latest state (errors or cleared fields)
        authEmailInput.value = '';
        authPasswordInput.value = '';
        renderAuthForm(); // Final render to display outcome (error or cleared state)
    }
}

// Removed: handleResendVerificationEmail function
// Removed: handleRefreshStatus function

/**
 * Initializes the login page specific elements and listeners.
 * Called by main.js after Firebase is initialized.
 * @param {object|null} user The current Firebase user object, or null if not logged in.
 */
export function initLoginPage(user) {
    if (authSection) authSection.classList.remove('hidden'); // Ensure auth section is visible

    // Hide verification message initially, or show if user is unverified
    if (user && !user.emailVerified) {
        showEmailVerificationMessage(user.email);
    } else {
        hideEmailVerificationMessage();
    }

    // Attach event listeners
    if (signupBtn) signupBtn.addEventListener('click', handleSignUp);
    if (signinBtn) signinBtn.addEventListener('click', handleSignIn);
    
    // Initial render of the form
    renderAuthForm();
}
