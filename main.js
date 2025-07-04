import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendEmailVerification } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Global State Variables ---
let db;
let auth;
let currentUserId = null;
let leads = [];
let newLead = {
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
let editingLeadId = null;
let validationError = '';
let authError = ''; // State for authentication errors

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

// --- DOM Element References ---
const customMessageBoxOverlay = document.getElementById('custom-message-box-overlay');
const messageTextSpan = document.getElementById('message-text');
const closeMessageBtn = document.getElementById('close-message-btn');

// These elements might not exist on both pages, so check for their existence
const authSection = document.getElementById('auth-section'); // Only on index.html (login)
const appContent = document.getElementById('app-content'); // Only on addleads.html
const authEmailInput = document.getElementById('auth-email'); // Only on index.html (login)
const authPasswordInput = document.getElementById('auth-password'); // Only on index.html (login)
const signupBtn = document.getElementById('signup-btn'); // Only on index.html (login)
const signinBtn = document.getElementById('signin-btn'); // Only on index.html (login)
const logoutBtn = document.getElementById('logout-btn'); // Only on addleads.html
const authErrorDiv = document.getElementById('auth-error'); // Only on index.html (login)
const authErrorMessageSpan = document.getElementById('auth-error-message'); // Only on index.html (login)
const emailVerificationMessageDiv = document.getElementById('email-verification-message'); // Only on index.html (login)
const verificationMessageTextSpan = document.getElementById('verification-message-text'); // Only on index.html (login)
const resendVerificationBtn = document.getElementById('resend-verification-btn'); // Only on index.html (login)
const refreshStatusBtn = document.getElementById('refresh-status-btn'); // Only on index.html (login)

const userIdDisplay = document.getElementById('user-id-display'); // Only on addleads.html
const currentUserIdSpan = document.getElementById('current-user-id'); // Only on addleads.html
const formTitle = document.getElementById('form-title'); // Only on addleads.html
const validationErrorDiv = document.getElementById('validation-error'); // Only on addleads.html
const errorMessageSpan = document.getElementById('error-message'); // Only on addleads.html

const leadNameInput = document.getElementById('lead-name'); // Only on addleads.html
const leadEmailInput = document.getElementById('lead-email'); // Only on addleads.html
const callBookingLinkInput = document.getElementById('call-booking-link'); // Only on addleads.html
const instagramLinkInput = document.getElementById('instagram-link'); // Only on addleads.html
const youtubeLinkInput = document.getElementById('youtube-link'); // Only on addleads.html
const tiktokLinkInput = document.getElementById('tiktok-link'); // Only on addleads.html
const follower10KUpRadio = document.getElementById('follower-10k-up'); // Only on addleads.html
const followerLess10KRadio = document.getElementById('follower-less-10k'); // Only on addleads.html
const avgViewsInput = document.getElementById('avg-views'); // Only on addleads.html
const nichesContainer = document.getElementById('niches-container'); // Only on addleads.html
const otherNicheNotesContainer = document.getElementById('other-niche-notes-container'); // Only on addleads.html
const otherNicheNotesTextarea = document.getElementById('other-niche-notes'); // Only on addleads.html
const leadNotesTextarea = document.getElementById('lead-notes'); // Only on addleads.html

const addLeadBtn = document.getElementById('add-lead-btn'); // Only on addleads.html
const updateLeadBtn = document.getElementById('update-lead-btn'); // Only on addleads.html
const cancelEditBtn = document.getElementById('cancel-edit-btn'); // Only on addleads.html
const leadsListDiv = document.getElementById('leads-list'); // Only on addleads.html
const noLeadsMessage = document.getElementById('no-leads-message'); // Only on addleads.html

// --- Niche Definitions ---
const poppyAINiches = [
    {
        name: 'AI Educator',
        subNiches: [
            'AI for Beginners', 'Advanced AI Concepts', 'AI Ethics & Society',
            'AI Tools & Applications', 'Machine Learning Fundamentals',
            'Deep Learning & Neural Networks', 'Natural Language Processing (NLP)',
            'Computer Vision', 'AI in Business', 'AI for Developers',
            'AI for Non-Technical Audiences'
        ]
    },
    {
        name: 'Content Creator',
        subNiches: [
            'Video Production', 'Podcasting', 'Blogging & Writing',
            'Graphic Design', 'Photography', 'Short-form Video (TikTok/Reels)',
            'Live Streaming', 'Animation', 'Scriptwriting', 'Content Strategy',
            'Monetization Strategies'
        ]
    },
    {
        name: 'Marketer',
        subNiches: [
            'Digital Marketing', 'Social Media Marketing', 'SEO (Search Engine Optimization)',
            'SEM (Search Engine Marketing)', 'Email Marketing', 'Content Marketing',
            'Affiliate Marketing', 'Influencer Marketing', 'Performance Marketing',
            'Brand Strategy', 'Analytics & Reporting'
        ]
    },
    {
        name: 'Founder',
        subNiches: [
            'Startup Strategy', 'Fundraising & Investment', 'Product Development',
            'Business Operations', 'Team Building & HR', 'Legal & Compliance',
            'Financial Management', 'Scaling & Growth', 'Exit Strategy', 'Innovation & R&D'
        ]
    },
    {
        name: 'Personal Brand Coach',
        subNiches: [
            'Brand Strategy & Development', 'Online Presence Optimization',
            'Content for Personal Brand', 'Networking & Relationship Building',
            'Public Speaking & Presentation', 'Thought Leadership',
            'Monetization of Personal Brand', 'Client Acquisition for Coaches'
        ]
    },
    {
        name: 'Others',
        subNiches: [
            'Specify custom niche(s) in the field below.'
        ]
    }
];

// --- Functions ---

/**
 * Displays a custom message box (modal).
 * @param {string} message The message to display.
 */
function showMessage(message) {
    customMessageBoxOverlay.style.display = 'flex'; // Explicitly set to flex
    messageTextSpan.textContent = message;
}

/**
 * Hides the custom message box (modal).
 */
function hideMessage() {
    customMessageBoxOverlay.style.display = 'none'; // Explicitly set to none
    messageTextSpan.textContent = ''; // Clear message
}

/**
 * Displays the email verification message box.
 * This function will only execute if emailVerificationMessageDiv and verificationMessageTextSpan exist (i.e., on index.html).
 * @param {string} email The email address to display in the message.
 */
function showEmailVerificationMessage(email) {
    if (emailVerificationMessageDiv && verificationMessageTextSpan) {
        verificationMessageTextSpan.textContent = `Please verify your email address (${email}) to access the dashboard. Check your inbox for a verification link.`;
        emailVerificationMessageDiv.classList.remove('hidden');
    }
}

/**
 * Hides the email verification message box.
 * This function will only execute if emailVerificationMessageDiv and verificationMessageTextSpan exist (i.e., on index.html).
 */
function hideEmailVerificationMessage() {
    if (emailVerificationMessageDiv && verificationMessageTextSpan) {
        emailVerificationMessageDiv.classList.add('hidden');
        verificationMessageTextSpan.textContent = '';
    }
}

/**
 * Renders the current state of the form inputs.
 * This function is called on both index.html and addleads.html, but only updates elements present on the current page.
 */
function renderForm() {
    // Elements specific to addleads.html (Lead Input Form)
    if (leadNameInput) leadNameInput.value = newLead.name;
    if (leadEmailInput) leadEmailInput.value = newLead.email;
    if (callBookingLinkInput) callBookingLinkInput.value = newLead.callBookingLink;
    if (instagramLinkInput) instagramLinkInput.value = newLead.instagramLink;
    if (youtubeLinkInput) youtubeLinkInput.value = newLead.youtubeLink;
    if (tiktokLinkInput) tiktokLinkInput.value = newLead.tiktokLink;
    if (avgViewsInput) avgViewsInput.value = newLead.avgViews;
    if (leadNotesTextarea) leadNotesTextarea.value = newLead.notes;
    if (otherNicheNotesTextarea) otherNicheNotesTextarea.value = newLead.otherNicheNotes;

    // Update radio buttons (on addleads.html)
    if (follower10KUpRadio) follower10KUpRadio.checked = newLead.followerCount === '10K up';
    if (followerLess10KRadio) followerLess10KRadio.checked = newLead.followerCount === 'Less 10k';

    // Render niches checkboxes and sub-niches (on addleads.html)
    if (nichesContainer) {
        nichesContainer.innerHTML = ''; // Clear previous niches
        poppyAINiches.forEach(majorNiche => {
            const div = document.createElement('div');
            div.className = 'mb-3';

            const label = document.createElement('label');
            label.className = 'inline-flex items-center';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = 'niches';
            checkbox.value = majorNiche.name;
            checkbox.className = 'form-checkbox h-4 w-4 text-indigo-600 rounded';
            checkbox.checked = newLead.niches.includes(majorNiche.name);
            checkbox.addEventListener('change', handleNicheChange);

            const span = document.createElement('span');
            span.className = 'ml-2 text-gray-800 font-semibold';
            span.textContent = majorNiche.name;

            label.appendChild(checkbox);
            label.appendChild(span);
            div.appendChild(label);

            // Display sub-niches as enumerated notes if the major niche is selected
            if (newLead.niches.includes(majorNiche.name) && majorNiche.subNiches && majorNiche.subNiches.length > 0) {
                const ol = document.createElement('ol');
                ol.className = 'list-decimal list-inside ml-6 text-gray-500 italic text-sm mt-1';
                majorNiche.subNiches.forEach((subNiche, index) => {
                    const li = document.createElement('li');
                    li.textContent = subNiche;
                    ol.appendChild(li);
                });
                div.appendChild(ol);
            }
            nichesContainer.appendChild(div);
        });
    }

    // Show/hide "Others" notes field (on addleads.html)
    if (otherNicheNotesContainer) {
        if (newLead.niches.includes('Others')) {
            otherNicheNotesContainer.classList.remove('hidden');
        } else {
            otherNicheNotesContainer.classList.add('hidden');
        }
    }

    // Update form title and buttons based on editing state (on addleads.html)
    if (formTitle && addLeadBtn && updateLeadBtn && cancelEditBtn) {
        if (editingLeadId) {
            formTitle.textContent = 'Edit Lead';
            addLeadBtn.classList.add('hidden');
            updateLeadBtn.classList.remove('hidden');
            cancelEditBtn.classList.remove('hidden');
        } else {
            formTitle.textContent = 'Add New Lead';
            addLeadBtn.classList.remove('hidden');
            updateLeadBtn.classList.add('hidden');
            cancelEditBtn.classList.add('hidden');
        }
    }

    // Display validation error if any (on addleads.html)
    if (validationErrorDiv && errorMessageSpan) {
        if (validationError) {
            validationErrorDiv.classList.remove('hidden');
            errorMessageSpan.textContent = validationError;
        } else {
            validationErrorDiv.classList.add('hidden');
            errorMessageSpan.textContent = '';
        }
    }

    // Display authentication error (on index.html/login page)
    if (authErrorDiv && authErrorMessageSpan) {
        if (authError) {
            authErrorDiv.classList.remove('hidden');
            authErrorMessageSpan.textContent = authError;
        } else {
            authErrorDiv.classList.add('hidden');
            authErrorMessageSpan.textContent = '';
        }
    }
}

/**
 * Updates the newLead state based on input changes.
 * @param {Event} e - The input change event.
 */
function updateFormInput(e) {
    const { id, name, value, type, checked } = e.target;
    validationError = ''; // Clear validation error on input change

    if (type === 'radio') {
        newLead[name] = value;
    } else {
        // Map input IDs to newLead properties
        const propertyMap = {
            'lead-name': 'name',
            'lead-email': 'email',
            'call-booking-link': 'callBookingLink',
            'instagram-link': 'instagramLink',
            'youtube-link': 'youtubeLink',
            'tiktok-link': 'tiktokLink',
            'avg-views': 'avgViews',
            'lead-notes': 'notes',
            'other-niche-notes': 'otherNicheNotes'
        };
        const propName = propertyMap[id];
        if (propName) {
            newLead[propName] = value;
        }
    }
    renderForm(); // Re-render form to reflect changes and validation messages
}

/**
 * Handles changes to the major niche checkboxes.
 * @param {Event} e - The checkbox change event.
 */
function handleNicheChange(e) {
    const { value, checked } = e.target;
    validationError = ''; // Clear validation error on input change

    if (checked) {
        newLead.niches.push(value);
    } else {
        newLead.niches = newLead.niches.filter(niche => niche !== value);
        // If "Others" is unchecked, clear its notes field
        if (value === 'Others') {
            newLead.otherNicheNotes = '';
        }
    }
    renderForm(); // Re-render form to update sub-niche display and "Others" notes field
}

/**
 * Validates the form fields.
 * @returns {boolean} True if form is valid, false otherwise.
 */
function validateForm() {
    // Only validate lead form elements if they exist on the current page (addleads.html)
    if (leadNameInput) { // Check for existence of a lead form element
        if (!newLead.name.trim()) {
            validationError = 'Lead Name is required.';
            return false;
        }

        const hasSocialMediaLink = newLead.instagramLink.trim() || newLead.youtubeLink.trim() || newLead.tiktokLink.trim();
        if (!hasSocialMediaLink) {
            validationError = 'At least one social media link (Instagram, YouTube, or TikTok) is required.';
            return false;
        }

        if (!newLead.followerCount) {
            validationError = 'Follower Count (10K up or Less 10k) is required.';
            return false;
        }

        if (newLead.niches.length === 0) {
            validationError = 'At least one Niche must be selected.';
            return false;
        }

        if (newLead.niches.includes('Others') && !newLead.otherNicheNotes.trim()) {
            validationError = 'Please specify details for "Others" niche.';
            return false;
        }
    }

    validationError = ''; // Clear any previous errors if all validations pass
    return true;
}

/**
 * Adds a new lead to Firestore.
 */
async function handleAddLead() {
    if (!window.db || !currentUserId) {
        console.error("Firestore not initialized or user not authenticated.");
        window.showMessage("Application not fully loaded or authenticated. Please refresh and try again.");
        return;
    }
    if (!validateForm()) {
        renderForm(); // Re-render form to show validation error
        return;
    }

    try {
        // Use the hardcoded appId from the firebaseConfig
        await addDoc(collection(window.db, `artifacts/${window.appId}/public/data/leads`), {
            ...newLead,
            createdAt: serverTimestamp(), // Use serverTimestamp for consistent time
            createdBy: currentUserId
        });
        resetForm();
    } catch (e) {
        console.error("Error adding document: ", e);
        window.showMessage(`Error adding lead: ${e.message}. Check console for details.`);
    }
}

/**
 * Populates the form for editing an existing lead.
 * @param {string} id - The ID of the lead to edit.
 */
function handleEditLead(id) {
    const leadToEdit = leads.find(lead => lead.id === id);
    if (leadToEdit) {
        editingLeadId = id;
        newLead = { ...leadToEdit }; // Copy lead data to newLead for editing
        // Ensure niches is an array and otherNicheNotes is string for consistency
        newLead.niches = newLead.niches || [];
        newLead.otherNicheNotes = newLead.otherNicheNotes || '';
        renderForm();
    }
}

/**
 * Updates an existing lead in Firestore.
 */
async function handleUpdateLead() {
    if (!window.db || !currentUserId || !editingLeadId) {
        console.error("Firestore not initialized, user not authenticated, or no lead selected for editing.");
        window.showMessage("Application not fully loaded or authenticated. Cannot update.");
        return;
    }
    if (!validateForm()) {
        renderForm(); // Re-render form to show validation error
        return;
    }

    try {
        // Use the hardcoded appId from the firebaseConfig
        const leadRef = doc(window.db, `artifacts/${window.appId}/public/data/leads`, editingLeadId);
        await updateDoc(leadRef, {
            ...newLead,
            updatedAt: serverTimestamp(), // Use serverTimestamp for consistent time
            updatedBy: currentUserId
        });
        resetForm();
    } catch (e) {
        console.error("Error updating document: ", e);
        window.showMessage(`Error updating lead: ${e.message}. Check console for details.`);
    }
}

/**
 * Deletes a lead from Firestore.
 * @param {string} id - The ID of the lead to delete.
 */
async function handleDeleteLead(id) {
    if (!window.db || !currentUserId) {
        console.error("Firestore not initialized or user not authenticated.");
        window.showMessage("Application not fully loaded or authenticated. Cannot delete.");
        return;
    }
    try {
        await deleteDoc(doc(window.db, `artifacts/${window.appId}/public/data/leads`, id));
    } catch (e) {
        console.error("Error removing document: ", e);
        window.showMessage(`Error deleting lead: ${e.message}. Check console for details.`);
    }
}

/**
 * Resets the form to its initial state.
 */
function resetForm() {
    newLead = {
        name: '', email: '', notes: '', callBookingLink: '',
        followerCount: '', avgViews: '', instagramLink: '',
        youtubeLink: '', tiktokLink: '', niches: [], otherNicheNotes: ''
    };
    editingLeadId = null;
    validationError = '';
    renderForm();
}

/**
 * Renders the list of leads.
 */
function renderLeadsList() {
    if (leadsListDiv && noLeadsMessage) {
        leadsListDiv.innerHTML = ''; // Clear existing list
        if (leads.length === 0) {
            noLeadsMessage.classList.remove('hidden');
            leadsListDiv.appendChild(noLeadsMessage);
        } else {
            noLeadsMessage.classList.add('hidden');
            leads.forEach(lead => {
                const leadDiv = document.createElement('div');
                leadDiv.className = 'bg-white p-5 rounded-lg shadow-md border border-indigo-200 flex flex-col sm:flex-row justify-between items-start sm:items-center';
                leadDiv.innerHTML = `
                    <div class="flex-grow mb-3 sm:mb-0">
                        <h3 class="text-xl font-bold text-gray-900">${lead.name || 'No Name'}</h3>
                        ${lead.email ? `<p class="text-gray-600 text-sm">Email: <a href="mailto:${lead.email}" class="text-indigo-500 hover:underline">${lead.email}</a></p>` : ''}
                        ${lead.callBookingLink ? `<p class="text-gray-600 text-sm">Call Booking: <a href="${lead.callBookingLink}" target="_blank" rel="noopener noreferrer" class="text-indigo-500 hover:underline truncate inline-block max-w-[200px] sm:max-w-full">${lead.callBookingLink}</a></p>` : ''}
                        ${lead.instagramLink ? `<p class="text-gray-600 text-sm ml-4">Instagram: <a href="${lead.instagramLink}" target="_blank" rel="noopener noreferrer" class="text-purple-600 hover:underline truncate inline-block max-w-[200px] sm:max-w-full">${lead.instagramLink}</a></p>` : ''}
                        ${lead.youtubeLink ? `<p class="text-gray-600 text-sm ml-4">YouTube: <a href="${lead.youtubeLink}" target="_blank" rel="noopener noreferrer" class="text-red-600 hover:underline truncate inline-block max-w-[200px] sm:max-w-full">${lead.youtubeLink}</a></p>` : ''}
                        ${lead.tiktokLink ? `<p class="text-gray-600 text-sm ml-4">TikTok: <a href="${lead.tiktokLink}" target="_blank" rel="noopener noreferrer" class="text-gray-800 hover:underline truncate inline-block max-w-[200px] sm:max-w-full">${lead.tiktokLink}</a></p>` : ''}
                        ${lead.followerCount ? `<p class="text-gray-700 text-sm">Followers: <span class="font-medium">${lead.followerCount}</span></p>` : ''}
                        ${lead.avgViews ? `<p class="text-gray-700 text-sm">Avg. Views: <span class="font-medium">${lead.avgViews}</span></p>` : ''}
                        ${lead.niches && lead.niches.length > 0 ? `<p class="text-gray-700 text-sm mt-2">Niches: <span class="font-medium">${lead.niches.join(', ')}</span></p>` : ''}
                        ${lead.otherNicheNotes ? `<p class="text-gray-700 text-sm mt-1 italic">Other Niche Details: ${lead.otherNicheNotes}</p>` : ''}
                        ${lead.notes ? `<p class="text-gray-800 text-sm mt-2 italic">Notes: ${lead.notes}</p>` : ''}
                        <p class="text-gray-500 text-xs mt-1">
                            Added by: ${lead.createdBy?.substring(0, 8)}... on ${lead.createdAt?.toDate().toLocaleString()}
                        </p>
                    </div>
                    <div class="flex space-x-2 mt-3 sm:mt-0">
                        <button data-id="${lead.id}" class="edit-btn px-4 py-2 bg-yellow-500 text-white rounded-lg shadow-sm hover:bg-yellow-600 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-yellow-400">
                            Edit
                        </button>
                        <button data-id="${lead.id}" class="delete-btn px-4 py-2 bg-red-500 text-white rounded-lg shadow-sm hover:bg-red-600 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-400">
                            Delete
                        </button>
                    </div>
                `;
                leadsListDiv.appendChild(leadDiv);
            });

            // Attach event listeners to newly created buttons
            document.querySelectorAll('.edit-btn').forEach(button => {
                button.addEventListener('click', (e) => handleEditLead(e.target.dataset.id));
            });
            document.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', (e) => handleDeleteLead(e.target.dataset.id));
            });
        }
    }
}

