// Utility to export transactions to a downloadable CSV file
function exportToCSV(data, filename = "transactions.csv") {
  if (!data || !data.length) {
    alert("No transaction data available to export for the selected date range.");
    return;
  }

  const headers = ["Date", "Type", "Category", "Amount", "Description"];
  const rows = data.map((tx) => [
    `"${tx.date}"`,
    `"${tx.type}"`,
    `"${tx.category.replace(/"/g, '""')}"`,
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