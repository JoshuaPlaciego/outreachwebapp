// --- Firebase SDK Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signOut,
    EmailAuthProvider, // For re-authentication with email/password
    GoogleAuthProvider, // For re-authentication with Google
    reauthenticateWithCredential, // For re-authentication
    signInWithPopup, // For re-authentication with Google popup
    updatePassword // To update the user's password
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

// Import utility functions for messages
import { showMessage, hideMessage } from './utils.js';

// Your web app's Firebase configuration (duplicate for dashboard.js)
const firebaseConfig = {
    apiKey: "AIzaSyD6gijBHmULvJBIjTaoNP9miVr2ZYCKDSg",
    authDomain: "outreachwebapp-139d4.firebaseapp.com",
    projectId: "outreachwebapp-139d4",
    storageBucket: "outreachwebapp-139d4.firebasestorage.app",
    messagingSenderId: "189767218255",
    appId: "1:189767218255:web:dd2f5925fdcb15ed9ba63a"
};

// --- App State & Config ---
let auth, db, userId, leadsUnsubscribe = null;
let leads = [];
let editingLeadId = null;
let reauthenticated = false; // Flag to track re-authentication status

// The appId is now derived directly from the firebaseConfig
const appId = firebaseConfig.appId;

const poppyAINiches = [
    { name: 'AI Educator', subNiches: ['AI for Beginners', 'Advanced AI Concepts', 'AI Ethics & Society', 'AI Tools & Applications'] },
    { name: 'Content Creator', subNiches: ['Video Production', 'Podcasting', 'Blogging & Writing', 'Short-form Video'] },
    { name: 'Marketer', subNiches: ['Digital Marketing', 'Social Media Marketing', 'SEO', 'Content Marketing'] },
    { name: 'Founder', subNiches: ['Startup Strategy', 'Fundraising', 'Product Development', 'Scaling & Growth'] },
    { name: 'Personal Brand Coach', subNiches: ['Brand Strategy', 'Online Presence', 'Thought Leadership', 'Monetization'] },
    { name: 'Others', subNiches: ['Specify custom niche(s) in the field below.'] }
];

// --- DOM Element References ---
const loadingIndicator = document.getElementById('loading-indicator');
const appView = document.getElementById('app-view');

// App View Elements
const logoutBtn = document.getElementById('logout-btn');
const currentUserIdSpan = document.getElementById('current-user-id');
const addLeadModalBtn = document.getElementById('add-new-lead-modal-btn'); // Button to open modal
const profileSettingsBtn = document.getElementById('profile-settings-btn'); // New: Profile Settings button

const formTitle = document.getElementById('form-title');
const validationErrorDiv = document.getElementById('validation-error'); // Still needed for specific form validation
const errorMessageSpan = document.getElementById('error-message'); // Still needed for specific form validation
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

// Lead Modal Elements
const leadModalOverlay = document.getElementById('lead-modal-overlay');
const leadModal = document.getElementById('lead-modal');
const closeModalBtn = document.getElementById('close-modal-btn');

// Profile Settings Modal Elements (NEW)
const profileModalOverlay = document.getElementById('profile-modal-overlay');
const profileModal = document.getElementById('profile-modal');
const closeProfileModalBtn = document.getElementById('close-profile-modal-btn');
const profileEmailDisplay = document.getElementById('profile-email-display');
const reauthSection = document.getElementById('reauth-section');
const reauthEmailPasswordSection = document.getElementById('reauth-email-password-section');
const reauthCurrentPasswordInput = document.getElementById('reauth-current-password');
const reauthEmailPasswordBtn = document.getElementById('reauth-email-password-btn');
const reauthGoogleSection = document.getElementById('reauth-google-section');
const reauthGoogleBtn = document.getElementById('reauth-google-btn');
const reauthError = document.getElementById('reauth-error');
const setPasswordSection = document.getElementById('set-password-section');
const newPasswordInput = document.getElementById('new-password');
const confirmNewPasswordInput = document.getElementById('confirm-new-password');
const profilePasswordError = document.getElementById('profile-password-error');
const setPasswordBtn = document.getElementById('set-password-btn');


