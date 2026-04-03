const { getDb } = require('../config/database');

function getSummary(query = {}) {
  const db = getDb();
  const conditions = ['deleted_at IS NULL'];
  const params     = [];

  if (query.date_from) { conditions.push('date >= ?'); params.push(query.date_from); }
  if (query.date_to)   { conditions.push('date <= ?'); params.push(query.date_to); }

  const where = conditions.join(' AND ');

  const totals = db.prepare(`
    SELECT
      SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) as total_income,
      SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as total_expenses,
      COUNT(*) as total_records
    FROM financial_records WHERE ${where}
  `).get(params);

  const net_balance = (totals.total_income || 0) - (totals.total_expenses || 0);

  const byCategory = db.prepare(`
    SELECT category, type,
           SUM(amount) as total,
           COUNT(*)    as count
    FROM financial_records
    WHERE ${where}
    GROUP BY category, type
    ORDER BY total DESC
  `).all(params);

  const recentActivity = db.prepare(`
    SELECT r.id, r.amount, r.type, r.category, r.date, r.notes, u.name as created_by_name
    FROM financial_records r
    JOIN users u ON u.id = r.created_by
    WHERE r.deleted_at IS NULL
    ORDER BY r.date DESC, r.id DESC
    LIMIT 10
  `).all([]);

  return {
    summary: {
      total_income:   totals.total_income   || 0,
      total_expenses: totals.total_expenses || 0,
      net_balance,
      total_records:  totals.total_records  || 0,
    },
    by_category: byCategory,
    recent_activity: recentActivity,
  };
}

function getMonthlyTrends(year) {
  const db = getDb();
  const y = year || new Date().getFullYear();

  const rows = db.prepare(`
    SELECT
      strftime('%m', date) as month,
      type,
      SUM(amount)          as total,
      COUNT(*)             as count
    FROM financial_records
    WHERE deleted_at IS NULL AND strftime('%Y', date) = ?
    GROUP BY month, type
    ORDER BY month
  `).all([String(y)]);

  const months = {};
  for (let m = 1; m <= 12; m++) {
    const key = String(m).padStart(2, '0');
    months[key] = { month: key, income: 0, expenses: 0, net: 0 };
  }
  for (const r of rows) {
    if (r.type === 'income')  months[r.month].income   = r.total;
    if (r.type === 'expense') months[r.month].expenses = r.total;
  }
  for (const m of Object.values(months)) m.net = m.income - m.expenses;

  return { year: y, months: Object.values(months) };
}

function getWeeklyTrends() {
  const db = getDb();
  const rows = db.prepare(`
    SELECT
      strftime('%Y-W%W', date) as week,
      type,
      SUM(amount)              as total
    FROM financial_records
    WHERE deleted_at IS NULL AND date >= date('now', '-12 weeks')
    GROUP BY week, type
    ORDER BY week
  `).all([]);

  const weeks = {};
  for (const r of rows) {
    if (!weeks[r.week]) weeks[r.week] = { week: r.week, income: 0, expenses: 0, net: 0 };
    if (r.type === 'income')  weeks[r.week].income   = r.total;
    if (r.type === 'expense') weeks[r.week].expenses = r.total;
  }
  for (const w of Object.values(weeks)) w.net = w.income - w.expenses;

  return { weeks: Object.values(weeks) };
}

module.exports = { getSummary, getMonthlyTrends, getWeeklyTrends };
