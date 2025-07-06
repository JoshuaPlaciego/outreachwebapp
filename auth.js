// auth.js
console.log("auth.js script started."); // Debugging log

// --- Firebase SDK Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    signOut,
    sendPasswordResetEmail,
    setPersistence, // Import setPersistence
    browserSessionPersistence, // For "Remember Me" (session)
    browserLocalPersistence,   // For "Remember Me" (local)
    GoogleAuthProvider,        // For Google Sign-in
    signInWithPopup            // For social sign-in popups
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc, // Keep setDoc just in case it's used elsewhere, but remove for user profile creation
    updateDoc,
    serverTimestamp,
    getDoc // Import getDoc for checking existing user documents
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
const forgotPasswordLink = document.getElementById('forgot-password-link');
const togglePasswordVisibility = document.getElementById('toggle-password-visibility');
const passwordStrengthIndicator = document.getElementById('password-strength');
const rememberMeCheckbox = document.getElementById('remember-me');
const googleAuthBtn = document.getElementById('google-auth-btn');
const emailError = document.getElementById('email-error');
const passwordError = document.getElementById('password-error');

// Message Box Elements (These are now handled by utils.js, but references are kept for event listeners)
const closeMessageBtn = document.getElementById('close-message-btn');
const messageBoxResendBtn = document.getElementById('message-box-resend-btn');
const messageBoxCloseIcon = document.getElementById('message-box-close-icon'); // Close icon
// Removed reference to messageBoxLogoutBtn as it will be removed from HTML


// --- Utility Functions (Local functions that don't need to be in utils.js) ---

/**
 * Switches the main view of the application.
 * @param {string} viewId - The ID of the view to show ('auth-view', 'loading-indicator').
 */
