// --- Firebase SDK Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    signOut,
    signInWithCustomToken,
    signInAnonymously
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    onSnapshot,
    deleteDoc,
    doc,
    updateDoc,
    serverTimestamp,
    query,
    where
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- App State & Config ---
let auth, db, userId, leadsUnsubscribe = null;
let leads = [];
let editingLeadId = null;

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD6gijBHmULvJBIjTaoNP9miVr2ZYCKDSg",
    authDomain: "outreachwebapp-139d4.firebaseapp.com",
    projectId: "outreachwebapp-139d4",
    storageBucket: "outreachwebapp-139d4.firebasestorage.app",
    messagingSenderId: "189767218255",
    appId: "1:189767218255:web:dd2f5925fdcb15ed9ba63a"
};

// The appId is now derived directly from the firebaseConfig
const appId = firebaseConfig.appId;

// --- DOM Element References ---
const loadingIndicator = document.getElementById('loading-indicator');
const authView = document.getElementById('auth-view');
const appView = document.getElementById('app-view');

// Auth View Elements
const emailInput = document.getElementById('auth-email');
const passwordInput = document.getElementById('auth-password');
const signupBtn = document.getElementById('signup-btn');
const signinBtn = document.getElementById('signin-btn');
const authErrorDiv = document.getElementById('auth-error');
const authErrorMessage = document.getElementById('auth-error-message');
const verificationMessageDiv = document.getElementById('email-verification-message');
const verificationEmailDisplay = document.getElementById('verification-email-display');
const inlineResendLink = document.getElementById('inline-resend-link');

// App View Elements
const logoutBtn = document.getElementById('logout-btn');
const currentUserIdSpan = document.getElementById('current-user-id');
const formTitle = document.getElementById('form-title');
const validationErrorDiv = document.getElementById('validation-error');
const errorMessageSpan = document.getElementById('error-message');
const leadNameInput = document.getElementById('lead-name');
const leadEmailInput = document.getElementById('lead-email');
const callBookingLinkInput = document.getElementById('call-booking-link');
const instagramLinkInput = document.getElementById('instagram-link');
const youtubeLinkInput = document.getElementById('youtube-link');
const tiktokLinkInput = document.getElementById('tiktok-link');
const avgViewsInput = document.getElementById('avg-views');
const nichesContainer = document.getElementById('niches-container');
const otherNicheNotesContainer = document.getElementById('other-niche-notes-container');
const otherNicheNotesTextarea = document.getElementById('other-niche-notes');
const leadNotesTextarea = document.getElementById('lead-notes');
const addLeadBtn = document.getElementById('add-lead-btn');
const updateLeadBtn = document.getElementById('update-lead-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const leadsListDiv = document.getElementById('leads-list');
const noLeadsMessage = document.getElementById('no-leads-message');

// Message Box Elements
const messageOverlay = document.getElementById('custom-message-box-overlay');
const messageBox = document.getElementById('custom-message-box');
const messageText = document.getElementById('message-text');
const closeMessageBtn = document.getElementById('close-message-btn');

// --- Utility Functions ---

/**
 * Displays a custom message to the user.
 * @param {string} msg - The message to display.
 */
function showMessage(msg) {
    messageText.textContent = msg;
    messageOverlay.classList.remove('hidden');
    setTimeout(() => {
        messageOverlay.style.opacity = '1';
        messageBox.style.transform = 'scale(1)';
    }, 10);
}

/**
 * Hides the custom message box.
 */
function hideMessage() {
    messageOverlay.style.opacity = '0';
    messageBox.style.transform = 'scale(0.95)';
    setTimeout(() => {
        messageOverlay.classList.add('hidden');
    }, 300);
}

/**
 * Switches the main view of the application.
 * @param {string} viewId - The ID of the view to show ('auth-view', 'app-view', 'loading-indicator').
 */
function switchView(viewId) {
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

// --- Authentication Logic ---

/**
 * Handles user sign-up.
 */
async function handleSignUp() {
    authErrorDiv.classList.add('hidden');
    verificationMessageDiv.classList.add('hidden');
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        authErrorMessage.textContent = "Email and password cannot be empty.";
        authErrorDiv.classList.remove('hidden');
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
        showMessage("Sign-up successful! A verification email has been sent to your inbox. Please verify to sign in.");
        await signOut(auth); // Sign out to force user to verify first
    } catch (error) {
        authErrorMessage.textContent = error.message;
        authErrorDiv.classList.remove('hidden');
    }
}

/**
 * Handles user sign-in.
 */
async function handleSignIn() {
    authErrorDiv.classList.add('hidden');
    verificationMessageDiv.classList.add('hidden');
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        authErrorMessage.textContent = "Email and password cannot be empty.";
        authErrorDiv.classList.remove('hidden');
        return;
    }

    try {
        // The onAuthStateChanged observer will handle the redirect
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        authErrorMessage.textContent = error.message;
        authErrorDiv.classList.remove('hidden');
    }
}

