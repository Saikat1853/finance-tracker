// Application Entry Point & Navigation
document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");
  const timeFrameSelect = document.getElementById("time-frame");
  const categoryFilterSelect = document.getElementById("category-filter");
  const customDateContainer = document.getElementById("custom-date-container");
  const applyFilterBtn = document.getElementById("apply-filter-btn");
  const exportBtn = document.getElementById("export-csv-btn");

  // Profile Modal Elements
  const profileBtn = document.getElementById("profile-btn");
  const profileModal = document.getElementById("profile-modal");
  const closeProfileModalBtn = document.getElementById("close-profile-modal-btn");
  const backupAllCsvBtn = document.getElementById("backup-all-csv-btn");
  const csvFileInput = document.getElementById("csv-file-input");

  // Tab switching
  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tabContents.forEach((c) => c.classList.add("hidden"));

      btn.classList.add("active");
      const targetTab = document.getElementById(btn.getAttribute("data-tab"));
      if (targetTab) targetTab.classList.remove("hidden");
    });
  });

  // Time frame filter change
  timeFrameSelect.addEventListener("change", (e) => {
    if (e.target.value === "custom") {
      customDateContainer.classList.remove("hidden");
    } else {
      customDateContainer.classList.add("hidden");
      loadTransactions();
    }
  });

  // Category filter change
  if (categoryFilterSelect) {
    categoryFilterSelect.addEventListener("change", () => {
      loadTransactions();
    });
  }

  // Custom date filter apply button
  applyFilterBtn.addEventListener("click", () => {
    loadTransactions();
  });

  // CSV Export Filtered Data Trigger
  exportBtn.addEventListener("click", () => {
    const period = timeFrameSelect.value;
    const cat = categoryFilterSelect ? categoryFilterSelect.value : "all";
    exportToCSV(
      currentTransactions,
      `finance_${cat}_${period}_${new Date().toISOString().split("T")[0]}.csv`
    );
  });

  // Open / Close Profile Modal Helpers
  function openProfileModal() {
    if (profileModal) {
      profileModal.classList.remove("hidden");
      document.body.classList.add("modal-open");
    }
  }

  function closeProfileModal() {
    if (profileModal) {
      profileModal.classList.add("hidden");
      document.body.classList.remove("modal-open");
    }
  }

  if (profileBtn) profileBtn.addEventListener("click", openProfileModal);
  if (closeProfileModalBtn) closeProfileModalBtn.addEventListener("click", closeProfileModal);

  // Close profile modal on backdrop click
  if (profileModal) {
    profileModal.addEventListener("click", (e) => {
      if (e.target === profileModal) {
        closeProfileModal();
      }
    });
  }

  // Global ESC key listener to close active modals
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeProfileModal();
      const txModal = document.getElementById("transaction-modal");
      if (txModal && !txModal.classList.contains("hidden")) {
        txModal.classList.add("hidden");
        document.body.classList.remove("modal-open");
      }
      const confirmModal = document.getElementById("confirm-modal");
      if (confirmModal && !confirmModal.classList.contains("hidden")) {
        confirmModal.classList.add("hidden");
        document.body.classList.remove("modal-open");
      }
    }
  });

  // Download All-Time Backup CSV from Profile
  if (backupAllCsvBtn) {
    backupAllCsvBtn.addEventListener("click", async () => {
      const { data, error } = await supabaseClient
        .from("transactions")
        .select("*")
        .order("date", { ascending: false });

      if (error || !data) {
        showToast("Failed to generate backup: " + (error?.message || "No data"), "error");
        return;
      }

      exportToCSV(data, `full_finance_backup_${new Date().toISOString().split("T")[0]}.csv`);
      showToast("Full backup downloaded successfully!", "success");
    });
  }

  // Handle CSV File Upload via import.js
  if (csvFileInput) {
    csvFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        handleCSVUpload(file);
        csvFileInput.value = "";
      }
    });
  }
});

// Global Toast Notification
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(50px)";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Global Custom Promise-based Confirm Dialog
function customConfirm(message, title = "Delete Transaction") {
  return new Promise((resolve) => {
    const modal = document.getElementById("confirm-modal");
    const titleEl = document.getElementById("confirm-title");
    const msgEl = document.getElementById("confirm-message");
    const acceptBtn = document.getElementById("confirm-accept-btn");
    const cancelBtn = document.getElementById("confirm-cancel-btn");

    titleEl.textContent = title;
    msgEl.textContent = message;
    modal.classList.remove("hidden");
    document.body.classList.add("modal-open");

    const cleanup = (result) => {
      modal.classList.add("hidden");
      document.body.classList.remove("modal-open");
      acceptBtn.removeEventListener("click", onAccept);
      cancelBtn.removeEventListener("click", onCancel);
      resolve(result);
    };

    const onAccept = () => cleanup(true);
    const onCancel = () => cleanup(false);

    acceptBtn.addEventListener("click", onAccept);
    cancelBtn.addEventListener("click", onCancel);
  });
}