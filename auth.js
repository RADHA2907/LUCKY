/**
 * =====================================================
 * ANIME_RIFT — Firebase Auth Module (auth.js)
 * Handles: Login, Signup, Google OAuth, Logout
 * =====================================================
 */

'use strict';

// ============================================================
// WAIT FOR DOM
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const auth = window.animeRiftAuth;

  // ============================================================
  // AUTH MODAL OPEN/CLOSE
  // ============================================================
  const authBtn = document.getElementById('auth-btn');
  const modalOverlay = document.getElementById('auth-modal-overlay');
  const modalClose = document.getElementById('auth-modal-close');

  authBtn?.addEventListener('click', () => {
    if (auth) {
      modalOverlay?.classList.add('open');
    } else {
      showAuthToast('Firebase is not configured. Set up firebase-config.js to enable login.', 'info');
    }
  });

  modalClose?.addEventListener('click', () => modalOverlay?.classList.remove('open'));

  // Close on overlay click
  modalOverlay?.addEventListener('click', (e) => {
    if (e.target === modalOverlay) modalOverlay.classList.remove('open');
  });

  // ============================================================
  // TAB SWITCHING (Login / Sign Up)
  // ============================================================
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');

  tabLogin?.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabSignup?.classList.remove('active');
    loginForm?.classList.remove('hidden');
    signupForm?.classList.add('hidden');
  });

  tabSignup?.addEventListener('click', () => {
    tabSignup.classList.add('active');
    tabLogin?.classList.remove('active');
    signupForm?.classList.remove('hidden');
    loginForm?.classList.add('hidden');
  });

  // ============================================================
  // FIREBASE AUTH LISTENERS (only if Firebase configured)
  // ============================================================
  if (!auth) {
    setupFallbackAuthUI();
    return;
  }

  // Monitor auth state changes
  auth.onAuthStateChanged((user) => {
    updateAuthUI(user);
  });

  // ============================================================
  // EMAIL / PASSWORD LOGIN
  // ============================================================
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email')?.value;
    const password = document.getElementById('login-password')?.value;
    const errorEl = document.getElementById('login-error');
    const submitBtn = document.getElementById('login-submit');

    clearError('login-error');
    if (submitBtn) submitBtn.textContent = 'Logging in...';

    try {
      await auth.signInWithEmailAndPassword(email, password);
      modalOverlay?.classList.remove('open');
      showAuthToast('Welcome back! 🎉', 'success');
    } catch (err) {
      showError('login-error', getAuthError(err.code));
    } finally {
      if (submitBtn) submitBtn.textContent = 'Login';
    }
  });

  // ============================================================
  // EMAIL / PASSWORD SIGNUP
  // ============================================================
  signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name')?.value;
    const email = document.getElementById('signup-email')?.value;
    const password = document.getElementById('signup-password')?.value;
    const errorEl = document.getElementById('signup-error');
    const submitBtn = document.getElementById('signup-submit');

    clearError('signup-error');
    if (submitBtn) submitBtn.textContent = 'Creating account...';

    try {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      // Update display name
      await cred.user.updateProfile({ displayName: name });
      modalOverlay?.classList.remove('open');
      showAuthToast(`Welcome to Anime_Rift, ${name}! 🌸`, 'success');
    } catch (err) {
      showError('signup-error', getAuthError(err.code));
    } finally {
      if (submitBtn) submitBtn.textContent = 'Create Account';
    }
  });

  // ============================================================
  // GOOGLE SIGN IN
  // ============================================================
  const googleBtns = ['google-login', 'google-signup'];
  googleBtns.forEach(id => {
    document.getElementById(id)?.addEventListener('click', async () => {
      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithPopup(provider);
        modalOverlay?.classList.remove('open');
        showAuthToast('Signed in with Google! 🎉', 'success');
      } catch (err) {
        showAuthToast('Google sign-in failed: ' + getAuthError(err.code), 'error');
      }
    });
  });

  // ============================================================
  // LOGOUT
  // ============================================================
  document.getElementById('auth-btn')?.addEventListener('contextmenu', async (e) => {
    const user = auth.currentUser;
    if (user) {
      e.preventDefault();
      await auth.signOut();
      showAuthToast('Logged out successfully.', 'info');
    }
  });
});

// ============================================================
// UPDATE AUTH UI
// ============================================================
function updateAuthUI(user) {
  const authBtn = document.getElementById('auth-btn');
  const authLabel = document.getElementById('auth-label');

  if (user) {
    if (authLabel) authLabel.textContent = user.displayName
      ? user.displayName.split(' ')[0]
      : 'Me';
    if (authBtn) {
      authBtn.title = `Signed in as ${user.email}\nRight-click to logout`;
    }
  } else {
    if (authLabel) authLabel.textContent = 'Login';
    if (authBtn) authBtn.title = 'Login';
  }
}

// ============================================================
// FALLBACK UI (Firebase not configured)
// ============================================================
function setupFallbackAuthUI() {
  const authBtn = document.getElementById('auth-btn');
  const authLabel = document.getElementById('auth-label');
  if (authLabel) authLabel.textContent = 'Login';

  // Remove auth forms from modal and show setup message
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const authTabs = document.querySelector('.auth-tabs');

  if (loginForm) loginForm.innerHTML = `
    <div style="text-align:center;padding:24px;color:var(--text-muted);">
      <i class="fas fa-fire-flame-curved" style="font-size:2.5rem;color:var(--accent-pink);display:block;margin-bottom:16px;"></i>
      <h3 style="color:var(--text-primary);margin-bottom:12px;">Firebase Not Configured</h3>
      <p style="font-size:0.88rem;line-height:1.7;margin-bottom:16px;">
        To enable login, set up a Firebase project and update <code style="background:var(--bg-glass);padding:2px 6px;border-radius:4px;">firebase-config.js</code>
        with your credentials.
      </p>
      <a href="https://console.firebase.google.com" target="_blank" rel="noopener" class="btn-primary" style="display:inline-flex;">
        <i class="fab fa-google"></i> Open Firebase Console
      </a>
    </div>
  `;
  if (signupForm) signupForm.classList.add('hidden');
  if (authTabs) authTabs.style.display = 'none';
}

// ============================================================
// HELPERS
// ============================================================
function showError(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = message;
    el.classList.remove('hidden');
  }
}

function clearError(elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = '';
    el.classList.add('hidden');
  }
}

function showAuthToast(message, type = 'info') {
  const icons = { success: 'fas fa-check-circle', error: 'fas fa-exclamation-circle', info: 'fas fa-info-circle' };
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="${icons[type]}"></i> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('out');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3500);
}

function getAuthError(code) {
  const errors = {
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/invalid-credential': 'Invalid credentials. Please check your email and password.',
  };
  return errors[code] || 'Authentication failed. Please try again.';
}