/**
 * Resends the verification email.
 */
async function resendVerification() {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) {
        showMessage("Please enter your email and password to resend the verification link.");
        return;
    }
    try {
        // We need to sign in the user temporarily to get the user object
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        if (userCredential.user && !userCredential.user.emailVerified) {
            await sendEmailVerification(userCredential.user);
            showMessage("Verification email resent successfully. Please check your inbox.");
        } else if (userCredential.user.emailVerified) {
            showMessage("Your email is already verified. You can now sign in.");
        }
        await signOut(auth); // Sign out again
    } catch (error) {
        showMessage(`Resend failed: ${error.message}`);
    }
}

/**
 * Handles user sign-out.
 */
async function handleSignOut() {
    try {
        await signOut(auth);
        // The onAuthStateChanged observer will handle switching to the auth view.
        if (leadsUnsubscribe) {
            leadsUnsubscribe(); // Detach the Firestore listener
            leadsUnsubscribe = null;
        }
        leads = [];
        renderLeadsList();
    } catch (error) {
        showMessage(`Sign Out Failed: ${error.message}`);
    }
}

// --- Lead Management Logic ---

/**
 * Renders the niche checkboxes in the form.
 */
function renderNiches() {
    nichesContainer.innerHTML = '';
    poppyAINiches.forEach(niche => {
        const div = document.createElement('div');
        div.className = 'mb-2';
        const label = document.createElement('label');
        label.className = 'inline-flex items-center';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'niches';
        checkbox.value = niche.name;
        checkbox.className = 'form-checkbox h-4 w-4 text-indigo-600 rounded';
        label.appendChild(checkbox);
        const span = document.createElement('span');
        span.className = 'ml-2 text-gray-800 font-semibold';
        span.textContent = niche.name;
        label.appendChild(span);
        div.appendChild(label);
        nichesContainer.appendChild(div);
    });
    // Add event listener to the container for delegation
    nichesContainer.addEventListener('change', handleNicheChange);
}

/**
 * Handles changes to niche checkboxes.
 */
function handleNicheChange(e) {
    if (e.target.type === 'checkbox' && e.target.value === 'Others') {
        otherNicheNotesContainer.classList.toggle('hidden', !e.target.checked);
    }
}

/**
 * Gathers form data into an object.
 * @returns {object} The lead data object.
 */
function getFormData() {
    const selectedNiches = [];
    nichesContainer.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
        selectedNiches.push(cb.value);
    });

    const followerCountRadio = document.querySelector('input[name="followerCount"]:checked');

    return {
        name: leadNameInput.value.trim(),
        email: leadEmailInput.value.trim(),
        callBookingLink: callBookingLinkInput.value.trim(),
        instagramLink: instagramLinkInput.value.trim(),
        youtubeLink: youtubeLinkInput.value.trim(),
        tiktokLink: tiktokLinkInput.value.trim(),
        followerCount: followerCountRadio ? followerCountRadio.value : '',
        avgViews: avgViewsInput.value.trim(),
        niches: selectedNiches,
        otherNicheNotes: otherNicheNotesTextarea.value.trim(),
        notes: leadNotesTextarea.value.trim(),
    };
}

