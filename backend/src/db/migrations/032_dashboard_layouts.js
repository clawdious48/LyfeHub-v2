module.exports = {
  name: '032_dashboard_layouts',
  async up(db) {
    await db.run(`
      CREATE TABLE IF NOT EXISTS dashboard_layouts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        layout_json JSONB NOT NULL DEFAULT '{"widgets":[]}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT dashboard_layouts_user_unique UNIQUE(user_id)
      )
    `);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_user_id ON dashboard_layouts(user_id)`);
  }
};
