// seed.js
// Creates one default user per role so you can log in immediately.
// Run with:  node seed.js
//
// Login with, e.g.:
//   email: fleet@transitops.com   password: Password123!
//   email: driver@transitops.com  password: Password123!
//   email: safety@transitops.com  password: Password123!
//   email: finance@transitops.com password: Password123!

require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('./db');

const DEFAULT_PASSWORD = 'Password123!';

const users = [
  { name: 'Fleet Manager', email: 'fleet@transitops.com', role: 'Fleet Manager' },
  { name: 'Driver User', email: 'driver@transitops.com', role: 'Driver' },
  { name: 'Safety Officer', email: 'safety@transitops.com', role: 'Safety Officer' },
  { name: 'Financial Analyst', email: 'finance@transitops.com', role: 'Financial Analyst' },
];

async function seed() {
  try {
    console.log('Seeding default users...');
    const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    for (const u of users) {
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [u.email]);
      if (existing.rows.length > 0) {
        console.log(`- ${u.email} already exists, skipping`);
        continue;
      }
      await pool.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
        [u.name, u.email, hash, u.role]
      );
      console.log(`✅ created ${u.role}: ${u.email} / ${DEFAULT_PASSWORD}`);
    }

    console.log('\nDone. All default passwords are:', DEFAULT_PASSWORD);
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
