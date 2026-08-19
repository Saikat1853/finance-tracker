// Parse CSV String into Array of Objects
function parseCSV(text) {
  const lines = text.split(/\r\n|\n/).filter((line) => line.trim() !== "");
  if (lines.length < 2) return [];

  // Remove quotes helper
  const clean = (val) => val.trim().replace(/^["']|["']$/g, "").trim();

  const headers = lines[0].split(",").map((h) => clean(h).toLowerCase());
  
  const results = [];

  for (let i = 1; i < lines.length; i++) {
    // Regex to split by comma outside quotes
    const rawCols = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(",");
    const cols = rawCols.map(clean);

    if (cols.length >= 4) {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = cols[index] !== undefined ? cols[index] : "";
      });
      results.push(record);
    }
  }

  return results;
}

// Handle CSV File Upload & Supabase Batch Insertion
async function handleCSVUpload(file) {
  if (!file) return;

  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) {
    showToast("Please log in to import data", "error");
    return;
  }

  const reader = new FileReader();

  reader.onload = async (e) => {
    try {
      const csvText = e.target.result;
      const parsedRecords = parseCSV(csvText);

      if (!parsedRecords.length) {
        showToast("No valid records found in CSV file", "error");
        return;
      }

      const rowsToInsert = parsedRecords
        .map((row) => {
          const date = row["date"] || row["Date"];
          const type = (row["type"] || row["Type"] || "expense").toLowerCase();
          const category = row["category"] || row["Category"] || "Other";
          const amount = parseFloat(row["amount"] || row["Amount"] || 0);
          const description = row["description"] || row["Description"] || "";

          if (!date || isNaN(amount) || amount <= 0) return null;

          return {
            user_id: user.id,
            date,
            type: type.includes("inc") ? "income" : "expense",
            category,
            amount,
            description
          };
        })
        .filter(Boolean);

      if (!rowsToInsert.length) {
        showToast("Failed to parse valid transaction rows", "error");
        return;
      }

      const { error } = await supabaseClient.from("transactions").insert(rowsToInsert);

      if (error) {
        showToast("Error importing CSV: " + error.message, "error");
        return;
      }

      showToast(`Successfully imported ${rowsToInsert.length} transactions!`, "success");
      
      // Close profile modal and refresh dashboard
      const profileModal = document.getElementById("profile-modal");
      if (profileModal) profileModal.classList.add("hidden");

      if (typeof loadTransactions === "function") {
        await loadTransactions();
      }
    } catch (err) {
      showToast("Error processing CSV: " + err.message, "error");
    }
  };

  reader.readAsText(file);
}