// Message Box Elements (These are now handled by utils.js, but the close button still needs an event listener)
const closeMessageBtn = document.getElementById('close-message-btn');


// --- Utility Functions (for Modals and Loading States) ---

/**
 * Switches the main view of the application.
 * @param {string} viewId - The ID of the view to show ('app-view', 'loading-indicator').
 */
function switchView(viewId) {
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

/**
 * Shows the lead add/edit modal.
 */
function showLeadModal() {
    leadModalOverlay.classList.remove('hidden');
    setTimeout(() => {
        leadModalOverlay.style.opacity = '1';
        leadModal.style.transform = 'scale(1)';
    }, 10);
}

/**
 * Hides the lead add/edit modal.
 */
function hideLeadModal() {
    leadModalOverlay.style.opacity = '0';
    leadModal.style.transform = 'scale(0.95)';
    setTimeout(() => {
        leadModalOverlay.classList.add('hidden');
        resetForm(); // Reset form when modal is closed
    }, 300);
}

/**
 * Shows the profile settings modal.
 */
function showProfileModal() {
    profileModalOverlay.classList.remove('hidden');
    setTimeout(() => {
        profileModalOverlay.style.opacity = '1';
        profileModal.style.transform = 'scale(1)';
    }, 10);
    // Populate email display
    const user = auth.currentUser;
    if (user) {
        profileEmailDisplay.textContent = user.email;
        checkAuthenticationMethodAndShowReauthOptions(user);
    }
    // Reset password fields and errors
    newPasswordInput.value = '';
    confirmNewPasswordInput.value = '';
    profilePasswordError.classList.add('hidden');
    reauthError.classList.add('hidden');
    setPasswordBtn.disabled = true; // Disable set password until re-authenticated
}

/**
 * Hides the profile settings modal.
 */
function hideProfileModal() {
    profileModalOverlay.style.opacity = '0';
    profileModal.style.transform = 'scale(0.95)';
    setTimeout(() => {
        profileModalOverlay.classList.add('hidden');
        reauthenticated = false; // Reset re-authentication flag on close
        reauthSection.classList.add('hidden'); // Hide reauth section
        reauthEmailPasswordSection.classList.add('hidden');
        reauthGoogleSection.classList.add('hidden');
        reauthCurrentPasswordInput.value = ''; // Clear password field
        setPasswordSection.classList.remove('hidden'); // Ensure password section is visible for next open
    }, 300);
}

/**
 * Sets the loading state for a button.
 * @param {HTMLElement} button - The button element.
 * @param {boolean} isLoading - True to show loading state, false otherwise.
 * @param {string} originalText - The original text of the button.
 */
function setButtonLoading(button, isLoading, originalText) {
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Loading...'; // Add spinner icon
    } else {
        button.disabled = false;
        button.innerHTML = originalText;
    }
}


// --- Authentication Logic (for Dashboard) ---

/**
 * Handles user sign-out.
 */
async function handleSignOut() {
    try {
        await signOut(auth);
        // Redirect to login page after sign out
        window.location.href = 'index.html';
        if (leadsUnsubscribe) {
            leadsUnsubscribe(); // Detach the Firestore listener
            leadsUnsubscribe = null;
        }
        leads = [];
        renderLeadsList(); // Clear leads list on sign out
    } catch (error) {
        showMessage(`Sign Out Failed: ${error.message}`);
    }
}

/**
 * Checks the user's current authentication method and displays appropriate re-authentication options.
 * @param {firebase.User} user - The current Firebase user object.
 */
