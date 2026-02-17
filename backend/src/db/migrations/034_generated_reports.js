module.exports = {
  name: '034_generated_reports',
  async up(db) {
    await db.run(`CREATE TABLE IF NOT EXISTS drying_reports (
      id TEXT PRIMARY KEY,
      drying_log_id TEXT NOT NULL REFERENCES drying_logs(id) ON DELETE CASCADE,
      job_id TEXT NOT NULL,
      org_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      generated_by TEXT,
      generated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    
    await db.run(`CREATE INDEX IF NOT EXISTS idx_drying_reports_log ON drying_reports(drying_log_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_drying_reports_job ON drying_reports(job_id)`);
  }
};