// Open Add Repayment Modal for a Consolidated Group
function openAddRepaymentModal(groupKey) {
  const group = consolidatedMoneyGroups.find((g) => g.groupKey === groupKey);
  if (!group) return;

  const { remaining } = group._computed;
  if (remaining <= 0) {
    if (typeof showToast === "function") {
      showToast("This person is already fully settled!", "info");
    }
    return;
  }

  const form = document.getElementById("repayment-form");
  if (form) form.reset();

  document.getElementById("rep-record-id").value = group.groupKey; // store groupKey
  document.getElementById("rep-max-outstanding").value = remaining;
  document.getElementById("rep-person-text").textContent = `${group.displayName} (${group.direction === "lent" ? "Receivable" : "Payable"})`;
  document.getElementById("rep-outstanding-text").textContent = `₹${remaining.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  document.getElementById("rep-date").value = new Date().toISOString().split("T")[0];

  const modal = document.getElementById("repayment-modal");
  if (modal) {
    modal.classList.remove("hidden");
    document.body.classList.add("modal-open");
  }
}

function closeAddRepaymentModal() {
  const modal = document.getElementById("repayment-modal");
  if (modal) {
    modal.classList.add("hidden");
    document.body.classList.remove("modal-open");
  }
}

// Repayment Form Submission Handler with Smart Record Attribution
document.addEventListener("DOMContentLoaded", () => {
  const closeRepBtn = document.getElementById("close-repayment-modal-btn");
  const cancelRepBtn = document.getElementById("cancel-repayment-modal-btn");
  const form = document.getElementById("repayment-form");

  if (closeRepBtn) closeRepBtn.addEventListener("click", closeAddRepaymentModal);
  if (cancelRepBtn) cancelRepBtn.addEventListener("click", closeAddRepaymentModal);

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        if (typeof showToast === "function") {
          showToast("Session expired. Please log in again.", "error");
        }
        return;
      }

      const groupKey = document.getElementById("rep-record-id").value;
      const group = consolidatedMoneyGroups.find((g) => g.groupKey === groupKey);

      if (!group) {
        if (typeof showToast === "function") {
          showToast("Invalid record selected", "error");
        }
        return;
      }

      const maxOutstanding = parseFloat(document.getElementById("rep-max-outstanding").value) || 0;
      let repaymentAmount = parseFloat(document.getElementById("rep-amount").value);
      const date = document.getElementById("rep-date").value;
      const note = document.getElementById("rep-note").value.trim() || null;

      if (isNaN(repaymentAmount) || repaymentAmount <= 0) {
        if (typeof showToast === "function") {
          showToast("Repayment amount must be greater than zero", "error");
        }
        return;
      }

      if (repaymentAmount > maxOutstanding) {
        if (typeof showToast === "function") {
          showToast(`Repayment cannot exceed the remaining balance of ₹${maxOutstanding.toLocaleString("en-IN")}`, "error");
        }
        return;
      }

      // Distribute repayment across the person's records (Oldest record first)
      const sortedRecords = group.records.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
      const repaymentInserts = [];
      let remainingToAttribute = repaymentAmount;

      for (const rec of sortedRecords) {
        if (remainingToAttribute <= 0) break;

        const recRepaid = (rec.money_repayments || []).reduce((sum, r) => sum + Number(r.amount), 0);
        const recUnsettled = Number(rec.amount) - recRepaid;

        if (recUnsettled > 0) {
          const allocate = Math.min(remainingToAttribute, recUnsettled);
          repaymentInserts.push({
            money_record_id: rec.id,
            user_id: user.id,
            amount: allocate,
            date,
            note
          });
          remainingToAttribute -= allocate;
        }
      }

      // If all records were somehow marked settled, attribute to the latest record
      if (remainingToAttribute > 0 && sortedRecords.length > 0) {
        repaymentInserts.push({
          money_record_id: sortedRecords[sortedRecords.length - 1].id,
          user_id: user.id,
          amount: remainingToAttribute,
          date,
          note
        });
      }

      const { error } = await supabaseClient.from("money_repayments").insert(repaymentInserts);

      if (error) {
        if (typeof showToast === "function") {
          showToast("Failed to save repayment: " + error.message, "error");
        }
        return;
      }

      if (typeof showToast === "function") {
        showToast("Repayment recorded successfully", "success");
      }
      closeAddRepaymentModal();
      loadMoneyRecords();
    });
  }
});