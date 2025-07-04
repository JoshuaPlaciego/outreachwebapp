import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Global Firebase Instances ---
let db;
let auth;

// --- IMPORTANT: Your Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyD6gijBHmULvJBIjTaoNP9miVr2ZYCKDSg",
    authDomain: "outreachwebapp-139d4.firebaseapp.com",
    projectId: "outreachwebapp-139d4",
    storageBucket: "outreachwebapp-139d4.firebasestorage.app",
    messagingSenderId: "189767218255",
    appId: "1:189767218255:web:dd2f5925fdcb15ed9ba63a"
};
const appId = firebaseConfig.projectId; // Used for Firestore collection paths

// --- Shared DOM Element References (for custom message box) ---
const customMessageBoxOverlay = document.getElementById('custom-message-box-overlay');
const messageTextSpan = document.getElementById('message-text');
const closeMessageBtn = document.getElementById('close-message-btn');

// --- Shared State for synchronization between login.js and main.js ---
// This flag indicates if a sign-in operation is currently in progress.
// It helps main.js defer routing decisions until login.js has completed its authentication.
window.isSigningIn = false;

// --- Shared Functions ---

/**
 * Displays a custom message box (modal).
 * @param {string} message The message to display.
 */
function showMessage(message) {
    if (customMessageBoxOverlay && messageTextSpan) {
        customMessageBoxOverlay.style.display = 'flex'; // Explicitly set to flex
        messageTextSpan.textContent = message;
    }
}

/**
 * Hides the custom message box (modal).
 */
function hideMessage() {
    if (customMessageBoxOverlay && messageTextSpan) {
        customMessageBoxOverlay.style.display = 'none'; // Explicitly set to none
        messageTextSpan.textContent = ''; // Clear message
    }
}

/**
 * Initializes the application, setting up Firebase and routing.
 */
async function initApp() {
    // Ensure the custom message box is hidden on initial load
    hideMessage();

    try {
        // Initialize Firebase app
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // Make db, auth, showMessage, hideMessage, and appId globally accessible
        // These will be available to dynamically imported scripts
        window.db = db;
        window.auth = auth;
        window.appId = appId;
        window.showMessage = showMessage;
        window.hideMessage = hideMessage;

        // Determine if we are on the login page (index.html) or the main app page (addleads.html)
        const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/');

        // Listen for auth state changes to handle routing
        onAuthStateChanged(auth, async (user) => {
            // If a sign-in operation is in progress, defer routing until it completes.
            // This prevents race conditions where onAuthStateChanged fires before emailVerified is updated.
            if (window.isSigningIn) {
                console.log("Sign-in in progress, deferring onAuthStateChanged routing.");
                return;
            }

            if (user) {
                let isVerified = user.emailVerified;
                let attempts = 0;
                const maxAttempts = 5; // Max retries
                const delayMs = 500; // Delay between retries in milliseconds

                // Retry mechanism to ensure emailVerified status is up-to-date
                while (!isVerified && attempts < maxAttempts) {
                    attempts++;
                    console.log(`Attempt ${attempts}: Checking email verification status...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs)); // Wait
                    try {
                        await user.reload(); // Reload user data
                        await user.getIdToken(true); // Force refresh of ID token to get latest claims
                        isVerified = user.emailVerified; // Update status after reload
                    } catch (reloadError) {
                        console.error("Error reloading user or refreshing token in onAuthStateChanged:", reloadError);
                        // If reload/getIdToken fails, it might mean the session is no longer valid.
                        // For a production app, you might want to force a sign-out here.
                        break; // Exit retry loop
                    }
                }

                // Now, check the emailVerified status after retries
                if (isVerified) {
                    // User is authenticated and email is verified
                    if (isLoginPage) {
                        // If on login page, redirect to addleads.html
                        window.location.href = 'addleads.html';
                    } else {
                        // If already on addleads.html, load addleads.js
                        import('./addleads.js')
                            .then(module => {
                                if (module.initAddLeadsPage) {
                                    module.initAddLeadsPage(user); // Pass user object for initial setup
                                }
                            })
                            .catch(error => console.error("Error loading addleads.js:", error));
                    }
                } else {
                    // User is signed in but email not verified (even after retries)
                    // Force sign out unverified user to prevent partial access
                    await signOut(auth);
                    if (!isLoginPage) {
                        // If on addleads.html, redirect to login page (index.html)
                        window.location.href = 'index.html';
                    } else {
                        // If already on login page, load login.js and show verification message
                        import('./login.js')
                            .then(module => {
                                if (module.initLoginPage) {
                                    module.initLoginPage(user); // Pass user object to login.js for message
                                }
                            })
                            .catch(error => console.error("Error loading login.js:", error));
                    }
                }
            } else {
                // No user signed in
                if (!isLoginPage) {
                    // If on addleads.html, redirect to login page (index.html)
                    window.location.href = 'index.html';
                } else {
                    // If already on login page, load login.js
                    import('./login.js')
                        .then(module => {
                            if (module.initLoginPage) {
                                module.initLoginPage(null); // No user, pass null
                            }
                        })
                        .catch(error => console.error("Error loading login.js:", error));
                }
            }
        });

    } catch (error) {
        console.error("Failed to initialize Firebase:", error);
        showMessage("Failed to load application. Please ensure Firebase configuration is correct and try refreshing.");
    }
}

// --- Event Listeners for Shared Elements ---
document.addEventListener('DOMContentLoaded', initApp);
if (closeMessageBtn) {
    closeMessageBtn.addEventListener('click', hideMessage);
}
