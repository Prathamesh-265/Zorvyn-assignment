const { getDb } = require('../config/database');
const { paginate, paginationMeta } = require('../utils/paginate');

function listRecords(query) {
  const { page, limit, offset } = paginate(query);
  const db = getDb();

  const conditions = ['deleted_at IS NULL'];
  const params     = [];

  if (query.type)       { conditions.push('type = ?');                          params.push(query.type); }
  if (query.category)   { conditions.push('category LIKE ?');                   params.push(`%${query.category}%`); }
  if (query.date_from)  { conditions.push('date >= ?');                         params.push(query.date_from); }
  if (query.date_to)    { conditions.push('date <= ?');                         params.push(query.date_to); }
  if (query.search)     { conditions.push('(notes LIKE ? OR category LIKE ?)'); params.push(`%${query.search}%`, `%${query.search}%`); }
  if (query.min_amount) { conditions.push('amount >= ?');                       params.push(parseFloat(query.min_amount)); }
  if (query.max_amount) { conditions.push('amount <= ?');                       params.push(parseFloat(query.max_amount)); }

  const where = conditions.join(' AND ');
  const total = db.prepare(`SELECT COUNT(*) as c FROM financial_records WHERE ${where}`).get(params).c;
  const rows  = db.prepare(
    `SELECT r.*, u.name as created_by_name
     FROM financial_records r
     JOIN users u ON u.id = r.created_by
     WHERE ${where}
     ORDER BY date DESC, r.id DESC
     LIMIT ? OFFSET ?`
  ).all([...params, limit, offset]);

  return { data: rows, pagination: paginationMeta(total, page, limit) };
}

function getRecord(id) {
  const record = getDb()
    .prepare(`SELECT r.*, u.name as created_by_name
              FROM financial_records r JOIN users u ON u.id = r.created_by
              WHERE r.id = ? AND r.deleted_at IS NULL`)
    .get([id]);
  if (!record) throw Object.assign(new Error('Record not found'), { status: 404 });
  return record;
}

function createRecord({ amount, type, category, date, notes }, userId) {
  const db = getDb();
  const result = db
    .prepare('INSERT INTO financial_records (amount, type, category, date, notes, created_by) VALUES (?,?,?,?,?,?)')
    .run([amount, type, category, date, notes || null, userId]);
  return getRecord(result.lastInsertRowid);
}

function updateRecord(id, fields) {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM financial_records WHERE id = ? AND deleted_at IS NULL').get([id]);
  if (!existing) throw Object.assign(new Error('Record not found'), { status: 404 });

  const allowed = {};
  if (fields.amount   !== undefined) allowed.amount   = fields.amount;
  if (fields.type     !== undefined) allowed.type     = fields.type;
  if (fields.category !== undefined) allowed.category = fields.category;
  if (fields.date     !== undefined) allowed.date     = fields.date;
  if (fields.notes    !== undefined) allowed.notes    = fields.notes;

  if (Object.keys(allowed).length === 0)
    throw Object.assign(new Error('No valid fields to update'), { status: 400 });

  allowed.updated_at = new Date().toISOString();
  const sets   = Object.keys(allowed).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE financial_records SET ${sets} WHERE id = ?`).run([...Object.values(allowed), id]);
  return getRecord(id);
}

function deleteRecord(id) {
  const result = getDb()
    .prepare("UPDATE financial_records SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL")
    .run([id]);
  if (result.changes === 0) throw Object.assign(new Error('Record not found'), { status: 404 });
  return { message: 'Record deleted (soft delete)' };
}

module.exports = { listRecords, getRecord, createRecord, updateRecord, deleteRecord };
