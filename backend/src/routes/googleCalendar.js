const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const googleCalendar = require('../services/googleCalendar');

const router = express.Router();
router.use(authMiddleware);

// Initiate OAuth flow
router.get('/auth/google/calendar', async (req, res) => {
  try {
    const url = await googleCalendar.getAuthUrl(req.user.id);
    res.json({ url });
  } catch (err) {
    console.error('Google Calendar auth error:', err);
    res.status(500).json({ error: 'Failed to initiate Google Calendar auth' });
  }
});

// OAuth callback
router.get('/auth/google/calendar/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'Authorization code required' });
    await googleCalendar.handleCallback(code, req.user.id);
    // Redirect to calendar page after successful connection
    res.redirect('/calendar?google_connected=true');
  } catch (err) {
    console.error('Google Calendar callback error:', err);
    res.redirect('/calendar?google_error=true');
  }
});

// Connection status
router.get('/google-calendar/status', async (req, res) => {
  try {
    const status = await googleCalendar.getConnectionStatus(req.user.id);
    res.json(status);
  } catch (err) {
    console.error('Google Calendar status error:', err);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Disconnect
router.delete('/google-calendar/connection', async (req, res) => {
  try {
    await googleCalendar.disconnectGoogle(req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Google Calendar disconnect error:', err);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// Manual sync trigger
router.post('/google-calendar/sync', async (req, res) => {
  try {
    const result = await googleCalendar.syncEvents(req.user.id);
    res.json(result);
  } catch (err) {
    console.error('Google Calendar sync error:', err);
    res.status(500).json({ error: 'Failed to sync' });
  }
});

// List Google calendars with mapping info
router.get('/google-calendar/calendars', async (req, res) => {
  try {
    const calendars = await googleCalendar.getGoogleCalendars(req.user.id);
    res.json({ calendars });
  } catch (err) {
    console.error('Google Calendar list error:', err);
    res.status(500).json({ error: 'Failed to list calendars' });
  }
});

// Toggle calendar visibility/sync direction
router.patch('/google-calendar/calendars/:id', async (req, res) => {
  try {
    const { is_visible, sync_direction } = req.body;
    const mapping = await googleCalendar.updateMapping(req.params.id, req.user.id, { is_visible, sync_direction });
    res.json({ mapping });
  } catch (err) {
    console.error('Google Calendar mapping update error:', err);
    res.status(500).json({ error: 'Failed to update mapping' });
  }
});

module.exports = router;
