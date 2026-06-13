'use strict';

// ── Constants ────────────────────────────────────────────────────────────────

const LABELS = [
  { id: 'none',    color: '#dfe1e6' },
  { id: 'red',     color: '#ef4444' },
  { id: 'orange',  color: '#f59e0b' },
  { id: 'green',   color: '#22c55e' },
  { id: 'blue',    color: '#3b82f6' },
  { id: 'purple',  color: '#8b5cf6' },
  { id: 'pink',    color: '#ec4899' },
];

const COL_COLORS = ['#6366f1','#f59e0b','#22c55e','#3b82f6','#ec4899','#ef4444','#14b8a6'];

// ── State ────────────────────────────────────────────────────────────────────

let data = { columns: [] };
let drag = { cardId: null, fromColId: null };

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function labelColor(id) {
  return (LABELS.find(l => l.id === id) || LABELS[0]).color;
}

function findCard(cardId) {
  for (const col of data.columns) {
    const card = col.cards.find(c => c.id === cardId);
    if (card) return { card, col };
  }
  return null;
}

// ── Storage ───────────────────────────────────────────────────────────────────

function load() {
  try {
    const saved = localStorage.getItem('kanbanData');
    if (saved) { data = JSON.parse(saved); return; }
  } catch {}
  data = defaultData();
}

function save() {
  localStorage.setItem('kanbanData', JSON.stringify(data));
}

// ── Default seed data ─────────────────────────────────────────────────────────

function defaultData() {
  const mk = (title, label = 'none', desc = '') => ({ id: uid(), title, description: desc, label });
  return {
    columns: [
      { id: uid(), title: 'To Do', color: COL_COLORS[0], cards: [
        mk('Research competitor apps', 'blue', 'Look at Trello, Asana, Linear for inspiration'),
        mk('Set up project structure', 'green'),
        mk('Write project brief', 'none'),
      ]},
      { id: uid(), title: 'In Progress', color: COL_COLORS[1], cards: [
        mk('Design landing page mockup', 'purple', 'Use Figma, share with team by Friday'),
        mk('Build navigation component', 'green'),
      ]},
      { id: uid(), title: 'Review', color: COL_COLORS[3], cards: [
        mk('API integration PR', 'orange', 'Waiting on code review from senior dev'),
      ]},
      { id: uid(), title: 'Done', color: COL_COLORS[2], cards: [
        mk('Initialize GitHub repo', 'green'),
        mk('Create wireframes', 'purple'),
      ]},
    ]
  };
}

// ── Render ────────────────────────────────────────────────────────────────────

function render() {
  const board = document.getElementById('board');
  board.innerHTML = '';

  data.columns.forEach(col => {
    board.appendChild(buildColumn(col));
  });
}

function buildColumn(col) {
  const el = document.createElement('div');
  el.className = 'column';
  el.dataset.id = col.id;

  // Header
  const header = document.createElement('div');
  header.className = 'col-header';

  const bar = document.createElement('div');
  bar.className = 'col-color-bar';
  bar.style.background = col.color;

  const titleEl = document.createElement('input');
  titleEl.type = 'text';
  titleEl.className = 'col-title';
  titleEl.value = col.title;
  titleEl.maxLength = 40;
  titleEl.addEventListener('blur', () => {
    col.title = titleEl.value.trim() || col.title;
    titleEl.value = col.title;
    save();
  });
  titleEl.addEventListener('keydown', e => { if (e.key === 'Enter') titleEl.blur(); });

  const count = document.createElement('span');
  count.className = 'col-count';
  count.textContent = col.cards.length;

  const delBtn = document.createElement('button');
  delBtn.className = 'col-delete';
  delBtn.title = 'Delete column';
  delBtn.innerHTML = '&#x2715;';
  delBtn.addEventListener('click', () => deleteColumn(col.id));

  header.append(bar, titleEl, count, delBtn);

  // Cards container
  const cardsEl = document.createElement('div');
  cardsEl.className = 'col-cards';
  cardsEl.dataset.colId = col.id;

  col.cards.forEach(card => cardsEl.appendChild(buildCard(card, col.id)));

  setupDropZone(cardsEl, col.id);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'col-footer';

  const addBtn = document.createElement('button');
  addBtn.className = 'btn-add-card';
  addBtn.textContent = '+ Add a card';
  addBtn.addEventListener('click', () => showInlineAdd(col.id, footer, addBtn));

  footer.appendChild(addBtn);

  el.append(header, cardsEl, footer);
  return el;
}

