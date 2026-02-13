const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure /data directory exists for Docker volume mount
const dbDir = '/data';
const dbPath = path.join(dbDir, 'kanban.db');

// Create directory if it doesn't exist (for local dev)
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// ============================================
// USERS TABLE
// ============================================
const usersTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
if (!usersTable) {
  console.log('Creating users table...');
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      settings TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE UNIQUE INDEX idx_users_email ON users(email)`);
  console.log('Users table created');
}

// ============================================
// TASKS TABLE
// ============================================
const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='tasks'").get();

if (tableInfo && tableInfo.sql.includes("'backlog'")) {
  // Old schema with 'backlog' - need to migrate to 'planned'
  console.log('Migrating tasks table: backlog → planned');
  
  // Check which columns exist in the old table
  const columns = db.prepare("PRAGMA table_info(tasks)").all();
  const columnNames = columns.map(c => c.name);
  const hasActivityLog = columnNames.includes('activity_log');
  const hasReviewState = columnNames.includes('review_state');
  
  // Create new table with updated schema
  db.exec(`
    CREATE TABLE tasks_new (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      acceptance_criteria TEXT DEFAULT '[]',
      status TEXT DEFAULT 'planned' CHECK(status IN ('planned', 'ready', 'in_progress', 'blocked', 'review', 'done')),
      priority INTEGER DEFAULT 3 CHECK(priority >= 1 AND priority <= 5),
      context_links TEXT DEFAULT '[]',
      notes TEXT DEFAULT '',
      activity_log TEXT DEFAULT '[]',
      session_id TEXT,
      user_id TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      review_state TEXT DEFAULT '{}'
    );
  `);
  
  // Build dynamic INSERT based on available columns
  const activityLogSelect = hasActivityLog ? 'activity_log' : "'[]'";
  const reviewStateSelect = hasReviewState ? "COALESCE(review_state, '{}')" : "'{}'";
  
  db.exec(`
    INSERT INTO tasks_new SELECT 
      id, title, description, acceptance_criteria,
      CASE WHEN status = 'backlog' THEN 'planned' ELSE status END,
      priority, context_links, notes, ${activityLogSelect}, session_id,
      NULL,
      created_at, updated_at, completed_at,
      ${reviewStateSelect}
    FROM tasks;
    
    DROP TABLE tasks;
    ALTER TABLE tasks_new RENAME TO tasks;
  `);
  
  console.log('Migration complete: backlog → planned');
} else if (!tableInfo) {
  // Fresh install - create with new schema
  db.exec(`
    CREATE TABLE tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      acceptance_criteria TEXT DEFAULT '[]',
      status TEXT DEFAULT 'planned' CHECK(status IN ('planned', 'ready', 'in_progress', 'blocked', 'review', 'done')),
      priority INTEGER DEFAULT 3 CHECK(priority >= 1 AND priority <= 5),
      context_links TEXT DEFAULT '[]',
      notes TEXT DEFAULT '',
      activity_log TEXT DEFAULT '[]',
      session_id TEXT,
      user_id TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      review_state TEXT DEFAULT '{}'
    )
  `);
}

// Add activity_log column if it doesn't exist (migration for existing DBs)
try {
  db.exec(`ALTER TABLE tasks ADD COLUMN activity_log TEXT DEFAULT '[]'`);
  console.log('Added activity_log column');
} catch (e) {
  // Column already exists, ignore
}

// Add review_state column for tracking review progress
try {
  db.exec(`ALTER TABLE tasks ADD COLUMN review_state TEXT DEFAULT '{}'`);
  console.log('Added review_state column');
} catch (e) {
  // Column already exists, ignore
}

// Add user_id column if it doesn't exist (migration for existing DBs)
try {
  db.exec(`ALTER TABLE tasks ADD COLUMN user_id TEXT REFERENCES users(id)`);
  console.log('Added user_id column to tasks');
} catch (e) {
  // Column already exists, ignore
}

// Create indexes
db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id)`);

// ============================================
// TASK ITEMS TABLE (Personal tasks / My Day)
// ============================================
const taskItemsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='task_items'").get();
if (!taskItemsTable) {
  console.log('Creating task_items table...');
  db.exec(`
    CREATE TABLE task_items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      due_date TEXT,
      due_time TEXT,
      recurring TEXT,
      recurring_days TEXT DEFAULT '[]',
      important INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      completed_at TEXT,
      subtasks TEXT DEFAULT '[]',
      user_id TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_task_items_user_id ON task_items(user_id)`);
  db.exec(`CREATE INDEX idx_task_items_due_date ON task_items(due_date)`);
  db.exec(`CREATE INDEX idx_task_items_important ON task_items(important)`);
  db.exec(`CREATE INDEX idx_task_items_completed ON task_items(completed)`);
  console.log('Task items table created');
}

