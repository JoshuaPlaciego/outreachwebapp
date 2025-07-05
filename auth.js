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
    setDoc,
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
const togglePasswordVisibility = document.getElementById('toggle-password-visibility'); // New
const passwordStrengthIndicator = document.getElementById('password-strength'); // New
const rememberMeCheckbox = document.getElementById('remember-me'); // New
const googleSignInBtn = document.getElementById('google-signin-btn'); // New
// Removed: const facebookSignInBtn = document.getElementById('facebook-signin-btn'); // New
const emailError = document.getElementById('email-error'); // New
const passwordError = document.getElementById('password-error'); // New
const recaptchaError = document.getElementById('recaptcha-error'); // New

// Message Box Elements
const closeMessageBtn = document.getElementById('close-message-btn'); // "Got It!" button
const messageBoxResendBtn = document.getElementById('message-box-resend-btn'); // Resend button inside message box
const messageBoxCloseIcon = document.getElementById('message-box-close-icon'); // Close icon

// --- Utility Functions ---

/**
 * Switches the main view of the application.
 * @param {string} viewId - The ID of the view to show ('auth-view', 'loading-indicator').
 */
function switchView(viewId) {
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
    passwordStrengthIndicator.className = 'text-xs mt-1'; // Reset strength indicator
    passwordStrengthIndicator.style.width = '0%'; // Ensure width is reset
    passwordStrengthIndicator.style.backgroundColor = 'transparent'; // Ensure background is reset
    recaptchaError.classList.add('hidden'); // Hide recaptcha error
    if (typeof grecaptcha !== 'undefined') { // Reset reCAPTCHA if it exists
        grecaptcha.reset();
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

    if (password.length < minLength && password.length > 0) {
        passwordError.textContent = `Password must be at least ${minLength} characters.`;
        passwordError.classList.remove('hidden');
        isValid = false;
    } else if (password.length === 0) {
        passwordError.classList.add('hidden');
        isValid = true; // No error if empty, but will be caught by overall validation
    } else {
        passwordError.classList.add('hidden');
    }

    updatePasswordStrength(password);
    return isValid;
}

/**
 * Updates the password strength indicator.
 * @param {string} password - The password string.
 */
function updatePasswordStrength(password) {
    let strength = 0;
    if (password.length >= 6) strength += 1;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength += 1;
    if (password.match(/\d/)) strength += 1;
    if (password.match(/[^a-zA-Z\d]/)) strength += 1;

    passwordStrengthIndicator.className = 'text-xs mt-1'; // Reset classes
    if (password.length === 0) {
        passwordStrengthIndicator.style.width = '0%';
        passwordStrengthIndicator.style.backgroundColor = 'transparent';
    } else if (strength <= 2) {
        passwordStrengthIndicator.classList.add('weak');
        passwordStrengthIndicator.style.width = '33%';
        passwordStrengthIndicator.style.backgroundColor = '#ef4444'; // red-500
    } else if (strength === 3) {
        passwordStrengthIndicator.classList.add('medium');
        passwordStrengthIndicator.style.width = '66%';
        passwordStrengthIndicator.style.backgroundColor = '#f59e0b'; // amber-500
    } else {
        passwordStrengthIndicator.classList.add('strong');
        passwordStrengthIndicator.style.width = '100%';
        passwordStrengthIndicator.style.backgroundColor = '#22c55e'; // green-500
    }
}

// --- Authentication Logic ---

/**
 * Handles user sign-up.
 */
async function handleSignUp() {
    authErrorDiv.classList.add('hidden');
    recaptchaError.classList.add('hidden'); // Hide reCAPTCHA error
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const recaptchaResponse = typeof grecaptcha !== 'undefined' ? grecaptcha.getResponse() : '';

    if (!validateEmailInput() || !validatePasswordInput() || !email || !password) {
        showMessage("Please correct the form errors.");
        return;
    }

    if (recaptchaResponse.length === 0) {
        recaptchaError.classList.remove('hidden');
        return;
    }

    setButtonLoading(signupBtn, true, 'Sign Up');

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
        resetAuthForm(); // Clear fields after successful signup and sign out
        showMessage(`Sign up successful! Please check your inbox for a verification link sent to your ${email}.`, false);

    } catch (error) {
        authErrorMessage.textContent = error.message;
        authErrorDiv.classList.remove('hidden');
    } finally {
        setButtonLoading(signupBtn, false, 'Sign Up');
        if (typeof grecaptcha !== 'undefined') grecaptcha.reset(); // Reset reCAPTCHA
    }
}

/**
 * Handles user sign-in.
 */
async function handleSignIn() {
    authErrorDiv.classList.add('hidden');
    recaptchaError.classList.add('hidden'); // Hide reCAPTCHA error
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const recaptchaResponse = typeof grecaptcha !== 'undefined' ? grecaptcha.getResponse() : '';
    const rememberMe = rememberMeCheckbox.checked;

    if (!validateEmailInput() || !validatePasswordInput() || !email || !password) {
        showMessage("Please correct the form errors.");
        return;
    }

    if (recaptchaResponse.length === 0) {
        recaptchaError.classList.remove('hidden');
        return;
    }

    setButtonLoading(signinBtn, true, 'Sign In');

    try {
        // Set persistence based on "Remember Me" checkbox
        await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);

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
            // If email is not verified, show verification message via general message box
            // Pass true to showResendButton to display the "Resend Verification Email" button
            showMessage(`Your email address ${user.email} is not verified. Please check your inbox for a verification link or click resend.`, true);
            authErrorDiv.classList.add('hidden'); // Hide auth error if verification is the issue
            switchView('auth-view');
            loadingIndicator.classList.add('hidden');
            await signOut(auth); // Sign out if not verified to force re-login after verification
        }

    } catch (error) {
        authErrorMessage.textContent = error.message;
        authErrorDiv.classList.remove('hidden');
    } finally {
        setButtonLoading(signinBtn, false, 'Sign In');
        if (typeof grecaptcha !== 'undefined') grecaptcha.reset(); // Reset reCAPTCHA
    }
}

