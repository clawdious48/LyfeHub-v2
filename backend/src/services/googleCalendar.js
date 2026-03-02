const { google } = require('googleapis');
const db = require('../db/pool');
const { v4: uuidv4 } = require('uuid');

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.email',
];

/**
 * Create a new OAuth2 client from env vars
 */
function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALENDAR_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI
  );
}

/**
 * Generate Google OAuth consent URL
 */
async function getAuthUrl(userId) {
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI;
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !redirectUri) {
    throw new Error('Google Calendar OAuth not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALENDAR_REDIRECT_URI environment variables.');
  }
  const oauth2Client = createOAuth2Client();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: userId,
  });
  return url;
}

/**
 * Exchange auth code for tokens, store connection in DB, sync calendar list
 */
async function handleCallback(code, userId) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  oauth2Client.setCredentials(tokens);

  // Get the user's Google email
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data: userInfo } = await oauth2.userinfo.get();
  const googleEmail = userInfo.email;

  // Upsert connection (one connection per user)
  const existing = await db.getOne(
    `SELECT id FROM google_calendar_connections WHERE user_id = $1`,
    [userId]
  );

  if (existing) {
    await db.run(
      `UPDATE google_calendar_connections SET
        google_email = $1, access_token = $2, refresh_token = $3,
        token_expires_at = $4, sync_enabled = true, updated_at = NOW()
      WHERE user_id = $5`,
      [
        googleEmail,
        tokens.access_token,
        tokens.refresh_token,
        tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        userId,
      ]
    );
  } else {
    await db.run(
      `INSERT INTO google_calendar_connections
        (id, user_id, google_email, access_token, refresh_token, token_expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        uuidv4(),
        userId,
        googleEmail,
        tokens.access_token,
        tokens.refresh_token,
        tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      ]
    );
  }

  // Sync the user's calendar list
  await syncCalendars(userId);

  // Also sync events so they're available immediately
  try {
    await syncEvents(userId);
  } catch (err) {
    console.error('Initial event sync failed (non-fatal):', err.message);
  }
}

/**
 * Get an authenticated Google Calendar API client for a user.
 * Auto-refreshes the access token if expired.
 */
async function getClient(userId) {
  const conn = await db.getOne(
    `SELECT * FROM google_calendar_connections WHERE user_id = $1 AND sync_enabled = true`,
    [userId]
  );
  if (!conn) return null;

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: conn.access_token,
    refresh_token: conn.refresh_token,
    expiry_date: conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : undefined,
  });

  // Check if token is expired or about to expire (within 5 minutes)
  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
  const now = Date.now();
  if (expiresAt - now < 5 * 60 * 1000) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      await db.run(
        `UPDATE google_calendar_connections SET
          access_token = $1, token_expires_at = $2, updated_at = NOW()
        WHERE user_id = $3`,
        [
          credentials.access_token,
          credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null,
          userId,
        ]
      );
      oauth2Client.setCredentials(credentials);
    } catch (err) {
      console.error('Failed to refresh Google token for user', userId, err.message);
      return null;
    }
  }

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

/**
 * Get connection status for a user
 */
async function getConnectionStatus(userId) {
  const conn = await db.getOne(
    `SELECT google_email, sync_enabled, last_synced_at FROM google_calendar_connections WHERE user_id = $1`,
    [userId]
  );
  if (!conn) {
    return { connected: false };
  }
  return {
    connected: true,
    google_email: conn.google_email,
    last_synced_at: conn.last_synced_at,
    sync_enabled: conn.sync_enabled,
  };
}

/**
 * Sync Google Calendar list to local calendars + mappings.
 * Creates/updates local calendar rows and google_calendar_mappings rows.
 */
async function syncCalendars(userId) {
  const calendar = await getClient(userId);
  if (!calendar) throw new Error('No Google Calendar connection for user');

  const { data } = await calendar.calendarList.list();
  const items = data.items || [];

  for (const gcal of items) {
    // Check if mapping already exists
    const existing = await db.getOne(
      `SELECT id, local_calendar_id FROM google_calendar_mappings
       WHERE user_id = $1 AND google_calendar_id = $2`,
      [userId, gcal.id]
    );

    if (existing) {
      // Update the local calendar's name/color to match Google
      if (existing.local_calendar_id) {
        await db.run(
          `UPDATE calendars SET name = $1, color = $2, updated_at = NOW()
           WHERE id = $3 AND user_id = $4`,
          [gcal.summary || 'Untitled', gcal.backgroundColor || '#4285f4', existing.local_calendar_id, userId]
        );
      }
    } else {
      // Create a new local calendar
      const localId = uuidv4();
      const now = new Date().toISOString();
      await db.run(
        `INSERT INTO calendars (id, name, description, color, user_id, is_default, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 0, $6, $7)`,
        [
          localId,
          gcal.summary || 'Untitled',
          gcal.description || '',
          gcal.backgroundColor || '#4285f4',
          userId,
          now,
          now,
        ]
      );

      // Create the mapping
      await db.run(
        `INSERT INTO google_calendar_mappings (id, user_id, google_calendar_id, local_calendar_id)
         VALUES ($1, $2, $3, $4)`,
        [uuidv4(), userId, gcal.id, localId]
      );
    }
  }
}

/**
 * Incremental sync of events from Google Calendar.
 * Uses syncToken for efficient delta sync.
 */
async function syncEvents(userId) {
  const calendarClient = await getClient(userId);
  if (!calendarClient) throw new Error('No Google Calendar connection for user');

  const conn = await db.getOne(
    `SELECT id, sync_token FROM google_calendar_connections WHERE user_id = $1`,
    [userId]
  );

  const mappings = await db.getAll(
    `SELECT m.*, c.name AS calendar_name
     FROM google_calendar_mappings m
     LEFT JOIN calendars c ON c.id = m.local_calendar_id
     WHERE m.user_id = $1 AND m.is_visible = true AND m.sync_direction IN ('both', 'pull')`,
    [userId]
  );

  let totalSynced = 0;

  for (const mapping of mappings) {
    try {
      const params = {
        calendarId: mapping.google_calendar_id,
        maxResults: 2500,
        singleEvents: true,
      };

      // Use syncToken for incremental sync if available
      if (conn.sync_token) {
        params.syncToken = conn.sync_token;
      } else {
        // Initial sync: get events from 6 months ago to 1 year ahead
        const now = new Date();
        const timeMin = new Date(now);
        timeMin.setMonth(timeMin.getMonth() - 6);
        const timeMax = new Date(now);
        timeMax.setFullYear(timeMax.getFullYear() + 1);
        params.timeMin = timeMin.toISOString();
        params.timeMax = timeMax.toISOString();
      }

      let pageToken = null;
      let nextSyncToken = null;

      do {
        if (pageToken) params.pageToken = pageToken;

        let response;
        try {
          response = await calendarClient.events.list(params);
        } catch (err) {
          // If syncToken is invalid (410 Gone), do a full sync
          if (err.code === 410) {
            delete params.syncToken;
            const now = new Date();
            const timeMin = new Date(now);
            timeMin.setMonth(timeMin.getMonth() - 6);
            const timeMax = new Date(now);
            timeMax.setFullYear(timeMax.getFullYear() + 1);
            params.timeMin = timeMin.toISOString();
            params.timeMax = timeMax.toISOString();
            response = await calendarClient.events.list(params);
          } else {
            throw err;
          }
        }

        const events = response.data.items || [];
        nextSyncToken = response.data.nextSyncToken || null;
        pageToken = response.data.nextPageToken || null;

        for (const gEvent of events) {
          if (gEvent.status === 'cancelled') {
            // Delete locally if event was cancelled in Google
            await db.run(
              `DELETE FROM calendar_events WHERE external_id = $1 AND external_source = 'google' AND user_id = $2`,
              [gEvent.id, userId]
            );
            totalSynced++;
            continue;
          }

          // Parse start/end — Google events can be date-only (all-day) or dateTime
          const isAllDay = !!gEvent.start.date;
          const startDate = isAllDay ? gEvent.start.date : gEvent.start.dateTime.split('T')[0];
          const startTime = isAllDay ? null : gEvent.start.dateTime.split('T')[1].substring(0, 5);
          const endDate = isAllDay
            ? gEvent.end.date
            : gEvent.end.dateTime.split('T')[0];
          const endTime = isAllDay ? null : gEvent.end.dateTime.split('T')[1].substring(0, 5);

          // Upsert event
          const existingEvent = await db.getOne(
            `SELECT id FROM calendar_events WHERE external_id = $1 AND external_source = 'google' AND user_id = $2`,
            [gEvent.id, userId]
          );

          const now = new Date().toISOString();

          if (existingEvent) {
            await db.run(
              `UPDATE calendar_events SET
                title = $1, description = $2, location = $3,
                start_date = $4, start_time = $5, end_date = $6, end_time = $7,
                is_all_day = $8, external_etag = $9, updated_at = $10
              WHERE id = $11`,
              [
                gEvent.summary || '(No title)',
                gEvent.description || null,
                gEvent.location || null,
                startDate, startTime, endDate, endTime,
                isAllDay ? 1 : 0,
                gEvent.etag || null,
                now,
                existingEvent.id,
              ]
            );
          } else {
            await db.run(
              `INSERT INTO calendar_events (
                id, calendar_id, user_id, title, description, location,
                start_date, start_time, end_date, end_time,
                is_all_day, external_id, external_source, external_etag,
                created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
              [
                uuidv4(),
                mapping.local_calendar_id,
                userId,
                gEvent.summary || '(No title)',
                gEvent.description || null,
                gEvent.location || null,
                startDate, startTime, endDate, endTime,
                isAllDay ? 1 : 0,
                gEvent.id,
                'google',
                gEvent.etag || null,
                now, now,
              ]
            );
          }
          totalSynced++;
        }
      } while (pageToken);

      // Store the sync token for incremental sync next time
      if (nextSyncToken) {
        await db.run(
          `UPDATE google_calendar_connections SET sync_token = $1, last_synced_at = NOW(), updated_at = NOW() WHERE user_id = $2`,
          [nextSyncToken, userId]
        );
      }
    } catch (err) {
      console.error(`Error syncing Google calendar ${mapping.google_calendar_id}:`, err.message);
    }
  }

  // Update last_synced_at even if no sync token changed
  await db.run(
    `UPDATE google_calendar_connections SET last_synced_at = NOW(), updated_at = NOW() WHERE user_id = $1`,
    [userId]
  );

  return { synced: totalSynced };
}

