// ============================================
// Core Bases - System-level bases that map to existing tables
// ============================================

const db = require('./schema');
const tasksDb = require('./tasks');
const peopleDb = require('./people');
const organizationsDb = require('./organizations');
const notesDb = require('./notes');
const projectsDb = require('./projects');
const tagsDb = require('./tags');

// Core base definitions - these are defined in code, not in the database
const CORE_BASES = {
  'core-people': {
    id: 'core-people',
    name: 'People',
    description: 'Contacts and relationships - personal, professional, and notable people',
    icon: '👥',
    is_core: true,
    table_name: 'people',
    readme: `# People Base Guide

## Overview
The People base is your comprehensive relationship management system. Track everyone from close friends and family to professional contacts and notable figures. It's designed to help you be more intentional about your relationships by capturing not just contact info, but the deeper context of how you relate to each person.

## Property Categories

### Core Identity
- **Name**: Full name of the contact
- **Nickname**: What you call them or how they prefer to be called
- **Photo URL**: Link to their photo
- **Birthday**: Their birth date (great for reminders)
- **Gender**: Their gender identity

### Contact Methods
- **Email**: Primary email address
- **Email (Secondary)**: Work or alternate email
- **Phone (Mobile/Work/Home)**: Various phone numbers

### Location
- **Address**: Street address
- **City/State/Country**: Geographic location
- **Timezone**: Their timezone (helpful for scheduling calls)

### Professional
- **Company**: Where they work
- **Job Title**: Their role
- **Industry**: The field they work in

### Social & Online
- **Website**: Personal or professional site
- **LinkedIn/Twitter/Instagram**: Social profiles

### Relationship & Context
- **Relationship**: How they relate to you (Family, Friend, Colleague, etc.)
- **How We Met**: The story of your first meeting
- **Tags**: Custom labels for organizing contacts
- **Introduced By**: Who connected you

### Notes & Tracking
- **Notes**: Free-form notes about this person
- **Last Contacted**: When you last reached out
- **Follow Up**: Next follow-up date
- **Important**: Flag for key contacts

### Personality & Communication
- **MBTI Type**: Their Myers-Briggs personality type
- **Enneagram**: Their Enneagram type
- **Love Language**: How they prefer to give/receive appreciation
- **Communication Style**: Direct, Diplomatic, Analytical, or Expressive
- **Preferred Contact Method**: How they like to be reached
- **Best Time to Reach**: When they're most available

### Relationship Dynamics
- **Relationship Strength**: How strong your connection is
- **Energy Impact**: How interactions affect your energy
- **Trust Level**: Your level of trust with them
- **Reciprocity**: Balance of give and take
- **Contact Frequency**: How often you currently connect
- **Desired Frequency**: How often you'd like to connect

### Personal Reflection
- **What I Admire**: Qualities you appreciate about them
- **What I Can Learn**: Skills or traits to learn from them
- **How They Make Me Feel**: Emotional impact of the relationship
- **Shared Interests**: Common hobbies or topics
- **Conversation Topics**: Good things to discuss
- **Sensitive Topics**: Areas to avoid

### History & Milestones
- **Date Met**: When you first met
- **How Relationship Evolved**: Journey of your connection
- **Past Conflicts**: Issues you've worked through

### Gifts & Thoughtfulness
- **Gift Ideas**: Present ideas for them
- **Favorite Things**: What they love
- **Allergies/Dislikes**: What to avoid

### Relationship Goals
- **Relationship Goals**: Where you want the relationship to go
- **How I Can Support**: Ways you can help them
- **How They Support Me**: What they bring to your life

## Use Cases

### Personal Contacts
Track family traditions, remember important dates, note conversation topics for your next call. Use the energy impact and relationship strength fields to be intentional about nurturing key relationships.

### Professional Contacts
Keep track of LinkedIn connections, note how you met at conferences, track follow-up dates. The industry and company fields help you remember context for networking.

### Celebrities/Public Figures
Track notable people you admire - authors, thought leaders, etc. Note what you can learn from them and their public work.

## Tips & Best Practices
- Set the "Important" flag for your inner circle
- Use Tags to create custom groupings (e.g., "Book Club", "College Friends")
- Review "Last Contacted" regularly to stay in touch with people who matter
- The "What I Can Learn" field is great for mentors and role models
- Use "Sensitive Topics" to avoid awkward conversations`,
    properties: [
      // Core Identity
      { id: 'name', name: 'Name', type: 'text', position: 0, width: 200 },
      { id: 'nickname', name: 'Nickname', type: 'text', position: 1, width: 120 },
      { id: 'photo_url', name: 'Photo', type: 'url', position: 2, width: 100 },
      { id: 'birthday', name: 'Birthday', type: 'date', position: 3, width: 120 },
      { id: 'gender', name: 'Gender', type: 'select', position: 4, width: 120, options: [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
        { value: 'non-binary', label: 'Non-binary' },
        { value: 'other', label: 'Other' },
        { value: 'prefer-not-to-say', label: 'Prefer not to say' }
      ]},
      // Contact Methods
      { id: 'email', name: 'Email', type: 'text', position: 5, width: 200 },
      { id: 'email_secondary', name: 'Email (Secondary)', type: 'text', position: 6, width: 200 },
      { id: 'phone_mobile', name: 'Phone (Mobile)', type: 'text', position: 7, width: 140 },
      { id: 'phone_work', name: 'Phone (Work)', type: 'text', position: 8, width: 140 },
      { id: 'phone_home', name: 'Phone (Home)', type: 'text', position: 9, width: 140 },
      // Location
      { id: 'address', name: 'Address', type: 'text', position: 10, width: 250 },
      { id: 'city', name: 'City', type: 'text', position: 11, width: 120 },
      { id: 'state', name: 'State', type: 'text', position: 12, width: 100 },
      { id: 'country', name: 'Country', type: 'text', position: 13, width: 120 },
      { id: 'zip', name: 'Zip Code', type: 'text', position: 14, width: 100 },
      { id: 'timezone', name: 'Timezone', type: 'select', position: 14, width: 180, options: [
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
      ]},
      // Professional
      { id: 'company', name: 'Company', type: 'text', position: 15, width: 180 },
      { id: 'job_title', name: 'Job Title', type: 'text', position: 16, width: 180 },
      { id: 'industry', name: 'Industry', type: 'text', position: 17, width: 150 },
      // Social & Online
      { id: 'website', name: 'Website', type: 'url', position: 18, width: 200 },
      { id: 'linkedin', name: 'LinkedIn', type: 'url', position: 19, width: 200 },
      { id: 'twitter', name: 'Twitter', type: 'url', position: 20, width: 200 },
      { id: 'instagram', name: 'Instagram', type: 'url', position: 21, width: 200 },
      // Relationship & Context
      { id: 'relationship', name: 'Relationship', type: 'select', position: 22, width: 140, options: [
        { value: 'family', label: 'Family' },
        { value: 'friend', label: 'Friend' },
        { value: 'colleague', label: 'Colleague' },
        { value: 'client', label: 'Client' },
        { value: 'vendor', label: 'Vendor' },
        { value: 'acquaintance', label: 'Acquaintance' },
        { value: 'celebrity', label: 'Celebrity' },
        { value: 'other', label: 'Other' }
      ]},
      { id: 'how_we_met', name: 'How We Met', type: 'text', position: 23, width: 250 },
      { id: 'tags', name: 'Tags', type: 'multi_select', position: 24, width: 200, options: [] },
      { id: 'introduced_by', name: 'Introduced By', type: 'text', position: 25, width: 150 },
      // Notes & Tracking
      { id: 'notes', name: 'Notes', type: 'text', position: 26, width: 300 },
      { id: 'last_contacted', name: 'Last Contacted', type: 'date', position: 27, width: 140 },
      { id: 'follow_up', name: 'Follow Up', type: 'date', position: 28, width: 120 },
      { id: 'important', name: 'Important', type: 'checkbox', position: 29, width: 100 },
      // Personality & Communication
      { id: 'mbti_type', name: 'MBTI Type', type: 'select', position: 30, width: 120, options: [
        { value: 'INTJ', label: 'INTJ' }, { value: 'INTP', label: 'INTP' },
        { value: 'ENTJ', label: 'ENTJ' }, { value: 'ENTP', label: 'ENTP' },
        { value: 'INFJ', label: 'INFJ' }, { value: 'INFP', label: 'INFP' },
        { value: 'ENFJ', label: 'ENFJ' }, { value: 'ENFP', label: 'ENFP' },
        { value: 'ISTJ', label: 'ISTJ' }, { value: 'ISFJ', label: 'ISFJ' },
        { value: 'ESTJ', label: 'ESTJ' }, { value: 'ESFJ', label: 'ESFJ' },
        { value: 'ISTP', label: 'ISTP' }, { value: 'ISFP', label: 'ISFP' },
        { value: 'ESTP', label: 'ESTP' }, { value: 'ESFP', label: 'ESFP' }
      ]},
      { id: 'enneagram', name: 'Enneagram', type: 'select', position: 31, width: 140, options: [
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
      ]},
      { id: 'love_language', name: 'Love Language', type: 'select', position: 32, width: 180, options: [
        { value: 'words_of_affirmation', label: 'Words of Affirmation' },
        { value: 'acts_of_service', label: 'Acts of Service' },
        { value: 'receiving_gifts', label: 'Receiving Gifts' },
        { value: 'quality_time', label: 'Quality Time' },
        { value: 'physical_touch', label: 'Physical Touch' }
      ]},
      { id: 'communication_style', name: 'Communication Style', type: 'select', position: 33, width: 160, options: [
        { value: 'direct', label: 'Direct' },
        { value: 'diplomatic', label: 'Diplomatic' },
        { value: 'analytical', label: 'Analytical' },
        { value: 'expressive', label: 'Expressive' }
      ]},
      { id: 'preferred_contact_method', name: 'Preferred Contact', type: 'select', position: 34, width: 160, options: [
        { value: 'call', label: 'Call' },
        { value: 'text', label: 'Text' },
        { value: 'email', label: 'Email' },
        { value: 'in_person', label: 'In-person' },
        { value: 'video_chat', label: 'Video Chat' }
      ]},
      { id: 'best_time_to_reach', name: 'Best Time to Reach', type: 'text', position: 35, width: 150 },
      // Relationship Dynamics
      { id: 'relationship_strength', name: 'Relationship Strength', type: 'select', position: 36, width: 160, options: [
        { value: 'strong', label: 'Strong' },
        { value: 'good', label: 'Good' },
        { value: 'neutral', label: 'Neutral' },
        { value: 'distant', label: 'Distant' },
        { value: 'strained', label: 'Strained' }
      ]},
      { id: 'energy_impact', name: 'Energy Impact', type: 'select', position: 37, width: 140, options: [
        { value: 'energizing', label: 'Energizing' },
        { value: 'neutral', label: 'Neutral' },
        { value: 'draining', label: 'Draining' }
      ]},
      { id: 'trust_level', name: 'Trust Level', type: 'select', position: 38, width: 120, options: [
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' },
        { value: 'building', label: 'Building' }
      ]},
      { id: 'reciprocity', name: 'Reciprocity', type: 'select', position: 39, width: 150, options: [
        { value: 'balanced', label: 'Balanced' },
        { value: 'i_give_more', label: 'I Give More' },
        { value: 'they_give_more', label: 'They Give More' }
      ]},
      { id: 'contact_frequency', name: 'Contact Frequency', type: 'select', position: 40, width: 150, options: [
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' },
        { value: 'quarterly', label: 'Quarterly' },
        { value: 'yearly', label: 'Yearly' },
        { value: 'rarely', label: 'Rarely' }
      ]},
      { id: 'desired_frequency', name: 'Desired Frequency', type: 'select', position: 41, width: 150, options: [
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' },
        { value: 'quarterly', label: 'Quarterly' },
        { value: 'yearly', label: 'Yearly' },
        { value: 'rarely', label: 'Rarely' }
      ]},
      // Personal Reflection
      { id: 'what_i_admire', name: 'What I Admire', type: 'text', position: 42, width: 250 },
      { id: 'what_i_can_learn', name: 'What I Can Learn', type: 'text', position: 43, width: 250 },
      { id: 'how_they_make_me_feel', name: 'How They Make Me Feel', type: 'text', position: 44, width: 200 },
      { id: 'shared_interests', name: 'Shared Interests', type: 'multi_select', position: 45, width: 200, options: [] },
      { id: 'conversation_topics', name: 'Conversation Topics', type: 'multi_select', position: 46, width: 200, options: [] },
      { id: 'sensitive_topics', name: 'Sensitive Topics', type: 'multi_select', position: 47, width: 200, options: [] },
      // History & Milestones
      { id: 'date_met', name: 'Date Met', type: 'date', position: 48, width: 120 },
      { id: 'how_relationship_evolved', name: 'How Relationship Evolved', type: 'text', position: 49, width: 300 },
      { id: 'past_conflicts', name: 'Past Conflicts', type: 'text', position: 50, width: 250 },
      // Gifts & Thoughtfulness
      { id: 'gift_ideas', name: 'Gift Ideas', type: 'multi_select', position: 51, width: 200, options: [] },
      { id: 'favorite_things', name: 'Favorite Things', type: 'text', position: 52, width: 200 },
      { id: 'allergies_dislikes', name: 'Allergies/Dislikes', type: 'text', position: 53, width: 200 },
      // Relationship Goals
      { id: 'relationship_goals', name: 'Relationship Goals', type: 'text', position: 54, width: 250 },
      { id: 'how_i_can_support', name: 'How I Can Support', type: 'text', position: 55, width: 250 },
      { id: 'how_they_support_me', name: 'How They Support Me', type: 'text', position: 56, width: 250 },
      { id: 'organization', name: 'Organization', type: 'relation', position: 57, width: 200, options: { relatedBaseId: 'core-organizations', displayProperty: 'name', allowMultiple: false, reversePropertyId: 'people' }}
    ]
  },
  'core-organizations': {
    id: 'core-organizations',
    name: 'Organizations',
    description: 'Companies, agencies, and organizations',
    icon: '🏢',
    is_core: true,
    table_name: 'organizations',
    properties: [
      { id: 'name', name: 'Name', type: 'text', position: 0, width: 200 },
      { id: 'type', name: 'Type', type: 'select', position: 1, width: 140, options: [
        { value: 'business', label: 'Business' },
        { value: 'agency', label: 'Agency' },
        { value: 'insurance', label: 'Insurance' },
        { value: 'nonprofit', label: 'Nonprofit' },
        { value: 'government', label: 'Government' },
        { value: 'contractor', label: 'Contractor' },
        { value: 'vendor', label: 'Vendor' },
        { value: 'other', label: 'Other' }
      ]},
      { id: 'industry', name: 'Industry', type: 'text', position: 2, width: 150 },
      { id: 'description', name: 'Description', type: 'text', position: 3, width: 300 },
      { id: 'website', name: 'Website', type: 'url', position: 4, width: 200 },
      { id: 'linkedin', name: 'LinkedIn', type: 'url', position: 5, width: 200 },
      { id: 'phone', name: 'Phone', type: 'text', position: 6, width: 140 },
      { id: 'email', name: 'Email', type: 'text', position: 7, width: 200 },
      { id: 'address', name: 'Address', type: 'text', position: 8, width: 250 },
      { id: 'city', name: 'City', type: 'text', position: 9, width: 120 },
      { id: 'state', name: 'State', type: 'text', position: 10, width: 100 },
      { id: 'country', name: 'Country', type: 'text', position: 11, width: 120 },
      { id: 'zip', name: 'Zip Code', type: 'text', position: 14, width: 100 },
      { id: 'founded_year', name: 'Founded', type: 'number', position: 12, width: 100 },
      { id: 'employee_count', name: 'Employees', type: 'number', position: 13, width: 100 },
      { id: 'notes', name: 'Notes', type: 'text', position: 14, width: 300 },
      { id: 'tags', name: 'Tags', type: 'multi_select', position: 15, width: 200, options: [] },
      { id: 'important', name: 'Important', type: 'checkbox', position: 16, width: 100 },
      { id: 'people', name: 'People', type: 'relation', position: 17, width: 200, options: {
        relatedBaseId: 'core-people',
        displayProperty: 'name',
        allowMultiple: true,
        isReverse: true,
        reversePropertyId: 'organization'
      }}
    ]
  },
  'core-tasks': {
    id: 'core-tasks',
    name: 'Tasks',
    description: 'Personal tasks synced with the Tasks dashboard',
    icon: '✅',
    is_core: true,
    table_name: 'tasks',
    properties: [
      { id: 'title', name: 'Title', type: 'text', position: 0, width: 250 },
      { id: 'description', name: 'Description', type: 'text', position: 1, width: 300 },
      { id: 'status', name: 'Status', type: 'select', position: 2, width: 120, options: [
        { value: 'todo', label: 'To Do' },
        { value: 'doing', label: 'Doing' },
        { value: 'done', label: 'Done' }
      ]},
      { id: 'my_day', name: 'My Day', type: 'checkbox', position: 3, width: 100 },
      { id: 'due_date', name: 'Due Date', type: 'date', position: 4, width: 120 },
      { id: 'due_time', name: 'Due Time', type: 'time', position: 5, width: 100 },
      { id: 'due_time_end', name: 'End Time', type: 'time', position: 6, width: 100 },
      { id: 'snooze_date', name: 'Snooze Until', type: 'date', position: 7, width: 120 },
      { id: 'priority', name: 'Priority', type: 'select', position: 8, width: 120, options: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' }
      ]},
      { id: 'energy', name: 'Energy', type: 'select', position: 9, width: 100, options: [
        { value: 'low', label: 'Low' },
        { value: 'high', label: 'High' }
      ]},
      { id: 'location', name: 'Location', type: 'select', position: 10, width: 120, options: [
        { value: 'home', label: 'Home' },
        { value: 'office', label: 'Office' },
        { value: 'errand', label: 'Errand' }
      ]},
      { id: 'important', name: 'Important', type: 'checkbox', position: 11, width: 100 },
      { id: 'completed', name: 'Completed', type: 'checkbox', position: 12, width: 100 },
      { id: 'completed_at', name: 'Completed At', type: 'date', position: 13, width: 120 },
      { id: 'recurring', name: 'Recurring', type: 'select', position: 14, width: 120, options: [
        { value: 'daily', label: 'Daily' },
        { value: 'weekdays', label: 'Weekdays' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'biweekly', label: 'Biweekly' },
        { value: 'monthly', label: 'Monthly' },
        { value: 'yearly', label: 'Yearly' }
      ]},
      { id: 'recurring_days', name: 'Recurring Days', type: 'multi_select', position: 15, width: 150, options: [
        { value: 'sun', label: 'Sun' },
        { value: 'mon', label: 'Mon' },
        { value: 'tue', label: 'Tue' },
        { value: 'wed', label: 'Wed' },
        { value: 'thu', label: 'Thu' },
        { value: 'fri', label: 'Fri' },
        { value: 'sat', label: 'Sat' }
      ]},
      { id: 'project_id', name: 'Project', type: 'relation', position: 16, width: 150, options: {
        relatedBaseId: 'core-projects',
        displayProperty: 'name'
      }},
      { id: 'list_id', name: 'List', type: 'text', position: 17, width: 150 },
      { id: 'subtasks', name: 'Subtasks', type: 'text', position: 18, width: 200 },
      { id: 'people_ids', name: 'People', type: 'relation', position: 19, width: 200, options: {
        relatedBaseId: 'core-people',
        displayProperty: 'name',
        allowMultiple: true
      }},
      { id: 'note_ids', name: 'Notes', type: 'relation', position: 20, width: 200, options: {
        relatedBaseId: 'core-notes',
        displayProperty: 'name',
        allowMultiple: true
      }}
    ]
  },
  'core-notes': {
    id: 'core-notes',
    name: 'Notes',
    description: 'Capture ideas, meeting notes, web clips, and more',
    icon: '📝',
    is_core: true,
    table_name: 'notes',
    readme: `# Notes Base Guide

## Overview
The Notes base is your central hub for capturing and organizing all types of written content.

## Note Types
- **Journal**: Personal reflections and daily entries
- **Meeting**: Notes from meetings and calls
- **Web Clip**: Saved content from the web
- **Reference**: Reference material and documentation
- **Idea**: Quick ideas and brainstorms
- **Plan**: Plans and strategies

## Tips
- Use Review Date for notes you want to revisit
- Archive notes instead of deleting them
- Use Tags to create cross-cutting categories
- Favorite your most-referenced notes`,
    properties: [
      { id: 'name', name: 'Name', type: 'text', position: 0, width: 250 },
      { id: 'type', name: 'Type', type: 'select', position: 1, width: 120, options: [
        { value: 'journal', label: 'Journal' },
        { value: 'meeting', label: 'Meeting' },
        { value: 'web_clip', label: 'Web Clip' },
        { value: 'reference', label: 'Reference' },
        { value: 'idea', label: 'Idea' },
        { value: 'plan', label: 'Plan' },
        { value: 'definition', label: 'Definition' }
      ]},
      { id: 'content', name: 'Content', type: 'text', position: 2, width: 400 },
      { id: 'domain', name: 'Domain', type: 'multi_select', position: 3, width: 200, options: [
        { value: 'javascript', label: 'JavaScript' },
        { value: 'powershell', label: 'PowerShell' },
        { value: 'css', label: 'CSS' },
        { value: 'html', label: 'HTML' },
        { value: 'react', label: 'React' },
        { value: 'nodejs', label: 'Node.js' },
        { value: 'git', label: 'Git' },
        { value: 'docker', label: 'Docker' },
        { value: 'typescript', label: 'TypeScript' },
        { value: 'python', label: 'Python' },
        { value: 'cpp', label: 'C++' },
        { value: 'linux_cli', label: 'Linux/CLI' },
        { value: 'ui_ux_design', label: 'UI/UX Design' },
        { value: 'databases', label: 'Databases' },
        { value: 'networking', label: 'Networking' },
        { value: 'general_dev', label: 'General Dev' },
        { value: 'iicrc_s500', label: 'IICRC S500' },
        { value: 'estimating_xactimate', label: 'Estimating/Xactimate' },
        { value: 'restoration_general', label: 'Restoration General' }
      ]},
      { id: 'url', name: 'URL', type: 'url', position: 4, width: 200 },
      { id: 'note_date', name: 'Note Date', type: 'date', position: 5, width: 120 },
      { id: 'review_date', name: 'Review Date', type: 'date', position: 6, width: 120 },
      { id: 'favorite', name: 'Favorite', type: 'checkbox', position: 7, width: 100 },
      { id: 'archived', name: 'Archived', type: 'checkbox', position: 8, width: 100 },
      { id: 'tags', name: 'Tags', type: 'multi_select', position: 9, width: 200, options: [] },
      { id: 'project_id', name: 'Project', type: 'text', position: 10, width: 150 },
      { id: 'attachments', name: 'Attachments', type: 'files', position: 11, width: 200 }
    ]
  },
  'core-projects': {
    id: 'core-projects',
    name: 'Projects',
    description: 'Track projects with status, deadlines, and goals',
    icon: '🚀',
    is_core: true,
    table_name: 'projects',
    readme: `# Projects Base Guide

## Overview
The Projects base helps you track all your projects from inception to completion.

## Status Options
- **Planned**: Not started yet
- **On Hold**: Paused for now
- **Doing**: Actively working on it
- **Ongoing**: Maintenance or perpetual projects
- **Done**: Completed!

## Tips
- Set target deadlines to stay accountable
- Use review notes for project retrospectives
- Archive completed projects to keep your list clean
- Link projects to goals for bigger-picture tracking`,
    properties: [
      { id: 'name', name: 'Name', type: 'text', position: 0, width: 250 },
      { id: 'status', name: 'Status', type: 'select', position: 1, width: 120, options: [
        { value: 'planned', label: 'Planned' },
        { value: 'on_hold', label: 'On Hold' },
        { value: 'doing', label: 'Doing' },
        { value: 'ongoing', label: 'Ongoing' },
        { value: 'done', label: 'Done' }
      ]},
      { id: 'target_deadline', name: 'Target Deadline', type: 'date', position: 2, width: 140 },
      { id: 'completed_date', name: 'Completed Date', type: 'date', position: 3, width: 140 },
      { id: 'archived', name: 'Archived', type: 'checkbox', position: 4, width: 100 },
      { id: 'review_notes', name: 'Review Notes', type: 'text', position: 5, width: 300 },
      { id: 'tag_id', name: 'Tag', type: 'text', position: 6, width: 150 },
      { id: 'goal_id', name: 'Goal', type: 'text', position: 7, width: 150 }
    ]
  },
  'core-tags': {
    id: 'core-tags',
    name: 'Tags',
    description: 'Organize with Areas, Resources, and Entities (PARA method)',
    icon: '🏷️',
    is_core: true,
    table_name: 'tags',
    readme: `# Tags Base Guide

## Overview
Tags help you organize and categorize your content using the PARA method.

## Tag Types (PARA Method)

### Areas
Ongoing spheres of responsibility (Home, Work, Health)

### Resources
Topics of ongoing interest (Programming, Cooking, Finance)

### Entities
Meta-collections or specific things (Apps, Books, Essays)

## Tips
- Use Favorite to surface frequently-used tags
- Archive tags instead of deleting
- Add URLs to link to external resources`,
    properties: [
      { id: 'name', name: 'Name', type: 'text', position: 0, width: 250 },
      { id: 'type', name: 'Type', type: 'select', position: 1, width: 120, options: [
        { value: 'area', label: 'Area' },
        { value: 'resource', label: 'Resource' },
        { value: 'entity', label: 'Entity' }
      ]},
      { id: 'description', name: 'Description', type: 'text', position: 2, width: 300 },
      { id: 'url', name: 'URL', type: 'url', position: 3, width: 200 },
      { id: 'parent_tag_id', name: 'Parent Tag', type: 'text', position: 4, width: 150 },
      { id: 'favorite', name: 'Favorite', type: 'checkbox', position: 5, width: 100 },
      { id: 'archived', name: 'Archived', type: 'checkbox', position: 6, width: 100 }
    ]
  }
};