function switchView(viewId) {
    console.log(`Switching view to: ${viewId}`); // Debugging log
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

/**
 * Resets the authentication form fields.
 */
function resetAuthForm() {
    emailInput.value = '';
    passwordInput.value = '';
    authErrorDiv.classList.add('hidden'); // Also hide any auth errors
    emailError.classList.add('hidden'); // Hide email specific error
    passwordError.classList.add('hidden'); // Hide password specific error
    // Reset password strength indicator visuals
    const passwordStrengthLabel = document.getElementById('password-strength-label');
    const passwordStrengthBar = document.getElementById('password-strength-bar');
    if (passwordStrengthLabel) passwordStrengthLabel.textContent = '';
    if (passwordStrengthBar) {
        passwordStrengthBar.style.width = '0%';
        passwordStrengthBar.style.backgroundColor = '#e5e7eb'; // Default gray
    }
    // Reset password requirements checklist icons
    const passwordRequirements = {
        length: document.getElementById('req-length'),
        uppercase: document.getElementById('req-uppercase'),
        lowercase: document.getElementById('req-lowercase'),
        number: document.getElementById('req-number'),
        special: document.getElementById('req-special') 
    };
    for (const key in passwordRequirements) {
        const element = passwordRequirements[key];
        if (element) {
            element.classList.remove('text-green-500');
            element.classList.add('text-red-500');
            element.querySelector('i').classList.remove('fa-check-circle');
            element.querySelector('i').classList.add('fa-times-circle'); // Ensure it's times-circle
        }
    }
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
 * Validates email input in real-time.
 */
function validateEmailInput() {
    const email = emailInput.value.trim();
    if (email === '') {
        emailError.classList.add('hidden');
        return true;
    }
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValid) {
        emailError.textContent = "Invalid email format.";
        emailError.classList.remove('hidden');
    } else {
        emailError.classList.add('hidden');
    }
    return isValid;
}

/**
 * Validates password input in real-time and updates strength.
 */
function validatePasswordInput() {
    const password = passwordInput.value;
    const minLength = 6;
    let isValid = true;

    // Password length validation
    if (password.length < minLength && password.length > 0) {
        passwordError.textContent = `Password must be at least ${minLength} characters.`;
        passwordError.classList.remove('hidden');
        isValid = false;
    } else if (password.length === 0) {
        passwordError.classList.add('hidden');
    } else {
        passwordError.classList.add('hidden');
    }

    updatePasswordStrength(password);

    // Check all requirements for signup button enablement
    const requirements = {
        length: password.length >= 6,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/.test(password)
    };
    const allRequirementsMet = Object.values(requirements).every(Boolean);
    signupBtn.disabled = !allRequirementsMet;

    return isValid && allRequirementsMet;
}


/**
 * Updates the password strength indicator.
 * @param {string} password - The password string.
 */
function updatePasswordStrength(password) {
    const passwordStrengthLabel = document.getElementById('password-strength-label');
    const passwordStrengthBar = document.getElementById('password-strength-bar');
    const passwordRequirementsElements = {
        length: document.getElementById('req-length'),
        uppercase: document.getElementById('req-uppercase'),
        lowercase: document.getElementById('req-lowercase'),
        number: document.getElementById('req-number'),
        special: document.getElementById('req-special') 
    };

    const requirements = {
        length: password.length >= 6,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*()_+{}\[\]:;<>,.?\\/-]/.test(password) 
    };

    let metCount = 0;
    for (const key in requirements) {
        const element = passwordRequirementsElements[key];
        if (element) { 
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
    }

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

    if (passwordStrengthLabel) {
        passwordStrengthLabel.textContent = strengthText;
        passwordStrengthLabel.className = `font-semibold ${strengthColor}`;
    }
    if (passwordStrengthBar) {
        const barWidth = (metCount / 5) * 100;
        passwordStrengthBar.style.width = `${barWidth}%`;
        passwordStrengthBar.style.backgroundColor = barColor;
    }
}


// --- Authentication Logic ---

/**
 * Handles user sign-up.
 */
async function handleSignUp() {
    console.log("handleSignUp called."); // Debugging log
    authErrorDiv.classList.add('hidden');
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!validateEmailInput() || !validatePasswordInput() || !email || !password) {
        authErrorMessage.textContent = "Please correct the form errors.";
        authErrorDiv.classList.remove('hidden');
        return;
    }

    setButtonLoading(signupBtn, true, 'Sign Up');
    setButtonLoading(signinBtn, true, 'Sign In');
    setButtonLoading(googleAuthBtn, true, '<i class="fab fa-google mr-2"></i> Google');

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("User created in Firebase Authentication:", user.uid, user.email);

        await sendEmailVerification(user);
        
        // Set a flag in session storage to indicate a fresh signup
        sessionStorage.setItem('justSignedUp', 'true');
        
        // DO NOT showMessage here. Let onAuthStateChanged handle the message.
        
        resetAuthForm(); // Clear fields and reset strength after successful signup
        
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
    console.log("handleSignIn called."); // Debugging log
    authErrorDiv.classList.add('hidden');
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const rememberMe = rememberMeCheckbox.checked;

    if (!validateEmailInput() || !validatePasswordInput() || !email || !password) {
        authErrorMessage.textContent = "Please correct the form errors.";
        authErrorDiv.classList.remove('hidden');
        return;
    }

    setButtonLoading(signinBtn, true, 'Sign In');
    setButtonLoading(signupBtn, true, 'Sign Up');
    setButtonLoading(googleAuthBtn, true, '<i class="fab fa-google mr-2"></i> Google');

    try {
        // Set persistence based on "Remember Me" checkbox
        await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await user.reload(); // Get latest emailVerified status
        console.log("User signed in. Email verified status after reload:", user.emailVerified); // Debugging log

        resetAuthForm(); // Clear fields on successful sign-in

        // Explicit redirection for verified users after successful sign-in
        if (user.emailVerified) {
            console.log("handleSignIn: User is verified. Redirecting to dashboard.html");
            sessionStorage.removeItem('justSignedUp'); // Clear the signup flag once verified
            window.location.href = 'dashboard.html';
        } else {
            // If user is not verified, stay on auth page and show message
            console.log("handleSignIn: User is NOT verified. Showing verification message.");
            const messageToDisplay = `Your email (${user.email}) is already signed up successfully but needs to be email verified. Please check your inbox for a verification link to grant full access.`;
            sessionStorage.removeItem('justSignedUp'); // Clear the flag after displaying
            showMessage(messageToDisplay, true, false);
        }

    } catch (error) {
        authErrorMessage.textContent = error.message;
        authErrorDiv.classList.remove('hidden');
    } finally {
        setButtonLoading(signinBtn, false, 'Sign In');
        setButtonLoading(signupBtn, false, 'Sign Up');
        setButtonLoading(googleAuthBtn, false, '<i class="fab fa-google mr-2"></i> Google');
    }
}

