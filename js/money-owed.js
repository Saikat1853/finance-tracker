let rawMoneyRecords = [];
let consolidatedMoneyGroups = [];
let activeViewingGroup = null;

// Normalize name helper
function normalizePersonName(name) {
  return (name || "").trim().toLowerCase();
}

// Compute dynamic status and aggregate for a consolidated person group
function computeGroupMetrics(group) {
  const totalOriginal = group.records.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  
  // Flatten all repayments across all records of this person
  const allRepayments = [];
  group.records.forEach((r) => {
    (r.money_repayments || []).forEach((rep) => {
      allRepayments.push({ ...rep, parent_record: r });
    });
  });

  const totalRepaid = allRepayments.reduce((sum, rep) => sum + (Number(rep.amount) || 0), 0);
  const remaining = Math.max(0, totalOriginal - totalRepaid);

  let status = "Pending";
  if (remaining <= 0) {
    status = "Settled";
  } else if (totalRepaid > 0) {
    status = "Partially Paid";
  }

  // Determine nearest / overdue due date among active records
  let dueText = "No due date";
  let dueClass = "";
  let nearestDueDate = null;

  // Filter records that have due dates
  const dueDates = group.records
    .filter((r) => r.due_date)
    .map((r) => r.due_date)
    .sort();

  if (dueDates.length > 0) {
    nearestDueDate = dueDates[0]; // Earliest due date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(nearestDueDate + "T00:00:00");
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      if (remaining > 0) {
        status = "Overdue";
        dueClass = "overdue-text";
      }
      dueText = `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"}`;
    } else if (diffDays === 0) {
      dueClass = remaining > 0 ? "soon-text" : "";
      dueText = "Due today";
    } else if (diffDays === 1) {
      dueClass = remaining > 0 ? "soon-text" : "";
      dueText = "Due tomorrow";
    } else {
      dueText = `Due in ${diffDays} days`;
    }
  }

  return {
    totalOriginal,
    totalRepaid,
    remaining,
    status,
    dueText,
    dueClass,
    nearestDueDate,
    allRepayments
  };
}

// Group raw records by normalized name + direction
function groupRecordsByPerson(records) {
  const groupsMap = new Map();

  records.forEach((rec) => {
    const norm = normalizePersonName(rec.person_name);
    const key = `${norm}__${rec.direction}`;

    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        groupKey: key,
        normalizedName: norm,
        displayName: rec.person_name.trim(), // Keep original capitalization
        direction: rec.direction,
        records: []
      });
    }

    groupsMap.get(key).records.push(rec);
  });

  const groups = Array.from(groupsMap.values());
  groups.forEach((g) => {
    g._computed = computeGroupMetrics(g);
  });

  return groups;
}

// Fetch all records with nested repayments from Supabase
async function loadMoneyRecords() {
  const loadingEl = document.getElementById("mo-loading");
  const emptyState = document.getElementById("mo-empty-state");

  if (loadingEl) loadingEl.classList.remove("hidden");
  if (emptyState) emptyState.classList.add("hidden");

  const { data, error } = await supabaseClient
    .from("money_records")
    .select(`
      *,
      money_repayments (
        id,
        amount,
        date,
        note,
        created_at
      )
    `)
    .order("date", { ascending: false });

  if (loadingEl) loadingEl.classList.add("hidden");

  if (error) {
    if (typeof showToast === "function") {
      showToast("Error loading money records: " + error.message, "error");
    }
    return;
  }

  rawMoneyRecords = data || [];
  consolidatedMoneyGroups = groupRecordsByPerson(rawMoneyRecords);
  applyMoneyFilters();
}

