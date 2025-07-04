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
 * @param {string} email The email address to display in the message.
 */
function showEmailVerificationMessage(email) {
    if (emailVerificationMessageDiv && verificationMessageTextSpan) {
        verificationMessageMessageTextSpan.textContent = `Please verify your email address (${email}) to access the dashboard. Check your inbox for a verification link.`;
        emailVerificationMessageDiv.classList.remove('hidden');
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
 */
function renderAuthForm() {
    if (authErrorDiv && authErrorMessageSpan) {
        if (authError) {
            authErrorDiv.classList.remove('hidden');
            authErrorMessageSpan.textContent = authError;
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
    authError = ''; // Clear previous auth errors for a fresh attempt
    const email = authEmailInput.value;
    const password = authPasswordInput.value;

    // Client-side validation for immediate feedback
    if (!email || !password) {
        authError = 'Email and password are required for sign up.';
        renderAuthForm();
        return; // Exit early, fields will be cleared in finally block
    }
    if (password.length < 6) {
        authError = 'Password must be at least 6 characters long.';
        renderAuthForm();
        return; // Exit early, fields will be cleared in finally block
    }

    try {
        // 1. Create user account with Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(window.auth, email, password);
        const user = userCredential.user;

        // 2. Send email verification to the new user
        await sendEmailVerification(user);
        // Removed: window.showMessage(`Account created for ${user.email}! A verification email has been sent to your address. Please verify your email and then sign in.`);

        // 3. Clear any auth error if signup was successful
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
        renderAuthForm();
    }
}

/**
 * Handles user sign-in with email and password.
 */
async function handleSignIn() {
    authError = ''; // Clear previous auth errors
    const email = authEmailInput.value;
    const password = authPasswordInput.value;

    if (!email || !password) {
        authError = 'Email and password are required for sign in.';
        renderAuthForm();
        return; // Exit early, fields will be cleared in finally block
    }

    try {
        const userCredential = await signInWithEmailAndPassword(window.auth, email, password);
        const user = userCredential.user;

        // Reload user to get the latest emailVerified status
        await user.reload();

        if (!user.emailVerified) {
            // User is signed in but email not verified, show error
            authError = `Please verify your email address (${user.email}) to access the dashboard.`;
            showEmailVerificationMessage(user.email); // Explicitly show the yellow message
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
    // Removed event listener attachments for resendVerificationBtn and refreshStatusBtn
    
    // Initial render of the form
    renderAuthForm();
}
