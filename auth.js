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
    signInAnonymously,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    onSnapshot,
    deleteDoc,
    doc,
    updateDoc,
    serverTimestamp,
    query,
    where
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- App State & Config ---
let auth, db, userId, leadsUnsubscribe = null;
let leads = [];
let editingLeadId = null;

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD6gijBHmULvJBIjTaoNP9miVr2ZYCKDSg",
    authDomain: "outreachwebapp-139d4.firebaseapp.com",
    projectId: "outreachwebapp-139d4",
    storageBucket: "outreachwebapp-139d4.firebasestorage.app",
    messagingSenderId: "189767218255",
    appId: "1:189767218255:web:dd2f5925fdcb15ed9ba63a"
};

// The appId is now derived directly from the firebaseConfig
const appId = firebaseConfig.appId;

// --- DOM Element References ---
const loadingIndicator = document.getElementById('loading-indicator');
const authView = document.getElementById('auth-view');
const appView = document.getElementById('app-view'); // This is not used in auth.js, but kept for consistency if it were a combined file

// Auth View Elements
const emailInput = document.getElementById('auth-email');
const passwordInput = document.getElementById('auth-password');
const signupBtn = document.getElementById('signup-btn');
const signinBtn = document.getElementById('signin-btn');
const authErrorDiv = document.getElementById('auth-error');
const authErrorMessage = document.getElementById('auth-error-message');
const verificationMessageDiv = document.getElementById('email-verification-message'); // This is not in the current index.html
const verificationEmailDisplay = document.getElementById('verification-email-display'); // This is not in the current index.html
const inlineResendLink = document.getElementById('inline-resend-link'); // This is not in the current index.html

const togglePasswordVisibility = document.getElementById('toggle-password-visibility');
const passwordError = document.getElementById('password-error');
const passwordStrength = document.getElementById('password-strength');
const passwordStrengthLabel = document.getElementById('password-strength-label'); // New: for strength text
const passwordStrengthBar = document.getElementById('password-strength-bar'); // New: for the visual bar

// Password Requirements Checklist
const passwordRequirements = {
    length: document.getElementById('req-length'),
    uppercase: document.getElementById('req-uppercase'),
    lowercase: document.getElementById('req-lowercase'),
    number: document.getElementById('req-number'),
    special: document.getElementById('req-special')
};

const googleAuthBtn = document.getElementById('google-auth-btn');
const forgotPasswordLink = document.getElementById('forgot-password-link');


// Message Box Elements
const messageOverlay = document.getElementById('custom-message-box-overlay');
const messageBox = document.getElementById('custom-message-box');
const messageText = document.getElementById('message-text');
const closeMessageBtn = document.getElementById('close-message-btn');
const messageBoxResendBtn = document.getElementById('message-box-resend-btn');


// --- Utility Functions ---

/**
 * Displays a custom message to the user.
 * @param {string} msg - The message to display.
 * @param {boolean} showResendButton - Whether to show the resend verification email button.
 */
