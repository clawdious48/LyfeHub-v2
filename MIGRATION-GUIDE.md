# SQLite → PostgreSQL Migration Guide

## Working Directory
`/root/lyfehub-v2/worktrees/postgres-migration/`

## What Changed

### schema.js (already done)
- Now exports the `pool.js` module (async query helpers)
- No more inline CREATE TABLE / ALTER TABLE — all DDL is in `init.sql`
- `initDatabase()` runs init.sql on startup

### pool.js (new)
Exports: `{ query, getOne, getAll, run, exec, transaction, close, pool }`

## Conversion Patterns

### Imports
```js
// OLD:
const db = require('./schema');
// NEW (same — schema.js now re-exports pool.js):
const db = require('./schema');
```

### Queries
```js
// OLD (synchronous):
db.prepare('SELECT * FROM users WHERE id = ?').get(id)
db.prepare('SELECT * FROM users WHERE status = ?').all(status)
db.prepare('INSERT INTO users (id, name) VALUES (?, ?)').run(id, name)

// NEW (async):
await db.getOne('SELECT * FROM users WHERE id = $1', [id])
await db.getAll('SELECT * FROM users WHERE status = $1', [status])
await db.run('INSERT INTO users (id, name) VALUES ($1, $2)', [id, name])
```

### Parameter Placeholders
- SQLite: `?` (positional, implicit)
- Postgres: `$1, $2, $3...` (explicit numbered)

### Timestamps
- SQLite: `datetime('now')` 
- Postgres: `NOW()` (already handled in init.sql defaults)
- In JS code: Use `new Date().toISOString()` for explicit timestamps

### Transactions
```js
// OLD:
const txn = db.transaction((items) => {
  for (const item of items) {
    db.prepare('INSERT ...').run(item);
  }
});
txn(items);

// NEW:
await db.transaction(async (client) => {
  for (const item of items) {
    await client.run('INSERT ...', [item]);
  }
});
```

### Functions must become async
Every exported function that touches the DB must become `async` and callers must `await` them.

### Return values
- `db.prepare().run()` returned `{ changes, lastInsertRowid }`
- `db.run()` now returns `{ rowCount, rows }`
- Use `rowCount` instead of `changes`
- For RETURNING clauses: `await db.getOne('INSERT ... RETURNING *', [...])`

### SQLite-specific removals
- Remove ALL `sqlite_master` queries
- Remove ALL `PRAGMA` calls
- Remove ALL `ALTER TABLE ADD COLUMN` migration blocks (handled in init.sql)
- Remove ALL `CREATE TABLE IF NOT EXISTS` blocks (handled in init.sql)
- The schema files (apexSchema.js, dryingSchema.js, bases table creation in bases.js) should become empty or just re-export db

### Boolean handling
- SQLite used INTEGER 0/1 for booleans
- Keep as INTEGER 0/1 in Postgres too (for compatibility) — no change needed

### UPSERT syntax
```js
// SQLite:
INSERT OR REPLACE INTO ...
INSERT OR IGNORE INTO ...

// Postgres:
INSERT INTO ... ON CONFLICT (key) DO UPDATE SET ...
INSERT INTO ... ON CONFLICT (key) DO NOTHING
```

### LIKE queries (case sensitivity)
- SQLite LIKE is case-insensitive by default
- Postgres LIKE is case-sensitive; use ILIKE for case-insensitive

### String concatenation
- Both support `||` — no change needed

### JSON
- SQLite stored JSON as TEXT, parsed in JS
- Keep the same approach — store as TEXT, parse in JS
- Don't convert to Postgres JSONB (avoid breaking changes)

## Files to Convert

### Schema files (remove DDL, keep as pass-through):
- `apexSchema.js` — remove all CREATE/ALTER, just `module.exports = require('./schema')`
- `dryingSchema.js` — same
- `bases.js` — remove CREATE TABLE blocks at top, keep CRUD functions

### DB modules (convert queries):
All files in `backend/src/db/` that export functions.

### Route files (add async/await):
All files in `backend/src/routes/` — add `async` to handlers, `await` DB calls.
