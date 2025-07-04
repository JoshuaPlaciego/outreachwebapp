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
const authSection = document.getElementById('auth-section');
const appContent = document.getElementById('app-content');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const signupBtn = document.getElementById('signup-btn');
const signinBtn = document.getElementById('signin-btn');
const logoutBtn = document.getElementById('logout-btn');
const authErrorDiv = document.getElementById('auth-error');
const authErrorMessageSpan = document.getElementById('auth-error-message');
const emailVerificationMessageDiv = document.getElementById('email-verification-message');
const verificationMessageTextSpan = document.getElementById('verification-message-text');
const resendVerificationBtn = document.getElementById('resend-verification-btn');
const refreshStatusBtn = document.getElementById('refresh-status-btn');

const userIdDisplay = document.getElementById('user-id-display');
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
const follower10KUpRadio = document.getElementById('follower-10k-up');
const followerLess10KRadio = document.getElementById('follower-less-10k');
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
 */
function hideEmailVerificationMessage() {
    if (emailVerificationMessageDiv && verificationMessageTextSpan) {
        emailVerificationMessageDiv.classList.add('hidden');
        verificationMessageTextSpan.textContent = '';
    }
}

/**
 * Renders the current state of the form inputs.
 */
function renderForm() {
    // Only render form elements if they exist on the current page (index.html)
    if (leadNameInput) leadNameInput.value = newLead.name;
    if (leadEmailInput) leadEmailInput.value = newLead.email;
    if (callBookingLinkInput) callBookingLinkInput.value = newLead.callBookingLink;
    if (instagramLinkInput) instagramLinkInput.value = newLead.instagramLink;
    if (youtubeLinkInput) youtubeLinkInput.value = newLead.youtubeLink;
    if (tiktokLinkInput) tiktokLinkInput.value = newLead.tiktokLink;
    if (avgViewsInput) avgViewsInput.value = newLead.avgViews;
    if (leadNotesTextarea) leadNotesTextarea.value = newLead.notes;
    if (otherNicheNotesTextarea) otherNicheNotesTextarea.value = newLead.otherNicheNotes;

    // Update radio buttons
    if (follower10KUpRadio) follower10KUpRadio.checked = newLead.followerCount === '10K up';
    if (followerLess10KRadio) followerLess10KRadio.checked = newLead.followerCount === 'Less 10k';

    // Render niches checkboxes and sub-niches
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


    // Show/hide "Others" notes field
    if (otherNicheNotesContainer) {
        if (newLead.niches.includes('Others')) {
            otherNicheNotesContainer.classList.remove('hidden');
        } else {
            otherNicheNotesContainer.classList.add('hidden');
        }
    }


    // Update form title and buttons based on editing state
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


    // Display validation error if any
    if (validationErrorDiv && errorMessageSpan) {
        if (validationError) {
            validationErrorDiv.classList.remove('hidden');
            errorMessageSpan.textContent = validationError;
        } else {
            validationErrorDiv.classList.add('hidden');
            errorMessageSpan.textContent = '';
        }
    }


    // Display authentication error
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

    validationError = ''; // Clear any previous errors if all validations pass
    return true;
}

/**
 * Adds a new lead to Firestore.
 */
