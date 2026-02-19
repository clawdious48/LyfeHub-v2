module.exports = {
  name: '031_calendar_events',
  async up(db) {
    // 1. calendar_events table
    await db.run(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        calendar_id TEXT NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        location TEXT DEFAULT '',
        start_date DATE NOT NULL,
        start_time TIME,
        end_date DATE NOT NULL,
        end_time TIME,
        is_all_day BOOLEAN DEFAULT false,
        timezone TEXT DEFAULT 'America/Denver',
        rrule TEXT,
        recurrence_id TEXT,
        is_exception BOOLEAN DEFAULT false,
        color TEXT,
        external_id TEXT,
        external_source TEXT,
        external_etag TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.run(`CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_calendar_events_calendar_id ON calendar_events(calendar_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_calendar_events_date_range ON calendar_events(start_date, end_date)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_calendar_events_external ON calendar_events(external_id, external_source)`);

    // 2. event_reminders table
    await db.run(`
      CREATE TABLE IF NOT EXISTS event_reminders (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id TEXT REFERENCES calendar_events(id) ON DELETE CASCADE,
        task_item_id TEXT REFERENCES task_items(id) ON DELETE CASCADE,
        minutes_before INTEGER NOT NULL DEFAULT 15,
        reminder_type TEXT DEFAULT 'notification',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 3. Add calendar_id to task_items
    await db.run(`ALTER TABLE task_items ADD COLUMN IF NOT EXISTS calendar_id TEXT REFERENCES calendars(id) ON DELETE SET NULL`);
  }
};
