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
            // If user is null and we are waiting for custom token auth, do nothing yet.
            // This prevents premature redirects if the initial auth state is not yet established.
            if (!user && typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                // We are likely in the process of signing in with custom token.
                // Do not redirect yet, wait for the next onAuthStateChanged event.
                return;
            }

            if (user) {
                await user.reload(); // Important for checking latest emailVerified status

                if (user.emailVerified) {
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
                    // User is signed in but email not verified
                    // DO NOT sign out here. Keep them signed in on the login page
                    // so they can use the "Resend Verification Email" link.
                    // The redirection logic below will handle sending them to the login page
                    // if they are on addleads.html.
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
                // No user signed in (and not waiting for custom token)
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

// Add event listener to log out when the tab is closed
window.addEventListener('beforeunload', async () => {
    if (auth && auth.currentUser) {
        try {
            await signOut(auth);
            console.log("User signed out on tab close.");
        } catch (error) {
            console.error("Error signing out on tab close:", error);
        }
    }
});
