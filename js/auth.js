let isSignUpMode = false; //[cite: 18]

// DOM Elements
const authSection = document.getElementById("auth-section"); //[cite: 18]
const appSection = document.getElementById("app-section"); //[cite: 18]
const authForm = document.getElementById("auth-form"); //[cite: 18]
const authTitle = document.getElementById("auth-title"); //[cite: 18]
const authEmail = document.getElementById("auth-email"); //[cite: 18]
const authPassword = document.getElementById("auth-password"); //[cite: 18]
const authSubmitBtn = document.getElementById("auth-submit-btn"); //[cite: 18]
const authToggleBtn = document.getElementById("auth-toggle-btn"); //[cite: 18]
const authToggleText = document.getElementById("auth-toggle-text"); //[cite: 18]
const authError = document.getElementById("auth-error"); //[cite: 18]
const profileEmailText = document.getElementById("profile-email-text"); //[cite: 18]
const logoutBtn = document.getElementById("logout-btn"); //[cite: 18]
const changePasswordForm = document.getElementById("change-password-form"); //[cite: 18]

// Toggle Sign In / Sign Up Mode
authToggleBtn.addEventListener("click", () => { //[cite: 18]
  isSignUpMode = !isSignUpMode; //[cite: 18]
  authTitle.textContent = isSignUpMode ? "Create Account" : "Sign In"; //[cite: 18]
  authSubmitBtn.textContent = isSignUpMode ? "Sign Up" : "Sign In"; //[cite: 18]
  authToggleText.textContent = isSignUpMode ? "Already have an account?" : "Don't have an account?"; //[cite: 18]
  authToggleBtn.textContent = isSignUpMode ? "Sign In" : "Sign Up"; //[cite: 18]
  authError.textContent = ""; //[cite: 18]
}); //[cite: 18]

// Handle Auth Form Submission
authForm.addEventListener("submit", async (e) => { //[cite: 18]
  e.preventDefault(); //[cite: 18]
  authError.textContent = ""; //[cite: 18]

  const email = authEmail.value.trim(); //[cite: 18]
  const password = authPassword.value; //[cite: 18]

  try { //[cite: 18]
    if (isSignUpMode) { //[cite: 18]
      const { data, error } = await supabaseClient.auth.signUp({ email, password }); //[cite: 18]
      if (error) throw error; //[cite: 18]
      if (data.user && !data.session) { //[cite: 18]
        authError.style.color = "var(--primary)"; //[cite: 18]
        authError.textContent = "Check your email for confirmation link."; //[cite: 18]
        return; //[cite: 18]
      }
    } else { //[cite: 18]
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password }); //[cite: 18]
      if (error) throw error; //[cite: 18]
    }
  } catch (err) { //[cite: 18]
    authError.style.color = "var(--expense)"; //[cite: 18]
    authError.textContent = err.message; //[cite: 18]
  }
}); //[cite: 18]

// Handle Password Change in Profile with Session Validation
if (changePasswordForm) { //[cite: 18]
  changePasswordForm.addEventListener("submit", async (e) => { //[cite: 18]
    e.preventDefault(); //[cite: 18]
    const newPassword = document.getElementById("new-password").value; //[cite: 18]
    const confirmPassword = document.getElementById("confirm-new-password").value; //[cite: 18]

    if (newPassword.length < 6) { //[cite: 18]
      showToast("Password must be at least 6 characters long", "error"); //[cite: 18]
      return; //[cite: 18]
    }

    if (newPassword !== confirmPassword) { //[cite: 18]
      showToast("Passwords do not match!", "error"); //[cite: 18]
      return; //[cite: 18]
    }

    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession(); //[cite: 18]

    if (sessionError || !session) { //[cite: 18]
      showToast("Your session has expired. Please log out and sign in again.", "error"); //[cite: 18]
      return; //[cite: 18]
    }

    const { error } = await supabaseClient.auth.updateUser({ password: newPassword }); //[cite: 18]

    if (error) { //[cite: 18]
      showToast("Failed to update password: " + error.message, "error"); //[cite: 18]
      return; //[cite: 18]
    }

    showToast("Password updated successfully!", "success"); //[cite: 18]
    changePasswordForm.reset(); //[cite: 18]
    
    const profileModal = document.getElementById("profile-modal"); //[cite: 18]
    if (profileModal) { //[cite: 18]
      profileModal.classList.add("hidden"); //[cite: 18]
      document.body.classList.remove("modal-open"); //[cite: 18]
    }
  }); //[cite: 18]
}

// Handle Logout
if (logoutBtn) { //[cite: 18]
  logoutBtn.addEventListener("click", async () => { //[cite: 18]
    await supabaseClient.auth.signOut(); //[cite: 18]
    window.location.reload(); //[cite: 18]
  }); //[cite: 18]
}

// UI State Updater
async function updateAuthState(session) { //[cite: 18]
  if (session?.user) { //[cite: 18]
    authSection.classList.add("hidden"); //[cite: 18]
    appSection.classList.remove("hidden"); //[cite: 18]
    if (profileEmailText) profileEmailText.textContent = session.user.email; //[cite: 18]
    
    // Automatically load transactions & money records
    if (typeof loadTransactions === "function") { //[cite: 18]
      await loadTransactions(); //[cite: 18]
    }
    if (typeof loadMoneyRecords === "function") {
      await loadMoneyRecords();
    }
  } else {
    authSection.classList.remove("hidden"); //[cite: 18]
    appSection.classList.add("hidden"); //[cite: 18]
    if (profileEmailText) profileEmailText.textContent = ""; //[cite: 18]
  }
} //[cite: 18]

// Initial Session Check on Page Load
document.addEventListener("DOMContentLoaded", async () => { //[cite: 18]
  const { data: { session } } = await supabaseClient.auth.getSession(); //[cite: 18]
  updateAuthState(session); //[cite: 18]
}); //[cite: 18]

// Real-time Auth State Change Listener
supabaseClient.auth.onAuthStateChange((event, session) => { //[cite: 18]
  updateAuthState(session); //[cite: 18]
}); //[cite: 18]