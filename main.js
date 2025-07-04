// main.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { initLoginPage } from "./login.js";
import { initAddLeadsPage } from "./addleads.js";

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyD6gijBHmULvJBIjTaoNP9miVr2ZYCKDSg",
    authDomain: "outreachwebapp-139d4.firebaseapp.com",
    projectId: "outreachwebapp-139d4",
    storageBucket: "outreachwebapp-139d4.appspot.com",
    messagingSenderId: "189767218255",
    appId: "1:189767218255:web:dd2f5925fdcb15ed9ba63a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Make Firebase services globally available
window.auth = auth;
window.db = db;
window.appId = firebaseConfig.projectId;

// Global showMessage utility
window.showMessage = (msg) => {
    const overlay = document.getElementById("custom-message-box-overlay");
    const messageText = document.getElementById("message-text");
    const closeButton = document.getElementById("close-message-btn");

    if (overlay && messageText && closeButton) {
        messageText.textContent = msg;
        overlay.style.display = "flex";
        closeButton.onclick = () => {
            overlay.style.display = "none";
        };
    } else {
        alert(msg);
    }
};

// Auth state observer
onAuthStateChanged(auth, (user) => {
    const path = window.location.pathname;

    if (path.includes("addleads.html")) {
        if (user && user.emailVerified) {
            initAddLeadsPage(user);
        } else {
            window.location.href = "index.html";
        }
    } else {
        initLoginPage(user);
    }
});
