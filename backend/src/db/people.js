// ============================================
// People Database Operations
// ============================================

const db = require('./schema');
const { v4: uuidv4 } = require('uuid');

/**
 * Get all people for a user
 */
async function getAllPeople(userId) {
  return await db.getAll(`
    SELECT * FROM people
    WHERE user_id = $1
    ORDER BY position ASC, name ASC
  `, [userId]);
}

/**
 * Get a single person by ID
 */
async function getPersonById(id, userId) {
  return await db.getOne(`
    SELECT * FROM people
    WHERE id = $1 AND user_id = $2
  `, [id, userId]);
}

/**
 * Create a new person
 */
async function createPerson(data, userId) {
  const id = uuidv4();
  const now = new Date().toISOString();

  await db.run(`
    INSERT INTO people (
      id, user_id, name, nickname, photo_url, birthday, gender,
      email, email_secondary, phone_mobile, phone_work, phone_home,
      address, city, state, country, zip, timezone,
      company, job_title, industry,
      website, linkedin, twitter, instagram,
      relationship, how_we_met, tags, introduced_by,
      notes, last_contacted, follow_up, important,
      mbti_type, enneagram, love_language, communication_style, preferred_contact_method, best_time_to_reach,
      relationship_strength, energy_impact, trust_level, reciprocity, contact_frequency, desired_frequency,
      what_i_admire, what_i_can_learn, how_they_make_me_feel, shared_interests, conversation_topics, sensitive_topics,
      date_met, how_relationship_evolved, past_conflicts,
      gift_ideas, favorite_things, allergies_dislikes,
      relationship_goals, how_i_can_support, how_they_support_me,
      organization_id,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11, $12,
      $13, $14, $15, $16, $17, $18,
      $19, $20, $21,
      $22, $23, $24, $25,
      $26, $27, $28, $29,
      $30, $31, $32, $33,
      $34, $35, $36, $37, $38, $39,
      $40, $41, $42, $43, $44, $45,
      $46, $47, $48, $49, $50, $51,
      $52, $53, $54,
      $55, $56, $57,
      $58, $59, $60,
      $61,
      $62, $63
    )
  `, [
    id, userId,
    data.name || 'Unnamed Person',
    data.nickname || '',
    data.photo_url || '',
    data.birthday || null,
    data.gender || '',
    data.email || '',
    data.email_secondary || '',
    data.phone_mobile || '',
    data.phone_work || '',
    data.phone_home || '',
    data.address || '',
    data.city || '',
    data.state || '',
    data.country || '',
    data.zip || '',
    data.timezone || '',
    data.company || '',
    data.job_title || '',
    data.industry || '',
    data.website || '',
    data.linkedin || '',
    data.twitter || '',
    data.instagram || '',
    data.relationship || '',
    data.how_we_met || '',
    JSON.stringify(data.tags || []),
    data.introduced_by || '',
    data.notes || '',
    data.last_contacted || null,
    data.follow_up || null,
    data.important ? 1 : 0,
    data.mbti_type || '',
    data.enneagram || '',
    data.love_language || '',
    data.communication_style || '',
    data.preferred_contact_method || '',
    data.best_time_to_reach || '',
    data.relationship_strength || '',
    data.energy_impact || '',
    data.trust_level || '',
    data.reciprocity || '',
    data.contact_frequency || '',
    data.desired_frequency || '',
    data.what_i_admire || '',
    data.what_i_can_learn || '',
    data.how_they_make_me_feel || '',
    JSON.stringify(data.shared_interests || []),
    JSON.stringify(data.conversation_topics || []),
    JSON.stringify(data.sensitive_topics || []),
    data.date_met || null,
    data.how_relationship_evolved || '',
    data.past_conflicts || '',
    JSON.stringify(data.gift_ideas || []),
    data.favorite_things || '',
    data.allergies_dislikes || '',
    data.relationship_goals || '',
    data.how_i_can_support || '',
    data.how_they_support_me || '',
    data.organization_id || null,
    now, now
  ]);

  return await getPersonById(id, userId);
}

/**
 * Update a person
 */
