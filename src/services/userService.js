const bcrypt = require('bcryptjs');
const { getDb } = require('../config/database');
const { paginate, paginationMeta } = require('../utils/paginate');

const SAFE_FIELDS = 'id, name, email, role, status, created_at, updated_at';

function listUsers(query) {
  const { page, limit, offset } = paginate(query);
  const db = getDb();

  const conditions = ['1=1'];
  const params     = [];

  if (query.role)   { conditions.push('role = ?');                         params.push(query.role); }
  if (query.status) { conditions.push('status = ?');                       params.push(query.status); }
  if (query.search) { conditions.push('(name LIKE ? OR email LIKE ?)');    params.push(`%${query.search}%`, `%${query.search}%`); }

  const where = conditions.join(' AND ');
  const total = db.prepare(`SELECT COUNT(*) as c FROM users WHERE ${where}`).get(params).c;
  const users = db.prepare(
    `SELECT ${SAFE_FIELDS} FROM users WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all([...params, limit, offset]);

  return { data: users, pagination: paginationMeta(total, page, limit) };
}

function getUser(id) {
  const user = getDb()
    .prepare(`SELECT ${SAFE_FIELDS} FROM users WHERE id = ?`)
    .get([id]);
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
  return user;
}

function updateUser(id, fields, requestingUser) {
  const allowed = {};
  if (fields.name)     allowed.name     = fields.name;
  if (fields.status && requestingUser.role === 'admin') allowed.status = fields.status;
  if (fields.role   && requestingUser.role === 'admin') allowed.role   = fields.role;
  if (fields.password) allowed.password = bcrypt.hashSync(fields.password, 10);

  if (Object.keys(allowed).length === 0)
    throw Object.assign(new Error('No valid fields to update'), { status: 400 });

  allowed.updated_at = new Date().toISOString();

  const db     = getDb();
  const sets   = Object.keys(allowed).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(allowed), id];
  db.prepare(`UPDATE users SET ${sets} WHERE id = ?`).run(values);

  return db.prepare(`SELECT ${SAFE_FIELDS} FROM users WHERE id = ?`).get([id]);
}

function deleteUser(id) {
  getDb().prepare("UPDATE users SET status='inactive' WHERE id = ?").run([id]);
  return { message: 'User deactivated' };
}

module.exports = { listUsers, getUser, updateUser, deleteUser };
