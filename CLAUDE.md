# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the projects

There is no build step, package manager, or dev server. All projects are static files.

- **Connect 4** — open `connect4.html` directly in a browser
- **Budget Tracker** — open `budget-tracker/index.html` in a browser (needs internet for Chart.js CDN)
- **Kanban Board** — open `kanban-board/index.html` directly in a browser
- **Job Tracker extension** — load unpacked via `chrome://extensions` or `edge://extensions` (Developer mode → Load unpacked → select `job-tracker-extension/`)

After editing extension files, click the refresh icon on the extension card in the browser's extensions page to reload.

## Architecture

### Connect 4 (`connect4.html`)
Single self-contained file. Game state is a 6×7 `grid` array. CPU uses minimax with alpha-beta pruning (`minimax`, `bestMove`, `scoreBoard` functions). Board is re-rendered from scratch on every move via `renderBoard()`.

### Job Tracker (`job-tracker-extension/`)
Manifest V3 Chrome/Edge extension. No background service worker — all logic runs in the popup lifetime.

- `popup.js` owns all state; reads/writes via `chrome.storage.local` (async, Promise-wrapped)
- `openModal(id)` doubles as add (id=null) and edit (id=number)
- `tryParseTitle()` heuristically extracts company/role from LinkedIn and Greenhouse page titles

### Budget Tracker (`budget-tracker/`)
All state lives in the `transactions` array in `app.js`, persisted to `localStorage` as JSON under the key `budgetTx`.

- `refresh()` is the single re-render entry point — calls summary, both charts, and the transaction list
- Chart instances (`categoryChart`, `monthlyChart`) are module-level variables; always `destroy()` before recreating to avoid Chart.js canvas reuse errors
- `viewYear`/`viewMonth` are `null` for all-time mode, or a year/month integer pair for monthly mode
- Chart.js is loaded from CDN (`cdn.jsdelivr.net`) — no local copy

### Kanban Board (`kanban-board/`)
All state lives in the `data` object (`{ columns: [...] }`) in `app.js`, persisted to `localStorage` under the key `kanbanData`.

- `render()` tears down and rebuilds the entire board from `data` on every state change — no partial updates
- Drag-and-drop uses the HTML5 API: `dragstart`/`dragend` on cards, `dragover`/`dragleave`/`drop` on each column's `.col-cards` container
- A `.drop-indicator` div is inserted into the DOM during `dragover` to show the insertion point; `getInsertTarget()` finds the card whose top half is below the cursor
- On `drop`, `indicator.nextSibling.dataset.id` identifies which card to insert before; if null, the dragged card is appended to the end
- `findCard(id)` searches all columns and returns `{ card, col }` — used instead of storing column context on every element
- Default seed data is written by `defaultData()` and only used when `localStorage` has no saved state

## Conventions

- No framework, no TypeScript — plain HTML/CSS/JS only
- Each project lives in its own folder (or single file for Connect 4)
- Commits are per-project with a short subject line and a body describing features
