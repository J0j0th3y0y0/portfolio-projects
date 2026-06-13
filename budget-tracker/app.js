'use strict';

// ── Constants ────────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = [
  { name: 'Food & Dining',  icon: '🍔', color: '#f59e0b' },
  { name: 'Transport',      icon: '🚗', color: '#3b82f6' },
  { name: 'Housing',        icon: '🏠', color: '#8b5cf6' },
  { name: 'Entertainment',  icon: '🎬', color: '#ec4899' },
  { name: 'Health',         icon: '💊', color: '#10b981' },
  { name: 'Shopping',       icon: '🛍️', color: '#f43f5e' },
  { name: 'Utilities',      icon: '💡', color: '#6366f1' },
  { name: 'Education',      icon: '📚', color: '#0ea5e9' },
  { name: 'Travel',         icon: '✈️', color: '#14b8a6' },
  { name: 'Other',          icon: '📦', color: '#9ca3af' },
];

const INCOME_CATEGORIES = [
  { name: 'Salary',         icon: '💼', color: '#22c55e' },
  { name: 'Freelance',      icon: '💻', color: '#84cc16' },
  { name: 'Investment',     icon: '📈', color: '#10b981' },
  { name: 'Gift',           icon: '🎁', color: '#06b6d4' },
  { name: 'Other Income',   icon: '💵', color: '#6ee7b7' },
];

const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

// ── State ────────────────────────────────────────────────────────────────────

let transactions = [];
let viewYear, viewMonth; // null = all-time
let activeType = 'expense';
let categoryChart = null;
let monthlyChart  = null;

// ── Storage ───────────────────────────────────────────────────────────────────

function load() {
  try { transactions = JSON.parse(localStorage.getItem('budgetTx') || '[]'); }
  catch { transactions = []; }
}

function save() {
  localStorage.setItem('budgetTx', JSON.stringify(transactions));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount) {
  return '$' + Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getCategoryMeta(name) {
  return ALL_CATEGORIES.find(c => c.name === name) || { name, icon: '💳', color: '#9ca3af' };
}

function getFiltered() {
  return transactions.filter(tx => {
    if (viewYear == null) return true;
    const d = new Date(tx.date + 'T00:00:00');
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  });
}

function sumByType(txs, type) {
  return txs.filter(t => t.type === type).reduce((s, t) => s + t.amount, 0);
}

// ── Summary Cards ─────────────────────────────────────────────────────────────

function renderSummary() {
  const filtered = getFiltered();
  const income   = sumByType(filtered, 'income');
  const expenses = sumByType(filtered, 'expense');
  const balance  = income - expenses;

  const valBalance  = document.getElementById('val-balance');
  valBalance.textContent = fmt(balance);
  valBalance.className = 'card-value' + (balance >= 0 ? '' : ' red');

  document.getElementById('val-income').textContent   = fmt(income);
  document.getElementById('val-expenses').textContent = fmt(expenses);

  const txCount = filtered.length;
  const label   = viewYear == null ? 'all time' : `${MONTHS[viewMonth]} ${viewYear}`;
  document.getElementById('sub-balance').textContent  = `${txCount} transaction${txCount !== 1 ? 's' : ''} · ${label}`;
  document.getElementById('sub-income').textContent   = `${filtered.filter(t => t.type === 'income').length} entries`;
  document.getElementById('sub-expenses').textContent = `${filtered.filter(t => t.type === 'expense').length} entries`;
}

// ── Category Chart (Donut) ───────────────────────────────────────────────────

function renderCategoryChart() {
  const expenses = getFiltered().filter(t => t.type === 'expense');
  const canvas = document.getElementById('chart-category');
  const empty  = document.getElementById('chart-category-empty');

  if (categoryChart) { categoryChart.destroy(); categoryChart = null; }

  if (expenses.length === 0) {
    canvas.style.display = 'none';
    empty.classList.remove('hidden');
    return;
  }

  canvas.style.display = '';
  empty.classList.add('hidden');

  const totals = {};
  expenses.forEach(t => { totals[t.category] = (totals[t.category] || 0) + t.amount; });
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const labels = sorted.map(([k]) => k);
  const data   = sorted.map(([, v]) => v);
  const colors = labels.map(l => getCategoryMeta(l).color);

  categoryChart = new Chart(canvas, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff', hoverOffset: 6 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 10, boxWidth: 10 } },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${fmt(ctx.raw)} (${((ctx.raw / data.reduce((a,b) => a+b, 0)) * 100).toFixed(1)}%)`
          }
        }
      }
    }
  });
}

