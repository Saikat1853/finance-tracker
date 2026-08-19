# 💰 Personal Finance Tracker

A lightweight, modern, mobile-responsive single-page web application built with vanilla **HTML5, CSS3, and JavaScript**, powered by **Supabase** (PostgreSQL + Auth) and **Chart.js** for real-time visual spending analytics. Designed for seamless deployment on **GitHub Pages**.

---

## ✨ Features

- **🔐 Secure Authentication:** Email and password authentication with persistent sessions handled via Supabase Auth.
- **🛡️ Row Level Security (RLS):** Database queries are isolated at the database engine level so each user can only read, insert, update, and delete their own transaction records.
- **📊 Real-Time Analytics & Visualizations:**
  - **Summary Metrics:** Total Income, Total Expense, and Net Balance calculations.
  - **Daily Spending Trend:** Interactive line chart mapping day-to-day expenditure spikes.
  - **Expense by Category:** Doughnut chart alongside an itemized value and percentage breakdown list.
  - **Income vs. Expense Breakdown:** Comparative bar chart.
  - **"Where Your Money Went":** Ranked expense breakdown featuring custom emoji icons and proportional progress bars.
- **⚡ Dynamic Filtering:**
  - Filter transactions and analytics across multiple timeframes: **This Month**, **This Week**, **This Year**, **All Time**, or a **Custom Date Range**.
  - Secondary filter by specific transaction categories.
- **✏️ Full CRUD Operations:** Create, Read, Update (edit existing entries via pre-filled modal), and Delete records.
- **📥 CSV Export:** Instant client-side CSV generator tailored to currently active date and category filters.
- **📱 Mobile-First Responsive Design:** Bottom-sheet modal interactions, scannable table views, and adaptive CSS grids.
- **🔔 Custom UI Notifications:** Non-blocking toast notifications and themed confirmation dialogs (no browser default alerts).

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, Modern CSS3 (CSS Variables, Flexbox, CSS Grid), Vanilla JavaScript (ES6 Modules)
- **Visualization:** [Chart.js](https://www.chartjs.org/) (CDN)
- **Backend & Database:** [Supabase](https://supabase.com/) (PostgreSQL & Supabase JS SDK v2)
- **Hosting:** GitHub Pages

---

## 📁 Project Structure

finance-tracker/
│
├── index.html              # Main SPA layout (Auth, Dashboard, Analytics, Modals)
├── README.md               # Project documentation
│
├── css/
│   ├── main.css            # Global variables, typography, and layout styling
│   └── components.css      # Form controls, tables, buttons, metrics, charts, modals & toasts
│
└── js/
├── config.js           # Supabase client initialization & API credentials
├── auth.js             # Auth workflows, session persistence & route guards
├── transactions.js     # Transaction CRUD, modal controls & category population
├── analysis.js         # Chart.js rendering, ranked spending bars & metric calculations
├── export.js           # Filter-aware CSV export utility
└── app.js              # Tab navigation, global event handlers, toast & confirm utilities