function showMessage(msg, showResendButton = false) {
    messageText.textContent = msg;
    messageBoxResendBtn.classList.toggle('hidden', !showResendButton);
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
 * @param {string} viewId - The ID of the view to show ('auth-view', 'app-view', 'loading-indicator').
 */
function switchView(viewId) {
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

/**
 * Sets the loading state for a button.
 * @param {HTMLElement} button - The button element.
 * @param {boolean} isLoading - True to show loading state, false otherwise.
 * @param {string} originalText - The original text of the button.
 */
function setButtonLoading(button, isLoading, originalText) {
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Loading...'; // Add spinner icon
    } else {
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

/**
 * Updates the password requirement checklist and strength indicator based on the input password.
 */
function updatePasswordRequirements() {
    const password = passwordInput.value;
    const requirements = {
        length: password.length >= 6,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/.test(password) // More comprehensive special characters
    };

    let metCount = 0;
    for (const key in requirements) {
        const element = passwordRequirements[key];
        if (requirements[key]) {
            element.classList.remove('text-red-500');
            element.classList.add('text-green-500');
            element.querySelector('i').classList.remove('fa-times-circle');
            element.querySelector('i').classList.add('fa-check-circle');
            metCount++;
        } else {
            element.classList.remove('text-green-500');
            element.classList.add('text-red-500');
            element.querySelector('i').classList.remove('fa-check-circle');
            element.querySelector('i').classList.add('fa-times-circle');
        }
    }

    // Update password strength label
    let strengthText = '';
    let strengthColor = '';
    let barColor = '';

    if (password.length === 0) {
        strengthText = '';
        strengthColor = '';
        barColor = '#e5e7eb'; // Tailwind gray-200
    } else if (metCount === 5 && password.length >= 10) {
        strengthText = 'Very Strong';
        strengthColor = 'text-green-700';
        barColor = '#15803d'; // Tailwind green-700
    } else if (metCount >= 4 && password.length >= 8) {
        strengthText = 'Strong';
        strengthColor = 'text-green-500';
        barColor = '#22c55e'; // Tailwind green-500
    } else if (metCount >= 3 && password.length >= 6) {
        strengthText = 'Moderate';
        strengthColor = 'text-yellow-600';
        barColor = '#eab308'; // Tailwind yellow-600
    } else if (metCount >= 1) {
        strengthText = 'Weak';
        strengthColor = 'text-orange-500';
        barColor = '#f97316'; // Tailwind orange-500
    } else {
        strengthText = 'Very Weak';
        strengthColor = 'text-red-600';
        barColor = '#dc2626'; // Tailwind red-600
    }

    passwordStrengthLabel.textContent = strengthText;
    passwordStrengthLabel.className = `font-semibold ${strengthColor}`; // Apply color class

    // Update password strength bar
    let barWidth = (metCount / 5) * 100; // Percentage of requirements met
    if (password.length === 0) {
        barWidth = 0; // No bar if no password
    }
    passwordStrengthBar.style.width = `${barWidth}%`;
    passwordStrengthBar.style.backgroundColor = barColor;


    // Enable/disable signup button based on all requirements met
    const allRequirementsMet = Object.values(requirements).every(Boolean);
    signupBtn.disabled = !allRequirementsMet;
}


// --- Authentication Logic ---

/**
 * Handles user sign-up.
 */
async function handleSignUp() {
    authErrorDiv.classList.add('hidden');
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        authErrorMessage.textContent = "Email and password cannot be empty.";
        authErrorDiv.classList.remove('hidden');
        return;
    }

    // Re-run password requirements check to ensure all are met before signup attempt
    updatePasswordRequirements();
    if (signupBtn.disabled) { // If button is disabled, it means requirements weren't met
        authErrorMessage.textContent = "Please meet all password requirements.";
        authErrorDiv.classList.remove('hidden');
        return;
    }

    setButtonLoading(signupBtn, true, 'Sign Up');
    setButtonLoading(signinBtn, true, 'Sign In');
    setButtonLoading(googleAuthBtn, true, '<i class="fab fa-google mr-2"></i> Google');


    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
        // Reinstating signOut and the specific success message for signup
        await signOut(auth); // End the session immediately after signup
        showMessage("Sign-up successful! A verification email has been sent to your inbox. Please verify to sign in.", false); // No resend button here
    } catch (error) {
        authErrorMessage.textContent = error.message;
        authErrorDiv.classList.remove('hidden');
    } finally {
        setButtonLoading(signupBtn, false, 'Sign Up');
        setButtonLoading(signinBtn, false, 'Sign In');
        setButtonLoading(googleAuthBtn, false, '<i class="fab fa-google mr-2"></i> Google');
    }
}

/**
 * Handles user sign-in.
 */
async function handleSignIn() {
    authErrorDiv.classList.add('hidden');
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        authErrorMessage.textContent = "Email and password cannot be empty.";
        authErrorDiv.classList.remove('hidden');
        return;
    }

    setButtonLoading(signupBtn, true, 'Sign Up');
    setButtonLoading(signinBtn, true, 'Sign In');
    setButtonLoading(googleAuthBtn, true, '<i class="fab fa-google mr-2"></i> Google');

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        if (!userCredential.user.emailVerified) {
            // Only show resend button if signing in with unverified email
            showMessage("Your email is not verified. Please check your inbox for a verification link.", true);
            await signOut(auth); // Sign out if not verified
        }
        // The onAuthStateChanged observer will handle the redirect to dashboard.
    } catch (error) {
        authErrorMessage.textContent = error.message;
        authErrorDiv.classList.remove('hidden');
    } finally {
        setButtonLoading(signupBtn, false, 'Sign Up');
        setButtonLoading(signinBtn, false, 'Sign In');
        setButtonLoading(googleAuthBtn, false, '<i class="fab fa-google mr-2"></i> Google');
    }
}

