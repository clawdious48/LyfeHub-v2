const db = require('./pool');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const BCRYPT_ROUNDS = 12;

/**
 * Initialize the database schema by running init.sql.
 * Called once at app startup.
 */
async function initDatabase() {
  const initSql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
  await db.exec(initSql);
  console.log('PostgreSQL database schema initialized');

  // Seed default org if none exists
  const orgCount = await db.getOne('SELECT COUNT(*) as cnt FROM apex_organizations');
  if (parseInt(orgCount.cnt) === 0) {
    const { v4: uuidv4 } = require('uuid');
    const mgmtUser = await db.getOne("SELECT id FROM users WHERE role = 'management' ORDER BY created_at ASC LIMIT 1");
    if (mgmtUser) {
      const orgId = uuidv4();
      const memberId = uuidv4();
      await db.run(
        'INSERT INTO apex_organizations (id, name, slug, created_by) VALUES ($1, $2, $3, $4)',
        [orgId, 'Apex Restoration', 'apex-restoration', mgmtUser.id]
      );
      await db.run(
        'INSERT INTO apex_org_members (id, org_id, user_id, role) VALUES ($1, $2, $3, $4)',
        [memberId, orgId, mgmtUser.id, 'management']
      );
      await db.run('UPDATE apex_jobs SET org_id = $1 WHERE org_id IS NULL', [orgId]);
      console.log('Seeded default Apex Restoration org');
    }
  }

  // Ensure no users have NULL role
  await db.run("UPDATE users SET role = 'field_tech' WHERE role IS NULL");

  // Seed persistent dev/test user
  await seedDevUser();
}

/**
 * Ensure the dev/test user exists with management role + Apex org membership.
 * Idempotent: creates if missing, updates password/role if already exists.
 */
async function seedDevUser() {
  const { v4: uuidv4 } = require('uuid');
  const email = 'jaker3001@gmail.com';
  const password = 'jarjarjar';
  const name = 'Jake Rogers';
  const role = 'management';

  let user = await db.getOne('SELECT id, role FROM users WHERE email = $1', [email]);

  if (!user) {
    // Create user
    const id = uuidv4();
    const now = new Date().toISOString();
    const passwordHash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
    await db.run(`
      INSERT INTO users (id, email, password_hash, name, role, settings, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, '{}', $6, $7)
    `, [id, email, passwordHash, name, role, now, now]);
    user = { id, role };
    console.log(`Seeded dev user: ${email}`);
  } else {
    // Ensure role is management and password is current
    const passwordHash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
    await db.run(
      'UPDATE users SET role = $1, password_hash = $2 WHERE id = $3',
      [role, passwordHash, user.id]
    );
    user.role = role;
  }

  // Ensure user is a member of the Apex org
  const org = await db.getOne("SELECT id FROM apex_organizations WHERE slug = 'apex-restoration' LIMIT 1");
  if (org) {
    const membership = await db.getOne(
      'SELECT id FROM apex_org_members WHERE org_id = $1 AND user_id = $2',
      [org.id, user.id]
    );
    if (!membership) {
      const memberId = uuidv4();
      await db.run(
        'INSERT INTO apex_org_members (id, org_id, user_id, role) VALUES ($1, $2, $3, $4)',
        [memberId, org.id, user.id, 'management']
      );
      console.log(`Added dev user to Apex Restoration org as management`);
    }
  }
}

module.exports = db;
module.exports.initDatabase = initDatabase;
