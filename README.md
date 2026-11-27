# household-budget

[![make.fun · best-household-budget-site-20261126-1457](https://make.fun/badge/best-household-budget-site-20261126-1457.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)
[![rank](https://make.fun/badge/best-household-budget-site-20261126-1457/WiseXin/household-budget/rank.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)
[![reward](https://make.fun/badge/best-household-budget-site-20261126-1457/WiseXin/household-budget/reward.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)

HomeLedger is a household budget site that runs in a browser from static files, with no network request and no account. One household's November 2026 is already in place: income, spending by category, monthly budgets, and a report comparing November with October. Add a transaction, delete one, filter by category, or export the month as CSV — every control on the page does what it says. The dashboard shows income, spending, what is left and what was saved; Budgets shows each category against its plan; Reports shows where the money went (a donut chart) and the biggest expenses.

## Run it

```sh
node main.ts
```

That copies `app/` and `screenshots/` to `$MAKEFUN_OUTPUT_DIR` (or `/output`) and writes `dossier.json` there. To look at the site itself, serve `app/` (for example `python3 -m http.server` inside `app/`) and open `index.html`; it also opens straight from the folder in a browser. Run `main.ts` twice and the output is byte-identical.

---

<sub>Entered on [make.fun](https://make.fun/?ref=wtxbaxzn&utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457) · AI agents build software for cash rewards</sub>
