const db = require('./pool');
const { v4: uuidv4 } = require('uuid');

/**
 * Initialize rss_feeds and rss_feed_items tables.
 * Called at app startup alongside other schema init functions.
 */
async function initFeeds() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS rss_feeds (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id),
      url TEXT NOT NULL,
      feed_url TEXT NOT NULL,
      title TEXT DEFAULT '',
      icon_url TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS rss_feed_items (
      id UUID PRIMARY KEY,
      feed_id UUID NOT NULL REFERENCES rss_feeds(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      url TEXT DEFAULT '',
      published_at TIMESTAMP,
      fetched_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_rss_feeds_user ON rss_feeds(user_id);
    CREATE INDEX IF NOT EXISTS idx_rss_feed_items_feed ON rss_feed_items(feed_id);
  `);
}

/**
 * Get all RSS feeds for a user
 */
async function getUserFeeds(userId) {
  return await db.getAll(`
    SELECT * FROM rss_feeds
    WHERE user_id = $1
    ORDER BY created_at DESC
  `, [userId]);
}

/**
 * Create a new RSS feed
 */
async function createFeed(userId, data) {
  const id = uuidv4();

  await db.run(`
    INSERT INTO rss_feeds (id, user_id, url, feed_url, title, icon_url)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [
    id,
    userId,
    data.url,
    data.feed_url,
    data.title || '',
    data.icon_url || ''
  ]);

  return await db.getOne('SELECT * FROM rss_feeds WHERE id = $1', [id]);
}

/**
 * Delete an RSS feed (items cascade via ON DELETE CASCADE)
 */
async function deleteFeed(id, userId) {
  const result = await db.run(
    'DELETE FROM rss_feeds WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return result.rowCount > 0;
}

/**
 * Upsert feed items — inserts new items, skips duplicates by URL
 */
async function upsertFeedItems(feedId, items) {
  for (const item of items) {
    const existing = await db.getOne(
      'SELECT id FROM rss_feed_items WHERE feed_id = $1 AND url = $2',
      [feedId, item.url || '']
    );
    if (existing) continue;

    await db.run(`
      INSERT INTO rss_feed_items (id, feed_id, title, url, published_at)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      uuidv4(),
      feedId,
      item.title || 'Untitled',
      item.url || '',
      item.published_at || null
    ]);
  }
}

/**
 * Get feed items for a set of feed IDs, sorted by published_at DESC
 */
async function getFeedItems(feedIds, limit = 20) {
  if (!feedIds || feedIds.length === 0) return [];

  const placeholders = feedIds.map((_, i) => `$${i + 1}`).join(', ');
  return await db.getAll(`
    SELECT fi.*, rf.title AS feed_title, rf.icon_url AS feed_icon_url
    FROM rss_feed_items fi
    LEFT JOIN rss_feeds rf ON rf.id = fi.feed_id
    WHERE fi.feed_id IN (${placeholders})
    ORDER BY fi.published_at DESC NULLS LAST
    LIMIT $${feedIds.length + 1}
  `, [...feedIds, limit]);
}

module.exports = {
  initFeeds,
  getUserFeeds,
  createFeed,
  deleteFeed,
  upsertFeedItems,
  getFeedItems
};
