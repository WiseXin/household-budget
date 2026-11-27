// HomeLedger: a household budget site on hash routes.
//
//   #/                dashboard (this month at a glance)
//   #/transactions    every transaction + the add form
//   #/budgets         monthly budgets against actual spending
//   #/reports         this month against last month, and the big expenses
//
// The seed month lives in data.js. Anything the household adds is kept in
// localStorage, so a reload keeps what was added and a fresh browser still
// sees the seed month. No network request is ever made.
//
// window.__shotReady is false while a page renders and true once it is on
// screen, so a screenshot script knows when to capture.

import { CATEGORIES, INCOME, LAST_MONTH, MONTH, MONTH_KEY, TRANSACTIONS } from './data.js';
import { budgetsPage, dashboard, missing, reportsPage, transactionsPage } from './views.js';

const STORE_KEY = 'homeledger.tx.v1';
const app = document.getElementById('app');

// ---- persistence ---------------------------------------------------------

const store = {
  // Seed transactions plus whatever the household added, in that order.
  read() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return [...TRANSACTIONS];
      const added = JSON.parse(raw);
      return Array.isArray(added) ? [...TRANSACTIONS, ...added] : [...TRANSACTIONS];
    } catch {
      // A damaged store falls back to the seed data; nothing is lost.
      return [...TRANSACTIONS];
    }
  },

  write(added) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(added));
    } catch {
      // Private mode or a full store: the page still works for this visit.
    }
  },
};

// ---- state ---------------------------------------------------------------

const seedIds = new Set(TRANSACTIONS.map((t) => t.id));

const state = {
  transactions: store.read(),
  filter: 'all',
};

// Only the household's own additions live in the store; the seed month is
// read from data.js every time, so it can never be edited away.
const addedOnly = () => state.transactions.filter((t) => !seedIds.has(t.id));

const setTransactions = (next) => {
  state.transactions = next;
  store.write(addedOnly());
};

// ---- small helpers -------------------------------------------------------

const categoryOf = (id) => CATEGORIES.find((c) => c.id === id) || { name: id, color: '#888', budget: 0 };

const sumAmounts = (list) => list.reduce((sum, t) => sum + t.amount, 0);

// Spending only: negative amounts, shown as a positive total.
const spentTotal = (list) => -sumAmounts(list.filter((t) => t.amount < 0));

const newestFirst = (list) => [...list].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

const named = (t) => ({ ...t, categoryName: categoryOf(t.category).name });

const inScope = (t) => state.filter === 'all' || t.category === state.filter;

// ---- model ---------------------------------------------------------------
// One object with every number the pages need, rebuilt from the current
// transactions on every render, so add/delete/filter can never leave a
// stale figure on screen.

function perCategoryTotals() {
  const totals = new Map(CATEGORIES.map((c) => [c.id, 0]));
  for (const t of state.transactions) {
    if (totals.has(t.category)) totals.set(t.category, totals.get(t.category) + t.amount);
  }
  return totals;
}

