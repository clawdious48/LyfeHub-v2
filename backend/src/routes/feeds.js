const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { requireScope } = require('../middleware/scopeAuth');
const feedsDb = require('../db/feeds');

router.use(authMiddleware);

/**
 * Extract domain from a URL string
 */
function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Discover RSS/Atom feed URL from an HTML page.
 * Looks for <link rel="alternate" type="application/rss+xml" href="...">
 * or type="application/atom+xml".
 */
function discoverFeedUrl(html, baseUrl) {
  // Match link tags with rel="alternate" and RSS/Atom type
  const linkRegex = /<link[^>]+rel=["']alternate["'][^>]*>/gi;
  const matches = html.match(linkRegex) || [];

  for (const tag of matches) {
    const typeMatch = tag.match(/type=["'](application\/(?:rss|atom)\+xml)["']/i);
    if (!typeMatch) continue;

    const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) continue;

    let feedUrl = hrefMatch[1];

    // Resolve relative URLs
    if (feedUrl.startsWith('/')) {
      try {
        const base = new URL(baseUrl);
        feedUrl = `${base.protocol}//${base.host}${feedUrl}`;
      } catch {
        // keep as-is
      }
    } else if (!feedUrl.startsWith('http')) {
      try {
        feedUrl = new URL(feedUrl, baseUrl).href;
      } catch {
        // keep as-is
      }
    }

    return feedUrl;
  }

  return null;
}

/**
 * Check if content looks like XML/RSS/Atom feed
 */
function isFeedContent(content) {
  const trimmed = content.trim().slice(0, 500);
  return trimmed.includes('<rss') || trimmed.includes('<feed') || trimmed.includes('<channel');
}

/**
 * Parse RSS <item> or Atom <entry> elements from XML string.
 * Returns array of { title, url, published_at }.
 */
function parseFeedItems(xml) {
  const items = [];

  // Try RSS <item> elements
  const rssItemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = rssItemRegex.exec(xml)) !== null) {
    const block = match[1];
    items.push(parseRssItem(block));
  }

  // If no RSS items, try Atom <entry> elements
  if (items.length === 0) {
    const atomEntryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
    while ((match = atomEntryRegex.exec(xml)) !== null) {
      const block = match[1];
      items.push(parseAtomEntry(block));
    }
  }

  return items;
}

/**
 * Extract title from XML content, handling CDATA
 */
function extractTitle(xml) {
  const titleMatch = xml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!titleMatch) return '';
  let title = titleMatch[1].trim();
  // Strip CDATA wrapper
  const cdataMatch = title.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  if (cdataMatch) title = cdataMatch[1].trim();
  return decodeXmlEntities(title);
}

/**
 * Decode common XML entities
 */
function decodeXmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/**
 * Parse a single RSS <item> block
 */
function parseRssItem(block) {
  const title = extractTitle(block);

  let url = '';
  const linkMatch = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
  if (linkMatch) {
    url = linkMatch[1].trim();
    const cdataMatch = url.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
    if (cdataMatch) url = cdataMatch[1].trim();
  }

  let published_at = null;
  const pubDateMatch = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
  if (pubDateMatch) {
    const parsed = new Date(pubDateMatch[1].trim());
    if (!isNaN(parsed.getTime())) published_at = parsed.toISOString();
  }

  return { title, url, published_at };
}

/**
 * Parse a single Atom <entry> block
 */
function parseAtomEntry(block) {
  const title = extractTitle(block);

  let url = '';
  // Atom uses <link href="..." /> (self-closing) or <link href="...">
  const linkMatch = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i);
  if (linkMatch) url = linkMatch[1];

  let published_at = null;
  // Try <published>, then <updated>
  const pubMatch = block.match(/<published[^>]*>([\s\S]*?)<\/published>/i)
    || block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i);
  if (pubMatch) {
    const parsed = new Date(pubMatch[1].trim());
    if (!isNaN(parsed.getTime())) published_at = parsed.toISOString();
  }

  return { title, url, published_at };
}

/**
 * Extract the top-level feed title from XML
 */
function extractFeedTitle(xml) {
  // For RSS: <channel><title>...</title>
  const channelMatch = xml.match(/<channel[^>]*>([\s\S]*?)<\/channel>/i);
  if (channelMatch) {
    return extractTitle(channelMatch[1]);
  }
  // For Atom: top-level <title> before first <entry>
  const firstEntry = xml.indexOf('<entry');
  const headerSection = firstEntry > -1 ? xml.slice(0, firstEntry) : xml;
  return extractTitle(headerSection);
}

