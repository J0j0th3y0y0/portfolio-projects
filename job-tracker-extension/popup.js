'use strict';

const STORAGE_KEY = 'jobTrackerApps';

const STATUS_LABELS = {
  bookmarked:   'Bookmarked',
  applied:      'Applied',
  phone_screen: 'Phone Screen',
  interview:    'Interview',
  offer:        'Offer',
  rejected:     'Rejected',
};

// ── Storage helpers ──────────────────────────────────────────────────────────

function loadJobs() {
  return new Promise(resolve => {
    chrome.storage.local.get(STORAGE_KEY, data => {
      resolve(data[STORAGE_KEY] || []);
    });
  });
}

function saveJobs(jobs) {
  return new Promise(resolve => {
    chrome.storage.local.set({ [STORAGE_KEY]: jobs }, resolve);
  });
}

// ── Tab switching ────────────────────────────────────────────────────────────

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    btn.classList.add('active');
    const target = document.getElementById(`tab-${btn.dataset.tab}`);
    target.classList.remove('hidden');
    target.classList.add('active');
    if (btn.dataset.tab === 'list') refreshList();
  });
});

// ── Auto-fill current tab URL ────────────────────────────────────────────────

async function getCurrentTab() {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      resolve(tabs[0] || null);
    });
  });
}

async function fillCurrentTabUrl() {
  const tab = await getCurrentTab();
  if (!tab) return;
  const urlInput = document.getElementById('url');
  if (urlInput && tab.url && !tab.url.startsWith('chrome://')) {
    urlInput.value = tab.url;
    tryParseTitle(tab.title || '');
  }
}

function tryParseTitle(title) {
  if (!title) return;
  // LinkedIn: "Role at Company | LinkedIn"
  const linkedinMatch = title.match(/^(.+?)\s+at\s+(.+?)\s*\|/i);
  if (linkedinMatch) {
    setIfEmpty('role', linkedinMatch[1].trim());
    setIfEmpty('company', linkedinMatch[2].trim());
    return;
  }
  // Greenhouse / Lever: "Role - Company" or "Role | Company"
  const dashMatch = title.match(/^(.+?)\s*[-|–]\s*(.+?)(?:\s*[-|–]|$)/);
  if (dashMatch) {
    setIfEmpty('role', dashMatch[1].trim());
    setIfEmpty('company', dashMatch[2].trim());
  }
}

function setIfEmpty(id, val) {
  const el = document.getElementById(id);
  if (el && !el.value) el.value = val;
}

document.getElementById('btn-grab-url').addEventListener('click', fillCurrentTabUrl);

// ── Add form ─────────────────────────────────────────────────────────────────

document.getElementById('date').value = new Date().toISOString().slice(0, 10);

document.getElementById('add-form').addEventListener('submit', async e => {
  e.preventDefault();
  const job = {
    id: Date.now(),
    company: document.getElementById('company').value.trim(),
    role: document.getElementById('role').value.trim(),
    url: document.getElementById('url').value.trim(),
    date: document.getElementById('date').value,
    status: document.getElementById('status').value,
    notes: document.getElementById('notes').value.trim(),
    createdAt: Date.now(),
  };

  const jobs = await loadJobs();
  jobs.unshift(job);
  await saveJobs(jobs);

  showToast('Application saved!');
  e.target.reset();
  document.getElementById('date').value = new Date().toISOString().slice(0, 10);
  document.getElementById('status').value = 'applied';
  fillCurrentTabUrl();
});

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 2000);
}

// ── Filter state ─────────────────────────────────────────────────────────────

let activeFilter = 'all';

document.querySelectorAll('.filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(f => f.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    refreshList();
  });
});

// ── Render list ───────────────────────────────────────────────────────────────

async function refreshList() {
  const jobs = await loadJobs();
  renderStats(jobs);
  renderJobs(jobs);
}

