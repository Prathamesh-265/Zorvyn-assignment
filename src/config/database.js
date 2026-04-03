/**
 * database.js
 *
 * Uses sql.js (pure-JS SQLite, no native build tools needed).
 * sql.js exposes an async initSqlJs() — we call it once at server boot
 * via initDb(), which is awaited in src/index.js before listen().
 * All subsequent db calls are fully synchronous.
 */

const path = require('path');
const fs   = require('fs');

const DB_PATH = path.join(__dirname, '../../data/finance.db');

let _db = null;   // sql.js Database instance

async function initDb() {
  if (_db) return;

  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const initSqlJs  = require('sql.js');
  const SQL        = await initSqlJs();

  const filebuf = fs.existsSync(DB_PATH) ? fs.readFileSync(DB_PATH) : null;
  _db = filebuf ? new SQL.Database(filebuf) : new SQL.Database();

  _initSchema();
  _persist();
}

function _persist() {
  if (!_db) return;
  fs.writeFileSync(DB_PATH, Buffer.from(_db.export()));
}

function _initSchema() {
  _db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password   TEXT NOT NULL,
      role       TEXT NOT NULL DEFAULT 'viewer',
      status     TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS financial_records (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      amount     REAL NOT NULL,
      type       TEXT NOT NULL,
      category   TEXT NOT NULL,
      date       TEXT NOT NULL,
      notes      TEXT,
      deleted_at TEXT,
      created_by INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_records_date     ON financial_records(date);
    CREATE INDEX IF NOT EXISTS idx_records_type     ON financial_records(type);
    CREATE INDEX IF NOT EXISTS idx_records_category ON financial_records(category);
  `);
}

// ── Synchronous query helpers ─────────────────────────────────────

function _run(sql, params) {
  _db.run(sql, params || []);
  const meta = _db.exec('SELECT last_insert_rowid() as id, changes() as ch');
  _persist();
  const row = meta[0]?.values[0];
  return { lastInsertRowid: row ? row[0] : null, changes: row ? row[1] : 0 };
}

function _get(sql, params) {
  const stmt = _db.prepare(sql);
  stmt.bind(params || []);
  if (stmt.step()) {
    const result = _zip(stmt.getColumnNames(), stmt.get());
    stmt.free();
    return result;
  }
  stmt.free();
  return undefined;
}

function _all(sql, params) {
  const stmt = _db.prepare(sql);
  stmt.bind(params || []);
  const cols = stmt.getColumnNames();
  const rows = [];
  while (stmt.step()) rows.push(_zip(cols, stmt.get()));
  stmt.free();
  return rows;
}

function _zip(keys, vals) {
  return Object.fromEntries(keys.map((k, i) => [k, vals[i]]));
}

// Normalise both .run(a, b) and .run([a, b]) call styles
function _norm(args) {
  if (args.length === 1 && Array.isArray(args[0])) return args[0];
  return args;
}

// ── better-sqlite3-compatible proxy ──────────────────────────────

const db = {
  prepare(sql) {
    return {
      run(...a) { return _run(sql, _norm(a)); },
      get(...a) { return _get(sql, _norm(a)); },
      all(...a) { return _all(sql, _norm(a)); },
    };
  },
  exec(sql)  { _db.run(sql); _persist(); },
  pragma()   { /* no-op */ },
  transaction(fn) {
    return (items) => {
      _db.run('BEGIN');
      try   { fn(items); _db.run('COMMIT'); }
      catch (e) { _db.run('ROLLBACK'); throw e; }
      _persist();
    };
  },
};

function getDb() {
  if (!_db) throw new Error('DB not ready — initDb() must be awaited before use');
  return db;
}

module.exports = { getDb, initDb };