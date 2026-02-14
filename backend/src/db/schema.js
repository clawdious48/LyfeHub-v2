const db = require('./pool');
const fs = require('fs');
const path = require('path');

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
}

module.exports = db;
module.exports.initDatabase = initDatabase;