function renderStats(jobs) {
  const counts = {
    Total: jobs.length,
    Applied: jobs.filter(j => j.status === 'applied').length,
    Interview: jobs.filter(j => j.status === 'interview').length,
    Offer: jobs.filter(j => j.status === 'offer').length,
  };

  const row = document.getElementById('stats-row');
  row.innerHTML = Object.entries(counts).map(([label, num]) => `
    <div class="stat-chip">
      <span class="stat-num">${num}</span>
      <span class="stat-label">${label}</span>
    </div>
  `).join('');
}

function renderJobs(jobs) {
  const filtered = activeFilter === 'all'
    ? jobs
    : jobs.filter(j => j.status === activeFilter);

  const list = document.getElementById('jobs-list');

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="1.5">
          <rect x="2" y="7" width="20" height="14" rx="2"/>
          <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
        </svg>
        <p>${activeFilter === 'all' ? 'No applications yet. Start adding jobs!' : `No ${STATUS_LABELS[activeFilter]} applications.`}</p>
      </div>`;
    return;
  }

  list.innerHTML = filtered.map(job => {
    const dateStr = job.date ? formatDate(job.date) : '';
    const notesHtml = job.notes
      ? `<div class="job-notes" title="${escHtml(job.notes)}">${escHtml(job.notes)}</div>`
      : '';
    const linkHtml = job.url
      ? `<a href="${escHtml(job.url)}" target="_blank" class="job-link" title="Open job posting"
            onclick="event.stopPropagation()">&#x1F517;</a>`
      : '';

    return `
      <div class="job-card" data-id="${job.id}">
        <div class="job-card-top">
          <div>
            <div class="job-company">${escHtml(job.company)}</div>
            <div class="job-role">${escHtml(job.role)}</div>
          </div>
          <span class="badge badge-${job.status}">${STATUS_LABELS[job.status]}</span>
        </div>
        <div class="job-meta">
          ${dateStr ? `<span class="job-date">${dateStr}</span>` : ''}
          ${linkHtml}
        </div>
        ${notesHtml}
      </div>`;
  }).join('');

  list.querySelectorAll('.job-card').forEach(card => {
    card.addEventListener('click', () => openEditModal(+card.dataset.id));
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[+m - 1]} ${+d}, ${y}`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Edit modal ────────────────────────────────────────────────────────────────

async function openEditModal(id) {
  const jobs = await loadJobs();
  const job = jobs.find(j => j.id === id);
  if (!job) return;

  document.getElementById('edit-id').value = id;
  document.getElementById('edit-company').value = job.company;
  document.getElementById('edit-role').value = job.role;
  document.getElementById('edit-url').value = job.url || '';
  document.getElementById('edit-date').value = job.date || '';
  document.getElementById('edit-status').value = job.status;
  document.getElementById('edit-notes').value = job.notes || '';

  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

document.getElementById('modal-close').addEventListener('click', closeModal);

document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

document.getElementById('edit-form').addEventListener('submit', async e => {
  e.preventDefault();
  const id = +document.getElementById('edit-id').value;
  const jobs = await loadJobs();
  const idx = jobs.findIndex(j => j.id === id);
  if (idx === -1) return;

  jobs[idx] = {
    ...jobs[idx],
    company: document.getElementById('edit-company').value.trim(),
    role: document.getElementById('edit-role').value.trim(),
    url: document.getElementById('edit-url').value.trim(),
    date: document.getElementById('edit-date').value,
    status: document.getElementById('edit-status').value,
    notes: document.getElementById('edit-notes').value.trim(),
  };

  await saveJobs(jobs);
  closeModal();
  refreshList();
});

document.getElementById('modal-delete').addEventListener('click', async () => {
  const id = +document.getElementById('edit-id').value;
  const jobs = await loadJobs();
  await saveJobs(jobs.filter(j => j.id !== id));
  closeModal();
  refreshList();
});

// ── Init ──────────────────────────────────────────────────────────────────────

fillCurrentTabUrl();
