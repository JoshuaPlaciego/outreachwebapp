// dashboard.js
console.log("dashboard.js script started."); // Debugging log

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
    updatePassword, // To update the user's password
    linkWithCredential, // For linking new providers
    sendEmailVerification // Import sendEmailVerification
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    collection,
    onSnapshot,
    deleteDoc,
    doc,
    updateDoc,
    serverTimestamp,
    query,
    where,
    addDoc // Ensure addDoc is imported if used
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
let auth;
let db;
let userId = null; // Current authenticated user's UID
let leads = []; // Array to store leads
let leadsUnsubscribe = null; // To store the unsubscribe function for Firestore listener
let editingLeadId = null; // Stores the ID of the lead being edited

// The appId is now derived directly from the firebaseConfig
const appId = firebaseConfig.appId;

// --- DOM Element References ---
const loadingIndicator = document.getElementById('loading-indicator');
const mainDashboardContent = document.getElementById('main-dashboard-content'); // New reference for the main content wrapper
const logoutBtn = document.getElementById('logout-btn');
const userIdDisplay = document.getElementById('current-user-id');
const profileEmail = document.getElementById('profile-email');
const profileEmailVerified = document.getElementById('profile-email-verified');
const linkGoogleBtn = document.getElementById('link-google-btn');
const linkGoogleError = document.getElementById('link-google-error');
const googleLinkSection = document.getElementById('google-link-section');

// Lead Form Elements
const leadForm = document.getElementById('lead-form');
const leadNameInput = document.getElementById('lead-name');
const leadEmailInput = document.getElementById('lead-email');
const callBookingLinkInput = document.getElementById('call-booking-link');
const instagramLinkInput = document.getElementById('instagram-link');
const youtubeLinkInput = document.getElementById('youtube-link');
const tiktokLinkInput = document.getElementById('tiktok-link');
const follower10KUpRadio = document.getElementById('follower-10k-up');
const followerLess10KRadio = document.getElementById('follower-less-10k');
const avgViewsInput = document.getElementById('avg-views');
const nichesContainer = document.getElementById('niches-container');
const otherNicheNotesContainer = document.getElementById('other-niche-notes-container');
const otherNicheNotesTextarea = document = document.getElementById('other-niche-notes');
const leadNotesTextarea = document.getElementById('lead-notes');
const validationErrorDiv = document.getElementById('validation-error');
const addLeadBtn = document.getElementById('add-lead-btn');
const updateLeadBtn = document.getElementById('update-lead-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const leadsListDiv = document.getElementById('leads-list');
const noLeadsMessage = document.getElementById('no-leads-message');

// Message Box Elements (from utils.js, but need local refs for event listeners if any)
const messageBoxResendBtn = document.getElementById('message-box-resend-btn');
const closeMessageBtn = document.getElementById('close-message-btn');
const messageBoxCloseIcon = document.getElementById('message-box-close-icon');
const customMessageBoxOverlay = document.getElementById('custom-message-box-overlay');


// --- Niche Definitions ---
const poppyAINiches = [
    "Fitness & Health", "Beauty & Skincare", "Fashion & Apparel",
    "Food & Cooking", "Travel & Adventure", "Gaming",
    "Tech & Gadgets", "Finance & Investing", "Education & Learning",
    "DIY & Home Improvement", "Parenting & Family", "Pets",
    "Art & Design", "Photography", "Music",
    "Books & Literature", "Environmental & Sustainability", "Comedy",
    "Motivation & Self-Help", "Business & Entrepreneurship", "Real Estate",
    "Automotive", "Sports", "Outdoor & Nature", "Other"
];

// --- Utility Functions ---

/**
 * Renders the niche checkboxes dynamically.
 */
function renderNiches() {
    nichesContainer.innerHTML = ''; // Clear existing
    poppyAINiches.forEach(niche => {
        const div = document.createElement('div');
        div.className = 'flex items-center';
        div.innerHTML = `
            <input type="checkbox" id="niche-${niche.replace(/\s/g, '-')}" name="niches" value="${niche}" class="form-checkbox text-indigo-600 rounded-md">
            <label for="niche-${niche.replace(/\s/g, '-')}" class="ml-2 text-sm text-gray-700">${niche}</label>
        `;
        nichesContainer.appendChild(div);
    });

    // Add event listeners to all niche checkboxes
    nichesContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', updateFormInput);
    });
}

