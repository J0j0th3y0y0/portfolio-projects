# Portfolio Projects

A collection of web projects built to demonstrate frontend, browser extension, and UI/UX skills.

---

## Projects

### Connect 4
A browser-based Connect 4 game playable against a friend or an AI opponent.

**Features**
- Two-player local mode and vs CPU mode
- CPU uses minimax with alpha-beta pruning (depth 5)
- Win detection across all four directions with animated highlights
- Drop animations and hover indicators

**How to run**
Open `connect4.html` directly in any browser — no server needed.

---

### Job Tracker — Browser Extension
A Chrome/Edge extension to track job applications from any job board.

**Features**
- Auto-fills the job URL from your current tab
- Parses company and role from LinkedIn and Greenhouse page titles
- Status tracking: Bookmarked → Applied → Phone Screen → Interview → Offer / Rejected
- Filterable application list with stats dashboard
- All data stored locally via `chrome.storage.local`

**How to install**
1. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge)
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `job-tracker-extension/` folder

---

### Personal Budget Tracker
A single-page web app to track income and expenses with charts and CSV export.

**Features**
- Add, edit, and delete income/expense transactions across 15 categories
- Spending breakdown donut chart (by category)
- 6-month income vs expenses bar chart
- Month navigation and all-time view
- Filter by type, category, and keyword search
- Export transactions to CSV
- Data persists in `localStorage`

**How to run**
Open `budget-tracker/index.html` in any browser. Requires an internet connection to load Chart.js from CDN.

---

## Tech Stack

| Project | Stack |
|---|---|
| Connect 4 | HTML, CSS, Vanilla JS |
| Job Tracker | HTML, CSS, Vanilla JS, Chrome Extension API (MV3) |
| Budget Tracker | HTML, CSS, Vanilla JS, Chart.js |

## Author

Josan Williams — [github.com/J0j0th3y0y0](https://github.com/J0j0th3y0y0)