function buildCard(card, colId) {
  const el = document.createElement('div');
  el.className = 'card';
  el.dataset.id = card.id;
  el.dataset.colId = colId;
  el.draggable = true;

  if (card.label && card.label !== 'none') {
    const labelEl = document.createElement('div');
    labelEl.className = 'card-label';
    labelEl.style.background = labelColor(card.label);
    el.appendChild(labelEl);
  }

  const titleEl = document.createElement('div');
  titleEl.className = 'card-title';
  titleEl.textContent = card.title;
  el.appendChild(titleEl);

  if (card.description) {
    const descEl = document.createElement('div');
    descEl.className = 'card-desc';
    descEl.textContent = card.description;
    el.appendChild(descEl);
  }

  el.addEventListener('click', () => openModal(card.id, colId));
  setupDraggable(el, card.id, colId);

  return el;
}

// ── Inline Add Card ───────────────────────────────────────────────────────────

function showInlineAdd(colId, footer, addBtn) {
  addBtn.classList.add('hidden');

  const form = document.createElement('div');
  form.className = 'inline-add';

  const ta = document.createElement('textarea');
  ta.placeholder = 'Enter a title for this card…';
  ta.rows = 2;

  const actions = document.createElement('div');
  actions.className = 'inline-add-actions';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn-primary';
  saveBtn.type = 'button';
  saveBtn.textContent = 'Add card';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn-ghost';
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'Cancel';

  function close() {
    form.remove();
    addBtn.classList.remove('hidden');
  }

  saveBtn.addEventListener('click', () => {
    const title = ta.value.trim();
    if (!title) return;
    const col = data.columns.find(c => c.id === colId);
    if (!col) return;
    col.cards.push({ id: uid(), title, description: '', label: 'none' });
    save();
    close();
    render();
  });

  cancelBtn.addEventListener('click', close);

  ta.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveBtn.click(); }
    if (e.key === 'Escape') close();
  });

  actions.append(saveBtn, cancelBtn);
  form.append(ta, actions);
  footer.insertBefore(form, addBtn);
  ta.focus();
}

// ── Drag and Drop ─────────────────────────────────────────────────────────────

function setupDraggable(cardEl, cardId, colId) {
  cardEl.addEventListener('dragstart', e => {
    drag.cardId = cardId;
    drag.fromColId = colId;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => cardEl.classList.add('is-dragging'), 0);
  });

  cardEl.addEventListener('dragend', () => {
    cardEl.classList.remove('is-dragging');
    document.querySelectorAll('.drop-indicator').forEach(d => d.remove());
  });
}

function setupDropZone(colCardsEl, colId) {
  colCardsEl.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Remove existing indicators in other columns
    document.querySelectorAll('.drop-indicator').forEach(d => {
      if (!colCardsEl.contains(d)) d.remove();
    });

    const afterEl = getInsertTarget(colCardsEl, e.clientY);
    let indicator = colCardsEl.querySelector('.drop-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'drop-indicator';
    }
    if (afterEl) {
      colCardsEl.insertBefore(indicator, afterEl);
    } else {
      colCardsEl.appendChild(indicator);
    }
  });

  colCardsEl.addEventListener('dragleave', e => {
    if (!colCardsEl.contains(e.relatedTarget)) {
      colCardsEl.querySelectorAll('.drop-indicator').forEach(d => d.remove());
    }
  });

  colCardsEl.addEventListener('drop', e => {
    e.preventDefault();
    if (!drag.cardId) return;

    const indicator = colCardsEl.querySelector('.drop-indicator');
    const afterEl = indicator ? getInsertTarget(colCardsEl, indicator.getBoundingClientRect().top + 1) : null;
    indicator?.remove();

    // Find the card and remove from source
    const result = findCard(drag.cardId);
    if (!result) return;
    const { card, col: fromCol } = result;
    fromCol.cards = fromCol.cards.filter(c => c.id !== drag.cardId);

    // Insert into target column
    const toCol = data.columns.find(c => c.id === colId);
    if (!toCol) return;

    if (afterEl && afterEl.dataset.id) {
      const insertIdx = toCol.cards.findIndex(c => c.id === afterEl.dataset.id);
      toCol.cards.splice(insertIdx, 0, card);
    } else {
      toCol.cards.push(card);
    }

    drag.cardId = null;
    drag.fromColId = null;
    save();
    render();
  });
}

