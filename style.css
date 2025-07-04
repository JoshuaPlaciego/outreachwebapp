<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Poppy.AI Lead Generation</title>
    <!-- Tailwind CSS CDN for styling -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Google Fonts: Inter -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <!-- Custom Stylesheet -->
    <link rel="stylesheet" href="style.css">
</head>
<body class="min-h-screen bg-gray-100 p-4 flex flex-col items-center justify-center">

    <!-- Loading Indicator -->
    <div id="loading-indicator" class="view active">
        <div class="flex flex-col items-center justify-center space-y-4">
            <svg class="animate-spin h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="text-gray-600">Loading App...</p>
        </div>
    </div>

    <!-- Auth View -->
    <div id="auth-view" class="view w-full max-w-md">
        <div class="bg-white rounded-xl shadow-lg p-8">
            <h2 class="text-3xl font-bold text-indigo-800 mb-2 text-center">Welcome to Poppy.AI</h2>
            <p class="text-center text-gray-600 mb-8">Sign in or create an account to manage your leads.</p>

            <!-- Auth Error Message -->
            <div id="auth-error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4 hidden" role="alert">
                <strong class="font-bold">Auth Error: </strong>
                <span id="auth-error-message"></span>
            </div>

            <!-- Email Verification Message -->
            <div id="email-verification-message" class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg relative mb-4 hidden" role="alert">
                <strong class="font-bold">Verification Needed</strong>
                <p class="mt-1">Please verify your email address at <span id="verification-email-display" class="font-semibold"></span> to continue. Check your inbox for a verification link.</p>
                <div class="text-center mt-3">
                    <a href="#" id="inline-resend-link" class="text-indigo-600 hover:underline font-semibold">Resend Verification Email</a>
                </div>
            </div>

            <div class="space-y-4">
                <div>
                    <label for="auth-email" class="block text-gray-700 text-sm font-bold mb-2">Email:</label>
                    <input type="email" id="auth-email" placeholder="you@example.com" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400">
                </div>
                <div>
                    <label for="auth-password" class="block text-gray-700 text-sm font-bold mb-2">Password:</label>
                    <input type="password" id="auth-password" placeholder="Your Password" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400">
                </div>
            </div>

            <div class="flex flex-col sm:flex-row justify-between gap-4 mt-6">
                <button id="signup-btn" class="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">Sign Up</button>
                <button id="signin-btn" class="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition duration-300 focus:outline-none focus:ring-2 focus:ring-green-500">Sign In</button>
            </div>
        </div>
    </div>

    <!-- App View (Dashboard) -->
    <div id="app-view" class="view w-full max-w-4xl">
        <div class="bg-white rounded-xl shadow-lg p-6">
            <div class="flex justify-between items-center mb-4">
                <h1 class="text-3xl font-bold text-indigo-800">Leads Dashboard</h1>
                <button id="logout-btn" class="px-4 py-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 transition duration-300 focus:outline-none focus:ring-2 focus:ring-red-400">Log Out</button>
            </div>
            <div id="user-id-display" class="mb-6 text-sm text-gray-600 text-center">
                User ID: <span class="font-mono bg-gray-200 px-2 py-1 rounded-md" id="current-user-id"></span>
            </div>

            <!-- Lead Input Form -->
            <div class="mb-8 p-6 bg-indigo-50 rounded-lg shadow-inner">
                <h2 id="form-title" class="text-2xl font-semibold text-indigo-800 mb-4">Add New Lead</h2>
                <div id="validation-error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4 hidden" role="alert">
                    <strong class="font-bold">Error: </strong>
                    <span id="error-message" class="block sm:inline"></span>
                </div>

                <!-- Form Sections -->
                <div class="space-y-6">
                    <!-- Basic Info -->
                    <div class="p-4 border border-indigo-200 rounded-lg bg-white">
                        <h3 class="text-lg font-semibold text-indigo-700 mb-3">Basic Information <span class="text-red-500">*</span></h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" id="lead-name" placeholder="Lead Name" class="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" required />
                            <input type="email" id="lead-email" placeholder="Email" class="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                            <input type="url" id="call-booking-link" placeholder="Call Booking Link (e.g., Calendly)" class="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 col-span-full" />
                        </div>
                    </div>
                    <!-- Social Media -->
                    <div class="p-4 border border-indigo-200 rounded-lg bg-white">
                        <h3 class="text-lg font-semibold text-indigo-700 mb-3">Social Media Links <span class="text-red-500">*</span></h3>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input type="url" id="instagram-link" placeholder="Instagram Profile URL" class="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400" />
                            <input type="url" id="youtube-link" placeholder="YouTube Channel URL" class="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400" />
                            <input type="url" id="tiktok-link" placeholder="TikTok Profile URL" class="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black" />
                        </div>
                    </div>
                    <!-- Metrics & Niches -->
                    <div class="p-4 border border-indigo-200 rounded-lg bg-white">
                        <h3 class="text-lg font-semibold text-indigo-700 mb-3">Metrics & Niche <span class="text-red-500">*</span></h3>
                        <div class="mb-4">
                            <label class="block text-gray-700 text-sm font-bold mb-2">Follower Count:</label>
                            <div class="flex gap-4 mb-3">
                                <label class="inline-flex items-center"><input type="radio" name="followerCount" value="10K up" id="follower-10k-up" class="form-radio h-4 w-4 text-indigo-600" required /><span class="ml-2 text-gray-700">10K+</span></label>
                                <label class="inline-flex items-center"><input type="radio" name="followerCount" value="Less 10k" id="follower-less-10k" class="form-radio h-4 w-4 text-indigo-600" required /><span class="ml-2 text-gray-700">&lt; 10k</span></label>
                            </div>
                        </div>
                        <input type="number" id="avg-views" placeholder="Average Views" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4" />
                        <div>
                            <label class="block text-gray-700 text-sm font-bold mb-2">Niches (Select all that apply):</label>
                            <div id="niches-container" class="border border-indigo-200 rounded-lg p-3 max-h-60 overflow-y-auto no-scrollbar"></div>
                        </div>
                        <div id="other-niche-notes-container" class="mt-4 hidden">
                            <label class="block text-gray-700 text-sm font-bold mb-2">Specify Other Niche(s):</label>
                            <textarea id="other-niche-notes" placeholder="e.g., Quantum Computing, Sustainable Fashion" rows="3" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"></textarea>
                        </div>
                    </div>
                    <!-- Notes -->
                    <div class="p-4 border border-indigo-200 rounded-lg bg-white">
                        <h3 class="text-lg font-semibold text-indigo-700 mb-3">Notes</h3>
                        <textarea id="lead-notes" placeholder="e.g., specific interests, last contact date" rows="4" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"></textarea>
                    </div>
                </div>
                <!-- Form Buttons -->
                <div class="flex justify-end space-x-2 mt-6">
                    <button id="update-lead-btn" class="px-6 py-3 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 hidden">Update Lead</button>
                    <button id="cancel-edit-btn" class="px-6 py-3 bg-gray-500 text-white rounded-lg shadow-md hover:bg-gray-600 transition duration-300 focus:outline-none focus:ring-2 focus:ring-gray-400 hidden">Cancel</button>
                    <button id="add-lead-btn" class="px-6 py-3 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">Add Lead</button>
                </div>
            </div>

            <!-- Leads List -->
            <div>
                <h2 class="text-2xl font-semibold text-indigo-800 mb-4">Your Leads</h2>
                <div id="leads-list" class="grid grid-cols-1 gap-4">
                    <p id="no-leads-message" class="text-gray-600 text-center p-4 bg-gray-50 rounded-lg">No leads added yet. Start by adding one above!</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Custom Message Box -->
    <div id="custom-message-box-overlay" class="hidden" style="opacity: 0;">
        <div id="custom-message-box" style="transform: scale(0.95);">
            <p id="message-text" class="text-lg text-gray-800 mb-6"></p>
            <button id="close-message-btn" class="px-6 py-3 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">Got It!</button>
        </div>
    </div>

    <!-- Application Logic -->
    <script type="module" src="script.js"></script>
</body>
</html>
