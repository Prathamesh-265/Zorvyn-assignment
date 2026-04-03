const bcrypt     = require('bcryptjs');
const { initDb, getDb } = require('../config/database');

async function seed() {
  await initDb();
  const db = getDb();
  console.log('🌱  Seeding database...');

  const users = [
    { name: 'Admin User',    email: 'admin@example.com',   password: 'password123', role: 'admin'   },
    { name: 'Alice Analyst', email: 'analyst@example.com', password: 'password123', role: 'analyst' },
    { name: 'Victor Viewer', email: 'viewer@example.com',  password: 'password123', role: 'viewer'  },
  ];

  for (const u of users) {
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get([u.email]);
    if (!exists) {
      db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)')
        .run([u.name, u.email, bcrypt.hashSync(u.password, 10), u.role]);
    }
  }

  const admin = db.prepare('SELECT id FROM users WHERE email = ?').get(['admin@example.com']);
  console.log(`   ✓ Users seeded (admin id=${admin.id})`);

  const categories = {
    income:  ['Salary', 'Freelance', 'Investment'],
    expense: ['Rent', 'Groceries', 'Utilities', 'Entertainment', 'Travel', 'Healthcare'],
  };

  const today = new Date();
  for (let i = 0; i < 60; i++) {
    const type   = Math.random() > 0.4 ? 'expense' : 'income';
    const cats   = categories[type];
    const cat    = cats[Math.floor(Math.random() * cats.length)];
    const amount = type === 'income'
      ? +(Math.random() * 8000 + 2000).toFixed(2)
      : +(Math.random() * 1500 + 50).toFixed(2);
    const d = new Date(today);
    d.setDate(d.getDate() - Math.floor(Math.random() * 365));
    const date = d.toISOString().split('T')[0];

    db.prepare('INSERT INTO financial_records (amount, type, category, date, notes, created_by) VALUES (?,?,?,?,?,?)')
      .run([amount, type, cat, date, `Sample ${type} — ${cat}`, admin.id]);
  }

  console.log('   ✓ 60 financial records seeded');
  console.log('\n✅  Seed complete!\n');
  console.log('   Credentials:');
  console.log('   admin@example.com   / password123  (admin)');
  console.log('   analyst@example.com / password123  (analyst)');
  console.log('   viewer@example.com  / password123  (viewer)\n');
}

seed().catch(err => { console.error(err); process.exit(1); });