/**
 * Updates the newLead object based on form input changes.
 * This function is generic and handles various input types.
 */
function updateFormInput(event) {
    const { id, value, type, checked, name } = event.target;

    if (id === 'lead-name') newLead.name = value;
    else if (id === 'lead-email') newLead.email = value;
    else if (id === 'call-booking-link') newLead.callBookingLink = value;
    else if (id === 'instagram-link') newLead.instagramLink = value;
    else if (id === 'youtube-link') newLead.youtubeLink = value;
    else if (id === 'tiktok-link') newLead.tiktokLink = value;
    else if (name === 'follower-count') newLead.followerCount = value;
    else if (id === 'avg-views') newLead.avgViews = value;
    else if (id === 'other-niche-notes') newLead.otherNicheNotes = value;
    else if (id === 'lead-notes') newLead.notes = value;
    else if (name === 'niches' && type === 'checkbox') {
        if (checked) {
            if (!newLead.niches.includes(value)) {
                newLead.niches.push(value);
            }
        } else {
            newLead.niches = newLead.niches.filter(n => n !== value);
        }
        // Show/hide other niche notes based on "Other" checkbox
        if (value === 'Other') {
            if (checked) {
                otherNicheNotesContainer.classList.remove('hidden');
            } else {
                otherNicheNotesContainer.classList.add('hidden');
                newLead.otherNicheNotes = ''; // Clear notes if "Other" is unchecked
                otherNicheNotesTextarea.value = '';
            }
        }
    }
    validateForm(); // Re-validate on every input change
}


/**
 * Validates the lead form.
 * @returns {boolean} True if form is valid, false otherwise.
 */
function validateForm() {
    let isValid = true;
    let errorMessage = '';

    if (!newLead.name.trim()) {
        errorMessage += 'Lead Name is required. ';
        isValid = false;
    }
    // Basic email format validation if email is provided
    if (newLead.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newLead.email.trim())) {
        errorMessage += 'Invalid Lead Email format. ';
        isValid = false;
    }

    validationErrorDiv.textContent = errorMessage;
    if (errorMessage) {
        validationErrorDiv.classList.remove('hidden');
    } else {
        validationErrorDiv.classList.add('hidden');
    }
    return isValid;
}

/**
 * Resets the lead form fields and state.
 */
function resetForm() {
    leadForm.reset();
    newLead = {
        name: '',
        email: '',
        notes: '',
        callBookingLink: '',
        followerCount: '',
        avgViews: '',
        instagramLink: '',
        youtubeLink: '',
        tiktokLink: '',
        niches: [],
        otherNicheNotes: ''
    };
    editingLeadId = null;
    validationErrorDiv.classList.add('hidden'); // Hide validation errors
    addLeadBtn.classList.remove('hidden');
    updateLeadBtn.classList.add('hidden');
    cancelEditBtn.classList.add('hidden');
    otherNicheNotesContainer.classList.add('hidden'); // Hide other niche notes
    renderNiches(); // Re-render niches to uncheck all
}

/**
 * Renders the list of leads.
 */