// ── Monthly Bar Chart ─────────────────────────────────────────────────────────

function renderMonthlyChart() {
  const canvas = document.getElementById('chart-monthly');
  if (monthlyChart) { monthlyChart.destroy(); monthlyChart = null; }

  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth(), label: MONTHS[d.getMonth()].slice(0, 3) });
  }

  const incomeData  = months.map(m =>
    transactions.filter(t => {
      const d = new Date(t.date + 'T00:00:00');
      return t.type === 'income' && d.getFullYear() === m.year && d.getMonth() === m.month;
    }).reduce((s, t) => s + t.amount, 0)
  );

  const expenseData = months.map(m =>
    transactions.filter(t => {
      const d = new Date(t.date + 'T00:00:00');
      return t.type === 'expense' && d.getFullYear() === m.year && d.getMonth() === m.month;
    }).reduce((s, t) => s + t.amount, 0)
  );

  monthlyChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: months.map(m => m.label),
      datasets: [
        { label: 'Income',   data: incomeData,  backgroundColor: 'rgba(34,197,94,0.8)',  borderRadius: 5, borderSkipped: false },
        { label: 'Expenses', data: expenseData, backgroundColor: 'rgba(239,68,68,0.8)', borderRadius: 5, borderSkipped: false },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12, boxWidth: 10 } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmt(ctx.raw)}` } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: {
          grid: { color: 'rgba(0,0,0,0.06)' },
          ticks: { font: { size: 11 }, callback: v => '$' + v.toLocaleString() }
        }
      }
    }
  });
}

// ── Transaction List ──────────────────────────────────────────────────────────

function renderTransactions() {
  const search   = document.getElementById('search').value.toLowerCase();
  const typeF    = document.getElementById('filter-type').value;
  const catF     = document.getElementById('filter-category').value;

  let txs = getFiltered()
    .filter(t => typeF === 'all' || t.type === typeF)
    .filter(t => catF === 'all' || t.category === catF)
    .filter(t => !search || t.description?.toLowerCase().includes(search) || t.category.toLowerCase().includes(search))
    .sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id);

  const list = document.getElementById('tx-list');
  if (txs.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💸</div>
        <p>No transactions found.<br>Add one with the button above!</p>
      </div>`;
    return;
  }

  list.innerHTML = txs.map(tx => {
    const meta = getCategoryMeta(tx.category);
    const sign = tx.type === 'income' ? '+' : '−';
    const d    = new Date(tx.date + 'T00:00:00');
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return `
      <div class="tx-item" data-id="${tx.id}">
        <div class="tx-icon" style="background:${meta.color}22">${meta.icon}</div>
        <div class="tx-info">
          <div class="tx-desc">${esc(tx.description || tx.category)}</div>
          <div class="tx-meta">${esc(tx.category)} · ${dateStr}</div>
        </div>
        <div class="tx-amount ${tx.type}">${sign}${fmt(tx.amount)}</div>
      </div>`;
  }).join('');

  list.querySelectorAll('.tx-item').forEach(el => {
    el.addEventListener('click', () => openModal(+el.dataset.id));
  });
}

function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Category Filter Dropdown ──────────────────────────────────────────────────

function populateCategoryFilter() {
  const sel = document.getElementById('filter-category');
  const cur = sel.value;
  sel.innerHTML = '<option value="all">All Categories</option>' +
    ALL_CATEGORIES.map(c => `<option value="${c.name}">${c.icon} ${c.name}</option>`).join('');
  sel.value = ALL_CATEGORIES.find(c => c.name === cur) ? cur : 'all';
}

// ── Month Navigation ──────────────────────────────────────────────────────────

function setMonthView(year, month) {
  viewYear  = year;
  viewMonth = month;
  document.getElementById('month-label').textContent = `${MONTHS[month]} ${year}`;
  document.getElementById('btn-all-time').classList.remove('active');
  refresh();
}