function checkAuthenticationMethodAndShowReauthOptions(user) {
    reauthSection.classList.remove('hidden');
    reauthEmailPasswordSection.classList.add('hidden');
    reauthGoogleSection.classList.add('hidden');
    reauthError.classList.add('hidden');
    setPasswordBtn.disabled = true; // Disable until re-authenticated

    const providers = user.providerData.map(p => p.providerId);

    if (providers.includes(EmailAuthProvider.PROVIDER_ID)) {
        reauthEmailPasswordSection.classList.remove('hidden');
    }
    if (providers.includes(GoogleAuthProvider.PROVIDER_ID)) {
        reauthGoogleSection.classList.remove('hidden');
    }

    // If the user only has a social provider (e.g., Google) and no password set,
    // they might not see the email/password re-auth option.
    // In this case, we still need to allow them to set a password after re-auth.
    // The setPasswordSection should always be visible, but its button enabled only after reauth.
}

/**
 * Handles re-authentication with email and password.
 */
async function handleReauthenticateWithPassword() {
    const user = auth.currentUser;
    const currentPassword = reauthCurrentPasswordInput.value;
    reauthError.classList.add('hidden');

    if (!currentPassword) {
        reauthError.textContent = "Please enter your current password.";
        reauthError.classList.remove('hidden');
        return;
    }

    setButtonLoading(reauthEmailPasswordBtn, true, 'Re-authenticate with Password');

    try {
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        reauthenticated = true;
        reauthSection.classList.add('hidden'); // Hide re-auth section on success
        setPasswordBtn.disabled = false; // Enable set password button
        showMessage("Re-authentication successful. You can now set your new password.");
    } catch (error) {
        reauthError.textContent = `Re-authentication failed: ${error.message}`;
        reauthError.classList.remove('hidden');
    } finally {
        setButtonLoading(reauthEmailPasswordBtn, false, 'Re-authenticate with Password');
        reauthCurrentPasswordInput.value = ''; // Clear password field
    }
}

/**
 * Handles re-authentication with Google.
 */
async function handleReauthenticateWithGoogle() {
    const user = auth.currentUser;
    reauthError.classList.add('hidden');

    setButtonLoading(reauthGoogleBtn, true, '<i class="fab fa-google mr-2"></i> Re-authenticate with Google');

    try {
        const provider = new GoogleAuthProvider();
        // Corrected: Call signInWithPopup on the auth object, not the user object
        const result = await signInWithPopup(auth, provider);
        // The result.credential contains the re-authentication credential
        await reauthenticateWithCredential(user, result.credential);
        reauthenticated = true;
        reauthSection.classList.add('hidden'); // Hide re-auth section on success
        setPasswordBtn.disabled = false; // Enable set password button
        showMessage("Re-authentication successful. You can now set your new password.");
    } catch (error) {
        reauthError.textContent = `Re-authentication failed: ${error.message}`;
        reauthError.classList.remove('hidden');
    } finally {
        setButtonLoading(reauthGoogleBtn, false, '<i class="fab fa-google mr-2"></i> Re-authenticate with Google');
    }
}

/**
 * Handles setting/updating the user's password.
 */
