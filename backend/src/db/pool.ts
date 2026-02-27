import { Pool, type PoolClient, type QueryResult } from 'pg';
import logger from '../lib/logger';

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

pool.on('connect', () => {
  logger.debug('PostgreSQL client connected');
});

pool.on('error', (err: Error) => {
  logger.error({ err }, 'Unexpected PostgreSQL pool error');
});

export interface DbClient {
  query: (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;
  getOne: (text: string, params?: unknown[]) => Promise<Record<string, unknown> | null>;
  getAll: (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;
  run: (text: string, params?: unknown[]) => Promise<{ rowCount: number | null; rows: Record<string, unknown>[] }>;
}

async function query(text: string, params?: unknown[]): Promise<Record<string, unknown>[]> {
  const res: QueryResult = await pool.query(text, params);
  return res.rows;
}

async function getOne(text: string, params?: unknown[]): Promise<Record<string, unknown> | null> {
  const res: QueryResult = await pool.query(text, params);
  return res.rows[0] || null;
}

async function getAll(text: string, params?: unknown[]): Promise<Record<string, unknown>[]> {
  const res: QueryResult = await pool.query(text, params);
  return res.rows;
}

async function run(text: string, params?: unknown[]): Promise<{ rowCount: number | null; rows: Record<string, unknown>[] }> {
  const res: QueryResult = await pool.query(text, params);
  return { rowCount: res.rowCount, rows: res.rows };
}

async function exec(text: string): Promise<void> {
  await pool.query(text);
}

async function transaction<T>(fn: (client: DbClient) => Promise<T>): Promise<T> {
  const client: PoolClient = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn({
      query: (text: string, params?: unknown[]) => client.query(text, params).then((r: QueryResult) => r.rows),
      getOne: (text: string, params?: unknown[]) => client.query(text, params).then((r: QueryResult) => r.rows[0] || null),
      getAll: (text: string, params?: unknown[]) => client.query(text, params).then((r: QueryResult) => r.rows),
      run: (text: string, params?: unknown[]) => client.query(text, params).then((r: QueryResult) => ({ rowCount: r.rowCount, rows: r.rows })),
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

async function close(): Promise<void> {
  await pool.end();
}

// CommonJS-compatible export so existing .js files can require() this module
export { pool, query, getOne, getAll, run, exec, transaction, close };

// Also support module.exports for backward compatibility with require()
module.exports = { pool, query, getOne, getAll, run, exec, transaction, close };
module.exports.pool = pool;
module.exports.query = query;
module.exports.getOne = getOne;
module.exports.getAll = getAll;
module.exports.run = run;
module.exports.exec = exec;
module.exports.transaction = transaction;
module.exports.close = close;