// Apply Search, Type, Status, and Sort filters to Consolidated Groups
function applyMoneyFilters() {
  const searchTerm = (document.getElementById("mo-search-input")?.value || "").toLowerCase().trim();
  const directionFilter = document.getElementById("mo-direction-filter")?.value || "all";
  const statusFilter = document.getElementById("mo-status-filter")?.value || "all";
  const sortFilter = document.getElementById("mo-sort-filter")?.value || "newest";

  // Render Dashboard Summary Metrics
  renderMoneyOwedSummary(consolidatedMoneyGroups);

  let filtered = consolidatedMoneyGroups.filter((group) => {
    const computed = group._computed;

    // Search matches person or any record description/note
    const matchesSearch =
      group.displayName.toLowerCase().includes(searchTerm) ||
      group.records.some((r) =>
        (r.description || "").toLowerCase().includes(searchTerm) ||
        (r.notes || "").toLowerCase().includes(searchTerm)
      );

    // Direction match
    const matchesDirection = directionFilter === "all" || group.direction === directionFilter;

    // Status match
    const matchesStatus = statusFilter === "all" || computed.status === statusFilter;

    return matchesSearch && matchesDirection && matchesStatus;
  });

  // Sorting
  filtered.sort((a, b) => {
    const latestDateA = a.records.reduce((max, r) => (r.date > max ? r.date : max), "");
    const latestDateB = b.records.reduce((max, r) => (r.date > max ? r.date : max), "");

    if (sortFilter === "newest") return new Date(latestDateB) - new Date(latestDateA);
    if (sortFilter === "oldest") return new Date(latestDateA) - new Date(latestDateB);
    if (sortFilter === "amount-high") return b._computed.remaining - a._computed.remaining;
    if (sortFilter === "amount-low") return a._computed.remaining - b._computed.remaining;
    if (sortFilter === "due-nearest") {
      if (!a._computed.nearestDueDate) return 1;
      if (!b._computed.nearestDueDate) return -1;
      return new Date(a._computed.nearestDueDate) - new Date(b._computed.nearestDueDate);
    }
    return 0;
  });

  renderMoneyGrids(filtered);
}

