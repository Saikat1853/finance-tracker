let currentTransactions = [];

// Date range calculation helper
function getDateRange(period) {
  const now = new Date();
  let start = new Date();
  let end = new Date();

  if (period === "weekly") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    start = new Date(now.setDate(diff));
    end = new Date(start);
    end.setDate(start.getDate() + 6);
  } else if (period === "monthly") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else if (period === "yearly") {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear(), 11, 31);
  } else if (period === "all") {
    return {
      startDate: "1970-01-01",
      endDate: "2099-12-31"
    };
  } else if (period === "custom") {
    const customStart = document.getElementById("start-date")?.value;
    const customEnd = document.getElementById("end-date")?.value;
    return {
      startDate: customStart || "1970-01-01",
      endDate: customEnd || "2099-12-31"
    };
  }

  const format = (d) => d.toISOString().split("T")[0];
  return { startDate: format(start), endDate: format(end) };
}

// Fetch transactions filtered by date and category with loading state
async function loadTransactions() {
  const timeFrameEl = document.getElementById("time-frame");
  const categoryFilterEl = document.getElementById("category-filter");
  const loadingEl = document.getElementById("table-loading");
  const emptyState = document.getElementById("table-empty-state");
  const txTableBody = document.getElementById("transactions-table-body");

  // Show spinner, clear table temporarily
  if (loadingEl) loadingEl.classList.remove("hidden");
  if (emptyState) emptyState.classList.add("hidden");
  if (txTableBody) txTableBody.innerHTML = "";

  const period = timeFrameEl ? timeFrameEl.value : "monthly";
  const selectedCategory = categoryFilterEl ? categoryFilterEl.value : "all";
  const { startDate, endDate } = getDateRange(period);

  let query = supabaseClient
    .from("transactions")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });

  if (selectedCategory && selectedCategory !== "all") {
    query = query.eq("category", selectedCategory);
  }

  const { data, error } = await query;

  // Hide spinner
  if (loadingEl) loadingEl.classList.add("hidden");

  if (error) {
    showToast("Error fetching transactions: " + error.message, "error");
    return;
  }

  currentTransactions = data || [];
  renderTable(currentTransactions);
  updateCategoryDropdownOptions();

  if (typeof renderAnalytics === "function") {
    renderAnalytics(currentTransactions);
  }
}

// Populate the Category filter dynamically from available data
async function updateCategoryDropdownOptions() {
  const categoryFilterEl = document.getElementById("category-filter");
  if (!categoryFilterEl) return;

  const currentSelection = categoryFilterEl.value;

  const { data } = await supabaseClient
    .from("transactions")
    .select("category");

  if (!data) return;

  const categories = Array.from(new Set(data.map((t) => t.category).filter(Boolean))).sort();

  categoryFilterEl.innerHTML = `<option value="all">All Categories</option>`;
  categories.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    if (cat === currentSelection) option.selected = true;
    categoryFilterEl.appendChild(option);
  });
}

// Render transaction rows with Edit and Delete actions
function renderTable(transactions) {
  const txTableBody = document.getElementById("transactions-table-body");
  const emptyState = document.getElementById("table-empty-state");
  if (!txTableBody) return;

  txTableBody.innerHTML = "";

  if (!transactions.length) {
    if (emptyState) emptyState.classList.remove("hidden");
    return;
  }
  if (emptyState) emptyState.classList.add("hidden");

  transactions.forEach((tx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${tx.date}</td>
      <td><span class="type-pill ${tx.type}">${tx.type}</span></td>
      <td>${tx.category}</td>
      <td>${tx.description || "-"}</td>
      <td style="font-weight:600; color:${tx.type === "income" ? "var(--income)" : "var(--expense)"}">
        ${tx.type === "income" ? "+" : "-"}₹${Number(tx.amount).toFixed(2)}
      </td>
      <td>
        <div class="action-cell">
          <button class="action-btn edit-btn" data-id="${tx.id}">Edit</button>
          <button class="action-btn delete-btn" data-id="${tx.id}">Delete</button>
        </div>
      </td>
    `;
    txTableBody.appendChild(tr);
  });

  // Attach Edit and Delete Event Listeners
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.getAttribute("data-id");
      openEditModal(id);
    });
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.getAttribute("data-id");
      deleteTransaction(id);
    });
  });
}

// Open Modal in Edit Mode with Pre-filled Form Values
function openEditModal(id) {
  const tx = currentTransactions.find((t) => t.id === id);
  if (!tx) return;

  document.getElementById("modal-title").textContent = "Edit Transaction";
  document.getElementById("tx-id").value = tx.id;
  document.getElementById("tx-type").value = tx.type;
  document.getElementById("tx-amount").value = tx.amount;
  document.getElementById("tx-category").value = tx.category;
  document.getElementById("tx-date").value = tx.date;
  document.getElementById("tx-desc").value = tx.description || "";

  document.getElementById("transaction-modal").classList.remove("hidden");
}

// Open Modal in Create Mode
function openModal() {
  const txForm = document.getElementById("transaction-form");
  if (txForm) txForm.reset();
  
  document.getElementById("modal-title").textContent = "New Transaction";
  document.getElementById("tx-id").value = "";
  document.getElementById("tx-date").value = new Date().toISOString().split("T")[0];
  document.getElementById("transaction-modal").classList.remove("hidden");
}

function closeModal() {
  const txModal = document.getElementById("transaction-modal");
  if (txModal) txModal.classList.add("hidden");
}

// Delete Transaction
async function deleteTransaction(id) {
  const confirmed = await customConfirm("Are you sure you want to delete this record? This action cannot be undone.");
  if (!confirmed) return;

  const { error } = await supabaseClient.from("transactions").delete().eq("id", id);
  if (error) {
    showToast("Failed to delete transaction: " + error.message, "error");
    return;
  }
  showToast("Transaction deleted successfully", "success");
  loadTransactions();
}

// Event Listeners setup
document.addEventListener("DOMContentLoaded", () => {
  const openModalBtn = document.getElementById("open-modal-btn");
  const closeModalBtn = document.getElementById("close-modal-btn");
  const cancelModalBtn = document.getElementById("cancel-modal-btn");
  const txForm = document.getElementById("transaction-form");

  if (openModalBtn) openModalBtn.addEventListener("click", openModal);
  if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
  if (cancelModalBtn) cancelModalBtn.addEventListener("click", closeModal);

  if (txForm) {
    txForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        showToast("Session expired. Please log in again.", "error");
        return;
      }

      const txId = document.getElementById("tx-id").value;
      const type = document.getElementById("tx-type").value;
      const amount = parseFloat(document.getElementById("tx-amount").value);
      const category = document.getElementById("tx-category").value.trim();
      const date = document.getElementById("tx-date").value;
      const description = document.getElementById("tx-desc").value.trim();

      const payload = { user_id: user.id, type, amount, category, date, description };

      let resultError = null;

      if (txId) {
        // Update Existing Transaction
        const { error } = await supabaseClient
          .from("transactions")
          .update(payload)
          .eq("id", txId);
        resultError = error;
      } else {
        // Insert New Transaction
        const { error } = await supabaseClient
          .from("transactions")
          .insert([payload]);
        resultError = error;
      }

      if (resultError) {
        showToast("Failed to save: " + resultError.message, "error");
        return;
      }

      showToast(txId ? "Transaction updated successfully" : "Transaction added successfully", "success");
      closeModal();
      loadTransactions();
    });
  }
});