function renderLeadsList() {
    if (!leadsListDiv) return; // Ensure the element exists

    leadsListDiv.innerHTML = ''; // Clear current list

    if (leads.length === 0) {
        noLeadsMessage.classList.remove('hidden');
        return;
    } else {
        noLeadsMessage.classList.add('hidden');
    }

    leads.forEach(lead => {
        const leadCard = document.createElement('div');
        leadCard.className = 'bg-white rounded-lg shadow-md p-4 mb-3 border-l-4 border-indigo-500 relative';
        leadCard.innerHTML = `
            <h3 class="text-xl font-semibold text-indigo-700 mb-2">${lead.name || 'N/A'}</h3>
            <p class="text-gray-700 text-sm mb-1"><strong class="font-medium">Email:</strong> ${lead.email || 'N/A'}</p>
            <p class="text-gray-700 text-sm mb-1"><strong class="font-medium">Call Booking:</strong> <a href="${lead.callBookingLink}" target="_blank" class="text-blue-500 hover:underline break-all">${lead.callBookingLink || 'N/A'}</a></p>
            <p class="text-gray-700 text-sm mb-1"><strong class="font-medium">Instagram:</strong> <a href="${lead.instagramLink}" target="_blank" class="text-blue-500 hover:underline break-all">${lead.instagramLink || 'N/A'}</a></p>
            <p class="text-gray-700 text-sm mb-1"><strong class="font-medium">YouTube:</b> <a href="${lead.youtubeLink}" target="_blank" class="text-blue-500 hover:underline break-all">${lead.youtubeLink || 'N/A'}</a></p>
            <p class="text-gray-700 text-sm mb-1"><strong class="font-medium">TikTok:</b> <a href="${lead.tiktokLink}" target="_blank" class="text-blue-500 hover:underline break-all">${lead.tiktokLink || 'N/A'}</a></p>
            <p class="text-gray-700 text-sm mb-1"><strong class="font-medium">Followers:</strong> ${lead.followerCount || 'N/A'}</p>
            <p class="text-gray-700 text-sm mb-1"><strong class="font-medium">Avg. Views:</strong> ${lead.avgViews || 'N/A'}</p>
            <p class="text-gray-700 text-sm mb-1"><strong class="font-medium">Niches:</strong> ${lead.niches && lead.niches.length > 0 ? lead.niches.join(', ') : 'N/A'}</p>
            ${lead.otherNicheNotes ? `<p class="text-gray-700 text-sm mb-1"><strong class="font-medium">Other Niche Notes:</strong> ${lead.otherNicheNotes}</p>` : ''}
            <p class="text-gray-700 text-sm mb-3"><strong class="font-medium">Notes:</strong> ${lead.notes || 'N/A'}</p>
            <p class="text-gray-500 text-xs">Added: ${lead.createdAt ? new Date(lead.createdAt.toDate()).toLocaleString() : 'N/A'}</p>

            <div class="absolute top-4 right-4 flex space-x-2">
                <button class="edit-btn text-blue-600 hover:text-blue-800" data-id="${lead.id}" title="Edit Lead">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-btn text-red-600 hover:text-red-800" data-id="${lead.id}" title="Delete Lead">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
        leadsListDiv.appendChild(leadCard);
    });

    // Attach event listeners to new edit/delete buttons
    leadsListDiv.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', handleEditLead);
    });
    leadsListDiv.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', handleDeleteLead);
    });
}

/**
 * Fills the form with lead data for editing.
 * @param {string} leadId - The ID of the lead to edit.
 */
function fillFormForEdit(leadId) {
    const leadToEdit = leads.find(lead => lead.id === leadId);
    if (!leadToEdit) {
        showMessage("Lead not found for editing.");
        return;
    }

    editingLeadId = leadId;
    newLead = { ...leadToEdit }; // Create a copy to edit

    leadNameInput.value = newLead.name || '';
    leadEmailInput.value = newLead.email || '';
    callBookingLinkInput.value = newLead.callBookingLink || '';
    instagramLinkInput.value = newLead.instagramLink || '';
    youtubeLinkInput.value = newLead.youtubeLink || '';
    tiktokLinkInput.value = newLead.tiktokLink || '';
    avgViewsInput.value = newLead.avgViews || '';
    leadNotesTextarea.value = newLead.notes || '';
    otherNicheNotesTextarea.value = newLead.otherNicheNotes || '';

    // Set radio buttons
    if (newLead.followerCount === '10k+') {
        follower10KUpRadio.checked = true;
    } else if (newLead.followerCount === '<10k') {
        followerLess10KRadio.checked = true;
    }

    // Set checkboxes for niches
    renderNiches(); // First, reset all checkboxes
    newLead.niches.forEach(niche => {
        const checkbox = document.getElementById(`niche-${niche.replace(/\s/g, '-')}`);
        if (checkbox) {
            checkbox.checked = true;
        }
    });

    // Show/hide other niche notes
    if (newLead.niches.includes('Other')) {
        otherNicheNotesContainer.classList.remove('hidden');
    } else {
        otherNicheNotesContainer.classList.add('hidden');
    }

    addLeadBtn.classList.add('hidden');
    updateLeadBtn.classList.remove('hidden');
    cancelEditBtn.classList.add('hidden');
    validationErrorDiv.classList.add('hidden'); // Clear any previous validation errors
}

// --- Firebase Interactions ---

/**
 * Handles adding a new lead to Firestore.
 */
async function handleAddLead(event) {
    event.preventDefault(); // Prevent default form submission
    console.log("handleAddLead called."); // Debugging log

    if (!validateForm()) {
        console.log("Form validation failed."); // Debugging log
        return;
    }

    try {
        // Add the current user's UID to the lead data
        const leadData = {
            ...newLead,
            createdAt: serverTimestamp(),
            createdBy: userId // Store the UID of the user who created this lead
        };
        console.log("Attempting to add lead to Firestore:", leadData); // Debugging log
        await addDoc(collection(db, `artifacts/${appId}/public/data/leads`), leadData);
        showMessage("Lead added successfully!");
        resetForm();
        console.log("Lead added and form reset."); // Debugging log
    } catch (error) {
        console.error("Error adding lead:", error);
        showMessage(`Error adding lead: ${error.message}`);
    }
}

/**
 * Handles updating an existing lead in Firestore.
 */
async function handleUpdateLead() {
    console.log("handleUpdateLead called."); // Debugging log
    if (!editingLeadId) {
        showMessage("No lead selected for update.");
        return;
    }

    if (!validateForm()) {
        console.log("Form validation failed for update."); // Debugging log
        return;
    }

    try {
        const leadRef = doc(db, `artifacts/${appId}/public/data/leads`, editingLeadId);
        // Ensure 'createdBy' field is not updated
        const updatedLeadData = { ...newLead };
        delete updatedLeadData.id; // Remove ID as it's not part of the document data
        delete updatedLeadData.createdBy; // Ensure createdBy is not accidentally updated

        console.log("Attempting to update lead in Firestore:", editingLeadId, updatedLeadData); // Debugging log
        await updateDoc(leadRef, updatedLeadData);
        showMessage("Lead updated successfully!");
        resetForm();
        console.log("Lead updated and form reset."); // Debugging log
    } catch (error) {
        console.error("Error updating lead:", error);
        showMessage(`Error updating lead: ${error.message}`);
    }
}

/**
 * Handles deleting a lead from Firestore.
 * @param {Event} event - The click event from the delete button.
 */
async function handleDeleteLead(event) {
    console.log("handleDeleteLead called."); // Debugging log
    const leadIdToDelete = event.currentTarget.dataset.id;
    if (!leadIdToDelete) {
        showMessage("No lead ID found for deletion.");
        return;
    }

    // Custom confirmation message box
    showMessage("Are you sure you want to delete this lead?", false); // Show message, but no resend button

    // Temporarily store the delete action and attach listener to the 'Got It!' button
    const confirmDelete = async () => {
        console.log("Delete confirmed for lead ID:", leadIdToDelete); // Debugging log
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/leads`, leadIdToDelete));
            showMessage("Lead deleted successfully!");
        } catch (error) {
            console.error("Error deleting lead:", error);
            showMessage(`Error deleting lead: ${error.message}`);
        } finally {
            // Remove the temporary event listener to avoid side effects
            closeMessageBtn.removeEventListener('click', confirmDelete);
            hideMessage(); // Hide the message box
        }
    };

    // Replace the default 'Got It!' listener with our confirmation
    closeMessageBtn.removeEventListener('click', hideMessage); // Remove default hide
    closeMessageBtn.addEventListener('click', confirmDelete, { once: true }); // Add one-time listener for confirmation
}

