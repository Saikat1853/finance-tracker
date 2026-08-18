let currentTransactions = [];

// Date range calculation helper
function getDateRange(period) {
  const now = new Date();
  let start = new Date();
  let end = new Date();

  if (period === "weekly") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    start = new Date(now.setDate(diff));
    end = new Date(start);
    end.setDate(start.getDate() + 6);
  } else if (period === "monthly") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else if (period === "yearly") {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear(), 11, 31);
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

// Fetch transactions filtered by date range
async function loadTransactions() {
  const timeFrameEl = document.getElementById("time-frame");
  const period = timeFrameEl ? timeFrameEl.value : "monthly";
  const { startDate, endDate } = getDateRange(period);

  const { data, error } = await supabaseClient
    .from("transactions")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });

  if (error) {
    showToast("Error fetching transactions: " + error.message, "error");
    return;
  }

  currentTransactions = data || [];
  renderTable(currentTransactions);
  if (typeof renderAnalytics === "function") {
    renderAnalytics(currentTransactions);
  }
}

// Render transaction rows into table
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
        <button class="action-btn delete-btn" data-id="${tx.id}">Delete</button>
      </td>
    `;
    txTableBody.appendChild(tr);
  });

  // Attach delete listeners
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.getAttribute("data-id");
      deleteTransaction(id);
    });
  });
}

// Delete Transaction with Custom Dialog & Toast
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

// Open & Close Modal Helpers
function openModal() {
  const txModal = document.getElementById("transaction-modal");
  const txForm = document.getElementById("transaction-form");
  const txDateInput = document.getElementById("tx-date");

  if (txForm) txForm.reset();
  if (txDateInput) txDateInput.value = new Date().toISOString().split("T")[0];
  if (txModal) txModal.classList.remove("hidden");
}

function closeModal() {
  const txModal = document.getElementById("transaction-modal");
  if (txModal) txModal.classList.add("hidden");
}

// Initialize listeners after DOM is loaded
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

      const type = document.getElementById("tx-type").value;
      const amount = parseFloat(document.getElementById("tx-amount").value);
      const category = document.getElementById("tx-category").value.trim();
      const date = document.getElementById("tx-date").value;
      const description = document.getElementById("tx-desc").value.trim();

      const { error } = await supabaseClient.from("transactions").insert([
        { user_id: user.id, type, amount, category, date, description }
      ]);

      if (error) {
        showToast("Failed to save: " + error.message, "error");
        return;
      }

      showToast("Transaction added successfully", "success");
      closeModal();
      loadTransactions();
    });
  }
});