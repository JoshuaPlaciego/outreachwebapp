// main.js

import { auth, db } from "./firebaseInit.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { initLoginPage } from "./login.js";
import { initAddLeadsPage } from "./addleads.js";

// Attach Firebase services globally
window.auth = auth;
window.db = db;
window.appId = "outreachwebapp-139d4"; // Optional, for organizing your Firestore structure

// Simple reusable message modal
window.showMessage = (message) => {
    const overlay = document.getElementById('custom-message-box-overlay');
    const messageText = document.getElementById('message-text');
    const closeButton = document.getElementById('close-message-btn');

    if (messageText) messageText.textContent = message;
    if (overlay) overlay.style.display = 'flex';

    if (closeButton) {
        closeButton.onclick = () => {
            overlay.style.display = 'none';
        };
    }
};

// Sections
const authSection = document.getElementById('auth-section');
const appContent = document.getElementById('app-content');

function showLoginPage(user) {
    if (appContent) appContent.classList.add('hidden');
    if (authSection) authSection.classList.remove('hidden');
    initLoginPage(user);
}

function showAddLeadsPage(user) {
    if (authSection) authSection.classList.add('hidden');
    if (appContent) appContent.classList.remove('hidden');
    initAddLeadsPage(user);
}

// Watch auth state
onAuthStateChanged(auth, (user) => {
    if (user) {
        user.reload().then(() => {
            if (!user.emailVerified) {
                showLoginPage(user);
            } else {
                showAddLeadsPage(user);
            }
        });
    } else {
        showLoginPage(null);
    }
});
