const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'lyfehub',
  user: process.env.DB_USER || 'lyfehub',
  password: process.env.DB_PASSWORD || 'lyfehub',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Log connection
pool.on('connect', () => {
  console.log('PostgreSQL client connected');
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

/**
 * Query helper — runs a parameterized query and returns all rows.
 * @param {string} text - SQL query with $1, $2... placeholders
 * @param {Array} params - Parameter values
 * @returns {Promise<Array>} rows
 */
async function query(text, params) {
  const res = await pool.query(text, params);
  return res.rows;
}

/**
 * Get one row (or null).
 */
async function getOne(text, params) {
  const res = await pool.query(text, params);
  return res.rows[0] || null;
}

/**
 * Get all rows (alias for query).
 */
async function getAll(text, params) {
  const res = await pool.query(text, params);
  return res.rows;
}

/**
 * Run a mutation (INSERT/UPDATE/DELETE) and return { rowCount, rows }.
 */
async function run(text, params) {
  const res = await pool.query(text, params);
  return { rowCount: res.rowCount, rows: res.rows };
}

/**
 * Execute raw SQL (for DDL, multi-statement).
 */
async function exec(text) {
  await pool.query(text);
}

/**
 * Run a function inside a transaction.
 * @param {Function} fn - async function receiving a client
 */
async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn({
      query: (text, params) => client.query(text, params).then(r => r.rows),
      getOne: (text, params) => client.query(text, params).then(r => r.rows[0] || null),
      getAll: (text, params) => client.query(text, params).then(r => r.rows),
      run: (text, params) => client.query(text, params).then(r => ({ rowCount: r.rowCount, rows: r.rows })),
    });
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Graceful shutdown.
 */
async function close() {
  await pool.end();
}

module.exports = {
  pool,
  query,
  getOne,
  getAll,
  run,
  exec,
  transaction,
  close,
};
