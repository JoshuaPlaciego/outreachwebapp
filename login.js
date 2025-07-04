// login.js (cleaned-up and optimized)

import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// --- DOM Elements ---
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

let authError = '';
let infoMessage = '';

function renderAuthForm() {
    authErrorDiv.classList.add('hidden');
    infoMessageDiv.classList.add('hidden');
    hideEmailVerificationMessage();

    if (authError) {
        authErrorDiv.classList.remove('hidden');
        authErrorMessageSpan.textContent = authError;
    } else if (infoMessage) {
        infoMessageDiv.classList.remove('hidden');
        infoMessageTextSpan.textContent = infoMessage;
    }
}

function showEmailVerificationMessage(email) {
    verificationEmailDisplay.textContent = email;
    emailVerificationMessageDiv.classList.remove('hidden');
    inlineResendLink.classList.remove('hidden');

    authErrorDiv.classList.add('hidden');
    infoMessageDiv.classList.add('hidden');
}

function hideEmailVerificationMessage() {
    emailVerificationMessageDiv.classList.add('hidden');
    verificationEmailDisplay.textContent = '';
    inlineResendLink.classList.add('hidden');
}

async function handleSignUp() {
    resetMessages();

    const email = authEmailInput.value;
    const password = authPasswordInput.value;

    if (!email || !password) return showError('Email and password are required for sign up.');
    if (password.length < 6) return showError('Password must be at least 6 characters long.');

    try {
        const { user } = await createUserWithEmailAndPassword(window.auth, email, password);
        await sendEmailVerification(user);
        showInfo(`Account created for ${user.email}! A verification email has been sent. Please verify and then sign in.`);
    } catch (error) {
        handleAuthError(error);
    } finally {
        clearInputs();
    }
}

async function handleSignIn() {
    resetMessages();

    const email = authEmailInput.value;
    const password = authPasswordInput.value;

    if (!email || !password) return showError('Email and password are required for sign in.');

    try {
        const { user } = await signInWithEmailAndPassword(window.auth, email, password);
        await user.reload();

        if (!user.emailVerified) {
            showEmailVerificationMessage(user.email);
        } else {
            showInfo('Successfully signed in and email verified!');
        }
    } catch (error) {
        handleAuthError(error);
    } finally {
        clearInputs();
    }
}

async function handleResendVerificationEmail() {
    resetMessages();

    const user = window.auth.currentUser;
    if (!user) return showError('No user is currently signed in.');

    try {
        await sendEmailVerification(user);
        showInfo('Verification email re-sent! Please check your inbox.');
    } catch (error) {
        showError(`Failed to resend verification email: ${error.message}`);
    }
}

function showError(message) {
    authError = message;
    infoMessage = '';
    renderAuthForm();
}

function showInfo(message) {
    infoMessage = message;
    authError = '';
    renderAuthForm();
}

function resetMessages() {
    authError = '';
    infoMessage = '';
    renderAuthForm();
}

function clearInputs() {
    authEmailInput.value = '';
    authPasswordInput.value = '';
}

export function initLoginPage(user) {
    authSection.classList.remove('hidden');

    if (user && !user.emailVerified) {
        showEmailVerificationMessage(user.email);
    } else {
        hideEmailVerificationMessage();
    }

    signupBtn.addEventListener('click', handleSignUp);
    signinBtn.addEventListener('click', handleSignIn);
    inlineResendLink.addEventListener('click', (e) => {
        e.preventDefault();
        handleResendVerificationEmail();
    });

    renderAuthForm();
}

function handleAuthError(error) {
    console.error("Auth Error:", error);
    switch (error.code) {
        case 'auth/email-already-in-use':
            showError('This email is already registered. Please sign in or use a different email.');
            break;
        case 'auth/invalid-email':
            showError('Invalid email address format.');
            break;
        case 'auth/weak-password':
            showError('Password is too weak. Please choose a stronger password.');
            break;
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
            showError('Invalid email or password. Please check your credentials and try again.');
            break;
        case 'auth/user-disabled':
            showError('Your account has been disabled. Please contact support.');
            break;
        default:
            showError(`Authentication Failed: ${error.message}`);
            break;
    }
}
