let isSignUpMode = false;

// DOM Elements
const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");
const authForm = document.getElementById("auth-form");
const authTitle = document.getElementById("auth-title");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const authSubmitBtn = document.getElementById("auth-submit-btn");
const authToggleBtn = document.getElementById("auth-toggle-btn");
const authToggleText = document.getElementById("auth-toggle-text");
const authError = document.getElementById("auth-error");
const profileEmailText = document.getElementById("profile-email-text");
const logoutBtn = document.getElementById("logout-btn");
const changePasswordForm = document.getElementById("change-password-form");

// Toggle Sign In / Sign Up Mode
authToggleBtn.addEventListener("click", () => {
  isSignUpMode = !isSignUpMode;
  authTitle.textContent = isSignUpMode ? "Create Account" : "Sign In";
  authSubmitBtn.textContent = isSignUpMode ? "Sign Up" : "Sign In";
  authToggleText.textContent = isSignUpMode ? "Already have an account?" : "Don't have an account?";
  authToggleBtn.textContent = isSignUpMode ? "Sign In" : "Sign Up";
  authError.textContent = "";
});

// Handle Auth Form Submission
authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authError.textContent = "";

  const email = authEmail.value.trim();
  const password = authPassword.value;

  try {
    if (isSignUpMode) {
      const { data, error } = await supabaseClient.auth.signUp({ email, password });
      if (error) throw error;
      if (data.user && !data.session) {
        authError.style.color = "var(--primary)";
        authError.textContent = "Check your email for confirmation link.";
        return;
      }
    } else {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
  } catch (err) {
    authError.style.color = "var(--expense)";
    authError.textContent = err.message;
  }
});

// Handle Password Change in Profile with Session Validation
if (changePasswordForm) {
  changePasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById("new-password").value;
    const confirmPassword = document.getElementById("confirm-new-password").value;

    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters long", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match!", "error");
      return;
    }

    // 1. Verify active session before updating
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

    if (sessionError || !session) {
      showToast("Your session has expired. Please log out and sign in again.", "error");
      return;
    }

    // 2. Perform password update
    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });

    if (error) {
      showToast("Failed to update password: " + error.message, "error");
      return;
    }

    showToast("Password updated successfully!", "success");
    changePasswordForm.reset();
    
    const profileModal = document.getElementById("profile-modal");
    if (profileModal) {
      profileModal.classList.add("hidden");
      document.body.classList.remove("modal-open");
    }
  });
}

// Handle Logout
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.reload();
  });
}

// UI State Updater
async function updateAuthState(session) {
  if (session?.user) {
    authSection.classList.add("hidden");
    appSection.classList.remove("hidden");
    if (profileEmailText) profileEmailText.textContent = session.user.email;
    
    // Automatically fetch transactions
    if (typeof loadTransactions === "function") {
      await loadTransactions();
    }
  } else {
    authSection.classList.remove("hidden");
    appSection.classList.add("hidden");
    if (profileEmailText) profileEmailText.textContent = "";
  }
}

// Initial Session Check on Page Load
document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  updateAuthState(session);
});

// Real-time Auth State Change Listener
supabaseClient.auth.onAuthStateChange((event, session) => {
  updateAuthState(session);
});