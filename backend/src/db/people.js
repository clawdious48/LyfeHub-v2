// ============================================
// People Database Operations
// ============================================

const db = require('./schema');
const { v4: uuidv4 } = require('uuid');

/**
 * Get all people for a user
 */
function getAllPeople(userId) {
  const stmt = db.prepare(`
    SELECT * FROM people
    WHERE user_id = ?
    ORDER BY position ASC, name ASC
  `);
  return stmt.all(userId);
}

/**
 * Get a single person by ID
 */
function getPersonById(id, userId) {
  const stmt = db.prepare(`
    SELECT * FROM people
    WHERE id = ? AND user_id = ?
  `);
  return stmt.get(id, userId);
}

/**
 * Create a new person
 */
function createPerson(data, userId) {
  const id = uuidv4();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
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
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?,
      ?, ?
    )
  `);

  stmt.run(
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
  );

  return getPersonById(id, userId);
}

/**
 * Update a person
 */
function updatePerson(id, data, userId) {
  const existing = getPersonById(id, userId);
  if (!existing) return null;

  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE people SET
      name = ?,
      nickname = ?,
      photo_url = ?,
      birthday = ?,
      gender = ?,
      email = ?,
      email_secondary = ?,
      phone_mobile = ?,
      phone_work = ?,
      phone_home = ?,
      address = ?,
      city = ?,
      state = ?,
      country = ?,
      zip = ?,
      timezone = ?,
      company = ?,
      job_title = ?,
      industry = ?,
      website = ?,
      linkedin = ?,
      twitter = ?,
      instagram = ?,
      relationship = ?,
      how_we_met = ?,
      tags = ?,
      introduced_by = ?,
      notes = ?,
      last_contacted = ?,
      follow_up = ?,
      important = ?,
      mbti_type = ?,
      enneagram = ?,
      love_language = ?,
      communication_style = ?,
      preferred_contact_method = ?,
      best_time_to_reach = ?,
      relationship_strength = ?,
      energy_impact = ?,
      trust_level = ?,
      reciprocity = ?,
      contact_frequency = ?,
      desired_frequency = ?,
      what_i_admire = ?,
      what_i_can_learn = ?,
      how_they_make_me_feel = ?,
      shared_interests = ?,
      conversation_topics = ?,
      sensitive_topics = ?,
      date_met = ?,
      how_relationship_evolved = ?,
      past_conflicts = ?,
      gift_ideas = ?,
      favorite_things = ?,
      allergies_dislikes = ?,
      relationship_goals = ?,
      how_i_can_support = ?,
      how_they_support_me = ?,
      organization_id = ?,
      updated_at = ?
    WHERE id = ? AND user_id = ?
  `);

  // Helper to get value with fallback to existing
  const val = (key, isJson = false) => {
    if (data[key] === undefined) {
      return isJson ? existing[key] : existing[key];
    }
    return isJson ? JSON.stringify(data[key]) : data[key];
  };

  stmt.run(
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
  );

  return getPersonById(id, userId);
}

/**
 * Delete a person
 */
function deletePerson(id, userId) {
  const stmt = db.prepare(`
    DELETE FROM people
    WHERE id = ? AND user_id = ?
  `);
  const result = stmt.run(id, userId);
  return result.changes > 0;
}

/**
 * Get people count for a user
 */
function getPeopleCount(userId) {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM people WHERE user_id = ?');
  const result = stmt.get(userId);
  return result ? result.count : 0;
}

/**
 * Search people by name or other fields
 */
function searchPeople(userId, query) {
  const searchTerm = `%${query}%`;
  const stmt = db.prepare(`
    SELECT * FROM people
    WHERE user_id = ?
      AND (name LIKE ? OR nickname LIKE ? OR email LIKE ? OR company LIKE ? OR notes LIKE ?)
    ORDER BY name ASC
  `);
  return stmt.all(userId, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
}

module.exports = {
  getAllPeople,
  getPersonById,
  createPerson,
  updatePerson,
  deletePerson,
  getPeopleCount,
  searchPeople
};