/**
 * Handles Google Sign-up/Sign-in.
 * This single function will handle both new user creation and existing user sign-in via Google.
 */
async function handleGoogleAuth() {
    console.log("handleGoogleAuth called."); // Debugging log
    authErrorDiv.classList.add('hidden');
    setButtonLoading(googleAuthBtn, true, '<i class="fab fa-google mr-2"></i> Google');
    setButtonLoading(signupBtn, true, 'Sign Up');
    setButtonLoading(signinBtn, true, 'Sign In');

    try {
        const provider = new GoogleAuthProvider();
        await setPersistence(auth, rememberMeCheckbox.checked ? browserLocalPersistence : browserSessionPersistence);
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        console.log("Google sign-in/up successful. Firestore user profile logic skipped as requested.");
        resetAuthForm(); // Clear fields after successful Google Auth
        // The onAuthStateChanged listener will handle redirection or message display
    } catch (error) {
        authErrorMessage.textContent = error.message;
        authErrorDiv.classList.remove('hidden');
    } finally {
        setButtonLoading(googleAuthBtn, false, '<i class="fab fa-google mr-2"></i> Google');
        setButtonLoading(signupBtn, false, 'Sign Up');
        setButtonLoading(signinBtn, false, 'Sign In');
    }
}


/**
 * Handles user logout.
 */
async function handleLogout() {
    try {
        await signOut(auth);
        // After logout, clear any messages and redirect to the auth page
        hideMessage(); // Ensure message box is hidden
        sessionStorage.removeItem('justSignedUp'); // Clear the signup flag on logout
        window.location.href = 'index.html'; // Redirect to login page
    } catch (error) {
        console.error("Logout error:", error);
        showMessage(`Logout failed: ${error.message}`);
    }
}

/**
 * Resends the verification email.
 */
async function resendVerification() {
    console.log("resendVerification called."); // Debugging log
    // We need the email from the input field as the user might be signed out
    const user = auth.currentUser; // Get the current user directly from auth

    if (!user) {
        showMessage("No user logged in to resend verification email. Please sign in.", false);
        return;
    }

    try {
        await sendEmailVerification(user);
        // Changed showMessage to not include a logout button
        showMessage("Verification email sent! Please check your inbox.", true, false); 
        
    } catch (error) {
        // Changed showMessage to not include a logout button
        showMessage(`Failed to resend verification email: ${error.message}`, true, false); 
    }
}

/**
 * Handles the "Forgot Password" functionality.
 */
async function handleForgotPassword() {
    console.log("handleForgotPassword called."); // Debugging log
    const email = emailInput.value.trim();
    if (!email) {
        showMessage("Please enter your email address to reset your password.");
        return;
    }
    try {
        await sendPasswordResetEmail(auth, email);
        showMessage("Password reset email sent! Please check your inbox for instructions.");
        emailInput.value = ''; // Clear email field after sending reset email
    } catch (error) {
        authErrorMessage.textContent = error.message; // Display error on the form
        authErrorDiv.classList.remove('hidden');
    }
}

// --- Event Listeners ---

/**
 * Attaches all primary event listeners for the authentication page.
 */
