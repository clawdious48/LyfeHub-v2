const db = require('./schema');

async function seedDefaultAreas(userId) {
    const defaults = [
        { name: 'Work', color: '#FF8C00', icon: '💼', sort_order: 0 },
        { name: 'Family', color: '#E91E63', icon: '👨‍👩‍👧‍👦', sort_order: 1 },
        { name: 'Health', color: '#4CAF50', icon: '💪', sort_order: 2 },
        { name: 'Finances', color: '#2196F3', icon: '💰', sort_order: 3 },
    ];
    for (const area of defaults) {
        await db.run(
            'INSERT INTO areas (user_id, name, color, icon, sort_order) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
            [userId, area.name, area.color, area.icon, area.sort_order]
        );
    }
}

async function getAreas(userId) {
    return await db.getAll('SELECT * FROM areas WHERE user_id = $1 ORDER BY sort_order, name', [userId]);
}

async function createArea(userId, { name, color, icon, sort_order }) {
    const id = require('uuid').v4();
    await db.run(
        'INSERT INTO areas (id, user_id, name, color, icon, sort_order) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, userId, name, color || '#FF8C00', icon || '📁', sort_order || 0]
    );
    return await db.getOne('SELECT * FROM areas WHERE id = $1', [id]);
}

async function updateArea(id, userId, updates) {
    const fields = [];
    const values = [];
    let idx = 1;
    for (const [key, val] of Object.entries(updates)) {
        if (['name', 'color', 'icon', 'sort_order'].includes(key)) {
            fields.push(`${key} = $${idx}`);
            values.push(val);
            idx++;
        }
    }
    if (fields.length === 0) return null;
    fields.push(`updated_at = NOW()`);
    values.push(id, userId);
    await db.run(
        `UPDATE areas SET ${fields.join(', ')} WHERE id = $${idx} AND user_id = $${idx + 1}`,
        values
    );
    return await db.getOne('SELECT * FROM areas WHERE id = $1 AND user_id = $2', [id, userId]);
}

async function deleteArea(id, userId) {
    const result = await db.run('DELETE FROM areas WHERE id = $1 AND user_id = $2', [id, userId]);
    return result && result.rowCount > 0;
}

module.exports = { seedDefaultAreas, getAreas, createArea, updateArea, deleteArea };