// ============================================
// CALENDAR SCHEDULING COLUMNS (for tasks)
// ============================================
// Add scheduling columns to tasks table for calendar integration
try {
  db.exec(`ALTER TABLE tasks ADD COLUMN scheduled_date TEXT`);
  console.log('Added scheduled_date column to tasks');
} catch (e) {
  // Column already exists, ignore
}

try {
  db.exec(`ALTER TABLE tasks ADD COLUMN scheduled_start TEXT`);
  console.log('Added scheduled_start column to tasks');
} catch (e) {
  // Column already exists, ignore
}

try {
  db.exec(`ALTER TABLE tasks ADD COLUMN scheduled_end TEXT`);
  console.log('Added scheduled_end column to tasks');
} catch (e) {
  // Column already exists, ignore
}

try {
  db.exec(`ALTER TABLE tasks ADD COLUMN is_all_day INTEGER DEFAULT 0`);
  console.log('Added is_all_day column to tasks');
} catch (e) {
  // Column already exists, ignore
}

// Index for calendar queries
db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON tasks(scheduled_date)`);

// Add due_time_end column to task_items for calendar duration
try {
  db.exec(`ALTER TABLE task_items ADD COLUMN due_time_end TEXT`);
  console.log('Added due_time_end column to task_items');
} catch (e) {
  // Column already exists, ignore
}

// ============================================
// CALENDARS TABLE
// ============================================
const calendarsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='calendars'").get();
if (!calendarsTable) {
  console.log('Creating calendars table...');
  db.exec(`
    CREATE TABLE calendars (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      color TEXT DEFAULT '#00aaff',
      user_id TEXT REFERENCES users(id),
      is_default INTEGER DEFAULT 0,
      system_type TEXT DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_calendars_user_id ON calendars(user_id)`);
  console.log('Calendars table created');
}

// Add system_type column if it doesn't exist
const calendarCols = db.prepare("PRAGMA table_info(calendars)").all();
const hasSystemType = calendarCols.some(c => c.name === 'system_type');
if (!hasSystemType) {
  console.log('Adding system_type column to calendars');
  db.exec(`ALTER TABLE calendars ADD COLUMN system_type TEXT DEFAULT NULL`);
}

// ============================================
// TASK_ITEM_CALENDARS JUNCTION TABLE (many-to-many)
// ============================================
const taskItemCalendarsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='task_item_calendars'").get();
if (!taskItemCalendarsTable) {
  console.log('Creating task_item_calendars junction table...');
  db.exec(`
    CREATE TABLE task_item_calendars (
      task_item_id TEXT REFERENCES task_items(id) ON DELETE CASCADE,
      calendar_id TEXT REFERENCES calendars(id) ON DELETE CASCADE,
      PRIMARY KEY (task_item_id, calendar_id)
    )
  `);
  db.exec(`CREATE INDEX idx_task_item_calendars_task ON task_item_calendars(task_item_id)`);
  db.exec(`CREATE INDEX idx_task_item_calendars_calendar ON task_item_calendars(calendar_id)`);
  console.log('Task item calendars junction table created');
}

// ============================================
// PEOPLE TABLE (Core Base)
// ============================================
const peopleTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='people'").get();
if (!peopleTable) {
  console.log('Creating people table...');
  db.exec(`
    CREATE TABLE people (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),

      -- Core Identity
      name TEXT NOT NULL,
      nickname TEXT DEFAULT '',
      photo_url TEXT DEFAULT '',
      birthday TEXT,
      gender TEXT DEFAULT '',

      -- Contact Methods
      email TEXT DEFAULT '',
      email_secondary TEXT DEFAULT '',
      phone_mobile TEXT DEFAULT '',
      phone_work TEXT DEFAULT '',
      phone_home TEXT DEFAULT '',

      -- Location
      address TEXT DEFAULT '',
      city TEXT DEFAULT '',
      state TEXT DEFAULT '',
      country TEXT DEFAULT '',
      zip TEXT DEFAULT '',
      timezone TEXT DEFAULT '',

      -- Professional
      company TEXT DEFAULT '',
      job_title TEXT DEFAULT '',
      industry TEXT DEFAULT '',

      -- Social & Online
      website TEXT DEFAULT '',
      linkedin TEXT DEFAULT '',
      twitter TEXT DEFAULT '',
      instagram TEXT DEFAULT '',

      -- Relationship & Context
      relationship TEXT DEFAULT '',
      how_we_met TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      introduced_by TEXT DEFAULT '',

      -- Notes & Tracking
      notes TEXT DEFAULT '',
      last_contacted TEXT,
      follow_up TEXT,
      important INTEGER DEFAULT 0,

      -- Personality & Communication
      mbti_type TEXT DEFAULT '',
      enneagram TEXT DEFAULT '',
      love_language TEXT DEFAULT '',
      communication_style TEXT DEFAULT '',
      preferred_contact_method TEXT DEFAULT '',
      best_time_to_reach TEXT DEFAULT '',

      -- Relationship Dynamics
      relationship_strength TEXT DEFAULT '',
      energy_impact TEXT DEFAULT '',
      trust_level TEXT DEFAULT '',
      reciprocity TEXT DEFAULT '',
      contact_frequency TEXT DEFAULT '',
      desired_frequency TEXT DEFAULT '',

      -- Personal Reflection
      what_i_admire TEXT DEFAULT '',
      what_i_can_learn TEXT DEFAULT '',
      how_they_make_me_feel TEXT DEFAULT '',
      shared_interests TEXT DEFAULT '[]',
      conversation_topics TEXT DEFAULT '[]',
      sensitive_topics TEXT DEFAULT '[]',

      -- History & Milestones
      date_met TEXT,
      how_relationship_evolved TEXT DEFAULT '',
      past_conflicts TEXT DEFAULT '',

      -- Gifts & Thoughtfulness
      gift_ideas TEXT DEFAULT '[]',
      favorite_things TEXT DEFAULT '',
      allergies_dislikes TEXT DEFAULT '',

      -- Relationship Goals
      relationship_goals TEXT DEFAULT '',
      how_i_can_support TEXT DEFAULT '',
      how_they_support_me TEXT DEFAULT '',

      -- Timestamps
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_people_user_id ON people(user_id)`);
  db.exec(`CREATE INDEX idx_people_name ON people(name)`);
  db.exec(`CREATE INDEX idx_people_relationship ON people(relationship)`);
  db.exec(`CREATE INDEX idx_people_important ON people(important)`);
  console.log('People table created');
}

// ============================================
// PEOPLE GROUPS TABLE (Organize people into collapsible groups)
// ============================================
const peopleGroupsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='people_groups'").get();
if (!peopleGroupsTable) {
  console.log('Creating people_groups table...');
  db.exec(`
    CREATE TABLE people_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '👥',
      user_id TEXT REFERENCES users(id),
      position INTEGER DEFAULT 0,
      collapsed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_people_groups_user_id ON people_groups(user_id)`);
  console.log('People groups table created');
}

// Add group_id column to people if it doesn't exist
try {
  db.exec(`ALTER TABLE people ADD COLUMN group_id TEXT REFERENCES people_groups(id)`);
  console.log('Added group_id column to people');
} catch (e) {
  // Column already exists, ignore
}

// Add position column to people if it doesn't exist (for ordering within groups)
try {
  db.exec(`ALTER TABLE people ADD COLUMN position INTEGER DEFAULT 0`);
  console.log('Added position column to people');
} catch (e) {
  // Column already exists, ignore
}

// Add zip column to people if it doesn't exist
try {
  db.exec(`ALTER TABLE people ADD COLUMN zip TEXT DEFAULT ''`);
  console.log('Added zip column to people');
} catch (e) {
  // Column already exists, ignore
}

// ============================================
// ADD ROLE COLUMN TO USERS (RBAC migration)
// ============================================
try {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'field_tech'");
  console.log('Added role column to users');
} catch (e) {
  // Column already exists, ignore
}

// Migrate first user to management role
try {
  const firstUser = db.prepare("SELECT id FROM users ORDER BY created_at ASC LIMIT 1").get();
  if (firstUser) {
    // Match NULL or field_tech — original migration missed NULL roles
    db.prepare("UPDATE users SET role = 'management' WHERE id = ? AND (role IS NULL OR role = 'field_tech')").run(firstUser.id);
  }
} catch (e) {}

// Ensure no users have NULL role (fills any remaining gaps)
try {
  db.prepare("UPDATE users SET role = 'field_tech' WHERE role IS NULL").run();
} catch (e) {}

console.log('Database initialized at', dbPath);


// ============================================
// API KEYS TABLE (User-specific API keys)
// ============================================
const apiKeysTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='api_keys'").get();
if (!apiKeysTable) {
  console.log('Creating api_keys table...');
  db.exec(`
    CREATE TABLE api_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      expires_at TEXT,
      last_used_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_api_keys_user_id ON api_keys(user_id)`);
  db.exec(`CREATE UNIQUE INDEX idx_api_keys_key_hash ON api_keys(key_hash)`);
  console.log('API keys table created');
}

module.exports = db;

// ============================================
// ORGANIZATIONS TABLE
// ============================================
const orgsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='organizations'").get();
if (!orgsTable) {
  console.log('Creating organizations table...');
  db.exec(`
    CREATE TABLE organizations (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      name TEXT NOT NULL,
      type TEXT DEFAULT '',
      industry TEXT DEFAULT '',
      description TEXT DEFAULT '',
      website TEXT DEFAULT '',
      linkedin TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      address TEXT DEFAULT '',
      city TEXT DEFAULT '',
      state TEXT DEFAULT '',
      country TEXT DEFAULT '',
      zip TEXT DEFAULT '',
      parent_org_id TEXT REFERENCES organizations(id),
      founded_year INTEGER,
      employee_count INTEGER,
      notes TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      important INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_organizations_user_id ON organizations(user_id)`);
  db.exec(`CREATE INDEX idx_organizations_name ON organizations(name)`);
  db.exec(`CREATE INDEX idx_organizations_type ON organizations(type)`);
  db.exec(`CREATE INDEX idx_organizations_industry ON organizations(industry)`);
  console.log('Organizations table created');
}

// Add organization_id column to people if it doesn't exist (for org relation)
try {
  db.exec(`ALTER TABLE people ADD COLUMN organization_id TEXT REFERENCES organizations(id)`);
  db.exec(`CREATE INDEX idx_people_organization_id ON people(organization_id)`);
  console.log('Added organization_id column to people');
} catch (e) {
  // Column already exists, ignore
}
module.exports = db;

// ============================================
// NOTES TABLE
// ============================================
const notesTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='notes'").get();
if (!notesTable) {
  console.log('Creating notes table...');
  db.exec(`
    CREATE TABLE notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      type TEXT DEFAULT '',
      archived INTEGER DEFAULT 0,
      favorite INTEGER DEFAULT 0,
      note_date TEXT,
      review_date TEXT,
      url TEXT DEFAULT '',
      content TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      attachments TEXT DEFAULT '[]',
      project_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_notes_user_id ON notes(user_id)`);
  db.exec(`CREATE INDEX idx_notes_type ON notes(type)`);
  db.exec(`CREATE INDEX idx_notes_archived ON notes(archived)`);
  db.exec(`CREATE INDEX idx_notes_favorite ON notes(favorite)`);
  db.exec(`CREATE INDEX idx_notes_note_date ON notes(note_date)`);
  console.log('Notes table created');
}

// Add attachments column to notes if it doesn't exist (migration for existing DBs)
try {
  db.exec(`ALTER TABLE notes ADD COLUMN attachments TEXT DEFAULT '[]'`);
  console.log('Added attachments column to notes');
} catch (e) {
  // Column already exists, ignore
}

// ============================================
// PROJECTS TABLE
// ============================================
const projectsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='projects'").get();
if (!projectsTable) {
  console.log('Creating projects table...');
  db.exec(`
    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      status TEXT DEFAULT 'planned' CHECK(status IN ('planned', 'on_hold', 'doing', 'ongoing', 'done')),
      target_deadline TEXT,
      completed_date TEXT,
      archived INTEGER DEFAULT 0,
      review_notes TEXT DEFAULT '',
      tag_id TEXT,
      goal_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_projects_user_id ON projects(user_id)`);
  db.exec(`CREATE INDEX idx_projects_status ON projects(status)`);
  db.exec(`CREATE INDEX idx_projects_archived ON projects(archived)`);
  console.log('Projects table created');
}

// ============================================
// TAGS TABLE
// ============================================
const tagsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tags'").get();
if (!tagsTable) {
  console.log('Creating tags table...');
  db.exec(`
    CREATE TABLE tags (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      type TEXT DEFAULT 'resource' CHECK(type IN ('area', 'resource', 'entity')),
      archived INTEGER DEFAULT 0,
      favorite INTEGER DEFAULT 0,
      parent_tag_id TEXT REFERENCES tags(id),
      url TEXT DEFAULT '',
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX idx_tags_user_id ON tags(user_id)`);
  db.exec(`CREATE INDEX idx_tags_type ON tags(type)`);
  db.exec(`CREATE INDEX idx_tags_archived ON tags(archived)`);
  db.exec(`CREATE INDEX idx_tags_favorite ON tags(favorite)`);
  db.exec(`CREATE INDEX idx_tags_parent_tag_id ON tags(parent_tag_id)`);
  console.log('Tags table created');
}

// ============================================
// TASK ITEMS - NEW COLUMNS (Phase A Migration)
// ============================================

// Add my_day column
try {
  db.exec(`ALTER TABLE task_items ADD COLUMN my_day INTEGER DEFAULT 0`);
  console.log('Added my_day column');
} catch (e) { /* Column exists */ }

// Add status column (todo/doing/done)
try {
  db.exec(`ALTER TABLE task_items ADD COLUMN status TEXT DEFAULT 'todo'`);
  console.log('Added status column');
} catch (e) { /* Column exists */ }

// Add priority column
try {
  db.exec(`ALTER TABLE task_items ADD COLUMN priority TEXT`);
  console.log('Added priority column');
} catch (e) { /* Column exists */ }

// Add snooze_date column
try {
  db.exec(`ALTER TABLE task_items ADD COLUMN snooze_date TEXT`);
  console.log('Added snooze_date column');
} catch (e) { /* Column exists */ }

// Add project_id column
try {
  db.exec(`ALTER TABLE task_items ADD COLUMN project_id TEXT`);
  console.log('Added project_id column');
} catch (e) { /* Column exists */ }

// Add energy column
try {
  db.exec(`ALTER TABLE task_items ADD COLUMN energy TEXT`);
  console.log('Added energy column');
} catch (e) { /* Column exists */ }

// Add location column
try {
  db.exec(`ALTER TABLE task_items ADD COLUMN location TEXT`);
  console.log('Added location column');
} catch (e) { /* Column exists */ }

// Add list_id column
try {
  db.exec(`ALTER TABLE task_items ADD COLUMN list_id TEXT`);
  console.log('Added list_id column');
} catch (e) { /* Column exists */ }

// Add people_ids column
try {
  db.exec(`ALTER TABLE task_items ADD COLUMN people_ids TEXT DEFAULT '[]'`);
  console.log('Added people_ids column');
} catch (e) { /* Column exists */ }

// Add note_ids column
try {
  db.exec(`ALTER TABLE task_items ADD COLUMN note_ids TEXT DEFAULT '[]'`);
  console.log('Added note_ids column');
} catch (e) { /* Column exists */ }

// Create indexes for new columns
db.exec(`CREATE INDEX IF NOT EXISTS idx_task_items_my_day ON task_items(my_day)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_task_items_status ON task_items(status)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_task_items_priority ON task_items(priority)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_task_items_snooze_date ON task_items(snooze_date)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_task_items_project_id ON task_items(project_id)`);

// ============================================
// CRM ENRICHMENT COLUMNS (OpenClaw-style)
// ============================================

// Add score column to people
try {
  db.exec(`ALTER TABLE people ADD COLUMN score INTEGER DEFAULT 0`);
  console.log('Added score column to people');
} catch (e) { /* Column exists */ }

// Add exchange_count column to people
try {
  db.exec(`ALTER TABLE people ADD COLUMN exchange_count INTEGER DEFAULT 0`);
  console.log('Added exchange_count column to people');
} catch (e) { /* Column exists */ }

// Add meeting_count column to people
try {
  db.exec(`ALTER TABLE people ADD COLUMN meeting_count INTEGER DEFAULT 0`);
  console.log('Added meeting_count column to people');
} catch (e) { /* Column exists */ }

// Add last_email_date column to people
try {
  db.exec(`ALTER TABLE people ADD COLUMN last_email_date TEXT`);
  console.log('Added last_email_date column to people');
} catch (e) { /* Column exists */ }

// Add last_meeting_date column to people
try {
  db.exec(`ALTER TABLE people ADD COLUMN last_meeting_date TEXT`);
  console.log('Added last_meeting_date column to people');
} catch (e) { /* Column exists */ }

// Add source column to people (how they were added)
try {
  db.exec(`ALTER TABLE people ADD COLUMN source TEXT DEFAULT 'manual'`);
  console.log('Added source column to people');
} catch (e) { /* Column exists */ }

// Add ai_notes column to people
try {
  db.exec(`ALTER TABLE people ADD COLUMN ai_notes TEXT DEFAULT ''`);
  console.log('Added ai_notes column to people');
} catch (e) { /* Column exists */ }

// Create indexes for CRM enrichment queries
db.exec(`CREATE INDEX IF NOT EXISTS idx_people_score ON people(score)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_people_source ON people(source)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_people_email ON people(email)`);

// ============================================
// API KEYS - Add encrypted key storage (for management role copy)
// ============================================
try {
  db.exec(`ALTER TABLE api_keys ADD COLUMN key_encrypted TEXT`);
  console.log("Added key_encrypted column to api_keys");
} catch (e) { /* Column exists */ }
