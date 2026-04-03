const bcrypt = require('bcryptjs');
const { getDb } = require('../config/database');
const { signToken } = require('../middleware/auth');

function login(email, password) {
  const user = getDb()
    .prepare('SELECT * FROM users WHERE email = ?')
    .get([email.toLowerCase()]);

  if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  if (user.status !== 'active') throw Object.assign(new Error('Account is inactive'), { status: 403 });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  const token = signToken(user.id);
  const { password: _, ...safeUser } = user;
  return { token, user: safeUser };
}

function register(name, email, password, role = 'viewer') {
  const db = getDb();
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get([email.toLowerCase()]);
  if (exists) throw Object.assign(new Error('Email already registered'), { status: 409 });

  const hash = bcrypt.hashSync(password, 10);
  const result = db
    .prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)')
    .run([name, email.toLowerCase(), hash, role]);

  return db
    .prepare('SELECT id, name, email, role, status, created_at FROM users WHERE id = ?')
    .get([result.lastInsertRowid]);
}

module.exports = { login, register };