function buildModel() {
  const totals = perCategoryTotals();
  const income = sumAmounts(INCOME);
  // Spending counts negative amounts only: an income entry filed under a
  // spending category must not shrink the Spent figure.
  const spent = spentTotal(state.transactions.filter((t) => t.category !== 'savings'));
  const saved = -totals.get('savings');
  const byCategory = CATEGORIES.map((c) => ({ ...c, spent: -totals.get(c.id) }));
  const rows = newestFirst(state.transactions.filter(inScope)).map(named);
  const compare = CATEGORIES.map((c) => {
    const last = LAST_MONTH.spentByCategory[c.id] || 0;
    const now = -totals.get(c.id);
    return { ...c, last, now, diff: now - last };
  });
  const top = newestFirst(
    state.transactions.filter((t) => t.amount < 0 && t.category !== 'savings'),
  )
    .sort((a, b) => a.amount - b.amount)
    .slice(0, 5)
    .map(named);
  const segments = byCategory
    .filter((c) => c.id !== 'savings' && c.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .map((c) => ({ label: c.name, value: c.spent, color: c.color }));
  const lastMonthSpent = Object.values(LAST_MONTH.spentByCategory).reduce((s, v) => s + v, 0);
  return {
    income,
    spent,
    saved,
    remaining: income - spent - saved,
    txCount: state.transactions.length,
    incomeCount: INCOME.length,
    savingsRate: income > 0 ? Math.round((saved / income) * 100) : 0,
    byCategory,
    recent: newestFirst(state.transactions).slice(0, 8).map(named),
    rows,
    total: sumAmounts(rows),
    totalBudget: CATEGORIES.reduce((s, c) => s + c.budget, 0),
    totalSpent: spent + saved,
    compare,
    top,
    segments,
    incomeNow: income,
    incomeLast: LAST_MONTH.income,
    spentNow: spent + saved,
    spentLast: lastMonthSpent,
  };
}

// ---- routing -------------------------------------------------------------

const ROUTES = [
  {
    test: (hash) => hash === '#/' || hash === '#' || hash === '',
    title: `HomeLedger — ${MONTH} dashboard`,
    page: (model) => dashboard(model),
  },
  {
    test: (hash) => hash.startsWith('#/transactions'),
    title: 'HomeLedger — Transactions',
    page: (model) =>
      transactionsPage({ categories: CATEGORIES, rows: model.rows, total: model.total }, state.filter),
  },
  {
    test: (hash) => hash.startsWith('#/budgets'),
    title: 'HomeLedger — Budgets',
    page: (model) => budgetsPage(model),
  },
  {
    test: (hash) => hash.startsWith('#/reports'),
    title: 'HomeLedger — Reports',
    page: (model) => reportsPage(model),
  },
];

function render() {
  window.__shotReady = false;
  const hash = location.hash || '#/';
  const model = buildModel();
  const route = ROUTES.find((r) => r.test(hash));
  document.title = route ? route.title : 'HomeLedger — Not found';
  app.innerHTML = route ? route.page(model) : missing();
  bindPage();
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

// ---- actions -------------------------------------------------------------

function downloadCsv() {
  const rows = newestFirst(state.transactions.filter(inScope));
  const quote = (v) => '"' + String(v).replace(/"/g, '""') + '"';
  const lines = ['Date,Description,Category,Amount'];
  for (const t of rows) {
    lines.push([t.date, quote(t.description), quote(categoryOf(t.category).name), t.amount.toFixed(2)].join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'homeledger-' + MONTH_KEY + '.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

function addTransaction(form) {
  const data = new FormData(form);
  const amount = Number(data.get('amount'));
  const kind = data.get('kind');
  const msg = document.getElementById('add-msg');
  if (!Number.isFinite(amount) || amount <= 0) {
    msg.textContent = 'Enter an amount above $0.';
    return;
  }
  const entry = {
    id: 'u-' + Date.now(),
    date: String(data.get('date') || '2026-11-26'),
    description: String(data.get('description') || '').trim() || 'Untitled',
    category: String(data.get('category')),
    amount: kind === 'income' ? amount : -amount,
  };
  setTransactions([...state.transactions, entry]);
  const note = 'Added ' + entry.description + ' (' + (kind === 'income' ? '+' : '-') + '$' + amount.toFixed(2) + ').';
  form.reset();
  form.querySelector('[name="date"]').value = '2026-11-26';
  render();
  document.getElementById('add-msg').textContent = note;
}

function deleteTransaction(id) {
  const removed = state.transactions.find((t) => t.id === id);
  setTransactions(state.transactions.filter((t) => t.id !== id));
  render();
  const msg = document.getElementById('add-msg');
  if (msg && removed) msg.textContent = 'Deleted ' + removed.description + '.';
}

// ---- wiring --------------------------------------------------------------
// Re-attached after every render, since render() replaces the page markup.

function bindPage() {
  const filterEl = document.getElementById('cat-filter');
  if (filterEl) {
    filterEl.addEventListener('change', () => {
      state.filter = filterEl.value;
      render();
    });
  }
  const exportBtn = document.getElementById('export-csv');
  if (exportBtn) exportBtn.addEventListener('click', downloadCsv);
  const form = document.getElementById('add-form');
  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      addTransaction(form);
    });
  }
  for (const btn of app.querySelectorAll('[data-del]')) {
    btn.addEventListener('click', () => deleteTransaction(btn.getAttribute('data-del')));
  }
}

window.addEventListener('hashchange', render);
render();