async function handleAddLead() {
    if (!db || !currentUserId) {
        console.error("Firestore not initialized or user not authenticated.");
        // Display a user-friendly error if Firebase isn't ready
        validationError = "Application not fully loaded or authenticated. Please refresh and try again.";
        renderForm();
        return;
    }
    if (!validateForm()) {
        renderForm(); // Re-render form to show validation error
        return;
    }

    try {
        // Use the hardcoded appId from the firebaseConfig
        await addDoc(collection(db, `artifacts/${appId}/public/data/leads`), {
            ...newLead,
            createdAt: serverTimestamp(), // Use serverTimestamp for consistent time
            createdBy: currentUserId
        });
        resetForm();
    } catch (e) {
        console.error("Error adding document: ", e);
        validationError = `Error adding lead: ${e.message}. Check console for details.`;
        renderForm();
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
    if (!db || !currentUserId || !editingLeadId) {
        console.error("Firestore not initialized, user not authenticated, or no lead selected for editing.");
        validationError = "Application not fully loaded or authenticated. Cannot update.";
        renderForm();
        return;
    }
    if (!validateForm()) {
        renderForm(); // Re-render form to show validation error
        return;
    }

    try {
        // Use the hardcoded appId from the firebaseConfig
        const leadRef = doc(db, `artifacts/${appId}/public/data/leads`, editingLeadId);
        await updateDoc(leadRef, {
            ...newLead,
            updatedAt: serverTimestamp(), // Use serverTimestamp for consistent time
            updatedBy: currentUserId
        });
        resetForm();
    } catch (e) {
        console.error("Error updating document: ", e);
        validationError = `Error updating lead: ${e.message}. Check console for details.`;
        renderForm();
    }
}

/**
 * Deletes a lead from Firestore.
 * @param {string} id - The ID of the lead to delete.
 */
async function handleDeleteLead(id) {
    if (!db || !currentUserId) {
        console.error("Firestore not initialized or user not authenticated.");
        validationError = "Application not fully loaded or authenticated. Cannot delete.";
        renderForm();
    }
    try {
        // Use the hardcoded appId from the firebaseConfig
        await deleteDoc(doc(db, `artifacts/${appId}/public/data/leads`, id));
    } catch (e) {
        console.error("Error removing document: ", e);
        validationError = `Error deleting lead: ${e.message}. Check console for details.`;
        renderForm();
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
 * Handles user sign-up with email and password.
 */
async function handleSignUp() {
    authError = ''; // Clear previous auth errors
    const email = authEmailInput.value;
    const password = authPasswordInput.value;

    if (!email || !password) {
        authError = 'Email and password are required for sign up.';
        renderForm();
        return;
    }
    if (password.length < 6) {
        authError = 'Password must be at least 6 characters long.';
        renderForm();
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await sendEmailVerification(user);
        showMessage(`Account created for ${user.email}! A verification email has been sent to your address. Please verify your email and then sign in.`);

        // Clear input fields after successful signup
        authEmailInput.value = '';
        authPasswordInput.value = '';
        authError = ''; // Clear any auth error if sign up was successful

        // Sign out the user immediately after sending verification email.
        // This ensures they must go through the sign-in flow after verification.
        await signOut(auth);

    } catch (error) {
        console.error("Sign Up Error:", error);
        if (error.code === 'auth/email-already-in-use') {
            authError = 'This email is already registered. Please sign in or use a different email.';
        } else if (error.code === 'auth/invalid-email') {
            authError = 'Invalid email address format.';
        } else if (error.code === 'auth/weak-password') {
            authError = 'Password is too weak. Please choose a stronger password.';
        } else {
            authError = `Sign Up Failed: ${error.message}`;
        }
        hideEmailVerificationMessage(); // Ensure hidden on sign-up errors
    } finally {
        renderForm(); // Always re-render to update UI based on final state
    }
}

/**
 * Handles user sign-in with email and password.
 */
async function handleSignIn() {
    authError = ''; // Clear previous auth errors
    const email = authEmailInput.value;
    const password = authPasswordInput.value;

    if (!email || !password) {
        authError = 'Email and password are required for sign in.';
        renderForm();
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Reload user to get the latest emailVerified status
        await user.reload();

        if (!user.emailVerified) {
            // User is signed in but email not verified, show error
            authError = `Please verify your email address (${user.email}) to access the dashboard.`;
            showEmailVerificationMessage(user.email); // Explicitly show the yellow message
            // Sign out the user to prevent partial access before verification
            await signOut(auth);
            // Redirect to login page
            window.location.href = 'login.html';
        } else {
            // Email is verified, redirect to main app content
            authError = ''; // Clear error if successfully signed in and verified
            hideEmailVerificationMessage(); // Ensure hidden if they were unverified and just verified
            window.location.href = 'index.html';
        }
        renderForm(); // Re-render to show authError or clear it
    } catch (error) {
        console.error("Sign In Error:", error);
        authError = `Sign In Failed: ${error.message}`;
        hideEmailVerificationMessage(); // Hide verification message on sign-in error
        renderForm();
    }
}

/**
 * Handles user sign-out.
 */
async function handleSignOut() {
    try {
        await signOut(auth);
        // Redirect to login page after sign out
        window.location.href = 'login.html';
        resetForm(); // Clear form data on logout
    } catch (error) {
        console.error("Sign Out Error:", error);
        authError = `Sign Out Failed: ${error.message}`; // Corrected error variable
        renderForm();
    }
}

/**
 * Handles resending the email verification.
 */
async function handleResendVerificationEmail() {
    authError = ''; // Clear previous auth errors
    const user = auth.currentUser;
    if (user) {
        try {
            await sendEmailVerification(user);
            authError = 'Verification email re-sent! Please check your inbox.';
            renderForm();
        } catch (error) {
            console.error("Resend Verification Error:", error);
            authError = `Failed to resend verification email: ${error.message}`;
            renderForm();
        }
    } else {
        authError = 'No user is currently signed in to resend verification.';
        renderForm();
    }
}

/**
 * Handles refreshing the user's authentication status to check email verification.
 */
async function handleRefreshStatus() {
    authError = ''; // Clear previous auth errors
    const user = auth.currentUser;
    if (user) {
        try {
            await user.reload(); // Reloads the user's profile
            // The onAuthStateChanged listener will then re-evaluate user.emailVerified
        } catch (error) {
            console.error("Refresh Status Error:", error);
            authError = `Failed to refresh status: ${error.message}`;
            renderForm();
        }
    } else {
        authError = 'No user is currently signed in to refresh status.';
        renderForm();
    }
}


/**
 * Initializes the application, setting up Firebase and listeners.
 */
async function initApp() {
    // Ensure the custom message box is hidden on initial load
    hideMessage();
    hideEmailVerificationMessage(); // Ensure this is also hidden on load

    try {
        // Initialize Firebase app with the directly provided config
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // Determine if we are on the login page or the main app page
        const isLoginPage = window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('/');

        // Listen for auth state changes to get the user ID
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                await user.reload(); // Important for checking verification status

                if (user.emailVerified) {
                    currentUserId = user.uid;
                    if (currentUserIdSpan) currentUserIdSpan.textContent = user.email || user.uid;
                    if (userIdDisplay) userIdDisplay.classList.remove('hidden');

                    hideEmailVerificationMessage(); // Hide verification message

                    // If on login page and verified, redirect to index.html
                    if (isLoginPage) {
                        window.location.href = 'index.html';
                    } else {
                        // If on index.html and verified, ensure app content is visible
                        if (appContent) appContent.classList.remove('hidden');
                        authError = ''; // Clear any lingering auth errors
                        // Start Firestore listener AFTER user is authenticated and verified
                        const leadsCollectionRef = collection(db, `artifacts/${appId}/public/data/leads`);
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
                            validationError = `Error fetching leads: ${error.message}.`;
                            renderForm();
                        });
                    }
                } else {
                    // User is signed in but email not verified
                    currentUserId = null; // Treat as not fully authenticated for app access
                    if (!isLoginPage) { // If on index.html, redirect to login
                        window.location.href = 'login.html';
                    } else {
                        // If on login.html, ensure auth section is visible and show verification message
                        if (authSection) authSection.classList.remove('hidden');
                        if (appContent) appContent.classList.add('hidden'); // Ensure app content is hidden
                        showEmailVerificationMessage(user.email);
                        console.warn("User signed in but email not verified:", user.email);
                    }
                }
            } else {
                // No user signed in
                currentUserId = null;
                if (currentUserIdSpan) currentUserIdSpan.textContent = '';
                if (userIdDisplay) userIdDisplay.classList.add('hidden');
                hideEmailVerificationMessage(); // Hide verification message if no user
                leads = []; // Clear leads if no user

                if (!isLoginPage) { // If on index.html and not logged in, redirect to login
                    window.location.href = 'login.html';
                } else {
                    // If on login.html and not logged in, ensure auth section is visible
                    if (authSection) authSection.classList.remove('hidden');
                    if (appContent) appContent.classList.add('hidden'); // Ensure app content is hidden
                }
                renderLeadsList(); // Clear leads list on UI
            }
            renderForm(); // Update UI after auth state change
        });

        // Initial render of the form (only for elements present on the current page)
        renderForm();

    } catch (error) {
        console.error("Failed to initialize Firebase:", error);
        // Display a user-friendly error message if Firebase fails to initialize
        validationError = "Failed to load application. Please ensure Firebase configuration is correct and try refreshing.";
        renderForm();
    }
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', initApp);

// Attach event listeners only if the elements exist on the current page
if (signupBtn) signupBtn.addEventListener('click', handleSignUp);
if (signinBtn) signinBtn.addEventListener('click', handleSignIn);
if (logoutBtn) logoutBtn.addEventListener('click', handleSignOut);
if (closeMessageBtn) closeMessageBtn.addEventListener('click', hideMessage);
if (resendVerificationBtn) resendVerificationBtn.addEventListener('click', handleResendVerificationEmail);
if (refreshStatusBtn) refreshStatusBtn.addEventListener('click', handleRefreshStatus);

// Form input listeners (only if elements exist)
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

// Button listeners for lead management (only if elements exist)
if (addLeadBtn) addLeadBtn.addEventListener('click', handleAddLead);
if (updateLeadBtn) updateLeadBtn.addEventListener('click', handleUpdateLead);
if (cancelEditBtn) cancelEditBtn.addEventListener('click', resetForm);
