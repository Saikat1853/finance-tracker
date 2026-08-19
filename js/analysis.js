let categoryChartInstance = null;
let comparisonChartInstance = null;
let dailyChartInstance = null;

// Category Emoji Map for UI Cards
const categoryIcons = {
  "food & dining": "🍔",
  "food": "🍔",
  "groceries": "🛒",
  "college fees": "🎓",
  "fees": "🎓",
  "transportation": "🚖",
  "transport": "🚖",
  "travel": "✈️",
  "shopping": "🛍️",
  "entertainment": "🍿",
  "electronics & gadgets": "💻",
  "gadgets": "💻",
  "rent / utilities": "🏠",
  "rent": "🏠",
  "bills & recharges": "📱",
  "recharge": "📱",
  "salary": "💰",
  "investment": "📈",
  "xerox/printout": "📄",
  "friends": "👥",
  "freinds": "👥",
  "insurance": "🛡️"
};

function getCategoryIcon(name) {
  const key = name.trim().toLowerCase();
  return categoryIcons[key] || "🏷️";
}

function renderAnalytics(transactions) {
  let totalIncome = 0;
  let totalExpense = 0;
  const categoryMap = {};
  const dailyExpenseMap = {};

  transactions.forEach((tx) => {
    const amount = Number(tx.amount);
    if (tx.type === "income") {
      totalIncome += amount;
    } else {
      totalExpense += amount;
      categoryMap[tx.category] = (categoryMap[tx.category] || 0) + amount;
      
      // Map expenses by day (YYYY-MM-DD)
      dailyExpenseMap[tx.date] = (dailyExpenseMap[tx.date] || 0) + amount;
    }
  });

  const netBalance = totalIncome - totalExpense;

  // Update Summary Metrics Cards
  document.getElementById("total-income").textContent = `₹${totalIncome.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  document.getElementById("total-expense").textContent = `₹${totalExpense.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  document.getElementById("net-balance").textContent = `₹${netBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  // Render Charts & Ranked Lists
  renderDailyChart(dailyExpenseMap);
  renderCategoryChart(categoryMap, totalExpense);
  renderComparisonChart(totalIncome, totalExpense);
  renderRankedSpending(categoryMap, totalExpense);
}

// 1. Daily Spending Trend Chart
function renderDailyChart(dailyExpenseMap) {
  const ctx = document.getElementById("daily-chart").getContext("2d");
  
  // Sort dates chronologically
  const sortedDates = Object.keys(dailyExpenseMap).sort((a, b) => new Date(a) - new Date(b));
  const dateLabels = sortedDates.map(d => {
    const parts = d.split("-");
    return `${parts[2]}/${parts[1]}`; // Render DD/MM
  });
  const dataValues = sortedDates.map(d => dailyExpenseMap[d]);

  if (dailyChartInstance) dailyChartInstance.destroy();

  dailyChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: dateLabels.length ? dateLabels : ["No Data"],
      datasets: [{
        label: "Daily Expense (₹)",
        data: dataValues.length ? dataValues : [0],
        borderColor: "#38bdf8",
        backgroundColor: "rgba(56, 189, 248, 0.15)",
        fill: true,
        tension: 0.35,
        pointBackgroundColor: "#ffffff",
        pointBorderColor: "#38bdf8",
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { 
          ticks: { color: "#94a3b8" }, 
          grid: { color: "#2e3c51" },
          beginAtZero: true
        },
        x: { 
          ticks: { color: "#94a3b8" }, 
          grid: { display: false } 
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// 2. Category Doughnut Chart & Percentage List
function renderCategoryChart(categoryMap, totalExpense) {
  const ctx = document.getElementById("category-chart").getContext("2d");
  const labels = Object.keys(categoryMap);
  const data = Object.values(categoryMap);

  const colors = [
    "#38bdf8", "#818cf8", "#f472b6", "#fb923c",
    "#facc15", "#4ade80", "#a78bfa", "#2dd4bf",
    "#f87171", "#e879f9", "#94a3b8"
  ];

  if (categoryChartInstance) categoryChartInstance.destroy();

  categoryChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels.length ? labels : ["No Expense"],
      datasets: [{
        data: data.length ? data : [1],
        backgroundColor: colors.slice(0, Math.max(labels.length, 1)),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      }
    }
  });

  // Render Category Breakdown (Values & Percentages)
  const breakdownContainer = document.getElementById("category-breakdown-list");
  breakdownContainer.innerHTML = "";

  if (!labels.length) {
    breakdownContainer.innerHTML = `<p class="empty-hint">No expense records available.</p>`;
    return;
  }

  // Sort descending by amount
  const sortedCategories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);

  sortedCategories.forEach(([cat, amount], idx) => {
    const percentage = totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : 0;
    const color = colors[idx % colors.length];

    const row = document.createElement("div");
    row.className = "category-stat-row";
    row.innerHTML = `
      <div class="cat-left">
        <span class="color-dot" style="background-color: ${color}"></span>
        <span class="cat-name">${cat}</span>
      </div>
      <div class="cat-right">
        <span class="cat-amt">₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
        <span class="cat-pct">${percentage}%</span>
      </div>
    `;
    breakdownContainer.appendChild(row);
  });
}

// 3. Income vs Expense Comparison Bar Chart
function renderComparisonChart(income, expense) {
  const ctx = document.getElementById("comparison-chart").getContext("2d");

  if (comparisonChartInstance) comparisonChartInstance.destroy();

  comparisonChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Income", "Expense"],
      datasets: [{
        data: [income, expense],
        backgroundColor: ["#22c55e", "#ef4444"],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { 
          ticks: { color: "#94a3b8" }, 
          grid: { color: "#2e3c51" },
          beginAtZero: true
        },
        x: { 
          ticks: { color: "#94a3b8" }, 
          grid: { display: false } 
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// 4. "Where Your Money Went" Ranked Progress Bar List
function renderRankedSpending(categoryMap, totalExpense) {
  const container = document.getElementById("ranked-spending-list");
  container.innerHTML = "";

  const sortedCategories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);

  if (!sortedCategories.length) {
    container.innerHTML = `<p class="empty-hint">No expense entries found for the selected period.</p>`;
    return;
  }

  const highestExpense = sortedCategories[0][1];

  sortedCategories.forEach(([cat, amount], index) => {
    const icon = getCategoryIcon(cat);
    const relativePercent = highestExpense > 0 ? (amount / highestExpense) * 100 : 0;

    const item = document.createElement("div");
    item.className = "ranked-item";
    item.innerHTML = `
      <div class="ranked-index">${index + 1}</div>
      <div class="ranked-icon">${icon}</div>
      <div class="ranked-info">
        <div class="ranked-name">${cat}</div>
        <div class="ranked-bar-bg">
          <div class="ranked-bar-fill" style="width: ${relativePercent}%"></div>
        </div>
      </div>
      <div class="ranked-amount">₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
    `;
    container.appendChild(item);
  });
}