module.exports = {
  name: '031_smart_list',
  async up(db) {
    // Add smart_list column to task_items
    await db.run(`ALTER TABLE task_items ADD COLUMN IF NOT EXISTS smart_list TEXT DEFAULT 'inbox'`);
    
    // Create index
    await db.run(`CREATE INDEX IF NOT EXISTS idx_task_items_smart_list ON task_items(smart_list)`);
    
    // Backfill existing tasks based on their current state
    // Tasks with a due_date → 'calendar'
    await db.run(`UPDATE task_items SET smart_list = 'calendar' WHERE due_date IS NOT NULL AND due_date != '' AND smart_list = 'inbox'`);
    
    // Tasks with a snooze_date but no due_date → 'snoozed'
    await db.run(`UPDATE task_items SET smart_list = 'snoozed' WHERE snooze_date IS NOT NULL AND snooze_date != '' AND (due_date IS NULL OR due_date = '') AND smart_list = 'inbox'`);
  }
};