/**
 * Handles the edit button click.
 * @param {Event} event - The click event.
 */
function handleEditLead(event) {
    console.log("handleEditLead called."); // Debugging log
    const leadIdToEdit = event.currentTarget.dataset.id;
    fillFormForEdit(leadIdToEdit);
}

/**
 * Handles user logout.
 */
async function handleLogout() {
    console.log("handleLogout called."); // Debugging log
    try {
        if (leadsUnsubscribe) {
            leadsUnsubscribe(); // Unsubscribe from Firestore listener
            leadsUnsubscribe = null;
            console.log("Firestore listener unsubscribed."); // Debugging log
        }
        await signOut(auth);
        console.log("User signed out. Redirecting to index.html."); // Debugging log
        window.location.href = 'index.html'; // Redirect to login page
    } catch (error) {
        console.error("Logout error:", error);
        showMessage(`Logout failed: ${error.message}`);
    }
}

/**
 * Handles linking Google account to existing user.
 */
async function handleLinkGoogle() {
    console.log("handleLinkGoogle called."); // Debugging log
    linkGoogleBtn.disabled = true;
    linkGoogleBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Linking...';
    linkGoogleError.classList.add('hidden');

    try {
        const provider = new GoogleAuthProvider();
        const user = auth.currentUser;

        if (!user) {
            showMessage("No user logged in to link Google account.");
            console.log("No user logged in for Google link."); // Debugging log
            return;
        }

        // Check if Google provider is already linked
        const isGoogleLinked = user.providerData.some(
            (p) => p.providerId === GoogleAuthProvider.PROVIDER_ID
        );

        if (isGoogleLinked) {
            showMessage("Google account is already linked to this user.", false);
            googleLinkSection.classList.add('hidden'); // Hide section if already linked
            console.log("Google account already linked."); // Debugging log
            return;
        }

        await linkWithCredential(user, provider);
        showMessage("Google account linked successfully!");
        googleLinkSection.classList.add('hidden'); // Hide the section after successful linking
        profileEmailVerified.textContent = user.emailVerified ? 'Yes' : 'No'; // Update status
        console.log("Google account linked successfully."); // Debugging log
    } catch (error) {
        console.error("Error linking Google account:", error);
        linkGoogleError.textContent = error.message;
        linkGoogleError.classList.remove('hidden');
        showMessage(`Failed to link Google account: ${error.message}`);
    } finally {
        linkGoogleBtn.disabled = false;
        linkGoogleBtn.innerHTML = '<i class="fab fa-google mr-2"></i> Link with Google';
    }
}

