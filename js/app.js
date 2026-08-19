// Application Entry Point & Navigation
document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");
  const timeFrameSelect = document.getElementById("time-frame");
  const categoryFilterSelect = document.getElementById("category-filter");
  const customDateContainer = document.getElementById("custom-date-container");
  const applyFilterBtn = document.getElementById("apply-filter-btn");
  const exportBtn = document.getElementById("export-csv-btn");

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

  // CSV Export Trigger
  exportBtn.addEventListener("click", () => {
    const period = timeFrameSelect.value;
    const cat = categoryFilterSelect.value;
    exportToCSV(
      currentTransactions,
      `finance_${cat}_${period}_${new Date().toISOString().split("T")[0]}.csv`
    );
  });
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

    const cleanup = (result) => {
      modal.classList.add("hidden");
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