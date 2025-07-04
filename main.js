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
    verificationMessageTextSpan.textContent = `Please verify your email address (${email}) to access the dashboard. Check your inbox for a verification link.`;
    emailVerificationMessageDiv.classList.remove('hidden');
}

/**
 * Hides the email verification message box.
 */
function hideEmailVerificationMessage() {
    emailVerificationMessageDiv.classList.add('hidden');
    verificationMessageTextSpan.textContent = '';
}

/**
 * Renders the current state of the form inputs.
 */
function renderForm() {
    leadNameInput.value = newLead.name;
    leadEmailInput.value = newLead.email;
    callBookingLinkInput.value = newLead.callBookingLink;
    instagramLinkInput.value = newLead.instagramLink;
    youtubeLinkInput.value = newLead.youtubeLink;
    tiktokLinkInput.value = newLead.tiktokLink;
    avgViewsInput.value = newLead.avgViews;
    leadNotesTextarea.value = newLead.notes;
    otherNicheNotesTextarea.value = newLead.otherNicheNotes;

    // Update radio buttons
    follower10KUpRadio.checked = newLead.followerCount === '10K up';
    followerLess10KRadio.checked = newLead.followerCount === 'Less 10k';

    // Render niches checkboxes and sub-niches
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

    // Show/hide "Others" notes field
    if (newLead.niches.includes('Others')) {
        otherNicheNotesContainer.classList.remove('hidden');
    } else {
        otherNicheNotesContainer.classList.add('hidden');
    }

    // Update form title and buttons based on editing state
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

    // Display validation error if any
    if (validationError) {
        validationErrorDiv.classList.remove('hidden');
        errorMessageSpan.textContent = validationError;
    } else {
        validationErrorDiv.classList.add('hidden');
        errorMessageSpan.textContent = '';
    }

    // Display authentication error
    if (authError) {
        authErrorDiv.classList.remove('hidden');
        authErrorMessageSpan.textContent = authError;
    } else {
        authErrorDiv.classList.add('hidden');
        authErrorMessageSpan.textContent = '';
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
        // Attempt to create a new user first
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Scenario 3: New user created successfully
        await sendEmailVerification(user);
        showMessage(`Account created for ${user.email}! A verification email has been sent to your address. Please verify to sign in.`);
        hideEmailVerificationMessage(); // Ensure hidden for new sign-ups
        authEmailInput.value = '';
        authPasswordInput.value = '';
        authError = ''; // Clear any auth error if sign up was successful

    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            // User already exists, now try to sign them in to check verification status
            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                await user.reload(); // Get latest status

                if (user.emailVerified) {
                    // Scenario 1: Existing & Verified
                    authError = 'User already exists and is verified. Please sign in directly.';
                    hideEmailVerificationMessage(); // Ensure hidden
                } else {
                    // Scenario 2: Existing & Not Verified
                    authError = ''; // Clear red error to show yellow message
                    showEmailVerificationMessage(user.email);
                }
                authEmailInput.value = ''; // Clear credentials for existing users too
                authPasswordInput.value = '';
                await signOut(auth); // Keep them on auth screen
            } catch (signInError) {
                // If sign-in fails even after 'email-already-in-use' (e.g., wrong password for existing user)
                console.error("Sign In Error (existing user during Sign Up attempt):", signInError);
                authError = `Sign Up Failed: ${signInError.message}`;
                hideEmailVerificationMessage(); // Hide yellow message if sign-in failed
            }
        } else {
            // Other sign-up errors (e.g., weak password, invalid email format for new user creation)
            console.error("Sign Up Error:", error);
            authError = `Sign Up Failed: ${error.message}`;
            hideEmailVerificationMessage(); // Hide yellow message on other sign-up errors
        }
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
            // Keep them on the auth section
            authSection.classList.remove('hidden');
            appContent.classList.add('hidden');
            // Sign out the user to prevent partial access before verification
            await signOut(auth);
        } else {
            // Email is verified, onAuthStateChanged will handle showing the dashboard
            authError = ''; // Clear error if successfully signed in and verified
            hideEmailVerificationMessage(); // Ensure hidden if they were unverified and just verified
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
        // Auth state listener will handle UI update on successful sign-out
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

        // Listen for auth state changes to get the user ID
        onAuthStateChanged(auth, async (user) => { // Made async to allow user.reload()
            if (user) {
                // Reload user to get the latest emailVerified status
                await user.reload(); // Important for checking verification status after user clicks link

                if (user.emailVerified) {
                    currentUserId = user.uid;
                    currentUserIdSpan.textContent = user.email || user.uid; // Display email if available
                    authSection.classList.add('hidden'); // Hide auth section
                    hideEmailVerificationMessage(); // Hide verification message
                    appContent.classList.remove('hidden'); // Show app content
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
                } else {
                    // User is signed in but email not verified
                    currentUserId = null; // Treat as not fully authenticated for app access
                    authSection.classList.remove('hidden'); // Show auth section
                    appContent.classList.add('hidden'); // Hide app content
                    console.warn("User signed in but email not verified:", user.email);
                }
            } else {
                currentUserId = null;
                currentUserIdSpan.textContent = '';
                userIdDisplay.classList.add('hidden'); // Hide user ID display
                authSection.classList.remove('hidden'); // Show auth section
                hideEmailVerificationMessage(); // Hide verification message if no user
                appContent.classList.add('hidden'); // Hide app content
                leads = []; // Clear leads if no user
                renderLeadsList();
            }
            renderForm(); // Update UI after auth state change
        });

        // Initial render of the form
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

// Authentication button listeners
signupBtn.addEventListener('click', handleSignUp);
signinBtn.addEventListener('click', handleSignIn);
logoutBtn.addEventListener('click', handleSignOut);
closeMessageBtn.addEventListener('click', hideMessage); // Event listener for the "Got It!" button
// Re-added event listeners for email verification message buttons
resendVerificationBtn.addEventListener('click', handleResendVerificationEmail);
refreshStatusBtn.addEventListener('click', handleRefreshStatus);


// Form input listeners
leadNameInput.addEventListener('input', updateFormInput);
leadEmailInput.addEventListener('input', updateFormInput);
callBookingLinkInput.addEventListener('input', updateFormInput);
instagramLinkInput.addEventListener('input', updateFormInput);
youtubeLinkInput.addEventListener('input', updateFormInput);
tiktokLinkInput.addEventListener('input', updateFormInput);
follower10KUpRadio.addEventListener('change', updateFormInput);
followerLess10KRadio.addEventListener('change', updateFormInput);
avgViewsInput.addEventListener('input', updateFormInput);
otherNicheNotesTextarea.addEventListener('input', updateFormInput);
leadNotesTextarea.addEventListener('input', updateFormInput);

// Button listeners for lead management
addLeadBtn.addEventListener('click', handleAddLead);
updateLeadBtn.addEventListener('click', handleUpdateLead);
cancelEditBtn.addEventListener('click', resetForm); // Cancel button simply resets the form