/**
 * Resends the verification email.
 */
messageBoxResendBtn.addEventListener('click', async () => {
    console.log("messageBoxResendBtn clicked."); // Debugging log
    hideMessage(); // Hide the message box first
    const user = auth.currentUser;
    if (user) {
        try {
            await sendEmailVerification(user);
            // After resending, re-show the message with resend and logout buttons
            showMessage("Verification email sent. Please check your inbox.", true, true);
            console.log("Verification email sent."); // Debugging log
        } catch (error) {
            console.error("Error resending verification email:", error);
            showMessage(`Failed to resend verification email: ${error.message}`, true, true); // Still show options on failure
        }
    } else {
        // If somehow no user, just show a general message
        showMessage("No user logged in to resend verification email. Please sign in.", false, false);
        console.log("No user for resend verification."); // Debugging log
    }
});


// --- Event Listeners ---
function attachEventListeners() {
    console.log("attachEventListeners called."); // Debugging log
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (linkGoogleBtn) linkGoogleBtn.addEventListener('click', handleLinkGoogle);

    // Lead form inputs
    if (leadNameInput) leadNameInput.addEventListener('input', updateFormInput);
    if (leadEmailInput) leadEmailInput.addEventListener('input', updateFormInput);
    if (callBookingLinkInput) callBookingLinkInput.addEventListener('input', updateFormInput);
    if (instagramLinkInput) instagramLinkInput.addEventListener('input', updateFormInput);
    if (youtubeLinkInput) youtubeLinkInput.addEventListener('input', updateFormInput);
    if (tiktokLinkInput) tiktokLinkInput.addEventListener('input', updateFormInput);
    if (follower10KUpRadio) follower10KUpRadio.addEventListener('change', updateFormInput);
    if (followerLess10KRadio) followerLess10KRadio.addEventListener('change', updateFormInput);
    if (avgViewsInput) avgViewsInput.addEventListener('input', updateFormInput);
    if (otherNicheNotesTextarea) otherNicheNotesTextarea.addEventListener('input', updateFormInput);
    if (leadNotesTextarea) leadNotesTextarea.addEventListener('input', updateFormInput);
    if (addLeadBtn) addLeadBtn.addEventListener('click', handleAddLead);
    if (updateLeadBtn) updateLeadBtn.addEventListener('click', handleUpdateLead);
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', resetForm);

    // Message box close buttons
    // The 'X' icon's visibility is now controlled by showMessage based on verification status
    if (closeMessageBtn) closeMessageBtn.addEventListener('click', hideMessage);
    if (messageBoxCloseIcon) messageBoxCloseIcon.addEventListener('click', hideMessage); // Ensure close icon works
    console.log("All event listeners attached."); // Debugging log
}