/**
 * Get all core bases available to a user
 */
async function getAllCoreBases(userId) {
  const results = [];
  for (const base of Object.values(CORE_BASES)) {
    results.push({
      ...base,
      user_id: userId,
      record_count: await getRecordCount(base.id, userId),
      column_count: base.properties.length
    });
  }
  return results;
}

/**
 * Get a single core base by ID
 */
function getCoreBase(baseId) {
  return CORE_BASES[baseId] || null;
}

/**
 * Get record count for a core base
 */
async function getRecordCount(baseId, userId) {
  if (baseId === 'core-tasks') {
    const result = await db.getOne('SELECT COUNT(*) as count FROM tasks WHERE user_id = $1', [userId]);
    return result ? result.count : 0;
  }
  if (baseId === 'core-people') {
    return await peopleDb.getPeopleCount(userId);
  }
  if (baseId === 'core-organizations') {
    return await organizationsDb.getOrganizationCount(userId);
  }
  if (baseId === 'core-notes') {
    return await notesDb.getNoteCount(userId);
  }
  if (baseId === 'core-projects') {
    return await projectsDb.getProjectCount(userId);
  }
  if (baseId === 'core-tags') {
    return await tagsDb.getTagCount(userId);
  }
  return 0;
}

/**
 * Get records for a core base
 */