async function updatePerson(id, data, userId) {
  const existing = await getPersonById(id, userId);
  if (!existing) return null;

  const now = new Date().toISOString();

  const val = (key, isJson = false) => {
    if (data[key] === undefined) {
      return isJson ? existing[key] : existing[key];
    }
    return isJson ? JSON.stringify(data[key]) : data[key];
  };

  await db.run(`
    UPDATE people SET
      name = $1,
      nickname = $2,
      photo_url = $3,
      birthday = $4,
      gender = $5,
      email = $6,
      email_secondary = $7,
      phone_mobile = $8,
      phone_work = $9,
      phone_home = $10,
      address = $11,
      city = $12,
      state = $13,
      country = $14,
      zip = $15,
      timezone = $16,
      company = $17,
      job_title = $18,
      industry = $19,
      website = $20,
      linkedin = $21,
      twitter = $22,
      instagram = $23,
      relationship = $24,
      how_we_met = $25,
      tags = $26,
      introduced_by = $27,
      notes = $28,
      last_contacted = $29,
      follow_up = $30,
      important = $31,
      mbti_type = $32,
      enneagram = $33,
      love_language = $34,
      communication_style = $35,
      preferred_contact_method = $36,
      best_time_to_reach = $37,
      relationship_strength = $38,
      energy_impact = $39,
      trust_level = $40,
      reciprocity = $41,
      contact_frequency = $42,
      desired_frequency = $43,
      what_i_admire = $44,
      what_i_can_learn = $45,
      how_they_make_me_feel = $46,
      shared_interests = $47,
      conversation_topics = $48,
      sensitive_topics = $49,
      date_met = $50,
      how_relationship_evolved = $51,
      past_conflicts = $52,
      gift_ideas = $53,
      favorite_things = $54,
      allergies_dislikes = $55,
      relationship_goals = $56,
      how_i_can_support = $57,
      how_they_support_me = $58,
      organization_id = $59,
      updated_at = $60
    WHERE id = $61 AND user_id = $62
  `, [
    data.name !== undefined ? data.name : existing.name,
    val('nickname'),
    val('photo_url'),
    data.birthday !== undefined ? data.birthday : existing.birthday,
    val('gender'),
    val('email'),
    val('email_secondary'),
    val('phone_mobile'),
    val('phone_work'),
    val('phone_home'),
    val('address'),
    val('city'),
    val('state'),
    val('country'),
    val('zip'),
    val('timezone'),
    val('company'),
    val('job_title'),
    val('industry'),
    val('website'),
    val('linkedin'),
    val('twitter'),
    val('instagram'),
    val('relationship'),
    val('how_we_met'),
    val('tags', true),
    val('introduced_by'),
    val('notes'),
    data.last_contacted !== undefined ? data.last_contacted : existing.last_contacted,
    data.follow_up !== undefined ? data.follow_up : existing.follow_up,
    data.important !== undefined ? (data.important ? 1 : 0) : existing.important,
    val('mbti_type'),
    val('enneagram'),
    val('love_language'),
    val('communication_style'),
    val('preferred_contact_method'),
    val('best_time_to_reach'),
    val('relationship_strength'),
    val('energy_impact'),
    val('trust_level'),
    val('reciprocity'),
    val('contact_frequency'),
    val('desired_frequency'),
    val('what_i_admire'),
    val('what_i_can_learn'),
    val('how_they_make_me_feel'),
    val('shared_interests', true),
    val('conversation_topics', true),
    val('sensitive_topics', true),
    data.date_met !== undefined ? data.date_met : existing.date_met,
    val('how_relationship_evolved'),
    val('past_conflicts'),
    val('gift_ideas', true),
    val('favorite_things'),
    val('allergies_dislikes'),
    val('relationship_goals'),
    val('how_i_can_support'),
    val('how_they_support_me'),
    data.organization_id !== undefined ? data.organization_id : existing.organization_id,
    now,
    id, userId
  ]);

  return await getPersonById(id, userId);
}

/**
 * Delete a person
 */
async function deletePerson(id, userId) {
  const result = await db.run(`
    DELETE FROM people
    WHERE id = $1 AND user_id = $2
  `, [id, userId]);
  return result.rowCount > 0;
}

/**
 * Get people count for a user
 */
async function getPeopleCount(userId) {
  const result = await db.getOne('SELECT COUNT(*) as count FROM people WHERE user_id = $1', [userId]);
  return result ? parseInt(result.count) : 0;
}

/**
 * Search people by name or other fields
 */
async function searchPeople(userId, query) {
  const searchTerm = `%${query}%`;
  return await db.getAll(`
    SELECT * FROM people
    WHERE user_id = $1
      AND (name ILIKE $2 OR nickname ILIKE $3 OR email ILIKE $4 OR company ILIKE $5 OR notes ILIKE $6)
    ORDER BY name ASC
  `, [userId, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]);
}

/**
 * Find a person by email address
 */
async function findByEmail(userId, email) {
  return await db.getOne(`
    SELECT * FROM people
    WHERE user_id = $1 AND (LOWER(email) = LOWER($2) OR LOWER(email_secondary) = LOWER($3))
  `, [userId, email, email]);
}

module.exports = {
  getAllPeople,
  getPersonById,
  createPerson,
  updatePerson,
  deletePerson,
  getPeopleCount,
  searchPeople,
  findByEmail
};
