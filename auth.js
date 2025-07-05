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
    setPersistence,
    browserSessionPersistence,
    browserLocalPersistence,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

import {
    getFirestore,
    doc,
    setDoc,
    updateDoc,
    serverTimestamp,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Utils ---
import { showMessage, hideMessage } from './utils.js';

// --- Firebase Config ---
const firebaseConfig = {
    apiKey: "AIzaSyD6gijBHmULvJBIjTaoNP9miVr2ZYCKDSg",
    authDomain: "outreachwebapp-139d4.firebaseapp.com",
    projectId: "outreachwebapp-139d4",
    storageBucket: "outreachwebapp-139d4.firebasestorage.app",
    messagingSenderId: "189767218255",
    appId: "1:189767218255:web:dd2f5925fdcb15ed9ba63a"
};

// --- App State ---
let auth;
let db;
const appId = firebaseConfig.appId;

// --- DOM Elements ---
const loadingIndicator = document.getElementById('loading-indicator');
const authView = document.getElementById('auth-view');

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

const closeMessageBtn = document.getElementById('close-message-btn');
const messageBoxResendBtn = document.getElementById('message-box-resend-btn');
const messageBoxCloseIcon = document.getElementById('message-box-close-icon');

// --- Utility Functions (Same as your original logic) ---
function switchView(viewId) {
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

function resetAuthForm() {
    emailInput.value = '';
    passwordInput.value = '';
    authErrorDiv.classList.add('hidden');
    emailError.classList.add('hidden');
    passwordError.classList.add('hidden');
    const passwordStrengthLabel = document.getElementById('password-strength-label');
    const passwordStrengthBar = document.getElementById('password-strength-bar');
    if (passwordStrengthLabel) passwordStrengthLabel.textContent = '';
    if (passwordStrengthBar) {
        passwordStrengthBar.style.width = '0%';
        passwordStrengthBar.style.backgroundColor = '#e5e7eb';
    }
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
            element.querySelector('i').classList.add('fa-times-circle');
        }
    }
}

function setButtonLoading(button, isLoading, originalText) {
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Loading...';
    } else {
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

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
    } else {
        passwordError.classList.add('hidden');
    }
    updatePasswordStrength(password);
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
        const el = passwordRequirementsElements[key];
        if (el) {
            if (requirements[key]) {
                el.classList.remove('text-red-500');
                el.classList.add('text-green-500');
                el.querySelector('i').classList.remove('fa-times-circle');
                el.querySelector('i').classList.add('fa-check-circle');
                metCount++;
            } else {
                el.classList.remove('text-green-500');
                el.classList.add('text-red-500');
                el.querySelector('i').classList.remove('fa-check-circle');
                el.querySelector('i').classList.add('fa-times-circle');
            }
        }
    }

    const strengthTexts = ['Very Weak', 'Weak', 'Moderate', 'Strong', 'Very Strong'];
    const barColors = ['#dc2626', '#f97316', '#eab308', '#22c55e', '#15803d'];
    if (passwordStrengthLabel) {
        passwordStrengthLabel.textContent = strengthTexts[metCount] || '';
        passwordStrengthLabel.className = `font-semibold text-${barColors[metCount] || 'gray-500'}`;
    }
    if (passwordStrengthBar) {
        passwordStrengthBar.style.width = `${(metCount / 5) * 100}%`;
        passwordStrengthBar.style.backgroundColor = barColors[metCount] || '#e5e7eb';
    }
}

// --- SIGN UP ---
async function handleSignUp() {
    authErrorDiv.classList.add('hidden');
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!validateEmailInput() || !validatePasswordInput()) return;

    setButtonLoading(signupBtn, true, 'Sign Up');
    try {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);

        const userRef = doc(db, `artifacts/${appId}/users/${user.uid}/profile`, user.uid);
        await setDoc(userRef, {
            email: user.email,
            emailVerified: false,
            createdAt: serverTimestamp()
        });

        await sendEmailVerification(user);
        await signOut(auth);
        showMessage(`✅ Sign up successful! Verification email sent to ${email}.`, false);
        resetAuthForm();
    } catch (error) {
        authErrorMessage.textContent = error.message;
        authErrorDiv.classList.remove('hidden');
    } finally {
        setButtonLoading(signupBtn, false, 'Sign Up');
    }
}

