const db = require('./pool');

async function getAllRoles() {
  return db.getAll('SELECT * FROM roles ORDER BY name');
}

async function getRoleByName(name) {
  return db.getOne('SELECT * FROM roles WHERE name = $1', [name]);
}

async function updateRolePermissions(name, permissions) {
  return db.run(
    'UPDATE roles SET permissions = $1, updated_at = NOW() WHERE name = $2',
    [JSON.stringify(permissions), name]
  );
}

async function revertRole(name) {
  const defaults = await getRoleDefaults(name);
  if (!defaults) throw new Error(`No defaults found for role: ${name}`);
  return db.run(
    'UPDATE roles SET permissions = $1, updated_at = NOW() WHERE name = $2',
    [JSON.stringify(defaults.permissions), name]
  );
}

async function revertAllRoles() {
  const defaults = await getDefaultPermissions();
  for (const d of defaults) {
    await db.run(
      'UPDATE roles SET permissions = $1, updated_at = NOW() WHERE name = $2',
      [JSON.stringify(d.permissions), d.role_name]
    );
  }
  return { reverted: defaults.length };
}

async function getRoleDefaults(name) {
  return db.getOne('SELECT * FROM role_defaults WHERE role_name = $1', [name]);
}

async function getDefaultPermissions() {
  return db.getAll('SELECT * FROM role_defaults ORDER BY role_name');
}

module.exports = {
  getAllRoles,
  getRoleByName,
  updateRolePermissions,
  revertRole,
  revertAllRoles,
  getRoleDefaults,
  getDefaultPermissions,
};