function attachEventListeners() {
    console.log("attachEventListeners called."); // Debugging log
    // Ensure buttons exist before attaching listeners
    if (signupBtn) signupBtn.addEventListener('click', handleSignUp);
    if (signinBtn) signinBtn.addEventListener('click', handleSignIn);
    if (googleAuthBtn) googleAuthBtn.addEventListener('click', handleGoogleAuth);

    // Attach listener to the new message box resend button
    if (messageBoxResendBtn) messageBoxResendBtn.addEventListener('click', (e) => {
        e.preventDefault();
        resendVerification();
    });

    // Removed attachment for messageBoxLogoutBtn as it will be removed from HTML
    // if (messageBoxLogoutBtn) { 
    //     messageBoxLogoutBtn.addEventListener('click', handleLogout);
    // }

    if (forgotPasswordLink) forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        handleForgotPassword();
    });

    // Event listener for password visibility toggle
    if (togglePasswordVisibility) togglePasswordVisibility.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        // Toggle eye icon
        togglePasswordVisibility.querySelector('i').classList.toggle('fa-eye');
        togglePasswordVisibility.querySelector('i').classList.toggle('fa-eye-slash');
    });

    // Real-time input validation
    if (emailInput) emailInput.addEventListener('input', validateEmailInput);
    if (passwordInput) passwordInput.addEventListener('input', validatePasswordInput);

    // Message box close buttons
    if (closeMessageBtn) closeMessageBtn.addEventListener('click', () => {
        hideMessage();
    });
    if (messageBoxCloseIcon) messageBoxCloseIcon.addEventListener('click', () => {
        hideMessage();
    });
    console.log("Event listeners attached."); // Debugging log
}

// --- Initialization ---

/**
 * Main function to initialize the authentication page.
 */
async function main() {
    console.log("main() function started."); // Debugging log
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    attachEventListeners();
    resetAuthForm(); // Initial reset of form fields and strength indicator

    // Handle authentication state
    onAuthStateChanged(auth, async (user) => {
        console.log("onAuthStateChanged triggered. User:", user ? user.email : "null", "Email Verified:", user ? user.emailVerified : "N/A"); // Debugging log
        if (user) {
            await user.reload(); // Get latest user state
            // userId is not needed here as it's for dashboard context, but keeping for consistency if other logic relies on it.
            // userId = user.uid; 

            if (user.emailVerified) {
                // User is authenticated AND verified, redirect to dashboard
                console.log("onAuthStateChanged: User is verified. Redirecting to dashboard."); // Debugging log
                sessionStorage.removeItem('justSignedUp'); // Clear the signup flag once verified
                window.location.href = 'dashboard.html';
            } else {
                // User is signed in but email is NOT verified.
                // Keep them on the auth page and show the verification message.
                console.log("onAuthStateChanged: User is unverified. Staying on auth page and showing message."); // Debugging log
                switchView('auth-view');

                // Always use the universal message for unverified users
                const messageToDisplay = `Your email (${user.email}) is already signed up successfully but needs to be email verified. Please check your inbox for a verification link to grant full access.`;
                
                // Clear the 'justSignedUp' flag after displaying the message, regardless of its initial state
                sessionStorage.removeItem('justSignedUp'); 
                
                // Changed showMessage to not include a logout button
                showMessage(messageToDisplay, true, false); 
                // Pre-fill email for convenience if they want to try logging in again
                emailInput.value = user.email; 
            }
        } else {
            // User is signed out or not logged in, show auth view
            console.log("onAuthStateChanged: User is signed out/not logged in. Showing auth view."); // Debugging log
            switchView('auth-view');
            // Ensure fields are clear when signed out
            resetAuthForm();
            sessionStorage.removeItem('justSignedUp'); // Clear the flag if user signs out
        }
        loadingIndicator.classList.add('hidden'); // Hide loading indicator once auth state is determined
        console.log("Loading indicator hidden."); // Debugging log
    });
    console.log("onAuthStateChanged listener attached."); // Debugging log
}

// Run the app
main();
console.log("main() function called."); // Debugging log
