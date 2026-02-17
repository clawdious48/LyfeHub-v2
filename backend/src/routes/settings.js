const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const { requireOrgMember } = require('../middleware/orgAuth');
const db = require('../db/schema');
const { requireScope } = require('../middleware/scopeAuth');

const router = express.Router();

// ============================================
// CONFIG
// ============================================

const LOGOS_UPLOAD_DIR = '/data/uploads/logos';
const TMP_DIR = '/data/uploads/tmp';

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml'
];

// ============================================
// MULTER SETUP
// ============================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(TMP_DIR, { recursive: true });
    cb(null, TMP_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed. Only JPEG, PNG, WebP, and SVG are accepted for logos.`), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// ============================================
// MIDDLEWARE
// ============================================

router.use(authMiddleware, requireOrgMember);

// ============================================
// ROUTES
// ============================================

// GET /api/settings/company - Get all company settings for organization
router.get('/company', requireScope('settings', 'read'), async (req, res) => {
  try {
    const settings = await db.getAll(
      'SELECT setting_key, setting_value, updated_at FROM company_settings WHERE org_id = $1 ORDER BY setting_key',
      [req.orgId]
    );

    // Convert to key-value object for easier frontend consumption
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.setting_key] = {
        value: setting.setting_value,
        updated_at: setting.updated_at
      };
    });

    res.json(settingsObj);
  } catch (err) {
    console.error('Error getting company settings:', err);
    res.status(500).json({ error: 'Failed to get company settings' });
  }
});

// POST /api/settings/company/logo - Upload company logo
router.post('/company/logo', requireScope('settings', 'write'), upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No logo file uploaded' });
    }

    const orgId = req.orgId;
    const outputDir = path.join(LOGOS_UPLOAD_DIR, orgId);
    fs.mkdirSync(outputDir, { recursive: true });

    const logoId = uuidv4();
    const ext = path.extname(req.file.originalname).toLowerCase();
    const filename = `logo-${logoId}${ext}`;
    const finalPath = path.join(outputDir, filename);

    try {
      // Move file from temp to logos directory
      fs.renameSync(req.file.path, finalPath);

      // Upsert the company_logo setting
      const settingId = uuidv4();
      const relativePath = path.join(orgId, filename);
      
      await db.run(`
        INSERT INTO company_settings (id, org_id, setting_key, setting_value, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (org_id, setting_key) 
        DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
      `, [settingId, orgId, 'company_logo', relativePath]);

      res.json({
        success: true,
        setting_key: 'company_logo',
        setting_value: relativePath,
        message: 'Logo uploaded successfully'
      });
    } finally {
      // Clean up temp file if it still exists
      try {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      } catch {}
    }
  } catch (err) {
    // Clean up temp file on error
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    console.error('Error uploading logo:', err);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

// PUT /api/settings/company/:key - Upsert a company setting
router.put('/company/:key', requireScope('settings', 'write'), async (req, res) => {
  try {
    const { value } = req.body;
    if (value === undefined || value === null) {
      return res.status(400).json({ error: 'setting value is required' });
    }

    const settingKey = req.params.key;
    const settingId = uuidv4();

    await db.run(`
      INSERT INTO company_settings (id, org_id, setting_key, setting_value, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (org_id, setting_key) 
      DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
    `, [settingId, req.orgId, settingKey, String(value)]);

    res.json({
      success: true,
      setting_key: settingKey,
      setting_value: String(value),
      message: 'Setting updated successfully'
    });
  } catch (err) {
    console.error('Error updating company setting:', err);
    res.status(500).json({ error: 'Failed to update company setting' });
  }
});

// GET /api/settings/company/logo/file - Serve the company logo file
router.get('/company/logo/file', requireScope('settings', 'read'), async (req, res) => {
  try {
    const setting = await db.getOne(
      'SELECT setting_value FROM company_settings WHERE org_id = $1 AND setting_key = $2',
      [req.orgId, 'company_logo']
    );

    if (!setting || !setting.setting_value) {
      return res.status(404).json({ error: 'Company logo not found' });
    }

    const filePath = path.join(LOGOS_UPLOAD_DIR, setting.setting_value);
    const resolvedPath = path.resolve(filePath);

    // Security check: ensure path is within logos directory
    if (!resolvedPath.startsWith(path.resolve(LOGOS_UPLOAD_DIR))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Logo file not found on disk' });
    }

    res.sendFile(resolvedPath);
  } catch (err) {
    console.error('Error serving logo file:', err);
    res.status(500).json({ error: 'Failed to serve logo file' });
  }
});

// ============================================
// MULTER ERROR HANDLING
// ============================================

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err.message && err.message.includes('not allowed')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = router;