function getInsertTarget(container, y) {
  const cards = [...container.querySelectorAll('.card:not(.is-dragging)')];
  return cards.find(card => {
    const box = card.getBoundingClientRect();
    return y < box.top + box.height / 2;
  }) || null;
}

// ── Modal ─────────────────────────────────────────────────────────────────────

let selectedLabel = 'none';

function buildLabelPicker(current) {
  selectedLabel = current || 'none';
  const picker = document.getElementById('label-picker');
  picker.innerHTML = '';
  LABELS.forEach(lbl => {
    const opt = document.createElement('div');
    opt.className = 'label-option' + (lbl.id === selectedLabel ? ' selected' : '');
    opt.style.background = lbl.color;
    opt.title = lbl.id;
    opt.addEventListener('click', () => {
      selectedLabel = lbl.id;
      picker.querySelectorAll('.label-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
    });
    picker.appendChild(opt);
  });
}

function openModal(cardId, colId) {
  const result = findCard(cardId);
  if (!result) return;
  const { card } = result;

  document.getElementById('modal-title').textContent = 'Edit Card';
  document.getElementById('card-id').value    = cardId;
  document.getElementById('card-col-id').value = colId;
  document.getElementById('card-title').value = card.title;
  document.getElementById('card-desc').value  = card.description || '';
  buildLabelPicker(card.label);

  document.getElementById('card-delete').classList.remove('hidden');
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('card-title').focus();
}

function openAddModal(colId) {
  document.getElementById('modal-title').textContent = 'Add Card';
  document.getElementById('card-id').value     = '';
  document.getElementById('card-col-id').value = colId;
  document.getElementById('card-title').value  = '';
  document.getElementById('card-desc').value   = '';
  buildLabelPicker('none');

  document.getElementById('card-delete').classList.add('hidden');
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('card-title').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

document.getElementById('card-form').addEventListener('submit', e => {
  e.preventDefault();
  const cardId = document.getElementById('card-id').value;
  const colId  = document.getElementById('card-col-id').value;
  const title  = document.getElementById('card-title').value.trim();
  const desc   = document.getElementById('card-desc').value.trim();
  if (!title) return;

  if (cardId) {
    const result = findCard(cardId);
    if (result) {
      result.card.title       = title;
      result.card.description = desc;
      result.card.label       = selectedLabel;
    }
  } else {
    const col = data.columns.find(c => c.id === colId);
    if (col) col.cards.push({ id: uid(), title, description: desc, label: selectedLabel });
  }

  save();
  closeModal();
  render();
});

document.getElementById('card-delete').addEventListener('click', () => {
  const cardId = document.getElementById('card-id').value;
  data.columns.forEach(col => {
    col.cards = col.cards.filter(c => c.id !== cardId);
  });
  save();
  closeModal();
  render();
});

// ── Column Actions ────────────────────────────────────────────────────────────

function deleteColumn(colId) {
  const col = data.columns.find(c => c.id === colId);
  if (!col) return;
  const msg = col.cards.length
    ? `Delete "${col.title}" and its ${col.cards.length} card${col.cards.length !== 1 ? 's' : ''}?`
    : `Delete column "${col.title}"?`;
  if (!confirm(msg)) return;
  data.columns = data.columns.filter(c => c.id !== colId);
  save();
  render();
}

document.getElementById('btn-add-col').addEventListener('click', () => {
  const title = prompt('Column name:');
  if (!title?.trim()) return;
  const colorIdx = data.columns.length % COL_COLORS.length;
  data.columns.push({ id: uid(), title: title.trim(), color: COL_COLORS[colorIdx], cards: [] });
  save();
  render();
});

// ── Keyboard shortcut ─────────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

// ── Init ──────────────────────────────────────────────────────────────────────

load();
render();