/**
 * Handles user sign-out.
 */
async function handleSignOut() {
    try {
        await window.auth.signOut();
        // Redirection handled by onAuthStateChanged in main.js
    } catch (error) {
        console.error("Sign Out Error:", error);
        window.showMessage(`Sign Out Failed: ${error.message}`);
    }
}

/**
 * Initializes the add leads page specific elements and listeners.
 * Called by main.js after Firebase is initialized and user is verified.
 * @param {object} user The current Firebase user object.
 */
export function initAddLeadsPage(user) {
    currentUserId = user.uid;
    if (appContent) appContent.classList.remove('hidden'); // Ensure app content is visible
    if (currentUserIdSpan) currentUserIdSpan.textContent = user.email || user.uid;
    if (userIdDisplay) userIdDisplay.classList.remove('hidden');

    // Attach event listeners
    if (logoutBtn) logoutBtn.addEventListener('click', handleSignOut);
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

    // Start Firestore listener for leads
    const leadsCollectionRef = collection(window.db, `artifacts/${window.appId}/public/data/leads`);
    onSnapshot(leadsCollectionRef, (snapshot) => {
        leads = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        // Sort leads by creation time in memory
        leads.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));
        renderLeadsList();
    }, (error) => {
        console.error("Error fetching leads:", error);
        window.showMessage(`Error fetching leads: ${error.message}.`);
    });

    // Initial render of the form and leads list
    renderForm();
    renderLeadsList();
}