/**
 * Push a local event to Google Calendar (create or update).
 * Only pushes if the event's calendar has a Google mapping.
 */
async function pushEventToGoogle(userId, event) {
  const calendarClient = await getClient(userId);
  if (!calendarClient) return null;

  // Find the Google calendar mapping for this event's calendar
  const mapping = await db.getOne(
    `SELECT * FROM google_calendar_mappings
     WHERE local_calendar_id = $1 AND user_id = $2 AND sync_direction IN ('both', 'push')`,
    [event.calendar_id, userId]
  );
  if (!mapping) return null;

  // Build the Google event object
  const gEvent = {
    summary: event.title,
    description: event.description || undefined,
    location: event.location || undefined,
  };

  const isAllDay = event.is_all_day === 1 || event.is_all_day === true;

  if (isAllDay) {
    gEvent.start = { date: event.start_date };
    gEvent.end = { date: event.end_date || event.start_date };
  } else {
    gEvent.start = {
      dateTime: `${event.start_date}T${event.start_time || '00:00'}:00`,
      timeZone: event.timezone || 'America/Chicago',
    };
    gEvent.end = {
      dateTime: `${event.end_date || event.start_date}T${event.end_time || event.start_time || '01:00'}:00`,
      timeZone: event.timezone || 'America/Chicago',
    };
  }

  let result;

  if (event.external_id && event.external_source === 'google') {
    // Update existing Google event
    result = await calendarClient.events.update({
      calendarId: mapping.google_calendar_id,
      eventId: event.external_id,
      requestBody: gEvent,
    });
  } else {
    // Create new Google event
    result = await calendarClient.events.insert({
      calendarId: mapping.google_calendar_id,
      requestBody: gEvent,
    });

    // Store external_id and etag on the local event
    await db.run(
      `UPDATE calendar_events SET external_id = $1, external_source = 'google', external_etag = $2 WHERE id = $3`,
      [result.data.id, result.data.etag, event.id]
    );
  }

  return result.data;
}

