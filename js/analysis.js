let categoryChartInstance = null;
let comparisonChartInstance = null;

function renderAnalytics(transactions) {
  let totalIncome = 0;
  let totalExpense = 0;
  const categoryMap = {};

  transactions.forEach((tx) => {
    const amount = Number(tx.amount);
    if (tx.type === "income") {
      totalIncome += amount;
    } else {
      totalExpense += amount;
      categoryMap[tx.category] = (categoryMap[tx.category] || 0) + amount;
    }
  });

  const netBalance = totalIncome - totalExpense;

  // Update Summary Metrics
  document.getElementById("total-income").textContent = `₹${totalIncome.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  document.getElementById("total-expense").textContent = `₹${totalExpense.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  document.getElementById("net-balance").textContent = `₹${netBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  renderCategoryChart(categoryMap);
  renderComparisonChart(totalIncome, totalExpense);
}

function renderCategoryChart(categoryMap) {
  const ctx = document.getElementById("category-chart").getContext("2d");
  const labels = Object.keys(categoryMap);
  const data = Object.values(categoryMap);

  if (categoryChartInstance) categoryChartInstance.destroy();

  categoryChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels.length ? labels : ["No Expense"],
      datasets: [{
        data: data.length ? data : [1],
        backgroundColor: [
          "#38bdf8", "#818cf8", "#f472b6", "#fb923c",
          "#facc15", "#4ade80", "#a78bfa", "#94a3b8"
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { color: "#94a3b8" } }
      }
    }
  });
}

function renderComparisonChart(income, expense) {
  const ctx = document.getElementById("comparison-chart").getContext("2d");

  if (comparisonChartInstance) comparisonChartInstance.destroy();

  comparisonChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Income", "Expense"],
      datasets: [{
        label: "Amount (₹)",
        data: [income, expense],
        backgroundColor: ["#22c55e", "#ef4444"],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { ticks: { color: "#94a3b8" }, grid: { color: "#334155" } },
        x: { ticks: { color: "#94a3b8" }, grid: { display: false } }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}