// --- Initialization ---

/**
 * Main function to initialize the dashboard page.
 */
async function main() {
    console.log("main() function started."); // Debugging log
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    // Initial state: show loading indicator, hide main content
    // We will manage visibility using Tailwind's 'hidden' class directly.
    loadingIndicator.classList.remove('hidden'); // Ensure loading is visible initially
    mainDashboardContent.classList.add('hidden'); // Ensure main content is hidden initially
    console.log("Initial UI state set (loading)."); // Debugging log

    // Render niches immediately
    renderNiches();
    console.log("Niches rendered."); // Debugging log

    // Attach event listeners
    attachEventListeners();
    console.log("Event listeners attached in main."); // Debugging log


    // Handle authentication state
    onAuthStateChanged(auth, async (user) => {
        console.log("onAuthStateChanged triggered. User:", user ? user.email : "null", "Email Verified:", user ? user.emailVerified : "N/A"); // Debugging log
        if (user) {
            await user.reload(); // Get latest user state
            userId = user.uid; // Set global userId
            console.log("User reloaded. Current userId:", userId); // Debugging log

            if (user.emailVerified) {
                // User is authenticated AND verified, show dashboard
                console.log("User is verified. Showing dashboard content."); // Debugging log
                hideMessage(); // Ensure message box is hidden
                
                // Correctly switch views by managing the 'hidden' class
                loadingIndicator.classList.add('hidden'); // Hide loading indicator
                mainDashboardContent.classList.remove('hidden'); // Show main content
                console.log("Dashboard content displayed, loading indicator hidden."); // Debugging log


                // Display user info
                if (userIdDisplay) userIdDisplay.textContent = userId;
                if (profileEmail) profileEmail.textContent = user.email;
                if (profileEmailVerified) profileEmailVerified.textContent = user.emailVerified ? 'Yes' : 'No';
                console.log("User info displayed."); // Debugging log


                // Check if Google provider is linked and hide section if it is
                const isGoogleLinked = user.providerData.some(
                    (p) => p.providerId === GoogleAuthProvider.PROVIDER_ID
                );
                if (googleLinkSection) {
                    if (isGoogleLinked) {
                        googleLinkSection.classList.add('hidden');
                        console.log("Google link section hidden (already linked)."); // Debugging log
                    } else {
                        googleLinkSection.classList.remove('hidden');
                        console.log("Google link section shown (not linked)."); // Debugging log
                    }
                }

                // Start Firestore listener for leads if not already running
                if (!leadsUnsubscribe) {
                    console.log("Starting Firestore listener for leads."); // Debugging log
                    const leadsCollectionRef = collection(db, `artifacts/${appId}/public/data/leads`);
                    // Query to get leads created by the current user
                    const q = query(leadsCollectionRef, where("createdBy", "==", userId)); 

                    leadsUnsubscribe = onSnapshot(q, (snapshot) => {
                        console.log("Firestore snapshot received."); // Debugging log
                        leads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        // Sort in memory (newest first)
                        leads.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));
                        renderLeadsList();
                        console.log("Leads rendered."); // Debugging log
                    }, (error) => {
                        console.error("Error fetching leads:", error);
                        showMessage(`Error fetching leads: ${error.message}.`);
                    });
                }

            } else {
                // User is signed in but email is not verified, redirect to login page
                console.log("User is unverified. Redirecting to index.html."); // Debugging log
                // The auth.js will handle showing the verification message on index.html
                window.location.href = 'index.html';
            }
        } else {
            // User is signed out, redirect to login
            console.log("User is signed out. Redirecting to index.html."); // Debugging log
            window.location.href = 'index.html';
        }
    });
    console.log("onAuthStateChanged listener attached in main."); // Debugging log
}

// Run the app
main();
console.log("main() function called."); // Debugging log
