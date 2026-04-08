/**
 * =====================================================
 * ANIME_RIFT — Firebase Configuration (firebase-config.js)
 *
 * HOW TO SET UP:
 * 1. Go to https://console.firebase.google.com
 * 2. Create a new project (e.g., "anime-rift")
 * 3. Enable Authentication → Sign-in methods → Email/Password + Google
 * 4. Go to Project Settings → Your apps → Add Web App
 * 5. Copy your config object and paste it below
 * =====================================================
 */

// ⚠️  REPLACE THIS WITH YOUR ACTUAL FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase (safely — only if config is real)
let firebaseApp = null;
let firebaseAuth = null;

try {
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    firebaseAuth = firebase.auth();
    console.log('[Anime_Rift] Firebase initialized successfully.');
  } else {
    console.warn('[Anime_Rift] Firebase config not set. Auth features disabled. See firebase-config.js for setup instructions.');
  }
} catch (err) {
  console.warn('[Anime_Rift] Firebase init failed:', err.message);
}

// Export for use in auth.js
window.animeRiftAuth = firebaseAuth;
window.animeRiftFirebase = firebaseApp;