/**
 * Validates the lead form data.
 * @param {object} data - The lead data object.
 * @returns {string|null} An error message string or null if valid.
 */
function validateForm(data) {
    if (!data.name) return 'Lead Name is required.';
    const hasSocialLink = data.instagramLink || data.youtubeLink || data.tiktokLink;
    if (!hasSocialLink) return 'At least one social media link is required.';
    if (!data.followerCount) return 'Follower Count is required.';
    if (data.niches.length === 0) return 'At least one Niche must be selected.';
    if (data.niches.includes('Others') && !data.otherNicheNotes) return 'Please specify details for the "Others" niche.';
    return null;
}

/**
 * Resets the lead form to its initial state.
 */
function resetForm() {
    document.querySelectorAll('#app-view input[type="text"], #app-view input[type="email"], #app-view input[type="url"], #app-view input[type="number"], #app-view textarea').forEach(input => input.value = '');
    document.querySelectorAll('#app-view input[type="radio"], #app-view input[type="checkbox"]').forEach(input => input.checked = false);

    editingLeadId = null;
    validationErrorDiv.classList.add('hidden');
    otherNicheNotesContainer.classList.add('hidden');

    formTitle.textContent = 'Add New Lead';
    addLeadBtn.classList.remove('hidden');
    updateLeadBtn.classList.add('hidden');
    cancelEditBtn.classList.add('hidden');
}

/**
 * Adds a new lead to Firestore.
 */
async function handleAddLead() {
    const leadData = getFormData();
    const errorMessage = validateForm(leadData);
    if (errorMessage) {
        errorMessageSpan.textContent = errorMessage;
        validationErrorDiv.classList.remove('hidden');
        return;
    }
    validationErrorDiv.classList.add('hidden');

    try {
        const docRef = await addDoc(collection(db, `artifacts/${appId}/public/data/leads`), {
            ...leadData,
            createdBy: userId,
            createdAt: serverTimestamp(),
        });
        showMessage("Lead added successfully!");
        resetForm();
    } catch (e) {
        console.error("Error adding document: ", e);
        showMessage(`Error adding lead: ${e.message}`);
    }
}

/**
 * Populates the form for editing a lead.
 * @param {string} id - The ID of the lead to edit.
 */
function populateFormForEdit(id) {
    const lead = leads.find(l => l.id === id);
    if (!lead) return;

    editingLeadId = id;

    leadNameInput.value = lead.name || '';
    leadEmailInput.value = lead.email || '';
    callBookingLinkInput.value = lead.callBookingLink || '';
    instagramLinkInput.value = lead.instagramLink || '';
    youtubeLinkInput.value = lead.youtubeLink || '';
    tiktokLinkInput.value = lead.tiktokLink || '';
    avgViewsInput.value = lead.avgViews || '';
    leadNotesTextarea.value = lead.notes || '';
    otherNicheNotesTextarea.value = lead.otherNicheNotes || '';

    const followerRadio = document.querySelector(`input[name="followerCount"][value="${lead.followerCount}"]`);
    if (followerRadio) followerRadio.checked = true;

    nichesContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = lead.niches.includes(cb.value);
    });

    otherNicheNotesContainer.classList.toggle('hidden', !lead.niches.includes('Others'));

    formTitle.textContent = 'Edit Lead';
    addLeadBtn.classList.add('hidden');
    updateLeadBtn.classList.remove('hidden');
    cancelEditBtn.classList.remove('hidden');

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Updates an existing lead in Firestore.
 */
async function handleUpdateLead() {
    if (!editingLeadId) return;

    const leadData = getFormData();
    const errorMessage = validateForm(leadData);
    if (errorMessage) {
        errorMessageSpan.textContent = errorMessage;
        validationErrorDiv.classList.remove('hidden');
        return;
    }
    validationErrorDiv.classList.add('hidden');

    try {
        const leadRef = doc(db, `artifacts/${appId}/public/data/leads`, editingLeadId);
        await updateDoc(leadRef, {
            ...leadData,
            updatedAt: serverTimestamp()
        });
        showMessage("Lead updated successfully!");
        resetForm();
    } catch (e) {
        console.error("Error updating document: ", e);
        showMessage(`Error updating lead: ${e.message}`);
    }
}