// ─── Endpoints ───────────────────────────────────────────────────────

/**
 * POST /api/feeds
 * Add a new RSS feed. Accepts { url }, auto-discovers feed URL from HTML pages.
 */
router.post('/', requireScope('tasks', 'write'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { url } = req.body;

    if (!url) return res.status(400).json({ error: 'url is required' });

    // Fetch the URL
    let response;
    try {
      response = await fetch(url, {
        headers: { 'User-Agent': 'LyfeHub/1.0 RSS Reader' },
        redirect: 'follow',
        signal: AbortSignal.timeout(10000)
      });
    } catch (fetchErr) {
      return res.status(400).json({ error: 'Failed to fetch URL: ' + fetchErr.message });
    }

    if (!response.ok) {
      return res.status(400).json({ error: `URL returned HTTP ${response.status}` });
    }

    const content = await response.text();
    let feedUrl = url;
    let feedXml = content;

    // If the content is HTML, try to discover the feed URL
    if (!isFeedContent(content)) {
      const discovered = discoverFeedUrl(content, url);
      if (!discovered) {
        return res.status(400).json({ error: 'No RSS/Atom feed found at this URL' });
      }
      feedUrl = discovered;

      // Fetch the actual feed
      try {
        const feedResponse = await fetch(feedUrl, {
          headers: { 'User-Agent': 'LyfeHub/1.0 RSS Reader' },
          redirect: 'follow',
          signal: AbortSignal.timeout(10000)
        });
        if (!feedResponse.ok) {
          return res.status(400).json({ error: `Feed URL returned HTTP ${feedResponse.status}` });
        }
        feedXml = await feedResponse.text();
      } catch (fetchErr) {
        return res.status(400).json({ error: 'Failed to fetch discovered feed: ' + fetchErr.message });
      }
    }

    // Parse the feed
    const feedTitle = extractFeedTitle(feedXml) || extractDomain(url);
    const items = parseFeedItems(feedXml);

    // Build favicon URL
    const domain = extractDomain(url);
    const iconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : '';

    // Save feed to DB
    const feed = await feedsDb.createFeed(userId, {
      url,
      feed_url: feedUrl,
      title: feedTitle,
      icon_url: iconUrl
    });

    // Save initial items
    if (items.length > 0) {
      await feedsDb.upsertFeedItems(feed.id, items);
    }

    res.json(feed);
  } catch (err) {
    console.error('Feed create error:', err);
    res.status(500).json({ error: 'Failed to add feed' });
  }
});

/**
 * GET /api/feeds
 * Returns all RSS feeds for the current user.
 */
router.get('/', requireScope('tasks', 'read'), async (req, res) => {
  try {
    const feeds = await feedsDb.getUserFeeds(req.user.id);
    res.json(feeds);
  } catch (err) {
    console.error('Feed list error:', err);
    res.status(500).json({ error: 'Failed to fetch feeds' });
  }
});

/**
 * DELETE /api/feeds/:id
 * Delete a feed and all its items (cascade).
 */
router.delete('/:id', requireScope('tasks', 'write'), async (req, res) => {
  try {
    const deleted = await feedsDb.deleteFeed(req.params.id, req.user.id);
    if (!deleted) return res.status(404).json({ error: 'Feed not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Feed delete error:', err);
    res.status(500).json({ error: 'Failed to delete feed' });
  }
});

/**
 * GET /api/feeds/items
 * Returns feed items for given feed IDs, sorted by published_at DESC.
 * Query params: feed_ids (comma-separated UUIDs), limit (default 20).
 */
router.get('/items', requireScope('tasks', 'read'), async (req, res) => {
  try {
    const { feed_ids, limit } = req.query;

    if (!feed_ids) return res.status(400).json({ error: 'feed_ids parameter is required' });

    const feedIds = feed_ids.split(',').map(id => id.trim()).filter(Boolean);
    if (feedIds.length === 0) return res.json([]);

    const items = await feedsDb.getFeedItems(feedIds, parseInt(limit) || 20);
    res.json(items);
  } catch (err) {
    console.error('Feed items error:', err);
    res.status(500).json({ error: 'Failed to fetch feed items' });
  }
});

module.exports = router;