// --- SIGN IN ---
async function handleSignIn() {
    authErrorDiv.classList.add('hidden');
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!validateEmailInput() || !validatePasswordInput()) return;

    setButtonLoading(signinBtn, true, 'Sign In');
    try {
        await setPersistence(auth, rememberMeCheckbox.checked ? browserLocalPersistence : browserSessionPersistence);
        const { user } = await signInWithEmailAndPassword(auth, email, password);
        await user.reload();

        if (!user.emailVerified) {
            showMessage(`⚠️ Your email ${user.email} is not verified.`, true);
            await signOut(auth);
            resetAuthForm();
        } else {
            const userRef = doc(db, `artifacts/${appId}/users/${user.uid}/profile`, user.uid);
            await updateDoc(userRef, {
                emailVerified: true,
                lastSignInTime: serverTimestamp()
            });
            resetAuthForm();
        }
    } catch (error) {
        authErrorMessage.textContent = error.message;
        authErrorDiv.classList.remove('hidden');
    } finally {
        setButtonLoading(signinBtn, false, 'Sign In');
    }
}

// --- GOOGLE AUTH ---
async function handleGoogleAuth() {
    setButtonLoading(googleAuthBtn, true, '<i class="fab fa-google mr-2"></i> Google');
    try {
        const provider = new GoogleAuthProvider();
        await setPersistence(auth, rememberMeCheckbox.checked ? browserLocalPersistence : browserSessionPersistence);
        const { user } = await signInWithPopup(auth, provider);

        const userRef = doc(db, `artifacts/${appId}/users/${user.uid}/profile`, user.uid);
        const existing = await getDoc(userRef);
        if (!existing.exists()) {
            await setDoc(userRef, {
                email: user.email,
                displayName: user.displayName || '',
                photoURL: user.photoURL || '',
                emailVerified: user.emailVerified,
                createdAt: serverTimestamp()
            });
        } else {
            await updateDoc(userRef, {
                emailVerified: user.emailVerified,
                lastSignInTime: serverTimestamp()
            });
        }
        resetAuthForm();
    } catch (error) {
        authErrorMessage.textContent = error.message;
        authErrorDiv.classList.remove('hidden');
    } finally {
        setButtonLoading(googleAuthBtn, false, '<i class="fab fa-google mr-2"></i> Google');
    }
}

// --- Resend Verification ---
async function resendVerification() {
    const email = emailInput.value.trim();
    if (!email) return showMessage("Enter your email to resend the verification.");
    showMessage("To resend, please sign in again. A new email will be sent automatically if still unverified.");
}

// --- Forgot Password ---
async function handleForgotPassword() {
    const email = emailInput.value.trim();
    if (!email) return showMessage("Enter your email to reset your password.");
    try {
        await sendPasswordResetEmail(auth, email);
        showMessage("Password reset email sent.");
        emailInput.value = '';
    } catch (error) {
        authErrorMessage.textContent = error.message;
        authErrorDiv.classList.remove('hidden');
    }
}

// --- Event Listeners ---
function attachEventListeners() {
    signupBtn.addEventListener('click', handleSignUp);
    signinBtn.addEventListener('click', handleSignIn);
    googleAuthBtn.addEventListener('click', handleGoogleAuth);
    messageBoxResendBtn.addEventListener('click', resendVerification);
    forgotPasswordLink.addEventListener('click', handleForgotPassword);
    togglePasswordVisibility.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePasswordVisibility.querySelector('i').classList.toggle('fa-eye');
        togglePasswordVisibility.querySelector('i').classList.toggle('fa-eye-slash');
    });
    emailInput.addEventListener('input', validateEmailInput);
    passwordInput.addEventListener('input', validatePasswordInput);
    closeMessageBtn.addEventListener('click', hideMessage);
    messageBoxCloseIcon.addEventListener('click', hideMessage);
}

// --- Init ---
async function main() {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    attachEventListeners();
    resetAuthForm();

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            await user.reload();
            if (user.emailVerified) {
                window.location.href = 'dashboard.html';
            } else {
                showMessage("⚠️ Your email is not verified. Please check your inbox.", true);
                switchView('auth-view');
                emailInput.value = user.email;
                await signOut(auth);
                resetAuthForm();
            }
        } else {
            switchView('auth-view');
            resetAuthForm();
        }
        loadingIndicator.classList.add('hidden');
    });
}
main();