function setAllTime() {
  viewYear = viewMonth = null;
  document.getElementById('month-label').textContent = 'All Time';
  document.getElementById('btn-all-time').classList.add('active');
  refresh();
}

document.getElementById('btn-prev-month').addEventListener('click', () => {
  if (viewYear == null) return;
  let m = viewMonth - 1, y = viewYear;
  if (m < 0) { m = 11; y--; }
  setMonthView(y, m);
});

document.getElementById('btn-next-month').addEventListener('click', () => {
  if (viewYear == null) return;
  let m = viewMonth + 1, y = viewYear;
  if (m > 11) { m = 0; y++; }
  setMonthView(y, m);
});

document.getElementById('btn-all-time').addEventListener('click', setAllTime);

// ── Filters ────────────────────────────────────────────────────────────────────

['search', 'filter-type', 'filter-category'].forEach(id => {
  document.getElementById(id).addEventListener('input', renderTransactions);
});

// ── Modal ─────────────────────────────────────────────────────────────────────

function openModal(id) {
  const tx = id != null ? transactions.find(t => t.id === id) : null;
  activeType = tx ? tx.type : 'expense';

  document.getElementById('modal-title').textContent = tx ? 'Edit Transaction' : 'Add Transaction';
  document.getElementById('tx-id').value     = tx ? tx.id : '';
  document.getElementById('tx-amount').value = tx ? tx.amount : '';
  document.getElementById('tx-date').value   = tx ? tx.date : new Date().toISOString().slice(0, 10);
  document.getElementById('tx-desc').value   = tx ? (tx.description || '') : '';

  const delBtn = document.getElementById('tx-delete');
  if (tx) delBtn.classList.remove('hidden');
  else    delBtn.classList.add('hidden');

  setActiveType(activeType, false);

  document.getElementById('tx-category').value = tx ? tx.category : '';
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('tx-amount').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

function setActiveType(type, resetCategory = true) {
  activeType = type;
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });
  populatModalCategories(resetCategory);
}

function populatModalCategories(reset = true) {
  const sel  = document.getElementById('tx-category');
  const prev = sel.value;
  const cats = activeType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  sel.innerHTML = cats.map(c => `<option value="${c.name}">${c.icon} ${c.name}</option>`).join('');
  if (!reset && cats.find(c => c.name === prev)) sel.value = prev;
}

document.querySelectorAll('.type-btn').forEach(btn => {
  btn.addEventListener('click', () => setActiveType(btn.dataset.type));
});

document.getElementById('btn-add').addEventListener('click', () => openModal(null));
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

document.getElementById('tx-form').addEventListener('submit', e => {
  e.preventDefault();
  const idVal  = document.getElementById('tx-id').value;
  const amount = parseFloat(document.getElementById('tx-amount').value);
  if (!amount || amount <= 0) return;

  const data = {
    id:          idVal ? +idVal : Date.now(),
    type:        activeType,
    amount,
    category:    document.getElementById('tx-category').value,
    description: document.getElementById('tx-desc').value.trim(),
    date:        document.getElementById('tx-date').value,
  };

  if (idVal) {
    const idx = transactions.findIndex(t => t.id === +idVal);
    if (idx !== -1) transactions[idx] = data;
  } else {
    transactions.unshift(data);
  }

  save();
  closeModal();
  refresh();
});

document.getElementById('tx-delete').addEventListener('click', () => {
  const id = +document.getElementById('tx-id').value;
  transactions = transactions.filter(t => t.id !== id);
  save();
  closeModal();
  refresh();
});

// ── CSV Export ────────────────────────────────────────────────────────────────

document.getElementById('btn-export').addEventListener('click', () => {
  const rows = [['Date', 'Type', 'Category', 'Description', 'Amount']];
  getFiltered()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach(t => rows.push([t.date, t.type, t.category, t.description || '', t.amount.toFixed(2)]));

  const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `budget-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// ── Refresh All ───────────────────────────────────────────────────────────────

function refresh() {
  renderSummary();
  renderCategoryChart();
  renderMonthlyChart();
  renderTransactions();
  populateCategoryFilter();
}

// ── Init ──────────────────────────────────────────────────────────────────────

load();
populateCategoryFilter();

const now = new Date();
setMonthView(now.getFullYear(), now.getMonth());