/**
 * Handles Google Sign-in/Sign-up.
 */
async function handleGoogleAuth() {
    authErrorDiv.classList.add('hidden');
    setButtonLoading(signupBtn, true, 'Sign Up');
    setButtonLoading(signinBtn, true, 'Sign In');
    setButtonLoading(googleAuthBtn, true, '<i class="fab fa-google mr-2"></i> Google');

    try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        // onAuthStateChanged will handle the redirect
    } catch (error) {
        authErrorMessage.textContent = error.message;
        authErrorDiv.classList.remove('hidden');
    } finally {
        setButtonLoading(signupBtn, false, 'Sign Up');
        setButtonLoading(signinBtn, false, 'Sign In');
        setButtonLoading(googleAuthBtn, false, '<i class="fab fa-google mr-2"></i> Google');
    }
}

/**
 * Resends the verification email.
 */
async function resendVerification() {
    const user = auth.currentUser;
    if (user) {
        try {
            await sendEmailVerification(user);
            showMessage("Verification email resent successfully. Please check your inbox.");
        } catch (error) {
            showMessage(`Failed to resend verification email: ${error.message}`);
        }
    } else {
        // This case should ideally not be hit if the button is only shown when a user exists
        showMessage("No active user session found to resend verification email.");
    }
}

/**
 * Handles password reset request.
 */
async function handleForgotPassword() {
    const email = emailInput.value.trim();
    if (!email) {
        showMessage("Please enter your email address to reset your password.");
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        showMessage(`Password reset email sent to ${email}. Please check your inbox.`);
    } catch (error) {
        showMessage(`Failed to send password reset email: ${error.message}`);
    }
}


// --- Event Listeners ---

/**
 * Attaches all primary event listeners for the authentication page.
 */
function attachEventListeners() {
    signupBtn.addEventListener('click', handleSignUp);
    signinBtn.addEventListener('click', handleSignIn);
    googleAuthBtn.addEventListener('click', handleGoogleAuth);
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent default link behavior
        handleForgotPassword();
    });

    // Toggle password visibility
    togglePasswordVisibility.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePasswordVisibility.querySelector('i').classList.toggle('fa-eye');
        togglePasswordVisibility.querySelector('i').classList.toggle('fa-eye-slash');
    });

    // Dynamic password requirements check
    passwordInput.addEventListener('input', updatePasswordRequirements);

    // Message Box close button
    closeMessageBtn.addEventListener('click', hideMessage);
    messageBoxResendBtn.addEventListener('click', resendVerification);
    document.getElementById('message-box-close-icon').addEventListener('click', hideMessage); // For the 'x' icon
}

// --- Initialization ---

/**
 * Main function to initialize the application.
 */
async function main() {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    attachEventListeners();
    updatePasswordRequirements(); // Initial check for empty password field

    // Handle authentication state
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            await user.reload(); // Get latest user state
            if (user.emailVerified) {
                // User is authenticated and verified, redirect to dashboard
                window.location.href = 'dashboard.html';
            } else {
                // User is signed in but email is not verified
                // Display a message and keep them on the auth page
                showMessage("Your email is not verified. Please check your inbox for a verification link.", true);
                switchView('auth-view');
                // Ensure email field is pre-filled for resend
                emailInput.value = user.email;
                // Sign out the user if they are unverified and trying to access
                // This ensures they cannot proceed until verified.
                await signOut(auth);
            }
        } else {
            // User is signed out or not logged in, show auth view
            switchView('auth-view');
        }
        loadingIndicator.classList.add('hidden'); // Hide loading indicator once auth state is determined
    });
}

// Run the app
main();