async function handleSetPassword() {
    if (!reauthenticated) {
        profilePasswordError.textContent = "Please re-authenticate first.";
        profilePasswordError.classList.remove('hidden');
        return;
    }

    const newPassword = newPasswordInput.value;
    const confirmNewPassword = confirmNewPasswordInput.value;
    profilePasswordError.classList.add('hidden');

    if (!newPassword || !confirmNewPassword) {
        profilePasswordError.textContent = "New password and confirmation cannot be empty.";
        profilePasswordError.classList.remove('hidden');
        return;
    }
    if (newPassword.length < 6) {
        profilePasswordError.textContent = "New password must be at least 6 characters long.";
        profilePasswordError.classList.remove('hidden');
        return;
    }
    if (newPassword !== confirmNewPassword) {
        profilePasswordError.textContent = "New password and confirmation do not match.";
        profilePasswordError.classList.remove('hidden');
        return;
    }

    setButtonLoading(setPasswordBtn, true, 'Set Password');

    try {
        const user = auth.currentUser;
        await updatePassword(user, newPassword);
        showMessage("Password updated successfully!");
        hideProfileModal(); // Close modal on success
    } catch (error) {
        profilePasswordError.textContent = `Failed to set password: ${error.message}`;
        profilePasswordError.classList.remove('hidden');
    } finally {
        setButtonLoading(setPasswordBtn, false, 'Set Password');
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
    document.querySelectorAll('#lead-modal input[type="text"], #lead-modal input[type="email"], #lead-modal input[type="url"], #lead-modal input[type="number"], #lead-modal textarea').forEach(input => input.value = '');
    document.querySelectorAll('#lead-modal input[type="radio"], #lead-modal input[type="checkbox"]').forEach(input => input.checked = false);

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
        hideLeadModal(); // Close modal after adding
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

    showLeadModal(); // Show modal when populating for edit
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
        hideLeadModal(); // Close modal after updating
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
                        ${lead.email ? `<p class="text-gray-600"><strong>Email:</strong> <a href="mailto:${lead.email}" target="_blank" rel="noopener noreferrer" class="text-indigo-500 hover:underline">${lead.email}</a></p>` : ''}
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
 * Attaches all primary event listeners for the dashboard page.
 */
function attachEventListeners() {
    // Dashboard actions
    logoutBtn.addEventListener('click', handleSignOut);
    addLeadModalBtn.addEventListener('click', () => {
        resetForm(); // Ensure form is clean for new entry
        showLeadModal();
    });
    profileSettingsBtn.addEventListener('click', showProfileModal); // New: Open Profile Settings modal

    // Lead Form (inside modal)
    addLeadBtn.addEventListener('click', handleAddLead);
    updateLeadBtn.addEventListener('click', handleUpdateLead);
    cancelEditBtn.addEventListener('click', hideLeadModal); // Cancel button closes modal

    // Lead Modal close buttons
    closeModalBtn.addEventListener('click', hideLeadModal);
    leadModalOverlay.addEventListener('click', (e) => {
        if (e.target === leadModalOverlay) { // Only close if clicking on the overlay itself, not the modal content
            hideLeadModal();
        }
    });

    // Profile Settings Modal close buttons (NEW)
    closeProfileModalBtn.addEventListener('click', hideProfileModal);
    profileModalOverlay.addEventListener('click', (e) => {
        if (e.target === profileModalOverlay) { // Only close if clicking on the overlay itself
            hideProfileModal();
        }
    });

    // Profile Settings Re-authentication and Password Update (NEW)
    reauthEmailPasswordBtn.addEventListener('click', handleReauthenticateWithPassword);
    reauthGoogleBtn.addEventListener('click', handleReauthenticateWithGoogle);
    setPasswordBtn.addEventListener('click', handleSetPassword);
    newPasswordInput.addEventListener('input', () => {
        // Simple validation to enable/disable set password button
        if (reauthenticated && newPasswordInput.value.length >= 6 && newPasswordInput.value === confirmNewPasswordInput.value) {
            setPasswordBtn.disabled = false;
        } else {
            setPasswordBtn.disabled = true;
        }
        profilePasswordError.classList.add('hidden'); // Hide error on input
    });
    confirmNewPasswordInput.addEventListener('input', () => {
        // Simple validation to enable/disable set password button
        if (reauthenticated && newPasswordInput.value.length >= 6 && newPasswordInput.value === confirmNewPasswordInput.value) {
            setPasswordBtn.disabled = false;
        } else {
            setPasswordBtn.disabled = true;
        }
        profilePasswordError.classList.add('hidden'); // Hide error on input
    });


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
 * Main function to initialize the dashboard page.
 */
async function main() {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    attachEventListeners();
    renderNiches();

    // Handle authentication state for dashboard
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            await user.reload(); // Get latest user state
            if (user.emailVerified) {
                // User is authenticated and verified, show dashboard
                userId = user.uid;
                currentUserIdSpan.textContent = userId;
                switchView('app-view');
                loadingIndicator.classList.add('hidden'); // Hide loading indicator once app is ready

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
                // User is signed in but email is not verified, redirect to login
                window.location.href = 'index.html';
            }
        } else {
            // User is signed out, redirect to login
            window.location.href = 'index.html';
        }
    });
}

// Run the app
main();
