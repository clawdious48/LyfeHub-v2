// ============================================
// People Tab — Core-People Base Integration
// ============================================
(function () {
  'use strict';

  // ─── State ───────────────────────────────────────────────────────────────────
  var peopleState = {
    records: [],
    currentRecord: null,
    filter: 'all',
    sort: 'az',
    searchQuery: '',
    loaded: false,
    scrollPosition: 0,
    editingId: null   // null = adding, string = editing
  };

  // ─── Schema: select options (sourced from coreBases.js) ──────────────────────
  var SCHEMA = {
    gender: [
      { value: 'male', label: 'Male' },
      { value: 'female', label: 'Female' },
      { value: 'non-binary', label: 'Non-binary' },
      { value: 'other', label: 'Other' },
      { value: 'prefer-not-to-say', label: 'Prefer not to say' }
    ],
    timezone: [
      { value: 'America/New_York', label: 'Eastern (US)' },
      { value: 'America/Chicago', label: 'Central (US)' },
      { value: 'America/Denver', label: 'Mountain (US)' },
      { value: 'America/Los_Angeles', label: 'Pacific (US)' },
      { value: 'America/Anchorage', label: 'Alaska' },
      { value: 'Pacific/Honolulu', label: 'Hawaii' },
      { value: 'Europe/London', label: 'London (GMT)' },
      { value: 'Europe/Paris', label: 'Paris (CET)' },
      { value: 'Europe/Berlin', label: 'Berlin (CET)' },
      { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
      { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
      { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
      { value: 'Asia/Mumbai', label: 'Mumbai (IST)' },
      { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
      { value: 'Pacific/Auckland', label: 'Auckland (NZST)' }
    ],
    relationship: [
      { value: 'family', label: 'Family' },
      { value: 'friend', label: 'Friend' },
      { value: 'colleague', label: 'Colleague' },
      { value: 'client', label: 'Client' },
      { value: 'vendor', label: 'Vendor' },
      { value: 'acquaintance', label: 'Acquaintance' },
      { value: 'celebrity', label: 'Celebrity' },
      { value: 'other', label: 'Other' }
    ],
    mbti_type: [
      'INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP',
      'ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'
    ].map(function (v) { return { value: v, label: v }; }),
    enneagram: [
      { value: '1', label: 'Type 1 - Reformer' },
      { value: '1w9', label: '1w9' }, { value: '1w2', label: '1w2' },
      { value: '2', label: 'Type 2 - Helper' },
      { value: '2w1', label: '2w1' }, { value: '2w3', label: '2w3' },
      { value: '3', label: 'Type 3 - Achiever' },
      { value: '3w2', label: '3w2' }, { value: '3w4', label: '3w4' },
      { value: '4', label: 'Type 4 - Individualist' },
      { value: '4w3', label: '4w3' }, { value: '4w5', label: '4w5' },
      { value: '5', label: 'Type 5 - Investigator' },
      { value: '5w4', label: '5w4' }, { value: '5w6', label: '5w6' },
      { value: '6', label: 'Type 6 - Loyalist' },
      { value: '6w5', label: '6w5' }, { value: '6w7', label: '6w7' },
      { value: '7', label: 'Type 7 - Enthusiast' },
      { value: '7w6', label: '7w6' }, { value: '7w8', label: '7w8' },
      { value: '8', label: 'Type 8 - Challenger' },
      { value: '8w7', label: '8w7' }, { value: '8w9', label: '8w9' },
      { value: '9', label: 'Type 9 - Peacemaker' },
      { value: '9w8', label: '9w8' }, { value: '9w1', label: '9w1' }
    ],
    love_language: [
      { value: 'words_of_affirmation', label: 'Words of Affirmation' },
      { value: 'acts_of_service', label: 'Acts of Service' },
      { value: 'receiving_gifts', label: 'Receiving Gifts' },
      { value: 'quality_time', label: 'Quality Time' },
      { value: 'physical_touch', label: 'Physical Touch' }
    ],
    communication_style: [
      { value: 'direct', label: 'Direct' },
      { value: 'diplomatic', label: 'Diplomatic' },
      { value: 'analytical', label: 'Analytical' },
      { value: 'expressive', label: 'Expressive' }
    ],
    preferred_contact_method: [
      { value: 'call', label: 'Call' },
      { value: 'text', label: 'Text' },
      { value: 'email', label: 'Email' },
      { value: 'in_person', label: 'In-person' },
      { value: 'video_chat', label: 'Video Chat' }
    ],
    relationship_strength: [
      { value: 'strong', label: 'Strong' },
      { value: 'good', label: 'Good' },
      { value: 'neutral', label: 'Neutral' },
      { value: 'distant', label: 'Distant' },
      { value: 'strained', label: 'Strained' }
    ],
    energy_impact: [
      { value: 'energizing', label: 'Energizing' },
      { value: 'neutral', label: 'Neutral' },
      { value: 'draining', label: 'Draining' }
    ],
    trust_level: [
      { value: 'high', label: 'High' },
      { value: 'medium', label: 'Medium' },
      { value: 'low', label: 'Low' },
      { value: 'building', label: 'Building' }
    ],
    reciprocity: [
      { value: 'balanced', label: 'Balanced' },
      { value: 'i_give_more', label: 'I Give More' },
      { value: 'they_give_more', label: 'They Give More' }
    ],
    contact_frequency: [
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'quarterly', label: 'Quarterly' },
      { value: 'yearly', label: 'Yearly' },
      { value: 'rarely', label: 'Rarely' }
    ],
    desired_frequency: [
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'quarterly', label: 'Quarterly' },
      { value: 'yearly', label: 'Yearly' },
      { value: 'rarely', label: 'Rarely' }
    ]
  };

  // ─── T1: API Adapter ──────────────────────────────────────────────────────────
  var peopleBaseApi = {
    async list() {
      var res = await fetch('/api/bases/core/core-people', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch people: ' + res.status);
      var data = await res.json();
      return data.records || [];
    },
    async get(id) {
      var records = await this.list();
      return records.find(function (r) { return r.id === id; }) || null;
    },
    async create(values) {
      var res = await fetch('/api/bases/core/core-people/records', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: values })
      });
      if (!res.ok) throw new Error('Failed to create person: ' + res.status);
      return res.json();
    },
    async update(id, values) {
      var res = await fetch('/api/bases/core/core-people/records/' + id, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: values })
      });
      if (!res.ok) throw new Error('Failed to update person: ' + res.status);
      return res.json();
    },
    async delete(id) {
      var res = await fetch('/api/bases/core/core-people/records/' + id, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to delete person: ' + res.status);
      return res.json();
    }
  };

  // ─── Helper Functions ─────────────────────────────────────────────────────────
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getInitials(name) {
    if (!name) return '?';
    var parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  function hashColor(str) {
    if (!str) return '#6366f1';
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    var colors = [
      '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
      '#f97316', '#eab308', '#22c55e', '#14b8a6',
      '#3b82f6', '#06b6d4', '#a855f7', '#f43f5e'
    ];
    return colors[Math.abs(hash) % colors.length];
  }

  function formatPhone(phone) {
    if (!phone) return '';
    var digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6);
    }
    if (digits.length === 11 && digits.charAt(0) === '1') {
      return '(' + digits.slice(1, 4) + ') ' + digits.slice(4, 7) + '-' + digits.slice(7);
    }
    return phone;
  }

  function labelFor(fieldId) {
    var labels = {
      name: 'Name', nickname: 'Nickname', birthday: 'Birthday', gender: 'Gender',
      photo_url: 'Photo',
      email: 'Email', email_secondary: 'Email (Secondary)',
      phone_mobile: 'Mobile', phone_work: 'Work Phone', phone_home: 'Home Phone',
      address: 'Address', city: 'City', state: 'State', country: 'Country',
      zip: 'Zip', timezone: 'Timezone',
      company: 'Company', job_title: 'Job Title', industry: 'Industry',
      organization: 'Organization',
      website: 'Website', linkedin: 'LinkedIn', twitter: 'Twitter', instagram: 'Instagram',
      relationship: 'Relationship', how_we_met: 'How We Met', tags: 'Tags',
      introduced_by: 'Introduced By',
      notes: 'Notes', last_contacted: 'Last Contacted', follow_up: 'Follow Up',
      important: 'Important',
      mbti_type: 'MBTI Type', enneagram: 'Enneagram', love_language: 'Love Language',
      communication_style: 'Communication Style', preferred_contact_method: 'Preferred Contact',
      best_time_to_reach: 'Best Time to Reach',
      relationship_strength: 'Relationship Strength', energy_impact: 'Energy Impact',
      trust_level: 'Trust Level', reciprocity: 'Reciprocity',
      contact_frequency: 'Contact Frequency', desired_frequency: 'Desired Frequency',
      what_i_admire: 'What I Admire', what_i_can_learn: 'What I Can Learn',
      how_they_make_me_feel: 'How They Make Me Feel', shared_interests: 'Shared Interests',
      conversation_topics: 'Conversation Topics', sensitive_topics: 'Sensitive Topics',
      date_met: 'Date Met', how_relationship_evolved: 'How Relationship Evolved',
      past_conflicts: 'Past Conflicts',
      gift_ideas: 'Gift Ideas', favorite_things: 'Favorite Things',
      allergies_dislikes: 'Allergies/Dislikes',
      relationship_goals: 'Relationship Goals', how_i_can_support: 'How I Can Support',
      how_they_support_me: 'How They Support Me'
    };
    return labels[fieldId] || fieldId;
  }

  function selectLabel(fieldId, value) {
    if (!value) return value;
    var opts = SCHEMA[fieldId];
    if (!opts) return value;
    var found = opts.find(function (o) { return o.value === value; });
    return found ? found.label : value;
  }

  function isPopulated(val) {
    if (val == null) return false;
    if (val === false) return false;
    if (typeof val === 'string' && val.trim() === '') return false;
    if (Array.isArray(val) && val.length === 0) return false;
    return true;
  }

  // ─── T11: Data Loading ────────────────────────────────────────────────────────
  async function loadPeopleData() {
    try {
      var records = await peopleBaseApi.list();
      peopleState.records = records;
      peopleState.loaded = true;
      renderPeopleContactList();
    } catch (err) {
      console.error('Failed to load people:', err);
      showPeopleError('Failed to load contacts. Please try again.');
    }
  }

  function showPeopleError(msg) {
    var list = document.getElementById('people-contact-list');
    if (list) {
      list.innerHTML = '<div class="people-error">' + escapeHtml(msg) + '</div>';
    }
  }

  // ─── T3: Contact List Renderer ────────────────────────────────────────────────
  function getFilteredSortedRecords() {
    var records = peopleState.records.slice();

    // Filter by relationship
    if (peopleState.filter !== 'all') {
      records = records.filter(function (r) {
        return r.values && r.values.relationship === peopleState.filter;
      });
    }

    // Search filter
    var q = peopleState.searchQuery.trim().toLowerCase();
    if (q) {
      records = records.filter(function (r) {
        var v = r.values || {};
        return [v.name, v.company, v.email, v.phone_mobile, v.phone_work, v.phone_home]
          .some(function (field) {
            return field && String(field).toLowerCase().indexOf(q) !== -1;
          });
      });
    }

    // Sort
    records.sort(function (a, b) {
      var av = a.values || {};
      var bv = b.values || {};
      if (peopleState.sort === 'recent') {
        var at = a.updated_at || a.created_at || '';
        var bt = b.updated_at || b.created_at || '';
        return bt.localeCompare(at);
      }
      if (peopleState.sort === 'company') {
        var ac = (av.company || '').toLowerCase();
        var bc = (bv.company || '').toLowerCase();
        if (ac !== bc) return ac.localeCompare(bc);
      }
      // az (default) and company fallback
      var an = (av.name || '').toLowerCase();
      var bn = (bv.name || '').toLowerCase();
      return an.localeCompare(bn);
    });

    return records;
  }

  function renderPeopleContactList() {
    var listEl = document.getElementById('people-contact-list');
    var emptyEl = document.getElementById('people-empty');
    if (!listEl) return;

    var records = getFilteredSortedRecords();

    if (records.length === 0) {
      listEl.innerHTML = '';
      if (emptyEl) emptyEl.style.display = '';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    var html = '';
    records.forEach(function (record) {
      var v = record.values || {};
      var name = v.name || 'Unknown';
      var initials = getInitials(name);
      var color = hashColor(name);
      var company = v.company || '';
      var jobTitle = v.job_title || '';
      var meta = [company, jobTitle].filter(Boolean).join(' · ');
      var phone = v.phone_mobile || v.phone_work || v.phone_home || '';
      var email = v.email || '';
      var id = record.id;

      var contactHtml = '';
      if (phone) {
        contactHtml += '<a href="tel:' + escapeHtml(phone) + '" class="people-card-phone" onclick="event.stopPropagation()">📱 ' + escapeHtml(formatPhone(phone)) + '</a>';
      }
      if (email) {
        contactHtml += '<a href="mailto:' + escapeHtml(email) + '" class="people-card-email" onclick="event.stopPropagation()">✉️ ' + escapeHtml(email) + '</a>';
      }

      html += '<div class="people-card' + (v.important ? ' people-card--important' : '') + '" data-person-id="' + escapeHtml(id) + '" onclick="peopleOpenDetail(\'' + escapeHtml(id) + '\')">';
      html += '<div class="people-card-avatar" style="background:' + color + '">' + escapeHtml(initials) + '</div>';
      html += '<div class="people-card-info">';
      html += '<div class="people-card-name">' + escapeHtml(name) + '</div>';
      if (meta) html += '<div class="people-card-meta">' + escapeHtml(meta) + '</div>';
      if (contactHtml) html += '<div class="people-card-contact">' + contactHtml + '</div>';
      html += '</div>';
      html += '<div class="people-card-arrow">›</div>';
      html += '</div>';
    });

    listEl.innerHTML = html;
  }

  // ─── T4: Detail View ──────────────────────────────────────────────────────────
  function peopleOpenDetail(id) {
    var record = peopleState.records.find(function (r) { return r.id === id; });
    if (!record) return;

    // Save scroll position
    var listEl = document.getElementById('people-contact-list');
    if (listEl) peopleState.scrollPosition = listEl.scrollTop;

    peopleState.currentRecord = record;

    var detailEl = document.getElementById('people-detail');
    var listView = document.getElementById('people-contact-list');
    var searchBar = document.querySelector('.people-search-bar');
    var fabEl = document.getElementById('people-fab');
    var emptyEl = document.getElementById('people-empty');

    if (listView) listView.style.display = 'none';
    if (searchBar) searchBar.style.display = 'none';
    if (fabEl) fabEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'none';
    if (detailEl) detailEl.style.display = '';

    renderDetailContent(record);

    // Wire edit/delete buttons
    var editBtn = document.getElementById('people-edit-btn');
    var deleteBtn = document.getElementById('people-delete-btn');

    if (editBtn) {
      editBtn.onclick = function () { peopleShowEditModal(id); };
    }
    if (deleteBtn) {
      deleteBtn.onclick = function () { peopleDeleteRecord(id); };
    }
  }

  function peopleCloseDetail() {
    var detailEl = document.getElementById('people-detail');
    var listView = document.getElementById('people-contact-list');
    var searchBar = document.querySelector('.people-search-bar');
    var fabEl = document.getElementById('people-fab');

    if (detailEl) detailEl.style.display = 'none';
    if (listView) listView.style.display = '';
    if (searchBar) searchBar.style.display = '';
    if (fabEl) fabEl.style.display = '';

    peopleState.currentRecord = null;

    // Restore scroll position
    if (listView) {
      requestAnimationFrame(function () {
        listView.scrollTop = peopleState.scrollPosition;
      });
    }

    renderPeopleContactList();
  }

  function renderDetailContent(record) {
    var contentEl = document.getElementById('people-detail-content');
    if (!contentEl) return;

    var v = record.values || {};

    // Name as the big header
    var nameHtml = '<div class="people-detail-name-header">';
    var initials = getInitials(v.name || '');
    var color = hashColor(v.name || '');
    nameHtml += '<div class="people-detail-avatar" style="background:' + color + '">' + escapeHtml(initials) + '</div>';
    nameHtml += '<h2 class="people-detail-name">' + escapeHtml(v.name || 'Unknown') + '</h2>';
    if (v.nickname) nameHtml += '<div class="people-detail-nickname">"' + escapeHtml(v.nickname) + '"</div>';
    nameHtml += '</div>';

    var sections = [
      {
        title: 'Identity',
        fields: [
          { id: 'birthday', label: 'Birthday', type: 'date' },
          { id: 'gender', label: 'Gender', type: 'select' }
        ]
      },
      {
        title: 'Contact',
        fields: [
          { id: 'email', label: 'Email', type: 'email' },
          { id: 'email_secondary', label: 'Email (Secondary)', type: 'email' },
          { id: 'phone_mobile', label: 'Mobile', type: 'phone' },
          { id: 'phone_work', label: 'Work Phone', type: 'phone' },
          { id: 'phone_home', label: 'Home Phone', type: 'phone' }
        ]
      },
      {
        title: 'Location',
        fields: [
          { id: 'address', label: 'Address', type: 'address' },
          { id: 'city', label: 'City', type: 'text' },
          { id: 'state', label: 'State', type: 'text' },
          { id: 'country', label: 'Country', type: 'text' },
          { id: 'zip', label: 'Zip', type: 'text' },
          { id: 'timezone', label: 'Timezone', type: 'select' }
        ]
      },
      {
        title: 'Professional',
        fields: [
          { id: 'company', label: 'Company', type: 'text' },
          { id: 'job_title', label: 'Job Title', type: 'text' },
          { id: 'industry', label: 'Industry', type: 'text' },
          { id: 'organization', label: 'Organization', type: 'text' }
        ]
      },
      {
        title: 'Social',
        fields: [
          { id: 'website', label: 'Website', type: 'url' },
          { id: 'linkedin', label: 'LinkedIn', type: 'url' },
          { id: 'twitter', label: 'Twitter', type: 'url' },
          { id: 'instagram', label: 'Instagram', type: 'url' }
        ]
      },
      {
        title: 'Relationship',
        fields: [
          { id: 'relationship', label: 'Relationship', type: 'select' },
          { id: 'how_we_met', label: 'How We Met', type: 'text' },
          { id: 'tags', label: 'Tags', type: 'multi' },
          { id: 'introduced_by', label: 'Introduced By', type: 'text' }
        ]
      },
      {
        title: 'Notes & Tracking',
        fields: [
          { id: 'notes', label: 'Notes', type: 'text' },
          { id: 'last_contacted', label: 'Last Contacted', type: 'date' },
          { id: 'follow_up', label: 'Follow Up', type: 'date' },
          { id: 'important', label: 'Important', type: 'bool' }
        ]
      },
      {
        title: 'Personality',
        fields: [
          { id: 'mbti_type', label: 'MBTI Type', type: 'select' },
          { id: 'enneagram', label: 'Enneagram', type: 'select' },
          { id: 'love_language', label: 'Love Language', type: 'select' },
          { id: 'communication_style', label: 'Communication Style', type: 'select' },
          { id: 'preferred_contact_method', label: 'Preferred Contact', type: 'select' },
          { id: 'best_time_to_reach', label: 'Best Time to Reach', type: 'text' }
        ]
      },
      {
        title: 'Relationship Dynamics',
        fields: [
          { id: 'relationship_strength', label: 'Relationship Strength', type: 'select' },
          { id: 'energy_impact', label: 'Energy Impact', type: 'select' },
          { id: 'trust_level', label: 'Trust Level', type: 'select' },
          { id: 'reciprocity', label: 'Reciprocity', type: 'select' },
          { id: 'contact_frequency', label: 'Contact Frequency', type: 'select' },
          { id: 'desired_frequency', label: 'Desired Frequency', type: 'select' }
        ]
      },
      {
        title: 'Personal Reflection',
        fields: [
          { id: 'what_i_admire', label: 'What I Admire', type: 'text' },
          { id: 'what_i_can_learn', label: 'What I Can Learn', type: 'text' },
          { id: 'how_they_make_me_feel', label: 'How They Make Me Feel', type: 'text' },
          { id: 'shared_interests', label: 'Shared Interests', type: 'multi' },
          { id: 'conversation_topics', label: 'Conversation Topics', type: 'multi' },
          { id: 'sensitive_topics', label: 'Sensitive Topics', type: 'multi' }
        ]
      },
      {
        title: 'History',
        fields: [
          { id: 'date_met', label: 'Date Met', type: 'date' },
          { id: 'how_relationship_evolved', label: 'How Relationship Evolved', type: 'text' },
          { id: 'past_conflicts', label: 'Past Conflicts', type: 'text' }
        ]
      },
      {
        title: 'Gifts',
        fields: [
          { id: 'gift_ideas', label: 'Gift Ideas', type: 'multi' },
          { id: 'favorite_things', label: 'Favorite Things', type: 'text' },
          { id: 'allergies_dislikes', label: 'Allergies/Dislikes', type: 'text' }
        ]
      },
      {
        title: 'Goals',
        fields: [
          { id: 'relationship_goals', label: 'Relationship Goals', type: 'text' },
          { id: 'how_i_can_support', label: 'How I Can Support', type: 'text' },
          { id: 'how_they_support_me', label: 'How They Support Me', type: 'text' }
        ]
      }
    ];

    var sectionsHtml = '';
    sections.forEach(function (section) {
      var fieldsHtml = '';
      section.fields.forEach(function (field) {
        var val = v[field.id];
        if (!isPopulated(val)) return;

        var valueHtml = '';
        if (field.type === 'phone') {
          var formatted = formatPhone(String(val));
          valueHtml = '<a href="tel:' + escapeHtml(String(val)) + '" class="people-detail-value people-detail-link">📱 ' + escapeHtml(formatted) + '</a>';
        } else if (field.type === 'email') {
          valueHtml = '<a href="mailto:' + escapeHtml(String(val)) + '" class="people-detail-value people-detail-link">✉️ ' + escapeHtml(String(val)) + '</a>';
        } else if (field.type === 'url') {
          var display = String(val).replace(/^https?:\/\/(www\.)?/, '');
          valueHtml = '<a href="' + escapeHtml(String(val)) + '" target="_blank" rel="noopener" class="people-detail-value people-detail-link">🔗 ' + escapeHtml(display) + '</a>';
        } else if (field.type === 'address') {
          var mapsUrl = 'https://maps.google.com/?q=' + encodeURIComponent(String(val));
          valueHtml = '<a href="' + escapeHtml(mapsUrl) + '" target="_blank" rel="noopener" class="people-detail-value people-detail-link">📍 ' + escapeHtml(String(val)) + '</a>';
        } else if (field.type === 'select') {
          valueHtml = '<span class="people-detail-value people-detail-badge">' + escapeHtml(selectLabel(field.id, String(val))) + '</span>';
        } else if (field.type === 'multi') {
          var items = Array.isArray(val) ? val : String(val).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
          valueHtml = '<span class="people-detail-value">' + items.map(function (it) {
            return '<span class="people-detail-tag">' + escapeHtml(it) + '</span>';
          }).join('') + '</span>';
        } else if (field.type === 'bool') {
          valueHtml = '<span class="people-detail-value people-detail-badge people-detail-badge--yes">✓ Yes</span>';
        } else {
          valueHtml = '<span class="people-detail-value">' + escapeHtml(String(val)) + '</span>';
        }

        fieldsHtml += '<div class="people-detail-field">';
        fieldsHtml += '<span class="people-detail-label">' + escapeHtml(field.label) + '</span>';
        fieldsHtml += valueHtml;
        fieldsHtml += '</div>';
      });

      if (fieldsHtml) {
        sectionsHtml += '<div class="people-detail-section">';
        sectionsHtml += '<h4 class="people-detail-section-title">' + escapeHtml(section.title) + '</h4>';
        sectionsHtml += fieldsHtml;
        sectionsHtml += '</div>';
      }
    });

    contentEl.innerHTML = nameHtml + sectionsHtml;
  }

  async function peopleDeleteRecord(id) {
    if (!confirm('Delete this contact? This cannot be undone.')) return;
    try {
      await peopleBaseApi.delete(id);
      peopleState.records = peopleState.records.filter(function (r) { return r.id !== id; });
      peopleCloseDetail();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete contact. Please try again.');
    }
  }

  // ─── T5: Add/Edit Modal ───────────────────────────────────────────────────────
  function buildSelectHtml(fieldId, currentValue) {
    var opts = SCHEMA[fieldId] || [];
    var html = '<option value="">— Select —</option>';
    opts.forEach(function (o) {
      html += '<option value="' + escapeHtml(o.value) + '"' + (currentValue === o.value ? ' selected' : '') + '>' + escapeHtml(o.label) + '</option>';
    });
    return html;
  }

  function buildFieldHtml(fieldId, inputType, label, currentValue, placeholder) {
    var val = currentValue != null ? currentValue : '';
    var ph = placeholder || '';
    var html = '<div class="people-form-field">';
    html += '<label class="people-form-label" for="pf-' + fieldId + '">' + escapeHtml(label) + '</label>';

    if (SCHEMA[fieldId]) {
      // Select field
      html += '<select class="people-form-select" id="pf-' + fieldId + '" name="' + fieldId + '">';
      html += buildSelectHtml(fieldId, String(val));
      html += '</select>';
    } else if (inputType === 'checkbox') {
      html += '<label class="people-form-toggle">';
      html += '<input type="checkbox" id="pf-' + fieldId + '" name="' + fieldId + '"' + (val ? ' checked' : '') + '>';
      html += '<span class="people-form-toggle-slider"></span>';
      html += '</label>';
    } else if (inputType === 'textarea') {
      html += '<textarea class="people-form-textarea" id="pf-' + fieldId + '" name="' + fieldId + '" placeholder="' + escapeHtml(ph) + '" rows="3">' + escapeHtml(String(val)) + '</textarea>';
    } else {
      html += '<input type="' + inputType + '" class="people-form-input" id="pf-' + fieldId + '" name="' + fieldId + '" value="' + escapeHtml(String(val)) + '" placeholder="' + escapeHtml(ph) + '" autocomplete="off">';
    }
    html += '</div>';
    return html;
  }

  function buildExpandableSection(title, fieldsHtml, expanded) {
    var id = 'pf-expand-' + title.replace(/\s+/g, '-').toLowerCase();
    var html = '<div class="people-form-section">';
    html += '<button type="button" class="people-form-section-toggle" onclick="this.classList.toggle(\'open\'); document.getElementById(\'' + id + '\').classList.toggle(\'open\')">';
    html += '<span>' + escapeHtml(title) + '</span>';
    html += '<svg class="people-form-section-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>';
    html += '</button>';
    html += '<div class="people-form-section-body' + (expanded ? ' open' : '') + '" id="' + id + '">';
    html += fieldsHtml;
    html += '</div>';
    html += '</div>';
    return html;
  }

  function renderModalForm(values) {
    var v = values || {};

    // Quick-add fields (always visible)
    var quickHtml = '';
    quickHtml += buildFieldHtml('name', 'text', 'Name *', v.name, 'Full name');
    quickHtml += buildFieldHtml('phone_mobile', 'tel', 'Mobile Phone', v.phone_mobile, '(801) 555-1234');
    quickHtml += buildFieldHtml('email', 'email', 'Email', v.email, 'email@example.com');
    quickHtml += buildFieldHtml('company', 'text', 'Company', v.company, 'Company name');
    quickHtml += buildFieldHtml('job_title', 'text', 'Job Title', v.job_title, 'Job title');
    quickHtml += buildFieldHtml('relationship', 'select', 'Relationship', v.relationship, '');

    // More Contact
    var moreContactHtml = '';
    moreContactHtml += buildFieldHtml('email_secondary', 'email', 'Email (Secondary)', v.email_secondary, '');
    moreContactHtml += buildFieldHtml('phone_work', 'tel', 'Work Phone', v.phone_work, '');
    moreContactHtml += buildFieldHtml('phone_home', 'tel', 'Home Phone', v.phone_home, '');

    // Location
    var locationHtml = '';
    locationHtml += buildFieldHtml('address', 'text', 'Address', v.address, 'Street address');
    locationHtml += buildFieldHtml('city', 'text', 'City', v.city, '');
    locationHtml += buildFieldHtml('state', 'text', 'State', v.state, '');
    locationHtml += buildFieldHtml('country', 'text', 'Country', v.country, '');
    locationHtml += buildFieldHtml('zip', 'text', 'Zip Code', v.zip, '');
    locationHtml += buildFieldHtml('timezone', 'select', 'Timezone', v.timezone, '');

    // Social
    var socialHtml = '';
    socialHtml += buildFieldHtml('website', 'url', 'Website', v.website, 'https://');
    socialHtml += buildFieldHtml('linkedin', 'url', 'LinkedIn', v.linkedin, 'https://linkedin.com/in/...');
    socialHtml += buildFieldHtml('twitter', 'url', 'Twitter', v.twitter, 'https://twitter.com/...');
    socialHtml += buildFieldHtml('instagram', 'url', 'Instagram', v.instagram, 'https://instagram.com/...');

    // Personal
    var personalHtml = '';
    personalHtml += buildFieldHtml('nickname', 'text', 'Nickname', v.nickname, '');
    personalHtml += buildFieldHtml('birthday', 'date', 'Birthday', v.birthday, '');
    personalHtml += buildFieldHtml('gender', 'select', 'Gender', v.gender, '');
    personalHtml += buildFieldHtml('notes', 'textarea', 'Notes', v.notes, 'Notes about this person...');

    // Relationship Context
    var relContextHtml = '';
    relContextHtml += buildFieldHtml('how_we_met', 'text', 'How We Met', v.how_we_met, '');
    relContextHtml += buildFieldHtml('introduced_by', 'text', 'Introduced By', v.introduced_by, '');
    relContextHtml += buildFieldHtml('tags', 'text', 'Tags', Array.isArray(v.tags) ? v.tags.join(', ') : (v.tags || ''), 'tag1, tag2, ...');
    relContextHtml += buildFieldHtml('important', 'checkbox', 'Important Contact', v.important, '');

    // Advanced
    var advancedHtml = '';
    // Personality
    advancedHtml += '<div class="people-form-subsection-title">Personality</div>';
    advancedHtml += buildFieldHtml('mbti_type', 'select', 'MBTI Type', v.mbti_type, '');
    advancedHtml += buildFieldHtml('enneagram', 'select', 'Enneagram', v.enneagram, '');
    advancedHtml += buildFieldHtml('love_language', 'select', 'Love Language', v.love_language, '');
    advancedHtml += buildFieldHtml('communication_style', 'select', 'Communication Style', v.communication_style, '');
    advancedHtml += buildFieldHtml('preferred_contact_method', 'select', 'Preferred Contact', v.preferred_contact_method, '');
    advancedHtml += buildFieldHtml('best_time_to_reach', 'text', 'Best Time to Reach', v.best_time_to_reach, '');
    // Relationship Dynamics
    advancedHtml += '<div class="people-form-subsection-title">Relationship Dynamics</div>';
    advancedHtml += buildFieldHtml('relationship_strength', 'select', 'Relationship Strength', v.relationship_strength, '');
    advancedHtml += buildFieldHtml('energy_impact', 'select', 'Energy Impact', v.energy_impact, '');
    advancedHtml += buildFieldHtml('trust_level', 'select', 'Trust Level', v.trust_level, '');
    advancedHtml += buildFieldHtml('reciprocity', 'select', 'Reciprocity', v.reciprocity, '');
    advancedHtml += buildFieldHtml('contact_frequency', 'select', 'Contact Frequency', v.contact_frequency, '');
    advancedHtml += buildFieldHtml('desired_frequency', 'select', 'Desired Frequency', v.desired_frequency, '');
    // Personal Reflection
    advancedHtml += '<div class="people-form-subsection-title">Personal Reflection</div>';
    advancedHtml += buildFieldHtml('what_i_admire', 'text', 'What I Admire', v.what_i_admire, '');
    advancedHtml += buildFieldHtml('what_i_can_learn', 'text', 'What I Can Learn', v.what_i_can_learn, '');
    advancedHtml += buildFieldHtml('how_they_make_me_feel', 'text', 'How They Make Me Feel', v.how_they_make_me_feel, '');
    advancedHtml += buildFieldHtml('shared_interests', 'text', 'Shared Interests', Array.isArray(v.shared_interests) ? v.shared_interests.join(', ') : (v.shared_interests || ''), 'interest1, interest2...');
    advancedHtml += buildFieldHtml('conversation_topics', 'text', 'Conversation Topics', Array.isArray(v.conversation_topics) ? v.conversation_topics.join(', ') : (v.conversation_topics || ''), '');
    advancedHtml += buildFieldHtml('sensitive_topics', 'text', 'Sensitive Topics', Array.isArray(v.sensitive_topics) ? v.sensitive_topics.join(', ') : (v.sensitive_topics || ''), '');
    // History
    advancedHtml += '<div class="people-form-subsection-title">History</div>';
    advancedHtml += buildFieldHtml('date_met', 'date', 'Date Met', v.date_met, '');
    advancedHtml += buildFieldHtml('how_relationship_evolved', 'textarea', 'How Relationship Evolved', v.how_relationship_evolved, '');
    advancedHtml += buildFieldHtml('past_conflicts', 'text', 'Past Conflicts', v.past_conflicts, '');
    // Gifts
    advancedHtml += '<div class="people-form-subsection-title">Gifts</div>';
    advancedHtml += buildFieldHtml('gift_ideas', 'text', 'Gift Ideas', Array.isArray(v.gift_ideas) ? v.gift_ideas.join(', ') : (v.gift_ideas || ''), '');
    advancedHtml += buildFieldHtml('favorite_things', 'text', 'Favorite Things', v.favorite_things, '');
    advancedHtml += buildFieldHtml('allergies_dislikes', 'text', 'Allergies/Dislikes', v.allergies_dislikes, '');
    // Goals
    advancedHtml += '<div class="people-form-subsection-title">Goals</div>';
    advancedHtml += buildFieldHtml('relationship_goals', 'textarea', 'Relationship Goals', v.relationship_goals, '');
    advancedHtml += buildFieldHtml('how_i_can_support', 'text', 'How I Can Support', v.how_i_can_support, '');
    advancedHtml += buildFieldHtml('how_they_support_me', 'text', 'How They Support Me', v.how_they_support_me, '');

    var html = '<div class="people-form-quick">' + quickHtml + '</div>';
    html += buildExpandableSection('More Contact', moreContactHtml, false);
    html += buildExpandableSection('Location', locationHtml, false);
    html += buildExpandableSection('Social', socialHtml, false);
    html += buildExpandableSection('Personal', personalHtml, false);
    html += buildExpandableSection('Relationship Context', relContextHtml, false);
    html += buildExpandableSection('Advanced', advancedHtml, false);

    return html;
  }

  function collectFormValues() {
    var form = document.getElementById('people-modal-body');
    if (!form) return {};

    var values = {};

    // Text / email / tel / url / date inputs
    var inputs = form.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="url"], input[type="date"]');
    inputs.forEach(function (inp) {
      if (inp.name && inp.value.trim() !== '') {
        values[inp.name] = inp.value.trim();
      }
    });

    // Selects
    var selects = form.querySelectorAll('select');
    selects.forEach(function (sel) {
      if (sel.name && sel.value !== '') {
        values[sel.name] = sel.value;
      }
    });

    // Checkboxes
    var checkboxes = form.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(function (cb) {
      if (cb.name) {
        values[cb.name] = cb.checked;
      }
    });

    // Textareas
    var textareas = form.querySelectorAll('textarea');
    textareas.forEach(function (ta) {
      if (ta.name && ta.value.trim() !== '') {
        values[ta.name] = ta.value.trim();
      }
    });

    // Multi-select fields (comma-separated text → array)
    var multiFields = ['tags', 'shared_interests', 'conversation_topics', 'sensitive_topics', 'gift_ideas'];
    multiFields.forEach(function (fieldId) {
      var input = form.querySelector('#pf-' + fieldId);
      if (input && input.value.trim()) {
        values[fieldId] = input.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      }
    });

    return values;
  }

  function peopleShowAddModal() {
    peopleState.editingId = null;
    var titleEl = document.getElementById('people-modal-title');
    var bodyEl = document.getElementById('people-modal-body');
    var saveBtn = document.getElementById('people-modal-save');
    var overlay = document.getElementById('people-modal-overlay');

    if (titleEl) titleEl.textContent = 'Add Person';
    if (bodyEl) bodyEl.innerHTML = renderModalForm(null);
    if (saveBtn) saveBtn.onclick = peopleSaveModal;
    if (overlay) overlay.classList.add('visible');

    // Focus name field
    var nameInput = document.getElementById('pf-name');
    if (nameInput) setTimeout(function () { nameInput.focus(); }, 100);
  }

  function peopleShowEditModal(id) {
    var record = peopleState.records.find(function (r) { return r.id === id; });
    if (!record) return;

    peopleState.editingId = id;
    var titleEl = document.getElementById('people-modal-title');
    var bodyEl = document.getElementById('people-modal-body');
    var saveBtn = document.getElementById('people-modal-save');
    var overlay = document.getElementById('people-modal-overlay');

    if (titleEl) titleEl.textContent = 'Edit Person';
    if (bodyEl) bodyEl.innerHTML = renderModalForm(record.values || {});
    if (saveBtn) saveBtn.onclick = peopleSaveModal;
    if (overlay) overlay.classList.add('visible');
  }

  function peopleCloseModal() {
    var overlay = document.getElementById('people-modal-overlay');
    if (overlay) overlay.classList.remove('visible');
    peopleState.editingId = null;
  }

  async function peopleSaveModal() {
    var values = collectFormValues();

    if (!values.name || !values.name.trim()) {
      alert('Name is required.');
      return;
    }

    var saveBtn = document.getElementById('people-modal-save');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }

    try {
      if (peopleState.editingId) {
        // Update existing
        var updated = await peopleBaseApi.update(peopleState.editingId, values);
        // Update local state
        var idx = peopleState.records.findIndex(function (r) { return r.id === peopleState.editingId; });
        if (idx !== -1) {
          peopleState.records[idx] = updated;
          peopleState.currentRecord = updated;
        }
        peopleCloseModal();
        renderDetailContent(updated);
        renderPeopleContactList();
      } else {
        // Create new
        var created = await peopleBaseApi.create(values);
        peopleState.records.push(created);
        peopleCloseModal();
        renderPeopleContactList();
        // Open the newly created record
        peopleOpenDetail(created.id);
      }
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save. Please try again.');
    } finally {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
    }
  }

  // ─── T6: Context Sheet Wiring ─────────────────────────────────────────────────
  document.addEventListener('people:filter', function (e) {
    peopleState.filter = (e.detail && e.detail.filter) || 'all';
    renderPeopleContactList();
  });

  document.addEventListener('people:sort', function (e) {
    peopleState.sort = (e.detail && e.detail.sort) || 'az';
    renderPeopleContactList();
  });

  // ─── Tab Activation & Search ──────────────────────────────────────────────────
  document.addEventListener('tab:activated', function (e) {
    if (e.detail && e.detail.tab === 'people') {
      loadPeopleData();
    }
  });

  // Search input — wire up after DOM is ready
  document.addEventListener('DOMContentLoaded', function () {
    var searchInput = document.getElementById('people-search');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        peopleState.searchQuery = this.value;
        renderPeopleContactList();
      });
    }

    // Modal overlay click-outside to close
    var overlay = document.getElementById('people-modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) peopleCloseModal();
      });
    }
  });

  // ─── Global Exports ───────────────────────────────────────────────────────────
  window.peopleApi = peopleBaseApi;
  window.loadPeople = loadPeopleData;
  window.peopleShowAddModal = peopleShowAddModal;
  window.peopleShowEditModal = peopleShowEditModal;
  window.peopleCloseModal = peopleCloseModal;
  window.peopleOpenDetail = peopleOpenDetail;
  window.peopleCloseDetail = peopleCloseDetail;

})();
