// db.js
// Single Postgres connection pool used by every route file via `require('../db')`.
//
// IMPORTANT: This file must stay a single file (not a folder named `db/`)
// because Node resolves `require('../db')` to `db.js` before it ever looks
// inside a `db/` directory. Having both caused every query in this project
// to silently fail (pool was undefined) — keep this as the only db module.

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Fallback to discrete vars if DATABASE_URL isn't set
  host: process.env.DATABASE_URL ? undefined : process.env.DB_HOST,
  port: process.env.DATABASE_URL ? undefined : process.env.DB_PORT,
  database: process.env.DATABASE_URL ? undefined : process.env.DB_NAME,
  user: process.env.DATABASE_URL ? undefined : process.env.DB_USER,
  password: process.env.DATABASE_URL ? undefined : process.env.DB_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  console.log('✅ PostgreSQL pool: new client connected');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected PostgreSQL pool error:', err.message);
});

// Quick sanity check at boot so failures are loud and immediate
pool.query('SELECT NOW()')
  .then((res) => console.log('✅ Database connected at', res.rows[0].now))
  .catch((err) => {
    console.error('❌ Database connection FAILED:', err.message);
    console.error('   Check DATABASE_URL / DB_* values in your .env file.');
  });

module.exports = pool;
