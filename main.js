// main.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { initLoginPage } from "./login.js";

// --- Firebase Config ---
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();

// Make globally accessible (optional but common in modular setups)
window.app = app;
window.db = db;
window.auth = auth;
window.appId = firebaseConfig.projectId;

// --- Simple feedback message ---
window.showMessage = (message) => {
    const messageBoxOverlay = document.getElementById("custom-message-box-overlay");
    const messageText = document.getElementById("message-text");
    const closeBtn = document.getElementById("close-message-btn");

    if (!messageBoxOverlay || !messageText || !closeBtn) return;

    messageText.textContent = message;
    messageBoxOverlay.style.display = "flex";

    const close = () => {
        messageBoxOverlay.style.display = "none";
        closeBtn.removeEventListener("click", close);
    };

    closeBtn.addEventListener("click", close);
};

// --- Auth State Listener ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        await user.reload();

        if (user.emailVerified) {
            import("./addleads.js").then(module => {
                module.initAddLeadsPage(user);
            });
        } else {
            initLoginPage(user); // Shows the verification needed message with resend option
        }
    } else {
        initLoginPage(null); // No user logged in
    }
});