/**
 * Delete an event from Google Calendar
 */
async function deleteEventFromGoogle(userId, eventId, externalId) {
  if (!externalId) return;

  const calendarClient = await getClient(userId);
  if (!calendarClient) return;

  // Find which Google calendar this event belongs to
  const event = await db.getOne(
    `SELECT calendar_id FROM calendar_events WHERE id = $1 AND user_id = $2`,
    [eventId, userId]
  );
  if (!event) return;

  const mapping = await db.getOne(
    `SELECT * FROM google_calendar_mappings
     WHERE local_calendar_id = $1 AND user_id = $2 AND sync_direction IN ('both', 'push')`,
    [event.calendar_id, userId]
  );
  if (!mapping) return;

  try {
    await calendarClient.events.delete({
      calendarId: mapping.google_calendar_id,
      eventId: externalId,
    });
  } catch (err) {
    // 404/410 means it's already gone from Google — that's fine
    if (err.code !== 404 && err.code !== 410) {
      throw err;
    }
  }
}

/**
 * Disconnect Google Calendar — remove connection and all mappings
 */
async function disconnectGoogle(userId) {
  await db.run(`DELETE FROM google_calendar_mappings WHERE user_id = $1`, [userId]);
  await db.run(`DELETE FROM google_calendar_connections WHERE user_id = $1`, [userId]);
}

