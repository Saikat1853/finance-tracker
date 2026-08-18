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
const userDisplay = document.getElementById("user-display");
const logoutBtn = document.getElementById("logout-btn");

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

// Handle Logout
logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  window.location.reload();
});

// UI State Updater
function updateAuthState(session) {
  if (session?.user) {
    authSection.classList.add("hidden");
    appSection.classList.remove("hidden");
    userDisplay.textContent = session.user.email;
    loadTransactions();
  } else {
    authSection.classList.remove("hidden");
    appSection.classList.add("hidden");
    userDisplay.textContent = "";
  }
}

// 1. Check existing cached session immediately on refresh
supabaseClient.auth.getSession().then(({ data: { session } }) => {
  updateAuthState(session);
});

// 2. Listen to subsequent state changes (login, logout, token refresh)
supabaseClient.auth.onAuthStateChange((event, session) => {
  updateAuthState(session);
});