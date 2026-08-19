// Utility to export transactions to a downloadable CSV file
function exportToCSV(data, filename = "transactions.csv") {
  if (!data || !data.length) {
    if (typeof showToast === "function") {
      showToast("No transaction data available to export for the selected date range.", "info");
    } else {
      alert("No transaction data available to export for the selected date range.");
    }
    return;
  }

  const headers = ["Date", "Type", "Category", "Amount", "Description"];
  const rows = data.map((tx) => [
    `"${tx.date}"`,
    `"${tx.type}"`,
    `"${(tx.category || "").replace(/"/g, '""')}"`,
    `"${Number(tx.amount).toFixed(2)}"`,
    `"${(tx.description || "").replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Utility to export Money Owed records to CSV
function exportMoneyOwedToCSV(data, filename = `money_owed_${new Date().toISOString().split("T")[0]}.csv`) {
  if (!data || !data.length) {
    if (typeof showToast === "function") {
      showToast("No money records available to export", "info");
    }
    return;
  }

  const headers = [
    "Person",
    "Direction",
    "Original Amount",
    "Total Repaid",
    "Remaining",
    "Date",
    "Due Date",
    "Status",
    "Description",
    "Notes"
  ];

  const rows = data.map((rec) => {
    const computed = typeof computeRecordStatus === "function" 
      ? computeRecordStatus(rec) 
      : { original: Number(rec.amount) || 0, repaid: 0, remaining: Number(rec.amount) || 0, status: "Pending" };

    const directionText = rec.direction === "lent" ? "Receivable (Lent)" : "Payable (Borrowed)";

    return [
      `"${(rec.person_name || "").replace(/"/g, '""')}"`,
      `"${directionText}"`,
      `"${computed.original.toFixed(2)}"`,
      `"${computed.repaid.toFixed(2)}"`,
      `"${computed.remaining.toFixed(2)}"`,
      `"${rec.date}"`,
      `"${rec.due_date || ""}"`,
      `"${computed.status}"`,
      `"${(rec.description || "").replace(/"/g, '""')}"`,
      `"${(rec.notes || "").replace(/"/g, '""')}"`
    ];
  });

  const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}