/**
 * Get all Google calendar mappings for a user (with calendar names/colors)
 */
async function getGoogleCalendars(userId) {
  return await db.getAll(
    `SELECT m.id, m.google_calendar_id, m.local_calendar_id, m.sync_direction, m.is_visible,
            c.name, c.color
     FROM google_calendar_mappings m
     LEFT JOIN calendars c ON c.id = m.local_calendar_id
     WHERE m.user_id = $1
     ORDER BY c.name ASC`,
    [userId]
  );
}

/**
 * Update a calendar mapping's visibility or sync direction
 */
async function updateMapping(mappingId, userId, data) {
  const existing = await db.getOne(
    `SELECT * FROM google_calendar_mappings WHERE id = $1 AND user_id = $2`,
    [mappingId, userId]
  );
  if (!existing) return null;

  const updates = [];
  const values = [];
  let paramIdx = 1;

  if (data.is_visible !== undefined) {
    updates.push(`is_visible = $${paramIdx++}`);
    values.push(data.is_visible);
  }
  if (data.sync_direction !== undefined) {
    updates.push(`sync_direction = $${paramIdx++}`);
    values.push(data.sync_direction);
  }

  if (updates.length === 0) return existing;

  values.push(mappingId, userId);
  await db.run(
    `UPDATE google_calendar_mappings SET ${updates.join(', ')} WHERE id = $${paramIdx++} AND user_id = $${paramIdx}`,
    values
  );

  return await db.getOne(
    `SELECT m.*, c.name, c.color
     FROM google_calendar_mappings m
     LEFT JOIN calendars c ON c.id = m.local_calendar_id
     WHERE m.id = $1 AND m.user_id = $2`,
    [mappingId, userId]
  );
}

module.exports = {
  getAuthUrl,
  handleCallback,
  getClient,
  getConnectionStatus,
  syncCalendars,
  syncEvents,
  pushEventToGoogle,
  deleteEventFromGoogle,
  disconnectGoogle,
  getGoogleCalendars,
  updateMapping,
};
