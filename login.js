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
const inlineResendLink = document.getElementById('inline-resend-link'); // Now a static element
// Removed direct reference to refreshStatusBtn as the button is no longer needed


// --- Functions (specific to login page) ---

/**
 * Displays the email verification message box.
 * When this message is shown, any existing authentication error message will be hidden.
 * @param {string} email The email address to display in the message.
 */
function showEmailVerificationMessage(email) {
    if (emailVerificationMessageDiv && verificationMessageTextSpan) {
        // Set the text content without rebuilding the entire HTML
        verificationMessageTextSpan.innerHTML = `
            <strong class="font-bold">Verification Needed: </strong>
            Please verify your email address (${email}) to access the dashboard.
            Check your inbox for a verification link.
            <br>
            <a href="#" id="inline-resend-link" class="text-indigo-600 hover:underline font-semibold mt-2 block">Resend Verification Email</a>
        `;
        emailVerificationMessageDiv.classList.remove('hidden');

        // Show the inline resend link (refresh button is removed from HTML)
        if (inlineResendLink) inlineResendLink.classList.remove('hidden');


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
        verificationMessageTextSpan.innerHTML = ''; // Clear content
        // Hide the inline resend link (refresh button is removed from HTML)
        if (inlineResendLink) inlineResendLink.classList.add('hidden');
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
    renderAuthForm(); // Immediately hide any existing auth error message visually

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
        hideEmailVerificationMessage(); // Ensure verification message is hidden on sign-up errors
    } finally {
        // Blanket rule: Always clear input fields and re-render the form to reflect the latest state (errors or cleared fields)
        authEmailInput.value = '';
        authPasswordInput.value = '';
        renderAuthForm(); // Final render to display outcome (error or cleared state)
    }
}

/**
 * Handles user sign-in with email and password.
 */
async function handleSignIn() {
    // Clear previous messages and errors visually at the very start of the attempt
    authError = ''; // Clear previous auth errors
    hideEmailVerificationMessage(); // Clear any previous verification messages
    renderAuthForm(); // Immediately hide any existing auth error message visually

    const email = authEmailInput.value;
    const password = authPasswordInput.value;

    if (!email || !password) {
        authError = 'Email and password are required for sign in.';
        renderAuthForm(); // Display new error
        return; // Exit early, fields will be cleared in finally block
    }

    try {
        const userCredential = await signInWithEmailAndPassword(window.auth, email, password);
        const user = userCredential.user;

        // Reload user to get the latest emailVerified status
        await user.reload();

        if (!user.emailVerified) {
            // User is signed in but email not verified, show ONLY the yellow verification message
            // showEmailVerificationMessage will also hide the red auth error box
            showEmailVerificationMessage(user.email);
            // Sign out the user to prevent partial access before verification
            await window.auth.signOut();
            // No explicit redirect needed here, onAuthStateChanged in main.js handles it
        } else {
            // Email is verified, onAuthStateChanged in main.js will handle redirect to addleads.html
            authError = ''; // Clear error if successfully signed in and verified
            hideEmailVerificationMessage(); // Ensure hidden if they were unverified and just verified
        }
    } catch (error) {
        console.error("Sign In Error:", error);
        authError = `Sign In Failed: ${error.message}`;
        hideEmailVerificationMessage(); // Hide verification message on sign-in error
    } finally {
        // Blanket rule: Always clear input fields and re-render the form to reflect the latest state (errors or cleared fields)
        authEmailInput.value = '';
        authPasswordInput.value = '';
        renderAuthForm();
    }
}

/**
 * Handles resending the email verification.
 */
async function handleResendVerificationEmail() {
    authError = ''; // Clear previous auth errors
    const user = window.auth.currentUser;
    if (user) {
        try {
            await sendEmailVerification(user);
            authError = 'Verification email re-sent! Please check your inbox.';
            renderAuthForm(); // Re-render to show success message
        } catch (error) {
            console.error("Resend Verification Error:", error);
            authError = `Failed to resend verification email: ${error.message}`;
            renderAuthForm(); // Re-render to show error message
        }
    } else {
        authError = 'No user is currently signed in to resend verification.';
        renderAuthForm();
    }
}

/**
 * Handles refreshing the user's authentication status to check email verification.
 * This function is no longer attached to a button in login.html, but kept for completeness if needed elsewhere.
 */
async function handleRefreshStatus() {
    authError = ''; // Clear previous auth errors
    const user = window.auth.currentUser;
    if (user) {
        try {
            await user.reload(); // Reloads the user's profile
            // The onAuthStateChanged listener in main.js will then re-evaluate user.emailVerified
            // and handle the routing/message display.
            authError = 'Status refreshed. Please try signing in again if your email is now verified.';
            renderAuthForm();
        } catch (error) {
            console.error("Refresh Status Error:", error);
            authError = `Failed to refresh status: ${error.message}`;
            renderAuthForm();
        }
    } else {
        authError = 'No user is currently signed in to refresh status.';
        renderAuthForm();
    }
}

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

    // Attach event listeners for login page buttons
    // These are now attached here, where the functions are defined.
    if (signupBtn) signupBtn.addEventListener('click', handleSignUp);
    if (signinBtn) signinBtn.addEventListener('click', handleSignIn);
    // The resend link is now dynamically created and attached within showEmailVerificationMessage
    // The refreshStatusBtn listener is removed as the button is no longer in HTML
    // if (refreshStatusBtn) refreshStatusBtn.addEventListener('click', handleRefreshStatus); // This line is commented out as the button is removed
    if (inlineResendLink) { // Ensure inlineResendLink exists before attaching listener
        inlineResendLink.addEventListener('click', (e) => {
            e.preventDefault();
            handleResendVerificationEmail();
        });
    }
    
    // Initial render of the form
    renderAuthForm();
}
