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


// --- Utility Functions (Local functions that don't need to be in utils.js) ---

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
        special: /[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/.test(password)
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

        // --- Create User Profile Document in Firestore ---
        const userProfileRef = doc(db, `artifacts/${appId}/users/${user.uid}/profile`, user.uid);
        await setDoc(userProfileRef, {
            email: user.email,
            createdAt: serverTimestamp(),
        });
        console.log("User profile document created in Firestore for UID:", user.uid);
        // --- End Create User Profile Document ---

        await sendEmailVerification(user);
        
        // Sign out immediately after successful signup and sending verification email
        await signOut(auth);
        
        // Add a small delay to allow onAuthStateChanged to process the signOut before showing the message
        setTimeout(() => {
            // Show success message WITHOUT resend button
            showMessage(`Sign up successful! A verification email has been sent to ${email}. Please verify to sign in.`, false);
            resetAuthForm(); // Clear fields and reset strength after successful signup
        }, 100); // 100ms delay
        
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

        // Reload user to get latest emailVerified status
        await user.reload();

        if (user.emailVerified) {
            // Update Firestore user document's emailVerified status if it's now true
            const userDocRef = doc(db, `artifacts/${appId}/users/${user.uid}/profile`, user.uid);
            await updateDoc(userDocRef, {
                emailVerified: true,
                lastSignInTime: serverTimestamp()
            });
            resetAuthForm(); // Clear fields on successful sign-in
            // onAuthStateChanged will handle redirect to dashboard
        } else {
            // If email is not verified, show verification message via general message box
            // Pass true to showResendButton to display the "Resend Verification Email" button
            showMessage(`Your email address ${user.email} is not verified. Please check your inbox for a verification link or click resend.`, true);
            authErrorDiv.classList.add('hidden'); // Hide auth error if verification is the issue
            switchView('auth-view');
            loadingIndicator.classList.add('hidden');
            await signOut(auth); // Sign out if not verified to force re-login after verification
            resetAuthForm(); // Clear fields after sign out
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
    authErrorDiv.classList.add('hidden');
    setButtonLoading(googleAuthBtn, true, '<i class="fab fa-google mr-2"></i> Google');
    setButtonLoading(signupBtn, true, 'Sign Up');
    setButtonLoading(signinBtn, true, 'Sign In');

    try {
        const provider = new GoogleAuthProvider();
        await setPersistence(auth, rememberMeCheckbox.checked ? browserLocalPersistence : browserSessionPersistence);
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Check if user exists in Firestore, if not, create a basic record
        const userProfileRef = doc(db, `artifacts/${appId}/users/${user.uid}/profile`, user.uid);
        const userProfileSnap = await getDoc(userProfileRef);

        if (!userProfileSnap.exists()) {
            await setDoc(userProfileRef, {
                email: user.email,
                displayName: user.displayName || null,
                photoURL: user.photoURL || null,
                emailVerified: user.emailVerified, // Google typically provides verified email
                createdAt: serverTimestamp()
            });
            console.log("New Google user profile document created in Firestore for UID:", user.uid);
        } else {
            // Update existing user record if necessary (e.g., emailVerified status, last login)
            await updateDoc(userProfileRef, {
                emailVerified: user.emailVerified,
                lastSignInTime: serverTimestamp()
            });
            console.log("Existing Google user profile found and updated in Firestore for UID:", user.uid);
        }
        resetAuthForm(); // Clear fields after successful Google Auth
        // onAuthStateChanged will handle redirect to dashboard
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
 * Resends the verification email.
 */
async function resendVerification() {
    // We need the email from the input field as the user might be signed out
    const emailToVerify = emailInput.value.trim();

    if (!emailToVerify) {
        showMessage("Please enter your email address in the email field to resend the verification link.");
        return;
    }

    try {
        // To resend verification, the user needs to be authenticated.
        // Since the current flow signs out unverified users, we'll prompt them to sign in again.
        // A new verification link will be sent automatically if their email is still unverified upon sign-in.
        showMessage("To resend the verification email, please sign in again with your email and password. A new verification link will be sent automatically if your email is still unverified.", false);
        
    } catch (error) {
        showMessage(`Failed to resend verification email: ${error.message}`);
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
    signupBtn.addEventListener('click', handleSignUp);
    signinBtn.addEventListener('click', handleSignIn);
    googleAuthBtn.addEventListener('click', handleGoogleAuth);

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
        hideMessage();
    });
    messageBoxCloseIcon.addEventListener('click', () => {
        hideMessage();
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
    resetAuthForm(); // Initial reset of form fields and strength indicator

    // Handle authentication state
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            await user.reload(); // Get latest user state
            if (user.emailVerified) {
                // User is authenticated and verified, redirect to dashboard
                window.location.href = 'dashboard.html';
            } else {
                // User is signed in but email is not verified.
                // This state is reached if they refresh the page while signed in but unverified.
                // In this specific scenario, we sign them out. The message will be shown
                // when they attempt to sign in again.
                console.log("Unverified user detected by onAuthStateChanged. Signing out.");
                await signOut(auth);
            }
        } else {
            // User is signed out or not logged in, show auth view
            switchView('auth-view');
            // Ensure fields are clear when signed out
            resetAuthForm();
        }
        loadingIndicator.classList.add('hidden'); // Hide loading indicator once auth state is determined
    });
}

// Run the app
main();
