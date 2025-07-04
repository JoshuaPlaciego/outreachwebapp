import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// --- Global State Variables (specific to login page) ---
let authError = ''; // State for authentication errors

// --- DOM Element References (specific to login.html) ---
const authSection = document.getElementById('auth-section');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const signupBtn = document.getElementById('signup-btn');
const signinBtn = document.getElementById('signin-btn'); // Corrected ID to match HTML
const authErrorDiv = document.getElementById('auth-error');
const authErrorMessageSpan = document.getElementById('auth-error-message');
const emailVerificationMessageDiv = document.getElementById('email-verification-message');
const verificationEmailDisplay = document.getElementById('verification-email-display'); // Span for dynamic email display
const inlineResendLink = document.getElementById('inline-resend-link'); // Now a static element


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

        // Explicitly hide the authentication error message when showing verification message
        if (authErrorDiv) {
            authErrorDiv.classList.add('hidden');
            authErrorMessageSpan.textContent = ''; // Clear content too
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
        
        // Show a clear message to the user that they need to verify their email
        window.showMessage(`Account created for ${user.email}! A verification email has been sent to your address. Please verify your email and then sign in.`);
        
        // DO NOT sign out here. Let main.js handle the state change based on email verification.
        // await window.auth.signOut(); // Removed this line

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
            // DO NOT sign out here. Keep the user signed in on the login page.
            // main.js's onAuthStateChanged will detect the unverified user and keep them on this page.
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
        // This case should ideally not be hit if the user is seeing the message and the flow is correct.
        authError = 'No user is currently signed in to resend verification.';
        renderAuthForm();
    }
}

// The handleRefreshStatus function is no longer needed as the button has been removed from HTML.
// If you decide to re-add a "Refresh Status" button in the future, you would uncomment this function
// and its event listener in initLoginPage.

/**
 * Initializes the login page specific elements and listeners.
 * Called by main.js after Firebase is initialized.
 * @param {object|null} user The current Firebase user object, or null if not logged in.
 */
export function initLoginPage(user) {
    if (authSection) authSection.classList.remove('hidden'); // Ensure auth section is visible

    // Hide verification message initially, or show if user is unverified
    // Pass the user object to showEmailVerificationMessage only if it's an unverified user
    if (user && !user.emailVerified) {
        showEmailVerificationMessage(user.email);
    } else {
        hideEmailVerificationMessage();
    }

    // Attach event listeners for login page buttons
    // These are now attached here, where the functions are defined.
    if (signupBtn) signupBtn.addEventListener('click', handleSignUp);
    if (signinBtn) signinBtn.addEventListener('click', handleSignIn);
    // The resend link is now a static element, attach its listener here
    if (inlineResendLink) {
        inlineResendLink.addEventListener('click', (e) => {
            e.preventDefault();
            handleResendVerificationEmail();
        });
    }
    // The refreshStatusBtn listener is removed as the button is no longer in HTML
    // if (refreshStatusBtn) refreshStatusBtn.addEventListener('click', handleRefreshStatus); // This line is commented out as the button is removed
    
    // Initial render of the form
    renderAuthForm();
}
