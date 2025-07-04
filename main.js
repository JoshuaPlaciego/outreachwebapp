// main.js (Updated with Logout button functionality)

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let db;
let auth;

const firebaseConfig = {
    apiKey: "AIzaSyD6gijBHmULvJBIjTaoNP9miVr2ZYCKDSg",
    authDomain: "outreachwebapp-139d4.firebaseapp.com",
    projectId: "outreachwebapp-139d4",
    storageBucket: "outreachwebapp-139d4.appspot.com",
    messagingSenderId: "189767218255",
    appId: "1:189767218255:web:dd2f5925fdcb15ed9ba63a"
};

const appId = firebaseConfig.projectId;

const customMessageBoxOverlay = document.getElementById('custom-message-box-overlay');
const messageTextSpan = document.getElementById('message-text');
const closeMessageBtn = document.getElementById('close-message-btn');
const authSection = document.getElementById('auth-section');
const appContent = document.getElementById('app-content');
const currentUserIdSpan = document.getElementById('current-user-id');
const userIdDisplay = document.getElementById('user-id-display');
const logoutBtn = document.getElementById('logout-btn');

let isRedirecting = false;

function showMessage(message) {
    if (customMessageBoxOverlay && messageTextSpan) {
        customMessageBoxOverlay.style.display = 'flex';
        messageTextSpan.textContent = message;
    }
}

function hideMessage() {
    if (customMessageBoxOverlay && messageTextSpan) {
        customMessageBoxOverlay.style.display = 'none';
        messageTextSpan.textContent = '';
    }
}

async function initApp() {
    hideMessage();

    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        await setPersistence(auth, browserLocalPersistence);

        window.db = db;
        window.auth = auth;
        window.appId = appId;
        window.showMessage = showMessage;
        window.hideMessage = hideMessage;

        const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/');

        onAuthStateChanged(auth, async (user) => {
            if (isRedirecting) return;

            if (!user && typeof __initial_auth_token !== 'undefined' && __initial_auth_token) return;

            if (user) {
                try {
                    await user.reload();
                } catch (reloadError) {
                    console.warn("Error reloading user, proceeding with cached user data:", reloadError);
                }

                if (user.emailVerified) {
                    if (isLoginPage) {
                        isRedirecting = true;
                        window.location.href = 'addleads.html';
                    } else {
                        if (authSection) authSection.classList.add('hidden');
                        if (appContent) appContent.classList.remove('hidden');
                        import('./addleads.js')
                            .then(module => module.initAddLeadsPage && module.initAddLeadsPage(user))
                            .catch(error => console.error("Error loading addleads.js:", error));
                    }
                } else {
                    if (!isLoginPage) {
                        isRedirecting = true;
                        window.location.href = 'index.html';
                    } else {
                        if (authSection) authSection.classList.remove('hidden');
                        if (appContent) authSection.classList.add('hidden');
                        import('./login.js')
                            .then(module => module.initLoginPage && module.initLoginPage(user))
                            .catch(error => console.error("Error loading login.js:", error));
                    }
                }
            } else {
                if (!isLoginPage) {
                    isRedirecting = true;
                    window.location.href = 'index.html';
                } else {
                    if (authSection) authSection.classList.remove('hidden');
                    if (appContent) authSection.classList.add('hidden');
                    import('./login.js')
                        .then(module => module.initLoginPage && module.initLoginPage(null))
                        .catch(error => console.error("Error loading login.js:", error));
                }
            }
        });

    } catch (error) {
        console.error("Failed to initialize Firebase:", error);
        showMessage("Failed to load application. Please ensure Firebase configuration is correct and try refreshing.");
    }
}

document.addEventListener('DOMContentLoaded', initApp);
if (closeMessageBtn) closeMessageBtn.addEventListener('click', hideMessage);

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            console.log("User manually logged out.");
            window.location.href = 'index.html';
        } catch (error) {
            console.error("Error during manual logout:", error);
            showMessage("Logout failed. Please try again.");
        }
    });
}
