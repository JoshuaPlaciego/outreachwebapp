import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Global Firebase Instances ---
let db;
let auth;

// --- IMPORTANT: Your Firebase Configuration ---
// This configuration is now directly embedded.
// Ensure these details match your Firebase project exactly.
const firebaseConfig = {
    apiKey: "AIzaSyD6gijBHmULvJBIjTaoNP9miVr2ZYCKDSg",
    authDomain: "outreachwebapp-139d4.firebaseapp.com",
    projectId: "outreachwebapp-139d4",
    storageBucket: "outreachwebapp-139d4.firebasestorage.app",
    messagingSenderId: "189767218255",
    appId: "1:189767218255:web:dd2f5925fdcb15ed9ba63a"
};
// The appId for the Firestore collection path should be the projectId
const appId = firebaseConfig.projectId;

// --- DOM Element References (Global/Shared) ---
const customMessageBoxOverlay = document.getElementById('custom-message-box-overlay');
const messageTextSpan = document.getElementById('message-text');
const closeMessageBtn = document.getElementById('close-message-btn');

// These elements are specific to either index.html or addleads.html
// They are declared here but will only be accessed if they exist on the current page.
const authSection = document.getElementById('auth-section');
const appContent = document.getElementById('app-content');
const currentUserIdSpan = document.getElementById('current-user-id');
const userIdDisplay = document.getElementById('user-id-display');
const logoutBtn = document.getElementById('logout-btn');


// --- Global State Variables (Shared, but mostly for addleads.js) ---
// These are declared here to be globally accessible if addleads.js needs them
// but their direct manipulation from main.js is minimized.
let currentUserId = null;
let leads = [];
let validationError = ''; // Used for general app errors, not auth errors
let authError = ''; // State for authentication errors, managed by login.js primarily

// --- Functions (Global/Shared) ---

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

// Note: showEmailVerificationMessage, hideEmailVerificationMessage, renderForm
// are now primarily handled within login.js and addleads.js as appropriate.
// main.js will pass the user object to them for initialization.

/**
 * Initializes the application, setting up Firebase and routing.
 */
async function initApp() {
    // Ensure the custom message box is hidden on initial load
    hideMessage();

    try {
        // Initialize Firebase app with the directly provided config
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // Make db, auth, showMessage, hideMessage, and appId globally accessible
        window.db = db;
        window.auth = auth;
        window.appId = appId;
        window.showMessage = showMessage;
        window.hideMessage = hideMessage;

        // Determine if we are on the login page (index.html) or the main app page (addleads.html)
        const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/');

        // Listen for auth state changes to handle routing
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Always reload and refresh token to get the absolute latest status
                try {
                    await user.reload();
                    await user.getIdToken(true); // Force token refresh
                } catch (reloadError) {
                    console.error("Error reloading user or refreshing token in onAuthStateChanged:", reloadError);
                    // If reload/getIdToken fails, it might mean the session is no longer valid.
                    // Force sign out to prevent stale sessions.
                    await signOut(auth);
                    if (!isLoginPage) { // Only redirect if not already on login page
                        window.location.href = 'index.html';
                    }
                    return; // Exit as user state is uncertain
                }

                if (user.emailVerified) {
                    // User is authenticated and email is verified
                    currentUserId = user.uid; // Set current user ID globally
                    if (isLoginPage) {
                        // If on login page, redirect to addleads.html
                        window.location.href = 'addleads.html';
                    } else {
                        // If already on addleads.html, load addleads.js and initialize it
                        import('./addleads.js')
                            .then(module => {
                                if (module.initAddLeadsPage) {
                                    module.initAddLeadsPage(user); // Pass user object for initial setup
                                }
                            })
                            .catch(error => console.error("Error loading addleads.js:", error));

                        // Update UI elements specific to addleads.html if they exist
                        if (currentUserIdSpan) currentUserIdSpan.textContent = user.email || user.uid;
                        if (userIdDisplay) userIdDisplay.classList.remove('hidden');
                        if (authSection) authSection.classList.add('hidden'); // Hide auth section if it somehow appears
                        if (appContent) appContent.classList.remove('hidden'); // Show app content
                        // No need to set authError here, as it's a success state
                    }
                } else {
                    // User is signed in but email not verified
                    currentUserId = null; // Treat as not fully authenticated for app access
                    await signOut(auth); // Force sign out unverified user

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
                        
                        // Ensure login page elements are visible and app content is hidden
                        if (authSection) authSection.classList.remove('hidden');
                        if (appContent) appContent.classList.add('hidden');
                    }
                }
            } else {
                // No user signed in
                currentUserId = null;
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
                    
                    // Ensure login page elements are visible and app content is hidden
                    if (authSection) authSection.classList.remove('hidden');
                    if (appContent) appContent.classList.add('hidden');
                }
                // Clear leads and hide leads list if no user
                leads = [];
                // renderLeadsList() is now in addleads.js, no need to call here
            }
            // renderForm() is also specific to addleads.js, no need to call here
        });

    } catch (error) {
        console.error("Failed to initialize Firebase:", error);
        showMessage("Failed to load application. Please ensure Firebase configuration is correct and try refreshing.");
    }
}

// --- Event Listeners (Global) ---
document.addEventListener('DOMContentLoaded', initApp);

// Close message box listener
if (closeMessageBtn) {
    closeMessageBtn.addEventListener('click', hideMessage);
}

// Logout button listener (only exists on addleads.html, but main.js can handle it)
// This listener needs to be attached conditionally if logoutBtn exists on the current page.
// It's better handled within addleads.js for clarity, but kept here for global handling.
const logoutBtn = document.getElementById('logout-btn'); // Re-fetch here to ensure it's not null on addleads.html
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            // onAuthStateChanged will handle redirection
        } catch (error) {
            console.error("Sign Out Error:", error);
            showMessage(`Sign Out Failed: ${error.message}`);
        }
    });
}
