// main.js
import { auth, db } from './firebaseInit.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { initLoginPage } from './login.js';
import { initAddLeadsPage } from './addleads.js';
import { initResendVerificationPage } from './resendVerification.js';

// Attach to window so other modules can access
window.auth = auth;
window.db = db;
window.appId = 'outreachwebapp-139d4';

// Global feedback message function
window.showMessage = (msg) => {
    console.log(msg);
    alert(msg); // Replace this with your own custom message box if desired
};

// Route based on auth state
onAuthStateChanged(auth, (user) => {
    console.log("Auth state changed. User:", user);

    const path = window.location.pathname;

    if (path.includes('resendVerification.html')) {
        initResendVerificationPage();
    } else if (!user) {
        initLoginPage(null);
    } else if (!user.emailVerified) {
        initLoginPage(user);
    } else {
        initAddLeadsPage(user);
    }
});