/**
 * Deletes a lead from Firestore.
 * @param {string} id - The ID of the lead to delete.
 */
async function handleDeleteLead(id) {
    // A simple confirmation before deleting
    // Using a custom message box instead of confirm()
    showMessage("Are you sure you want to delete this lead? This action cannot be undone. \n\n (Click 'Got It!' to confirm deletion)");
    // Temporarily re-purpose the 'Got It!' button for confirmation
    const originalCloseMessageBtnHandler = closeMessageBtn.onclick; // Store original handler
    closeMessageBtn.onclick = async () => {
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/leads`, id));
            showMessage("Lead deleted successfully.");
        } catch (e) {
            console.error("Error removing document: ", e);
            showMessage(`Error deleting lead: ${e.message}`);
        } finally {
            hideMessage();
            closeMessageBtn.onclick = originalCloseMessageBtnHandler; // Restore original handler
        }
    };
}

/**
 * Renders the list of leads.
 */
function renderLeadsList() {
    leadsListDiv.innerHTML = '';
    if (leads.length === 0) {
        leadsListDiv.appendChild(noLeadsMessage);
        noLeadsMessage.classList.remove('hidden');
    } else {
        noLeadsMessage.classList.add('hidden');
        leads.forEach(lead => {
            const leadDiv = document.createElement('div');
            leadDiv.className = 'bg-white p-5 rounded-lg shadow-md border border-indigo-100 flex flex-col';
            leadDiv.innerHTML = `
                <div class="flex-grow">
                    <h3 class="text-xl font-bold text-gray-900">${lead.name || 'No Name'}</h3>
                    <div class="mt-2 space-y-1 text-sm">
                        ${lead.email ? `<p class="text-gray-600"><strong>Email:</strong> <a href="mailto:${lead.email}" class="text-indigo-500 hover:underline">${lead.email}</a></p>` : ''}
                        ${lead.callBookingLink ? `<p class="text-gray-600"><strong>Booking:</strong> <a href="${lead.callBookingLink}" target="_blank" rel="noopener noreferrer" class="text-indigo-500 hover:underline truncate inline-block max-w-full">${lead.callBookingLink}</a></p>` : ''}
                        <div class="flex flex-wrap gap-x-4">
                        ${lead.instagramLink ? `<p class="text-gray-600"><strong>IG:</strong> <a href="${lead.instagramLink}" target="_blank" rel="noopener noreferrer" class="text-purple-600 hover:underline">Profile</a></p>` : ''}
                        ${lead.youtubeLink ? `<p class="text-gray-600"><strong>YT:</strong> <a href="${lead.youtubeLink}" target="_blank" rel="noopener noreferrer" class="text-red-600 hover:underline">Channel</a></p>` : ''}
                        ${lead.tiktokLink ? `<p class="text-gray-600"><strong>TikTok:</strong> <a href="${lead.tiktokLink}" target="_blank" rel="noopener noreferrer" class="text-gray-800 hover:underline">Profile</a></p>` : ''}
                        </div>
                        ${lead.followerCount ? `<p class="text-gray-700"><strong>Followers:</strong> <span class="font-medium">${lead.followerCount}</span></p>` : ''}
                        ${lead.avgViews ? `<p class="text-gray-700"><strong>Avg. Views:</strong> <span class="font-medium">${lead.avgViews}</span></p>` : ''}
                    </div>
                    <div class="mt-3">
                        ${lead.niches && lead.niches.length > 0 ? `<p class="text-gray-700 text-sm"><strong>Niches:</strong> <span class="font-medium">${lead.niches.join(', ')}</span></p>` : ''}
                        ${lead.otherNicheNotes ? `<p class="text-gray-700 text-sm mt-1 italic"><strong>Other Niche:</strong> ${lead.otherNicheNotes}</p>` : ''}
                        ${lead.notes ? `<p class="text-gray-800 text-sm mt-2 italic bg-gray-50 p-2 rounded"><strong>Notes:</strong> ${lead.notes}</p>` : ''}
                    </div>
                </div>
                <div class="border-t mt-4 pt-3 flex justify-between items-center">
                     <p class="text-gray-400 text-xs">ID: ${lead.id.substring(0, 8)}...</p>
                     <div class="flex space-x-2">
                        <button data-id="${lead.id}" class="edit-btn px-4 py-2 bg-yellow-500 text-white rounded-lg shadow-sm hover:bg-yellow-600 transition text-sm">Edit</button>
                        <button data-id="${lead.id}" class="delete-btn px-4 py-2 bg-red-500 text-white rounded-lg shadow-sm hover:bg-red-600 transition text-sm">Delete</button>
                    </div>
                </div>
            `;
            leadsListDiv.appendChild(leadDiv);
        });
    }
}

// --- Event Listeners ---

/**
 * Attaches all primary event listeners for the app.
 */
function attachEventListeners() {
    // Auth
    signupBtn.addEventListener('click', handleSignUp);
    signinBtn.addEventListener('click', handleSignIn);
    inlineResendLink.addEventListener('click', (e) => {
        e.preventDefault();
        resendVerification();
    });
    logoutBtn.addEventListener('click', handleSignOut);

    // Lead Form
    addLeadBtn.addEventListener('click', handleAddLead);
    updateLeadBtn.addEventListener('click', handleUpdateLead);
    cancelEditBtn.addEventListener('click', resetForm);

    // Leads List (Event Delegation)
    leadsListDiv.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const id = target.dataset.id;
        if (target.classList.contains('edit-btn')) {
            populateFormForEdit(id);
        } else if (target.classList.contains('delete-btn')) {
            handleDeleteLead(id);
        }
    });

    // Message Box
    closeMessageBtn.addEventListener('click', hideMessage);
}

// --- Initialization ---

/**
 * Main function to initialize the application.
 */
async function main() {
    // These variables are now hardcoded directly from your Firebase project's config.
    // const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
    const initialAuthToken = null; // Set to null as it's not provided by GitHub Pages directly

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    attachEventListeners();
    renderNiches();

    // Handle authentication state
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            await user.reload(); // Get latest user state
            if (user.emailVerified) {
                userId = user.uid;
                currentUserIdSpan.textContent = userId;
                switchView('app-view');

                // Start Firestore listener if it's not already running
                if (!leadsUnsubscribe) {
                    const leadsCollectionRef = collection(db, `artifacts/${appId}/public/data/leads`);
                    // Query to get leads created by the current user
                    const q = query(leadsCollectionRef, where("createdBy", "==", userId));

                    leadsUnsubscribe = onSnapshot(q, (snapshot) => {
                        leads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        // Sort in memory (newest first)
                        leads.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));
                        renderLeadsList();
                    }, (error) => {
                        console.error("Error fetching leads:", error);
                        showMessage(`Error fetching leads: ${error.message}.`);
                    });
                }
            } else {
                // User is signed in but email is not verified
                verificationEmailDisplay.textContent = user.email;
                verificationMessageDiv.classList.remove('hidden');
                authErrorDiv.classList.add('hidden');
                switchView('auth-view');
            }
        } else {
            // User is signed out
            userId = null;
            switchView('auth-view');
            verificationMessageDiv.classList.add('hidden');
            authErrorDiv.classList.add('hidden');
            resetForm();
        }
    });

    // Attempt to sign in with the provided token (if any, though null in this setup)
    try {
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            // If no token, the onAuthStateChanged will correctly show the login page.
            // For GitHub Pages, you'll rely on direct email/password sign-in.
            switchView('auth-view'); // Ensure auth view is shown if no user/token
        }
    } catch (error) {
        console.error("Error signing in with custom token:", error);
        switchView('auth-view');
        showMessage("Session validation failed. Please sign in again.");
    }
}

// Run the app
main();
