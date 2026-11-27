// HomeLedger: a household budget site on hash routes. The data lives in
// data.js; the household's own additions are kept in localStorage, so a
// reload keeps what was added. No network request is ever made.
//
//   #/                dashboard (this month at a glance)
//   #/transactions    every transaction + the add form
//   #/budgets         monthly budgets against actual spending
//   #/reports         this month against last month, and the big expenses
//
// window.__shotReady is false while a page renders and true once it is on
// screen, so a screenshot script knows when to capture.

import { CATEGORIES, INCOME, LAST_MONTH, MONTH, MONTH_KEY, TRANSACTIONS } from './data.js';
import { budgetsPage, dashboard, missing, reportsPage, transactionsPage } from './views.js';

const STORE_KEY = 'homeledger.tx.v1';

const app = document.getElementById('app');

// ---- state ---------------------------------------------------------------

function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const extra = JSON.parse(raw);
      if (Array.isArray(extra)) return [...TRANSACTIONS, ...extra];
    }
  } catch {
    // A damaged store falls back to the seed data; nothing is lost.
  }
  return [...TRANSACTIONS];
}

function saveExtra(extra) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(extra));
  } catch {
    // Private mode or a full store: the page still works for this visit.
  }
}

let transactions = loadTransactions();
let extra = transactions.filter((t) => !TRANSACTIONS.some((s) => s.id === t.id));
let filter = 'all';

const catById = (id) => CATEGORIES.find((c) => c.id === id) || { name: id, color: '#888', budget: 0 };
const moneyOf = (list) => list.reduce((s, t) => s + t.amount, 0);

// ---- model ---------------------------------------------------------------

function buildModel() {
  const income = INCOME.reduce((s, i) => s + i.amount, 0);
  const spending = transactions.filter((t) => t.amount < 0 && t.category !== 'savings');
  const spent = -moneyOf(spending);
  const saved = -moneyOf(transactions.filter((t) => t.category === 'savings'));
  const remaining = income - spent - saved;
  const byCategory = CATEGORIES.map((c) => ({
    ...c,
    spent: -moneyOf(transactions.filter((t) => t.category === c.id)),
  }));
  const recent = [...transactions]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 8)
    .map((t) => ({ ...t, categoryName: catById(t.category).name }));
  const rows = transactions
    .filter((t) => filter === 'all' || t.category === filter)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((t) => ({ ...t, categoryName: catById(t.category).name }));
  const compare = CATEGORIES.map((c) => ({
    ...c,
    last: LAST_MONTH.spentByCategory[c.id] || 0,
    now: -moneyOf(transactions.filter((t) => t.category === c.id)),
    diff: 0,
  })).map((c) => ({ ...c, diff: c.now - c.last }));
  const top = [...transactions]
    .filter((t) => t.amount < 0 && t.category !== 'savings')
    .sort((a, b) => a.amount - b.amount)
    .slice(0, 5)
    .map((t) => ({ ...t, categoryName: catById(t.category).name }));
  const segments = byCategory
    .filter((c) => c.id !== 'savings' && c.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .map((c) => ({ label: c.name, value: c.spent, color: c.color }));
  return {
    income,
    spent,
    saved,
    remaining,
    txCount: transactions.length,
    incomeCount: INCOME.length,
    savingsRate: income > 0 ? Math.round((saved / income) * 100) : 0,
    byCategory,
    recent,
    rows,
    total: moneyOf(rows),
    totalBudget: CATEGORIES.reduce((s, c) => s + c.budget, 0),
    totalSpent: spent + saved,
    compare,
    top,
    segments,
    incomeNow: income,
    incomeLast: LAST_MONTH.income,
    spentNow: spent + saved,
    spentLast: Object.values(LAST_MONTH.spentByCategory).reduce((s, v) => s + v, 0),
  };
}

// ---- render --------------------------------------------------------------

function render() {
  window.__shotReady = false;
  const hash = location.hash || '#/';
  const model = buildModel();
  let html;
  let title = `HomeLedger — ${MONTH}`;
  if (hash === '#/' || hash === '#') {
    html = dashboard(model);
    title = `HomeLedger — ${MONTH} dashboard`;
  } else if (hash.startsWith('#/transactions')) {
    html = transactionsPage({ categories: CATEGORIES, rows: model.rows, total: model.total }, filter);
    title = 'HomeLedger — Transactions';
  } else if (hash.startsWith('#/budgets')) {
    html = budgetsPage(model);
    title = 'HomeLedger — Budgets';
  } else if (hash.startsWith('#/reports')) {
    html = reportsPage(model);
    title = 'HomeLedger — Reports';
  } else {
    html = missing();
    title = 'HomeLedger — Not found';
  }
  document.title = title;
  app.innerHTML = html;
  bindPage();
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

function bindPage() {
  const filterEl = document.getElementById('cat-filter');
  if (filterEl) {
    filterEl.addEventListener('change', () => {
      filter = filterEl.value;
      render();
    });
  }
  const exportBtn = document.getElementById('export-csv');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const rows = transactions
        .filter((t) => filter === 'all' || t.category === filter)
        .sort((a, b) => (a.date < b.date ? 1 : -1));
      const csv = ['Date,Description,Category,Amount'];
      const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
      rows.forEach((t) => csv.push([t.date, q(t.description), q(catById(t.category).name), t.amount.toFixed(2)].join(',')));
      const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `homeledger-${MONTH_KEY}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
  const form = document.getElementById('add-form');
  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const amount = Number(data.get('amount'));
      const kind = data.get('kind');
      const msg = document.getElementById('add-msg');
      if (!Number.isFinite(amount) || amount <= 0) {
        msg.textContent = 'Enter an amount above $0.';
        return;
      }
      const entry = {
        id: `u-${Date.now()}`,
        date: String(data.get('date') || '2026-11-26'),
        description: String(data.get('description') || '').trim() || 'Untitled',
        category: String(data.get('category')),
        amount: kind === 'income' ? amount : -amount,
      };
      extra = [...extra, entry];
      transactions = [...transactions, entry];
      saveExtra(extra);
      msg.textContent = `Added ${entry.description} (${kind === 'income' ? '+' : '-'}$${amount.toFixed(2)}).`;
      form.reset();
      form.querySelector('[name="date"]').value = '2026-11-26';
      render();
      document.getElementById('add-msg').textContent = msg.textContent;
    });
  }
  app.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-del');
      const removed = transactions.find((t) => t.id === id);
      transactions = transactions.filter((t) => t.id !== id);
      extra = extra.filter((t) => t.id !== id);
      saveExtra(extra);
      render();
      const msg = document.getElementById('add-msg');
      if (msg && removed) msg.textContent = `Deleted ${removed.description}.`;
    });
  });
}

window.addEventListener('hashchange', render);
render();
