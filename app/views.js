// HTML for each page of HomeLedger, built from the household's data.
// Every value is escaped before it goes into the page. Charts are plain
// inline SVG drawn from the numbers, so the site needs no network and no
// chart library.

const escape = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export const money = (n) =>
  (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (iso) => {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

function barRow(label, spent, budget, color) {
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const over = spent > budget;
  return `<div class="bar-row">
  <div class="bar-head"><span><i class="dot" style="background:${color}"></i>${escape(label)}</span>
  <span>${money(spent)} of ${money(budget)}</span></div>
  <div class="bar"><div class="bar-fill${over ? ' over' : ''}" style="width:${pct}%;background:${color}"></div></div>
  <div class="bar-note">${over ? `Over budget by ${money(spent - budget)}` : `${pct}% of budget · ${money(budget - spent)} left`}</div>
</div>`;
}

function donut(segments) {
  // segments: [{label, value, color}] — a simple SVG donut with a legend.
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = 70;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const arcs = segments
    .map((s) => {
      const frac = s.value / total;
      const dash = `${(frac * c).toFixed(1)} ${(c - frac * c).toFixed(1)}`;
      const out = `<circle r="${r}" cx="90" cy="90" fill="none" stroke="${s.color}" stroke-width="26" stroke-dasharray="${dash}" stroke-dashoffset="${(-offset).toFixed(1)}" />`;
      offset += frac * c;
      return out;
    })
    .join('');
  const legend = segments
    .map(
      (s) =>
        `<li><i class="dot" style="background:${s.color}"></i>${escape(s.label)}<b>${money(s.value)}</b><span>${Math.round((s.value / total) * 100)}%</span></li>`,
    )
    .join('');
  return `<div class="donut-wrap">
  <svg viewBox="0 0 180 180" width="180" height="180" role="img" aria-label="Spending by category">${arcs}
  <text x="90" y="86" text-anchor="middle" class="donut-total">${money(total)}</text>
  <text x="90" y="106" text-anchor="middle" class="donut-cap">spent</text></svg>
  <ul class="legend">${legend}</ul></div>`;
}

export function dashboard(model) {
  const { income, spent, remaining, savingsRate, byCategory, recent, txCount, incomeCount } = model;
  const cards = `<section class="cards">
  <div class="card"><span>Income</span><strong class="good">${money(income)}</strong><small>${incomeCount} paydays in November</small></div>
  <div class="card"><span>Spent</span><strong>${money(spent)}</strong><small>${txCount} transactions</small></div>
  <div class="card"><span>Left over</span><strong class="${remaining >= 0 ? 'good' : 'bad'}">${money(remaining)}</strong><small>after spending &amp; saving</small></div>
  <div class="card"><span>Saved</span><strong>${savingsRate}%</strong><small>of income to savings</small></div>
</section>`;
  const bars = byCategory.map((c) => barRow(c.name, c.spent, c.budget, c.color)).join('');
  const rows = recent
    .map(
      (t) => `<tr><td>${fmtDate(t.date)}</td><td>${escape(t.description)}</td><td>${escape(t.categoryName)}</td>
  <td class="num ${t.amount < 0 ? 'bad' : 'good'}">${money(t.amount)}</td></tr>`,
    )
    .join('');
  return `<h1>November at a glance</h1>
<p class="lede">Your household's money for November 2026 — what came in, what went out, and what is left.</p>
${cards}
<section class="panel"><h2>Spending by category</h2>${bars}</section>
<section class="panel"><h2>Recent transactions</h2>
<table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th class="num">Amount</th></tr></thead>
<tbody>${rows}</tbody></table>
<p><a href="#/transactions">See all transactions &rarr;</a></p></section>`;
}

export function transactionsPage(model, filter) {
  const { categories, rows, total } = model;
  const options = ['all', ...categories.map((c) => c.id)]
    .map((id) => {
      const label = id === 'all' ? 'All categories' : categories.find((c) => c.id === id).name;
      return `<option value="${id}"${id === filter ? ' selected' : ''}>${escape(label)}</option>`;
    })
    .join('');
  const catOptions = categories
    .filter((c) => c.id !== 'savings')
    .map((c) => `<option value="${c.id}">${escape(c.name)}</option>`)
    .join('');
  const list = rows
    .map(
      (t) => `<tr><td>${fmtDate(t.date)}</td><td>${escape(t.description)}</td><td>${escape(t.categoryName)}</td>
  <td class="num ${t.amount < 0 ? 'bad' : 'good'}">${money(t.amount)}</td>
  <td><button class="del" data-del="${t.id}" type="button">Delete</button></td></tr>`,
    )
    .join('');
  return `<h1>Transactions</h1>
<p class="lede">Every dollar in and out for November 2026. Add one below, or delete a line you no longer need.</p>
<section class="panel"><h2>Add a transaction</h2>
<form id="add-form">
<label>Date <input type="date" name="date" value="2026-11-26" required></label>
<label>Description <input type="text" name="description" placeholder="e.g. Weekly groceries" required></label>
<label>Category <select name="category">${catOptions}</select></label>
<label>Type <select name="kind"><option value="expense">Expense</option><option value="income">Income</option></select></label>
<label>Amount ($) <input type="number" name="amount" min="0.01" step="0.01" placeholder="0.00" required></label>
<button type="submit">Add transaction</button>
<span id="add-msg" class="msg" role="status"></span>
</form></section>
<section class="panel"><h2>All transactions <span class="count">${rows.length} shown · ${money(total)} total</span></h2>
<label class="filter">Filter <select id="cat-filter">${options}</select></label>
<button id="export-csv" type="button">Export CSV</button>
<table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th class="num">Amount</th><th></th></tr></thead>
<tbody>${list || '<tr><td colspan="5">Nothing in this category yet.</td></tr>'}</tbody></table></section>`;
}

export function budgetsPage(model) {
  const rows = model.byCategory
    .map((c) => {
      const pct = c.budget > 0 ? Math.round((c.spent / c.budget) * 100) : 0;
      const status = c.spent > c.budget ? 'Over' : c.spent >= c.budget * 0.9 ? 'Almost there' : 'On track';
      return `<tr><td><i class="dot" style="background:${c.color}"></i>${escape(c.name)}</td>
  <td class="num">${money(c.spent)}</td><td class="num">${money(c.budget)}</td>
  <td class="num">${pct}%</td><td>${status}</td></tr>`;
    })
    .join('');
  const bars = model.byCategory.map((c) => barRow(c.name, c.spent, c.budget, c.color)).join('');
  return `<h1>Budgets</h1>
<p class="lede">What you planned to spend in each category this month, against what you actually spent.</p>
<section class="panel"><h2>Monthly budgets</h2>${bars}</section>
<section class="panel"><h2>Budget table</h2>
<table><thead><tr><th>Category</th><th class="num">Spent</th><th class="num">Budget</th><th class="num">Used</th><th>Status</th></tr></thead>
<tbody>${rows}</tbody></table>
<p>Total planned: <b>${money(model.totalBudget)}</b> · Total spent: <b>${money(model.totalSpent)}</b> · 
${model.totalSpent <= model.totalBudget ? `Under budget by <b class="good">${money(model.totalBudget - model.totalSpent)}</b>.` : `Over budget by <b class="bad">${money(model.totalSpent - model.totalBudget)}</b>.`}</p></section>`;
}

export function reportsPage(model) {
  const { compare, top, segments } = model;
  const rows = compare
    .map(
      (c) => `<tr><td><i class="dot" style="background:${c.color}"></i>${escape(c.name)}</td>
  <td class="num">${money(c.last)}</td><td class="num">${money(c.now)}</td>
  <td class="num ${c.diff <= 0 ? 'good' : 'bad'}">${c.diff <= 0 ? '−' : '+'}${money(Math.abs(c.diff))}</td></tr>`,
    )
    .join('');
  const topRows = top
    .map(
      (t, i) => `<tr><td>${i + 1}</td><td>${fmtDate(t.date)}</td><td>${escape(t.description)}</td>
  <td>${escape(t.categoryName)}</td><td class="num">${money(t.amount)}</td></tr>`,
    )
    .join('');
  return `<h1>Reports</h1>
<p class="lede">November against October, and where the big money went.</p>
<section class="panel"><h2>Where November's money went</h2>${donut(segments)}</section>
<section class="panel"><h2>November vs October</h2>
<table><thead><tr><th>Category</th><th class="num">October</th><th class="num">November</th><th class="num">Change</th></tr></thead>
<tbody>${rows}</tbody></table>
<p>Income was <b>${money(model.incomeNow)}</b> in November against <b>${money(model.incomeLast)}</b> in October.
Spending was <b>${money(model.spentNow)}</b> against <b>${money(model.spentLast)}</b>.</p></section>
<section class="panel"><h2>Biggest expenses</h2>
<table><thead><tr><th>#</th><th>Date</th><th>Description</th><th>Category</th><th class="num">Amount</th></tr></thead>
<tbody>${topRows}</tbody></table></section>`;
}

export function missing() {
  return `<h1>Not found</h1><p>There is no page at this address. <a href="#/">Back to the dashboard</a>.</p>`;
}