// Render Summary Cards & Insights
function renderMoneyOwedSummary(groups) {
  let totalImOwed = 0;
  let totalIOwe = 0;
  let activeGroupsCount = 0;
  let overdueCount = 0;
  let largestOutstandingPerson = "-";
  let largestOutstandingAmt = 0;

  let activeReceivablePeople = 0;
  let activePayablePeople = 0;

  groups.forEach((group) => {
    const { remaining, status } = group._computed;
    if (remaining > 0) {
      activeGroupsCount++;
      if (status === "Overdue") overdueCount++;

      if (group.direction === "lent") {
        totalImOwed += remaining;
        activeReceivablePeople++;
      } else {
        totalIOwe += remaining;
        activePayablePeople++;
      }

      if (remaining > largestOutstandingAmt) {
        largestOutstandingAmt = remaining;
        largestOutstandingPerson = `${group.displayName} (₹${remaining.toLocaleString("en-IN")})`;
      }
    }
  });

  const netPosition = totalImOwed - totalIOwe;

  const totalOwedEl = document.getElementById("mo-total-owed");
  const totalIOweEl = document.getElementById("mo-total-i-owe");
  const netEl = document.getElementById("mo-net-position");
  const activeCountEl = document.getElementById("mo-active-count");

  if (totalOwedEl) totalOwedEl.textContent = `₹${totalImOwed.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  if (totalIOweEl) totalIOweEl.textContent = `₹${totalIOwe.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  if (netEl) {
    netEl.textContent = `${netPosition >= 0 ? "+" : "-"}₹${Math.abs(netPosition).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
    netEl.style.color = netPosition >= 0 ? "var(--income)" : "var(--expense)";
  }

  if (activeCountEl) activeCountEl.textContent = activeGroupsCount;

  // Render Bottom Insights
  const insightsContainer = document.getElementById("mo-insights-content");
  if (insightsContainer) {
    insightsContainer.innerHTML = `
      <div class="mo-insight-item">
        <span>Receivable Summary</span>
        <strong>${activeReceivablePeople} people owe you ₹${totalImOwed.toLocaleString("en-IN")}</strong>
      </div>
      <div class="mo-insight-item">
        <span>Payable Summary</span>
        <strong>You owe ${activePayablePeople} people ₹${totalIOwe.toLocaleString("en-IN")}</strong>
      </div>
      <div class="mo-insight-item">
        <span>Overdue Records</span>
        <strong style="color: ${overdueCount > 0 ? "var(--expense)" : "var(--income)"};">${overdueCount} overdue</strong>
      </div>
      <div class="mo-insight-item">
        <span>Largest Balance</span>
        <strong>${largestOutstandingPerson}</strong>
      </div>
    `;
  }
}

// Render Consolidated Money Cards
function renderMoneyGrids(groups) {
  const lentGrid = document.getElementById("mo-lent-grid");
  const borrowedGrid = document.getElementById("mo-borrowed-grid");
  const emptyState = document.getElementById("mo-empty-state");
  const contentContainer = document.getElementById("mo-content-container");

  const lentCountEl = document.getElementById("mo-lent-count");
  const borrowedCountEl = document.getElementById("mo-borrowed-count");

  if (!lentGrid || !borrowedGrid) return;

  lentGrid.innerHTML = "";
  borrowedGrid.innerHTML = "";

  if (!groups.length) {
    if (emptyState) emptyState.classList.remove("hidden");
    if (contentContainer) contentContainer.classList.add("hidden");
    return;
  }

  if (emptyState) emptyState.classList.add("hidden");
  if (contentContainer) contentContainer.classList.remove("hidden");

  let lentCount = 0;
  let borrowedCount = 0;

  groups.forEach((group) => {
    const { totalOriginal, totalRepaid, remaining, status, dueText, dueClass } = group._computed;

    const card = document.createElement("div");
    card.className = "mo-card";

    const statusClass = status.toLowerCase().replace(/\s+/g, "-");
    const statusEmoji = status === "Settled" ? "🟢" : status === "Partially Paid" ? "🟡" : status === "Overdue" ? "🔴" : "⚪";

    // Summary description
    const entryCountText = `${group.records.length} record${group.records.length === 1 ? "" : "s"}`;

    card.innerHTML = `
      <div class="mo-card-header">
        <div>
          <div class="mo-person-name">${group.displayName}</div>
          <div class="mo-card-desc">${group.direction === "lent" ? "Money Receivable" : "Money Payable"} (${entryCountText})</div>
        </div>
        <span class="status-badge ${statusClass}">${statusEmoji} ${status}</span>
      </div>

      <div class="mo-amount-matrix">
        <div class="mo-matrix-item">
          <span>${group.direction === "lent" ? "Lent" : "Borrowed"}</span>
          <strong>₹${totalOriginal.toLocaleString("en-IN")}</strong>
        </div>
        <div class="mo-matrix-item">
          <span>Repaid</span>
          <strong style="color: var(--income);">₹${totalRepaid.toLocaleString("en-IN")}</strong>
        </div>
        <div class="mo-matrix-item">
          <span>Remaining</span>
          <strong style="color: ${remaining > 0 ? (group.direction === "lent" ? "var(--primary)" : "var(--expense)") : "var(--text-muted)"};">
            ₹${remaining.toLocaleString("en-IN")}
          </strong>
        </div>
      </div>

      <div class="mo-due-indicator ${dueClass}">
        📅 ${dueText}
      </div>

      <div class="mo-card-actions">
        <button class="btn secondary-btn view-mo-btn" data-key="${group.groupKey}">View</button>
        ${remaining > 0 ? `<button class="btn primary-btn add-rep-btn" data-key="${group.groupKey}">+ Add Repayment</button>` : ""}
      </div>
    `;

    if (group.direction === "lent") {
      lentGrid.appendChild(card);
      lentCount++;
    } else {
      borrowedGrid.appendChild(card);
      borrowedCount++;
    }
  });

  if (lentCountEl) lentCountEl.textContent = lentCount;
  if (borrowedCountEl) borrowedCountEl.textContent = borrowedCount;

  const lentSection = document.getElementById("mo-lent-section");
  const borrowedSection = document.getElementById("mo-borrowed-section");

  if (lentSection) lentSection.style.display = lentCount > 0 ? "block" : "none";
  if (borrowedSection) borrowedSection.style.display = borrowedCount > 0 ? "block" : "none";

  // Attach Event Listeners
  document.querySelectorAll(".view-mo-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const key = e.currentTarget.getAttribute("data-key");
      openViewGroupModal(key);
    });
  });

  document.querySelectorAll(".add-rep-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const key = e.currentTarget.getAttribute("data-key");
      if (typeof openAddRepaymentModal === "function") {
        openAddRepaymentModal(key);
      }
    });
  });
}

// Open / Close Modal Helpers
function openMoneyModal() {
  const form = document.getElementById("money-record-form");
  if (form) form.reset();

  const titleEl = document.getElementById("mo-modal-title");
  const idEl = document.getElementById("mo-id");
  const dateEl = document.getElementById("mo-date");

  if (titleEl) titleEl.textContent = "Add Money Record";
  if (idEl) idEl.value = "";
  if (dateEl) dateEl.value = new Date().toISOString().split("T")[0];

  const modal = document.getElementById("money-record-modal");
  if (modal) {
    modal.classList.remove("hidden");
    document.body.classList.add("modal-open");
  }
}

function closeMoneyModal() {
  const modal = document.getElementById("money-record-modal");
  if (modal) {
    modal.classList.add("hidden");
    document.body.classList.remove("modal-open");
  }
}

function openEditSingleRecordModal(recordId) {
  const rec = rawMoneyRecords.find((r) => r.id === recordId);
  if (!rec) return;

  const titleEl = document.getElementById("mo-modal-title");
  if (titleEl) titleEl.textContent = "Edit Lending/Borrowing Entry";

  document.getElementById("mo-id").value = rec.id;
  document.getElementById("mo-person").value = rec.person_name;
  document.getElementById("mo-amount").value = rec.amount;
  document.getElementById("mo-date").value = rec.date;
  document.getElementById("mo-due-date").value = rec.due_date || "";
  document.getElementById("mo-desc").value = rec.description || "";
  document.getElementById("mo-notes").value = rec.notes || "";

  const radios = document.getElementsByName("mo-direction");
  radios.forEach((r) => {
    r.checked = r.value === rec.direction;
  });

  closeViewGroupModal();

  const modal = document.getElementById("money-record-modal");
  if (modal) {
    modal.classList.remove("hidden");
    document.body.classList.add("modal-open");
  }
}

// View Consolidated Person Ledger
function openViewGroupModal(groupKey) {
  const group = consolidatedMoneyGroups.find((g) => g.groupKey === groupKey);
  if (!group) return;

  activeViewingGroup = group;
  const { totalOriginal, totalRepaid, remaining, status, dueText } = group._computed;

  document.getElementById("view-person-title").textContent = group.displayName;
  document.getElementById("view-direction-label").textContent =
    group.direction === "lent" ? "Total Lent" : "Total Borrowed";
  document.getElementById("view-original-amount").textContent = `₹${totalOriginal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  document.getElementById("view-repaid-amount").textContent = `₹${totalRepaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  document.getElementById("view-remaining-amount").textContent = `₹${remaining.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  document.getElementById("view-date").textContent = "Consolidated Ledger";
  document.getElementById("view-due-date").textContent = dueText;
  document.getElementById("view-status-pill").innerHTML = `<span class="status-badge ${status.toLowerCase().replace(/\s+/g, "-")}">${status}</span>`;
  document.getElementById("view-desc").textContent = `${group.records.length} lending/borrowing event(s)`;
  document.getElementById("view-notes").textContent = "-";

  // Build unified chronological history ledger
  const historyContainer = document.getElementById("view-history-timeline");
  historyContainer.innerHTML = "";

  const timelineEvents = [];

  // Add all lending/borrowing events
  group.records.forEach((r) => {
    timelineEvents.push({
      type: group.direction === "lent" ? "lent" : "borrowed",
      date: r.date,
      amount: Number(r.amount),
      description: r.description || (group.direction === "lent" ? "Lent Money" : "Borrowed Money"),
      rawId: r.id
    });
  });

  // Add all repayments
  group._computed.allRepayments.forEach((rep) => {
    timelineEvents.push({
      type: "repayment",
      date: rep.date,
      amount: Number(rep.amount),
      description: rep.note || "Repayment",
      rawId: rep.id
    });
  });

  // Sort newest first
  timelineEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

  timelineEvents.forEach((ev) => {
    const item = document.createElement("div");
    const isInitial = ev.type === "lent" || ev.type === "borrowed";
    item.className = `timeline-item ${isInitial ? (ev.type === "lent" ? "lent-initial" : "borrowed-initial") : ""}`;

    item.innerHTML = `
      <div class="timeline-left">
        <strong style="color: ${ev.type === "repayment" ? "var(--income)" : "var(--text-main)"};">
          ${ev.type === "repayment" ? "Repayment" : ev.type === "lent" ? "Lent" : "Borrowed"} ₹${ev.amount.toLocaleString("en-IN")}
        </strong>
        <small>${ev.date} — ${ev.description}</small>
      </div>
      ${
        isInitial
          ? `<button class="action-btn edit-btn" style="padding:0.2rem 0.4rem;" onclick="openEditSingleRecordModal('${ev.rawId}')">Edit</button>`
          : ""
      }
    `;
    historyContainer.appendChild(item);
  });

  // Setup modal buttons
  const addRepBtn = document.getElementById("view-add-repayment-btn");
  if (addRepBtn) {
    addRepBtn.style.display = remaining > 0 ? "inline-flex" : "none";
    addRepBtn.onclick = () => {
      closeViewGroupModal();
      if (typeof openAddRepaymentModal === "function") {
        openAddRepaymentModal(group.groupKey);
      }
    };
  }

  // Edit / Delete buttons in View Modal
  const editBtn = document.getElementById("view-edit-btn");
  if (editBtn) {
    // If only 1 record, edit it directly; otherwise open new addition modal
    editBtn.textContent = group.records.length === 1 ? "Edit Record" : "+ Add to Balance";
    editBtn.onclick = () => {
      if (group.records.length === 1) {
        openEditSingleRecordModal(group.records[0].id);
      } else {
        closeViewGroupModal();
        openMoneyModal();
        document.getElementById("mo-person").value = group.displayName;
        const radios = document.getElementsByName("mo-direction");
        radios.forEach((r) => {
          r.checked = r.value === group.direction;
        });
      }
    };
  }

  const deleteBtn = document.getElementById("view-delete-btn");
  if (deleteBtn) {
    deleteBtn.onclick = () => deleteGroupRecords(group);
  }

  const modal = document.getElementById("view-record-modal");
  if (modal) {
    modal.classList.remove("hidden");
    document.body.classList.add("modal-open");
  }
}

function closeViewGroupModal() {
  const modal = document.getElementById("view-record-modal");
  if (modal) {
    modal.classList.add("hidden");
    document.body.classList.remove("modal-open");
  }
}

// Delete all records of this person & direction
async function deleteGroupRecords(group) {
  const confirmed = await customConfirm(
    `This will delete all ${group.records.length} record(s) and repayment histories for ${group.displayName}.`,
    "Delete Records?"
  );
  if (!confirmed) return;

  const recordIds = group.records.map((r) => r.id);
  const { error } = await supabaseClient.from("money_records").delete().in("id", recordIds);

  if (error) {
    if (typeof showToast === "function") {
      showToast("Failed to delete records: " + error.message, "error");
    }
    return;
  }

  if (typeof showToast === "function") {
    showToast("Records deleted successfully", "success");
  }
  closeViewGroupModal();
  loadMoneyRecords();
}

// Initialize Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  const openMoBtn = document.getElementById("open-mo-modal-btn");
  const closeMoBtn = document.getElementById("close-mo-modal-btn");
  const cancelMoBtn = document.getElementById("cancel-mo-modal-btn");
  const closeViewBtn = document.getElementById("close-view-record-btn");
  const form = document.getElementById("money-record-form");

  if (openMoBtn) openMoBtn.addEventListener("click", openMoneyModal);
  if (closeMoBtn) closeMoBtn.addEventListener("click", closeMoneyModal);
  if (cancelMoBtn) cancelMoBtn.addEventListener("click", closeMoneyModal);
  if (closeViewBtn) closeViewBtn.addEventListener("click", closeViewGroupModal);

  // Filter Listeners
  ["mo-search-input", "mo-direction-filter", "mo-status-filter", "mo-sort-filter"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener(id === "mo-search-input" ? "input" : "change", applyMoneyFilters);
    }
  });

  // Export CSV
  const exportBtn = document.getElementById("mo-export-csv-btn");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      exportMoneyOwedToCSV(consolidatedMoneyGroups);
    });
  }

  // Handle Form Submission
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

      const recordId = document.getElementById("mo-id").value;
      const person_name = document.getElementById("mo-person").value.trim();
      const amount = parseFloat(document.getElementById("mo-amount").value);
      const date = document.getElementById("mo-date").value;
      const due_date = document.getElementById("mo-due-date").value || null;
      const description = document.getElementById("mo-desc").value.trim() || null;
      const notes = document.getElementById("mo-notes").value.trim() || null;

      const directionRadios = document.getElementsByName("mo-direction");
      let direction = "lent";
      directionRadios.forEach((r) => {
        if (r.checked) direction = r.value;
      });

      if (!person_name || isNaN(amount) || amount <= 0 || !date) {
        if (typeof showToast === "function") {
          showToast("Please fill in all required fields with valid values", "error");
        }
        return;
      }

      // If editing existing individual record, ensure amount >= its direct repayments
      if (recordId) {
        const existing = rawMoneyRecords.find((r) => r.id === recordId);
        if (existing) {
          const directRepaid = (existing.money_repayments || []).reduce((acc, r) => acc + Number(r.amount), 0);
          if (amount < directRepaid) {
            if (typeof showToast === "function") {
              showToast(`Amount cannot be less than repayments made on this entry (₹${directRepaid.toLocaleString("en-IN")})`, "error");
            }
            return;
          }
        }
      }

      const payload = {
        user_id: user.id,
        person_name,
        direction,
        amount,
        date,
        due_date,
        description,
        notes,
        updated_at: new Date().toISOString()
      };

      let resultError = null;

      if (recordId) {
        const { error } = await supabaseClient.from("money_records").update(payload).eq("id", recordId);
        resultError = error;
      } else {
        const { error } = await supabaseClient.from("money_records").insert([payload]);
        resultError = error;
      }

      if (resultError) {
        if (typeof showToast === "function") {
          showToast("Failed to save record: " + resultError.message, "error");
        }
        return;
      }

      if (typeof showToast === "function") {
        showToast(recordId ? "Record updated successfully" : "Money record added successfully", "success");
      }
      closeMoneyModal();
      loadMoneyRecords();
    });
  }
});