/**
 * Handles social sign-in (Google).
 */
async function handleGoogleSignIn() {
    setButtonLoading(googleSignInBtn, true, '<i class="fab fa-google mr-2"></i> Google');
    try {
        const provider = new GoogleAuthProvider();
        await setPersistence(auth, rememberMeCheckbox.checked ? browserLocalPersistence : browserSessionPersistence);
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Check if user exists in Firestore, if not, create a basic record
        const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
            await setDoc(userDocRef, {
                email: user.email,
                displayName: user.displayName,
                emailVerified: user.emailVerified,
                providerId: result.providerId,
                createdAt: serverTimestamp()
            });
        } else {
            // Update existing user record if necessary (e.g., emailVerified status)
            await updateDoc(userDocRef, {
                emailVerified: user.emailVerified,
                lastSignInTime: serverTimestamp()
            });
        }
        // onAuthStateChanged will handle redirect to dashboard
    } catch (error) {
        authErrorMessage.textContent = error.message;
        authErrorDiv.classList.remove('hidden');
    } finally {
        setButtonLoading(googleSignInBtn, false, '<i class="fab fa-google mr-2"></i> Google');
    }
}

// Removed handleFacebookSignIn function
// async function handleFacebookSignIn() {
//     setButtonLoading(facebookSignInBtn, true, '<i class="fab fa-facebook-f mr-2"></i> Facebook');
//     try {
//         const provider = new FacebookAuthProvider();
//         await setPersistence(auth, rememberMeCheckbox.checked ? browserLocalPersistence : browserSessionPersistence);
//         const result = await signInWithPopup(auth, provider);
//         const user = result.user;

//         // Check if user exists in Firestore, if not, create a basic record
//         const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, user.uid);
//         const userDocSnap = await getDoc(userDocRef);

//         if (!userDocSnap.exists()) {
//             await setDoc(userDocRef, {
//                 email: user.email,
//                 displayName: user.displayName,
//                 emailVerified: user.emailVerified,
//                 providerId: result.providerId,
//                 createdAt: serverTimestamp()
//             });
//         } else {
//             // Update existing user record if necessary (e.g., emailVerified status)
//             await updateDoc(userDocRef, {
//                 emailVerified: user.emailVerified,
//                 lastSignInTime: serverTimestamp()
//             });
//         }
//         // onAuthStateChanged will handle redirect to dashboard
//     } catch (error) {
//         authErrorMessage.textContent = error.message;
//         authErrorDiv.classList.remove('hidden');
//     } finally {
//         setButtonLoading(facebookSignInBtn, false, '<i class="fab fa-facebook-f mr-2"></i> Facebook');
//     }
// }


/**
 * Resends the verification email.
 */
async function resendVerification() {
    const user = auth.currentUser; // Get the currently signed-in user

    if (!user) {
        showMessage("Please sign in with the email you wish to verify, then try resending.");
        return;
    }

    const emailToVerify = emailInput.value.trim();

    if (!emailToVerify) {
        showMessage("Please enter your email address in the email field to resend the verification link.");
        return;
    }

    if (user.email !== emailToVerify) {
        showMessage("The email in the input field does not match your signed-in account. Please ensure they match or sign in with the correct account.");
        return;
    }

    try {
        await sendEmailVerification(user); // send to the current user
        showMessage("Verification email sent successfully. Please check your inbox.");
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
    googleSignInBtn.addEventListener('click', handleGoogleSignIn); // New
    // Removed: facebookSignInBtn.addEventListener('click', handleFacebookSignIn); // Removed

    // Attach listener to the new message box resend button
    messageBoxResendBtn.addEventListener('click', (e) => {
        e.preventDefault();
        resendVerification();
    });

    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        handleForgotPassword();
    });

    // Event listener for password visibility toggle
    togglePasswordVisibility.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        // Toggle eye icon
        togglePasswordVisibility.querySelector('i').classList.toggle('fa-eye');
        togglePasswordVisibility.querySelector('i').classList.toggle('fa-eye-slash');
    });

    // Real-time input validation
    emailInput.addEventListener('input', validateEmailInput);
    passwordInput.addEventListener('input', validatePasswordInput);

    // Message box close buttons
    closeMessageBtn.addEventListener('click', () => {
        hideMessage(); // This will also hide the resend button via utils.js
    });
    messageBoxCloseIcon.addEventListener('click', () => {
        hideMessage(); // This will also hide the resend button via utils.js
    });
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
                // User is signed in but email is not verified.
                // We do NOT show the message here. It will only be shown if
                // handleSignIn specifically detects an unverified user.
                authErrorDiv.classList.add('hidden');
                switchView('auth-view');
                loadingIndicator.classList.add('hidden');
            }
        } else {
            // User is signed out, show auth view and clear form
            switchView('auth-view');
            resetAuthForm(); // Clear fields on sign out
            loadingIndicator.classList.add('hidden');
        }
    });
}

// Run the app
main();
