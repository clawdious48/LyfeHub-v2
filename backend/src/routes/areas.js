const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getAreas, createArea, updateArea, deleteArea, seedDefaultAreas } = require('../db/areas');
const { requireScope } = require('../middleware/scopeAuth');

router.use(authMiddleware);

router.get('/', requireScope('areas', 'read'), async (req, res) => {
    try {
        let areas = await getAreas(req.user.userId);
        if (areas.length === 0) {
            await seedDefaultAreas(req.user.userId);
            areas = await getAreas(req.user.userId);
        }
        res.json({ areas });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', requireScope('areas', 'write'), async (req, res) => {
    try {
        const area = await createArea(req.user.userId, req.body);
        res.status(201).json({ area });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/:id', requireScope('areas', 'write'), async (req, res) => {
    try {
        const area = await updateArea(req.params.id, req.user.userId, req.body);
        if (!area) return res.status(404).json({ error: 'Area not found' });
        res.json({ area });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', requireScope('areas', 'delete'), async (req, res) => {
    try {
        const deleted = await deleteArea(req.params.id, req.user.userId);
        if (!deleted) return res.status(404).json({ error: 'Area not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
