// HomeLedger views: each page of the site, rendered to HTML strings.
//
// The numbers arrive as a model object built in main.js; this file only
// turns those numbers into markup. Every piece of text is escaped before
// it is inserted, and the charts are hand-drawn inline SVG, so the pages
// need no network, no web fonts and no chart library.
//
// Markup is assembled from small parts (arrays joined with newlines)
// instead of one big template per page, so each page is a list of pieces
// that can be read top to bottom.

const esc = (value) =>
  String(value).replace(/[&<>"']/g, (ch) => '&#' + ch.charCodeAt(0) + ';');

const USD2 = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const money = (n) => (n < 0 ? '-$' : '$') + USD2.format(Math.abs(n));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const shortDate = (iso) => {
  const d = new Date(iso + 'T12:00:00');
  return MONTHS[d.getMonth()] + ' ' + d.getDate();
};

// ---- small shared pieces -------------------------------------------------

const dot = (color) => '<i class="dot" style="background:' + color + '"></i>';

// Whole percent of a budget that has been used, capped at 100.
const usedPct = (spent, budget) =>
  budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

const amountCell = (amount) =>
  '<td class="num ' + (amount < 0 ? 'bad' : 'good') + '">' + money(amount) + '</td>';

function txRow(t, deletable) {
  const cells = [
    '<td>' + shortDate(t.date) + '</td>',
    '<td>' + esc(t.description) + '</td>',
    '<td>' + esc(t.categoryName) + '</td>',
    amountCell(t.amount),
  ];
  if (deletable) {
    cells.push('<td><button class="del" data-del="' + t.id + '" type="button">Delete</button></td>');
  }
  return '<tr>' + cells.join('') + '</tr>';
}

function statCard(label, value, note, tone) {
  const cls = tone ? ' class="' + tone + '"' : '';
  return (
    '<div class="card"><span>' +
    label +
    '</span><strong' +
    cls +
    '>' +
    value +
    '</strong><small>' +
    note +
    '</small></div>'
  );
}

// One horizontal budget bar: label + spent/budget, the fill, and a note
// that says how much is left — or how far over budget the category is.
function budgetBar(label, spent, budget, color) {
  const pct = usedPct(spent, budget);
  const over = spent > budget;
  const fillClass = over ? 'bar-fill over' : 'bar-fill';
  const note = over
    ? 'Over budget by ' + money(spent - budget)
    : pct + '% of budget · ' + money(budget - spent) + ' left';
  return [
    '<div class="bar-row">',
    '  <div class="bar-head"><span>' + dot(color) + esc(label) + '</span>',
    '  <span>' + money(spent) + ' of ' + money(budget) + '</span></div>',
    '  <div class="bar"><div class="' + fillClass + '" style="width:' + pct + '%;background:' + color + '"></div></div>',
    '  <div class="bar-note">' + note + '</div>',
    '</div>',
  ].join('\n');
}

const barsFor = (categories) =>
  categories.map((c) => budgetBar(c.name, c.spent, c.budget, c.color)).join('\n');

// A donut of spending by category: one stroked circle arc per segment,
// laid end to end around a 70px radius, with the total in the middle and
// a legend beside it.
function donut(segments) {
  const total = segments.reduce((sum, seg) => sum + seg.value, 0) || 1;
  const radius = 70;
  const circ = 2 * Math.PI * radius;
  const arcs = [];
  const legend = [];
  let walked = 0;
  for (const seg of segments) {
    const frac = seg.value / total;
    const len = frac * circ;
    arcs.push(
      '<circle r="' +
        radius +
        '" cx="90" cy="90" fill="none" stroke="' +
        seg.color +
        '" stroke-width="26" stroke-dasharray="' +
        len.toFixed(1) +
        ' ' +
        (circ - len).toFixed(1) +
        '" stroke-dashoffset="' +
        (-walked).toFixed(1) +
        '" />',
    );
    walked += len;
    legend.push(
      '<li>' +
        dot(seg.color) +
        esc(seg.label) +
        '<b>' +
        money(seg.value) +
        '</b><span>' +
        Math.round(frac * 100) +
        '%</span></li>',
    );
  }
  return [
    '<div class="donut-wrap">',
    '  <svg viewBox="0 0 180 180" width="180" height="180" role="img" aria-label="Spending by category">' +
      arcs.join(''),
    '  <text x="90" y="86" text-anchor="middle" class="donut-total">' + money(total) + '</text>',
    '  <text x="90" y="106" text-anchor="middle" class="donut-cap">spent</text></svg>',
    '  <ul class="legend">' + legend.join('') + '</ul></div>',
  ].join('\n');
}

// ---- pages ---------------------------------------------------------------

export function dashboard(model) {
  const cards = [
    statCard('Income', money(model.income), model.incomeCount + ' paydays in November', 'good'),
    statCard('Spent', money(model.spent), model.txCount + ' transactions', ''),
    statCard(
      'Left over',
      money(model.remaining),
      'after spending &amp; saving',
      model.remaining >= 0 ? 'good' : 'bad',
    ),
    statCard('Saved', model.savingsRate + '%', 'of income to savings', ''),
  ].join('\n  ');
  const recentRows = model.recent.map((t) => txRow(t, false)).join('\n  ');
  return [
    '<h1>November at a glance</h1>',
    '<p class="lede">Your household\'s money for November 2026 — what came in, what went out, and what is left.</p>',
    '<section class="cards">',
    '  ' + cards,
    '</section>',
    '<section class="panel"><h2>Spending by category</h2>' + barsFor(model.byCategory) + '</section>',
    '<section class="panel"><h2>Recent transactions</h2>',
    '<table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th class="num">Amount</th></tr></thead>',
    '<tbody>' + recentRows + '</tbody></table>',
    '<p><a href="#/transactions">See all transactions &rarr;</a></p></section>',
  ].join('\n');
}

export function transactionsPage(model, filter) {
  const optionTags = [];
  for (const id of ['all', ...model.categories.map((c) => c.id)]) {
    const label = id === 'all' ? 'All categories' : model.categories.find((c) => c.id === id).name;
    optionTags.push(
      '<option value="' + id + '"' + (id === filter ? ' selected' : '') + '>' + esc(label) + '</option>',
    );
  }
  const addOptions = model.categories
    .filter((c) => c.id !== 'savings')
    .map((c) => '<option value="' + c.id + '">' + esc(c.name) + '</option>')
    .join('');
  const rows = model.rows.map((t) => txRow(t, true)).join('\n  ');
  const body = rows || '<tr><td colspan="5">Nothing in this category yet.</td></tr>';
  return [
    '<h1>Transactions</h1>',
    '<p class="lede">Every dollar in and out for November 2026. Add one below, or delete a line you no longer need.</p>',
    '<section class="panel"><h2>Add a transaction</h2>',
    '<form id="add-form">',
    '<label>Date <input type="date" name="date" value="2026-11-26" required></label>',
    '<label>Description <input type="text" name="description" placeholder="e.g. Weekly groceries" required></label>',
    '<label>Category <select name="category">' + addOptions + '</select></label>',
    '<label>Type <select name="kind"><option value="expense">Expense</option><option value="income">Income</option></select></label>',
    '<label>Amount ($) <input type="number" name="amount" min="0.01" step="0.01" placeholder="0.00" required></label>',
    '<button type="submit">Add transaction</button>',
    '<span id="add-msg" class="msg" role="status"></span>',
    '</form></section>',
    '<section class="panel"><h2>All transactions <span class="count">' +
      model.rows.length +
      ' shown · ' +
      money(model.total) +
      ' total</span></h2>',
    '<label class="filter">Filter <select id="cat-filter">' + optionTags.join('') + '</select></label>',
    '<button id="export-csv" type="button">Export CSV</button>',
    '<table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th class="num">Amount</th><th></th></tr></thead>',
    '<tbody>' + body + '</tbody></table></section>',
  ].join('\n');
}

const budgetStatus = (c) => {
  if (c.spent > c.budget) return 'Over';
  if (c.spent >= c.budget * 0.9) return 'Almost there';
  return 'On track';
};

export function budgetsPage(model) {
  const rows = [];
  for (const c of model.byCategory) {
    rows.push(
      '<tr><td>' +
        dot(c.color) +
        esc(c.name) +
        '</td>\n  <td class="num">' +
        money(c.spent) +
        '</td><td class="num">' +
        money(c.budget) +
        '</td>\n  <td class="num">' +
        usedPct(c.spent, c.budget) +
        '%</td><td>' +
        budgetStatus(c) +
        '</td></tr>',
    );
  }
  const over = model.totalSpent > model.totalBudget;
  const verdict = over
    ? 'Over budget by <b class="bad">' + money(model.totalSpent - model.totalBudget) + '</b>.'
    : 'Under budget by <b class="good">' + money(model.totalBudget - model.totalSpent) + '</b>.';
  return [
    '<h1>Budgets</h1>',
    '<p class="lede">What you planned to spend in each category this month, against what you actually spent.</p>',
    '<section class="panel"><h2>Monthly budgets</h2>' + barsFor(model.byCategory) + '</section>',
    '<section class="panel"><h2>Budget table</h2>',
    '<table><thead><tr><th>Category</th><th class="num">Spent</th><th class="num">Budget</th><th class="num">Used</th><th>Status</th></tr></thead>',
    '<tbody>' + rows.join('\n  ') + '</tbody></table>',
    '<p>Total planned: <b>' +
      money(model.totalBudget) +
      '</b> · Total spent: <b>' +
      money(model.totalSpent) +
      '</b> · ',
    verdict + '</p></section>',
  ].join('\n');
}

export function reportsPage(model) {
  const compareRows = [];
  for (const c of model.compare) {
    const sign = c.diff <= 0 ? '−' : '+';
    const tone = c.diff <= 0 ? 'good' : 'bad';
    compareRows.push(
      '<tr><td>' +
        dot(c.color) +
        esc(c.name) +
        '</td>\n  <td class="num">' +
        money(c.last) +
        '</td><td class="num">' +
        money(c.now) +
        '</td>\n  <td class="num ' +
        tone +
        '">' +
        sign +
        money(Math.abs(c.diff)) +
        '</td></tr>',
    );
  }
  const topRows = model.top
    .map(
      (t, i) =>
        '<tr><td>' +
        (i + 1) +
        '</td><td>' +
        shortDate(t.date) +
        '</td><td>' +
        esc(t.description) +
        '</td>\n  <td>' +
        esc(t.categoryName) +
        '</td><td class="num">' +
        money(t.amount) +
        '</td></tr>',
    )
    .join('\n  ');
  return [
    '<h1>Reports</h1>',
    '<p class="lede">November against October, and where the big money went.</p>',
    '<section class="panel"><h2>Where November\'s money went</h2>' + donut(model.segments) + '</section>',
    '<section class="panel"><h2>November vs October</h2>',
    '<table><thead><tr><th>Category</th><th class="num">October</th><th class="num">November</th><th class="num">Change</th></tr></thead>',
    '<tbody>' + compareRows.join('\n  ') + '</tbody></table>',
    '<p>Income was <b>' +
      money(model.incomeNow) +
      '</b> in November against <b>' +
      money(model.incomeLast) +
      '</b> in October.',
    'Spending was <b>' +
      money(model.spentNow) +
      '</b> against <b>' +
      money(model.spentLast) +
      '</b>.</p></section>',
    '<section class="panel"><h2>Biggest expenses</h2>',
    '<table><thead><tr><th>#</th><th>Date</th><th>Description</th><th>Category</th><th class="num">Amount</th></tr></thead>',
    '<tbody>' + topRows + '</tbody></table></section>',
  ].join('\n');
}

export function missing() {
  return '<h1>Not found</h1><p>There is no page at this address. <a href="#/">Back to the dashboard</a>.</p>';
}