async function getCoreBaseRecords(baseId, userId) {
  if (baseId === 'core-tasks') {
    const rows = await db.getAll(`
      SELECT id, title, description, status, my_day, due_date, due_time, due_time_end,
             snooze_date, priority, energy, location, important, completed, completed_at,
             recurring, recurring_days, project_id, list_id, people_ids, note_ids, subtasks, user_id, created_at, updated_at
      FROM tasks
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId]);

    return rows.map((row, index) => ({
      id: row.id,
      base_id: baseId,
      global_id: index + 1,
      position: index,
      created_at: row.created_at,
      updated_at: row.updated_at,
      values: {
        title: row.title || '',
        description: row.description || '',
        status: row.status || 'todo',
        my_day: !!row.my_day,
        due_date: row.due_date || '',
        due_time: row.due_time || '',
        due_time_end: row.due_time_end || '',
        snooze_date: row.snooze_date || '',
        priority: row.priority || '',
        energy: row.energy || '',
        location: row.location || '',
        important: !!row.important,
        completed: !!row.completed,
        completed_at: row.completed_at || '',
        recurring: row.recurring || '',
        recurring_days: safeJsonParse(row.recurring_days, []),
        project_id: row.project_id || '',
        list_id: row.list_id || '',
        people_ids: safeJsonParse(row.people_ids, []),
        note_ids: safeJsonParse(row.note_ids, []),
        subtasks: safeJsonParse(row.subtasks, [])
      }
    }));
  }

  if (baseId === 'core-people') {
    const rows = await peopleDb.getAllPeople(userId);

    return rows.map((row, index) => ({
      id: row.id,
      base_id: baseId,
      global_id: index + 1,
      position: index,
      created_at: row.created_at,
      updated_at: row.updated_at,
      values: {
        name: row.name || '',
        nickname: row.nickname || '',
        photo_url: row.photo_url || '',
        birthday: row.birthday || '',
        gender: row.gender || '',
        email: row.email || '',
        email_secondary: row.email_secondary || '',
        phone_mobile: row.phone_mobile || '',
        phone_work: row.phone_work || '',
        phone_home: row.phone_home || '',
        address: row.address || '',
        city: row.city || '',
        state: row.state || '',
        country: row.country || '',
        zip: row.zip || '',
        timezone: row.timezone || '',
        company: row.company || '',
        job_title: row.job_title || '',
        industry: row.industry || '',
        website: row.website || '',
        linkedin: row.linkedin || '',
        twitter: row.twitter || '',
        instagram: row.instagram || '',
        relationship: row.relationship || '',
        how_we_met: row.how_we_met || '',
        tags: safeJsonParse(row.tags, []),
        introduced_by: row.introduced_by || '',
        notes: row.notes || '',
        last_contacted: row.last_contacted || '',
        follow_up: row.follow_up || '',
        important: !!row.important,
        mbti_type: row.mbti_type || '',
        enneagram: row.enneagram || '',
        love_language: row.love_language || '',
        communication_style: row.communication_style || '',
        preferred_contact_method: row.preferred_contact_method || '',
        best_time_to_reach: row.best_time_to_reach || '',
        relationship_strength: row.relationship_strength || '',
        energy_impact: row.energy_impact || '',
        trust_level: row.trust_level || '',
        reciprocity: row.reciprocity || '',
        contact_frequency: row.contact_frequency || '',
        desired_frequency: row.desired_frequency || '',
        what_i_admire: row.what_i_admire || '',
        what_i_can_learn: row.what_i_can_learn || '',
        how_they_make_me_feel: row.how_they_make_me_feel || '',
        shared_interests: safeJsonParse(row.shared_interests, []),
        conversation_topics: safeJsonParse(row.conversation_topics, []),
        sensitive_topics: safeJsonParse(row.sensitive_topics, []),
        date_met: row.date_met || '',
        how_relationship_evolved: row.how_relationship_evolved || '',
        past_conflicts: row.past_conflicts || '',
        gift_ideas: safeJsonParse(row.gift_ideas, []),
        favorite_things: row.favorite_things || '',
        allergies_dislikes: row.allergies_dislikes || '',
        relationship_goals: row.relationship_goals || '',
        how_i_can_support: row.how_i_can_support || '',
        how_they_support_me: row.how_they_support_me || '',
        organization: row.organization_id || null
      }
    }));
  }

  if (baseId === 'core-organizations') {
    const rows = await organizationsDb.getAllOrganizations(userId);
    
    const results = [];
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      results.push({
        id: row.id,
        base_id: baseId,
        global_id: index + 1,
        position: index,
        created_at: row.created_at,
        updated_at: row.updated_at,
        values: await mapOrganizationToValues(row, userId)
      });
    }
    return results;
  }

  if (baseId === 'core-notes') {
    const rows = await notesDb.getAllNotes(userId);
    
    return rows.map((row, index) => ({
      id: row.id,
      base_id: baseId,
      global_id: index + 1,
      position: index,
      created_at: row.created_at,
      updated_at: row.updated_at,
      values: mapNoteToValues(row)
    }));
  }

  if (baseId === 'core-projects') {
    const rows = await projectsDb.getAllProjects(userId);
    
    return rows.map((row, index) => ({
      id: row.id,
      base_id: baseId,
      global_id: index + 1,
      position: index,
      created_at: row.created_at,
      updated_at: row.updated_at,
      values: mapProjectToValues(row)
    }));
  }

  if (baseId === 'core-tags') {
    const rows = await tagsDb.getAllTags(userId);
    
    return rows.map((row, index) => ({
      id: row.id,
      base_id: baseId,
      global_id: index + 1,
      position: index,
      created_at: row.created_at,
      updated_at: row.updated_at,
      values: {
        name: row.name || '',
        type: row.type || 'resource',
        description: row.description || '',
        url: row.url || '',
        parent_tag_id: row.parent_tag_id || '',
        favorite: !!row.favorite,
        archived: !!row.archived
      }
    }));
  }

  return [];
}

/**
 * Safely parse JSON, return default on error
 */
function safeJsonParse(str, defaultVal) {
  if (!str) return defaultVal;
  try {
    return JSON.parse(str);
  } catch (e) {
    return defaultVal;
  }
}

/**
 * Map note database row to values object
 */
function mapNoteToValues(note) {
  return {
    name: note.name || '',
    type: note.type || '',
    content: note.content || '',
    url: note.url || '',
    note_date: note.note_date || '',
    review_date: note.review_date || '',
    favorite: !!note.favorite,
    archived: !!note.archived,
    tags: safeJsonParse(note.tags, []),
    project_id: note.project_id || '',
    attachments: safeJsonParse(note.attachments, []),
    domain: safeJsonParse(note.domain, [])
  };
}

/**
 * Map project database row to values object
 */
function mapProjectToValues(project) {
  return {
    name: project.name || '',
    status: project.status || 'planned',
    target_deadline: project.target_deadline || '',
    completed_date: project.completed_date || '',
    archived: !!project.archived,
    review_notes: project.review_notes || '',
    tag_id: project.tag_id || '',
    goal_id: project.goal_id || ''
  };
}

/**
 * Map organization database row to values object
 */
async function mapOrganizationToValues(org, userId) {
  const people = await organizationsDb.getPeopleByOrganization(org.id, userId);
  return {
    name: org.name || '',
    type: org.type || '',
    industry: org.industry || '',
    description: org.description || '',
    website: org.website || '',
    linkedin: org.linkedin || '',
    phone: org.phone || '',
    email: org.email || '',
    address: org.address || '',
    city: org.city || '',
    state: org.state || '',
    country: org.country || '',
    founded_year: org.founded_year || null,
    employee_count: org.employee_count || null,
    notes: org.notes || '',
    tags: safeJsonParse(org.tags, []),
    important: !!org.important,
    people: people.map(p => p.id)
  };
}

/**
 * Map person database row to values object
 */
function mapPersonToValues(person) {
  return {
    name: person.name || '',
    nickname: person.nickname || '',
    photo_url: person.photo_url || '',
    birthday: person.birthday || '',
    gender: person.gender || '',
    email: person.email || '',
    email_secondary: person.email_secondary || '',
    phone_mobile: person.phone_mobile || '',
    phone_work: person.phone_work || '',
    phone_home: person.phone_home || '',
    address: person.address || '',
    city: person.city || '',
    state: person.state || '',
    country: person.country || '',
    zip: person.zip || '',
    timezone: person.timezone || '',
    company: person.company || '',
    job_title: person.job_title || '',
    industry: person.industry || '',
    website: person.website || '',
    linkedin: person.linkedin || '',
    twitter: person.twitter || '',
    instagram: person.instagram || '',
    relationship: person.relationship || '',
    how_we_met: person.how_we_met || '',
    tags: safeJsonParse(person.tags, []),
    introduced_by: person.introduced_by || '',
    notes: person.notes || '',
    last_contacted: person.last_contacted || '',
    follow_up: person.follow_up || '',
    important: !!person.important,
    mbti_type: person.mbti_type || '',
    enneagram: person.enneagram || '',
    love_language: person.love_language || '',
    communication_style: person.communication_style || '',
    preferred_contact_method: person.preferred_contact_method || '',
    best_time_to_reach: person.best_time_to_reach || '',
    relationship_strength: person.relationship_strength || '',
    energy_impact: person.energy_impact || '',
    trust_level: person.trust_level || '',
    reciprocity: person.reciprocity || '',
    contact_frequency: person.contact_frequency || '',
    desired_frequency: person.desired_frequency || '',
    what_i_admire: person.what_i_admire || '',
    what_i_can_learn: person.what_i_can_learn || '',
    how_they_make_me_feel: person.how_they_make_me_feel || '',
    shared_interests: safeJsonParse(person.shared_interests, []),
    conversation_topics: safeJsonParse(person.conversation_topics, []),
    sensitive_topics: safeJsonParse(person.sensitive_topics, []),
    date_met: person.date_met || '',
    how_relationship_evolved: person.how_relationship_evolved || '',
    past_conflicts: person.past_conflicts || '',
    gift_ideas: safeJsonParse(person.gift_ideas, []),
    favorite_things: person.favorite_things || '',
    allergies_dislikes: person.allergies_dislikes || '',
    relationship_goals: person.relationship_goals || '',
    how_i_can_support: person.how_i_can_support || '',
    how_they_support_me: person.how_they_support_me || '',
    organization: person.organization_id || null
  };
}

/**
 * Create a record in a core base
 */
async function createCoreBaseRecord(baseId, values, userId) {
  if (baseId === 'core-tasks') {
    const task = await tasksDb.createTask({
      title: values.title || 'Untitled Task',
      description: values.description || '',
      status: values.status || 'todo',
      my_day: values.my_day || false,
      due_date: values.due_date || null,
      due_time: values.due_time || null,
      due_time_end: values.due_time_end || null,
      snooze_date: values.snooze_date || null,
      priority: values.priority || null,
      energy: values.energy || null,
      location: values.location || null,
      important: values.important || false,
      recurring: values.recurring || null,
      recurring_days: values.recurring_days || [],
      project_id: values.project_id || null,
      list_id: values.list_id || null,
      people_ids: values.people_ids || [],
      note_ids: values.note_ids || []
    }, userId);

    return {
      id: task.id,
      base_id: baseId,
      global_id: 0,
      position: 0,
      created_at: task.created_at,
      updated_at: task.updated_at,
      values: {
        title: task.title,
        description: task.description || '',
        status: task.status || 'todo',
        my_day: !!task.my_day,
        due_date: task.due_date || '',
        due_time: task.due_time || '',
        due_time_end: task.due_time_end || '',
        snooze_date: task.snooze_date || '',
        priority: task.priority || '',
        energy: task.energy || '',
        location: task.location || '',
        important: !!task.important,
        completed: !!task.completed,
        completed_at: task.completed_at || '',
        recurring: task.recurring || '',
        recurring_days: task.recurring_days || [],
        project_id: task.project_id || '',
        list_id: task.list_id || '',
        people_ids: task.people_ids || [],
        note_ids: task.note_ids || [],
        subtasks: task.subtasks || []
      }
    };
  }

  if (baseId === 'core-people') {
    const person = await peopleDb.createPerson({
      name: values.name || 'Unnamed Person',
      nickname: values.nickname || '',
      photo_url: values.photo_url || '',
      birthday: values.birthday || null,
      gender: values.gender || '',
      email: values.email || '',
      email_secondary: values.email_secondary || '',
      phone_mobile: values.phone_mobile || '',
      phone_work: values.phone_work || '',
      phone_home: values.phone_home || '',
      address: values.address || '',
      city: values.city || '',
      state: values.state || '',
      country: values.country || '',
      zip: values.zip || '',
      timezone: values.timezone || '',
      company: values.company || '',
      job_title: values.job_title || '',
      industry: values.industry || '',
      website: values.website || '',
      linkedin: values.linkedin || '',
      twitter: values.twitter || '',
      instagram: values.instagram || '',
      relationship: values.relationship || '',
      how_we_met: values.how_we_met || '',
      tags: values.tags || [],
      introduced_by: values.introduced_by || '',
      notes: values.notes || '',
      last_contacted: values.last_contacted || null,
      follow_up: values.follow_up || null,
      important: values.important || false,
      mbti_type: values.mbti_type || '',
      enneagram: values.enneagram || '',
      love_language: values.love_language || '',
      communication_style: values.communication_style || '',
      preferred_contact_method: values.preferred_contact_method || '',
      best_time_to_reach: values.best_time_to_reach || '',
      relationship_strength: values.relationship_strength || '',
      energy_impact: values.energy_impact || '',
      trust_level: values.trust_level || '',
      reciprocity: values.reciprocity || '',
      contact_frequency: values.contact_frequency || '',
      desired_frequency: values.desired_frequency || '',
      what_i_admire: values.what_i_admire || '',
      what_i_can_learn: values.what_i_can_learn || '',
      how_they_make_me_feel: values.how_they_make_me_feel || '',
      shared_interests: values.shared_interests || [],
      conversation_topics: values.conversation_topics || [],
      sensitive_topics: values.sensitive_topics || [],
      date_met: values.date_met || null,
      how_relationship_evolved: values.how_relationship_evolved || '',
      past_conflicts: values.past_conflicts || '',
      gift_ideas: values.gift_ideas || [],
      favorite_things: values.favorite_things || '',
      allergies_dislikes: values.allergies_dislikes || '',
      relationship_goals: values.relationship_goals || '',
      how_i_can_support: values.how_i_can_support || '',
      how_they_support_me: values.how_they_support_me || '',
      organization_id: values.organization || null
    }, userId);

    return {
      id: person.id,
      base_id: baseId,
      global_id: 0,
      position: 0,
      created_at: person.created_at,
      updated_at: person.updated_at,
      values: mapPersonToValues(person)
    };
  }

  if (baseId === 'core-organizations') {
    const org = await organizationsDb.createOrganization({
      name: values.name || 'Unnamed Organization',
      type: values.type || '',
      industry: values.industry || '',
      description: values.description || '',
      website: values.website || '',
      linkedin: values.linkedin || '',
      phone: values.phone || '',
      email: values.email || '',
      address: values.address || '',
      city: values.city || '',
      state: values.state || '',
      country: values.country || '',
      zip: values.zip || '',
      founded_year: values.founded_year || null,
      employee_count: values.employee_count || null,
      notes: values.notes || '',
      tags: values.tags || [],
      important: values.important || false
    }, userId);

    return {
      id: org.id,
      base_id: baseId,
      global_id: 0,
      position: 0,
      created_at: org.created_at,
      updated_at: org.updated_at,
      values: await mapOrganizationToValues(org, userId)
    };
  }

  if (baseId === 'core-tags') {
    const tag = await tagsDb.createTag({
      name: values.name || 'Untitled Tag',
      type: values.type || 'resource',
      description: values.description || '',
      url: values.url || '',
      parent_tag_id: values.parent_tag_id || null,
      favorite: values.favorite || false,
      archived: values.archived || false
    }, userId);

    return {
      id: tag.id,
      base_id: baseId,
      global_id: 0,
      position: 0,
      created_at: tag.created_at,
      updated_at: tag.updated_at,
      values: {
        name: tag.name,
        type: tag.type,
        description: tag.description || '',
        url: tag.url || '',
        parent_tag_id: tag.parent_tag_id || '',
        favorite: !!tag.favorite,
        archived: !!tag.archived
      }
    };
  }

  if (baseId === 'core-notes') {
    const note = await notesDb.createNote({
      name: values.name || 'Untitled Note',
      type: values.type || 'reference',
      content: values.content || '',
      url: values.url || '',
      note_date: values.note_date || null,
      review_date: values.review_date || null,
      favorite: values.favorite || false,
      archived: values.archived || false,
      tags: values.tags || [],
      project_id: values.project_id || null,
      domain: values.domain || []
    }, userId);

    return {
      id: note.id,
      base_id: baseId,
      global_id: 0,
      position: 0,
      created_at: note.created_at,
      updated_at: note.updated_at,
      values: mapNoteToValues(note)
    };
  }

  if (baseId === 'core-projects') {
    const project = await projectsDb.createProject({
      name: values.name || 'Untitled Project',
      status: values.status || 'planned',
      target_deadline: values.target_deadline || null,
      completed_date: values.completed_date || null,
      archived: values.archived || false,
      review_notes: values.review_notes || '',
      tag_id: values.tag_id || null,
      goal_id: values.goal_id || null
    }, userId);

    return {
      id: project.id,
      base_id: baseId,
      global_id: 0,
      position: 0,
      created_at: project.created_at,
      updated_at: project.updated_at,
      values: mapProjectToValues(project)
    };
  }

  return null;
}

/**
 * Update a record in a core base
 */
async function updateCoreBaseRecord(baseId, recordId, values, userId) {
  if (baseId === 'core-tasks') {
    const task = await tasksDb.updateTask(recordId, {
      title: values.title,
      description: values.description,
      status: values.status,
      my_day: values.my_day,
      due_date: values.due_date || null,
      due_time: values.due_time || null,
      due_time_end: values.due_time_end || null,
      snooze_date: values.snooze_date || null,
      priority: values.priority || null,
      energy: values.energy || null,
      location: values.location || null,
      important: values.important,
      completed: values.completed,
      recurring: values.recurring || null,
      recurring_days: values.recurring_days,
      project_id: values.project_id || null,
      list_id: values.list_id || null,
      people_ids: values.people_ids,
      note_ids: values.note_ids
    }, userId);

    if (!task) return null;

    return {
      id: task.id,
      base_id: baseId,
      global_id: 0,
      position: 0,
      created_at: task.created_at,
      updated_at: task.updated_at,
      values: {
        title: task.title,
        description: task.description || '',
        status: task.status || 'todo',
        my_day: !!task.my_day,
        due_date: task.due_date || '',
        due_time: task.due_time || '',
        due_time_end: task.due_time_end || '',
        snooze_date: task.snooze_date || '',
        priority: task.priority || '',
        energy: task.energy || '',
        location: task.location || '',
        important: !!task.important,
        completed: !!task.completed,
        completed_at: task.completed_at || '',
        recurring: task.recurring || '',
        recurring_days: task.recurring_days || [],
        project_id: task.project_id || '',
        list_id: task.list_id || '',
        people_ids: task.people_ids || [],
        note_ids: task.note_ids || [],
        subtasks: task.subtasks || []
      }
    };
  }

  if (baseId === 'core-people') {
    const updateData = { ...values };
    if (values.organization !== undefined) {
      updateData.organization_id = values.organization;
      delete updateData.organization;
    }
    const person = await peopleDb.updatePerson(recordId, updateData, userId);

    if (!person) return null;

    return {
      id: person.id,
      base_id: baseId,
      global_id: 0,
      position: 0,
      created_at: person.created_at,
      updated_at: person.updated_at,
      values: mapPersonToValues(person)
    };
  }

  if (baseId === 'core-organizations') {
    const org = await organizationsDb.updateOrganization(recordId, values, userId);

    if (!org) return null;

    return {
      id: org.id,
      base_id: baseId,
      global_id: 0,
      position: 0,
      created_at: org.created_at,
      updated_at: org.updated_at,
      values: await mapOrganizationToValues(org, userId)
    };
  }

  if (baseId === 'core-notes') {
    const note = await notesDb.updateNote(recordId, values, userId);

    if (!note) return null;

    return {
      id: note.id,
      base_id: baseId,
      global_id: 0,
      position: 0,
      created_at: note.created_at,
      updated_at: note.updated_at,
      values: mapNoteToValues(note)
    };
  }

  if (baseId === 'core-projects') {
    const project = await projectsDb.updateProject(recordId, values, userId);

    if (!project) return null;

    return {
      id: project.id,
      base_id: baseId,
      global_id: 0,
      position: 0,
      created_at: project.created_at,
      updated_at: project.updated_at,
      values: mapProjectToValues(project)
    };
  }

  if (baseId === 'core-tags') {
    const tag = await tagsDb.updateTag(recordId, values, userId);

    if (!tag) return null;

    return {
      id: tag.id,
      base_id: baseId,
      global_id: 0,
      position: 0,
      created_at: tag.created_at,
      updated_at: tag.updated_at,
      values: {
        name: tag.name,
        type: tag.type,
        description: tag.description || '',
        url: tag.url || '',
        parent_tag_id: tag.parent_tag_id || '',
        favorite: !!tag.favorite,
        archived: !!tag.archived
      }
    };
  }

  return null;
}

/**
 * Delete a record from a core base
 */
async function deleteCoreBaseRecord(baseId, recordId, userId) {
  if (baseId === 'core-tasks') {
    return await tasksDb.deleteTask(recordId, userId);
  }
  if (baseId === 'core-people') {
    return await peopleDb.deletePerson(recordId, userId);
  }
  if (baseId === 'core-organizations') {
    return await organizationsDb.deleteOrganization(recordId, userId);
  }
  if (baseId === 'core-notes') {
    return await notesDb.deleteNote(recordId, userId);
  }
  if (baseId === 'core-projects') {
    return await projectsDb.deleteProject(recordId, userId);
  }
  if (baseId === 'core-tags') {
    return await tagsDb.deleteTag(recordId, userId);
  }
  return false;
}

/**
 * Get README content for a core base
 */
function getCoreBaseReadme(baseId) {
  const base = CORE_BASES[baseId];
  return base?.readme || null;
}

/**
 * Check if a base ID is a core base
 */
function isCoreBase(baseId) {
  return baseId && baseId.startsWith('core-');
}

module.exports = {
  CORE_BASES,
  getAllCoreBases,
  getCoreBase,
  getCoreBaseRecords,
  createCoreBaseRecord,
  updateCoreBaseRecord,
  deleteCoreBaseRecord,
  getCoreBaseReadme,
  isCoreBase
};
