// HomeLedger seed data for November 2026.
// All figures are the household's own sample month. Amounts are in USD:
// income is positive, spending is negative. The app reads this file first,
// then lets the household add, edit and delete entries of its own (kept in
// localStorage, so a reload keeps what was added).

export const MONTH = 'November 2026';
export const MONTH_KEY = '2026-11';

export const CATEGORIES = [
  { id: 'housing', name: 'Housing', budget: 1850, color: '#4f6df5' },
  { id: 'food', name: 'Food & Dining', budget: 720, color: '#2f9e6e' },
  { id: 'transport', name: 'Transport', budget: 320, color: '#e08a1e' },
  { id: 'utilities', name: 'Utilities', budget: 260, color: '#7c5cd6' },
  { id: 'health', name: 'Health', budget: 180, color: '#d6456b' },
  { id: 'entertainment', name: 'Entertainment', budget: 150, color: '#0e7490' },
  { id: 'shopping', name: 'Shopping', budget: 250, color: '#b45309' },
  { id: 'savings', name: 'Savings', budget: 800, color: '#15803d' },
];

export const INCOME = [
  { id: 'inc-1', date: '2026-11-03', description: 'Salary — Alex (payroll)', amount: 3800 },
  { id: 'inc-2', date: '2026-11-03', description: 'Salary — Sam (payroll)', amount: 2600 },
  { id: 'inc-3', date: '2026-11-18', description: 'Freelance — Sam (weekend project)', amount: 240 },
];

export const TRANSACTIONS = [
  { id: 't-01', date: '2026-11-01', description: 'Rent — Maple Court Apt 4B', category: 'housing', amount: -1650 },
  { id: 't-02', date: '2026-11-02', description: 'Whole Foods Market', category: 'food', amount: -148.2 },
  { id: 't-03', date: '2026-11-03', description: 'City Transit monthly pass', category: 'transport', amount: -96 },
  { id: 't-04', date: '2026-11-04', description: 'Electric bill — City Power', category: 'utilities', amount: -87.4 },
  { id: 't-05', date: '2026-11-05', description: 'Pharmacy — prescriptions', category: 'health', amount: -42.5 },
  { id: 't-06', date: '2026-11-06', description: 'Gas — Shell, Route 9', category: 'transport', amount: -38.6 },
  { id: 't-07', date: '2026-11-07', description: 'Farmers market', category: 'food', amount: -64.75 },
  { id: 't-08', date: '2026-11-08', description: 'Cinema — two tickets', category: 'entertainment', amount: -32 },
  { id: 't-09', date: '2026-11-09', description: 'Internet — Fiber 500', category: 'utilities', amount: -59 },
  { id: 't-10', date: '2026-11-10', description: 'Trader Joe’s', category: 'food', amount: -112.9 },
  { id: 't-11', date: '2026-11-11', description: 'New running shoes', category: 'shopping', amount: -89.99 },
  { id: 't-12', date: '2026-11-12', description: 'Dinner — La Trattoria', category: 'food', amount: -58.4 },
  { id: 't-13', date: '2026-11-13', description: 'Water bill', category: 'utilities', amount: -41.2 },
  { id: 't-14', date: '2026-11-14', description: 'Dentist — checkup copay', category: 'health', amount: -65 },
  { id: 't-15', date: '2026-11-15', description: 'Transfer to savings', category: 'savings', amount: -800 },
  { id: 't-16', date: '2026-11-16', description: 'Gas — Chevron', category: 'transport', amount: -41.3 },
  { id: 't-17', date: '2026-11-17', description: 'Whole Foods Market', category: 'food', amount: -131.6 },
  { id: 't-18', date: '2026-11-18', description: 'Streaming — movies & music', category: 'entertainment', amount: -24.98 },
  { id: 't-19', date: '2026-11-19', description: 'Phone — two lines', category: 'utilities', amount: -68 },
  { id: 't-20', date: '2026-11-20', description: 'Hardware store — light bulbs', category: 'shopping', amount: -27.45 },
  { id: 't-21', date: '2026-11-21', description: 'Lunch — Banh Mi cart', category: 'food', amount: -18.5 },
  { id: 't-22', date: '2026-11-22', description: 'Gym membership', category: 'health', amount: -39 },
  { id: 't-23', date: '2026-11-23', description: 'Trader Joe’s', category: 'food', amount: -98.35 },
  { id: 't-24', date: '2026-11-24', description: 'Books — two paperbacks', category: 'shopping', amount: -31.8 },
  { id: 't-25', date: '2026-11-25', description: 'Thanksgiving groceries', category: 'food', amount: -86.2 },
  { id: 't-26', date: '2026-11-26', description: 'Gas — Shell, Route 9', category: 'transport', amount: -36.9 },
];

// Last month, for the Reports comparison (same shape, October 2026).
export const LAST_MONTH = {
  label: 'October 2026',
  income: 6400,
  spentByCategory: {
    housing: 1650,
    food: 612.4,
    transport: 238.1,
    utilities: 231.6,
    health: 118.5,
    entertainment: 96.98,
    shopping: 142.2,
    savings: 800,
  },
};
