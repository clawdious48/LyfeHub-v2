// Master scope registry — single source of truth
const SCOPE_GROUPS = [
  {
    id: 'tasks',
    label: 'Tasks',
    description: 'Task management, lists, and items',
    scopes: ['tasks:read', 'tasks:write', 'tasks:delete']
  },
  {
    id: 'notes', 
    label: 'Notes',
    description: 'Personal notes',
    scopes: ['notes:read', 'notes:write', 'notes:delete']
  },
  {
    id: 'people',
    label: 'People & Contacts',
    description: 'Contact management and groups',
    scopes: ['people:read', 'people:write', 'people:delete']
  },
  {
    id: 'bases',
    label: 'Bases & Records',
    description: 'Custom databases, views, and records',
    scopes: ['bases:read', 'bases:write', 'bases:delete', 'records:read', 'records:write', 'records:delete']
  },
  {
    id: 'calendar',
    label: 'Calendar',
    description: 'Calendar events and scheduling',
    scopes: ['calendar:read', 'calendar:write', 'calendar:delete']
  },
  {
    id: 'areas',
    label: 'Areas',
    description: 'Life areas organization',
    scopes: ['areas:read', 'areas:write', 'areas:delete']
  },
  {
    id: 'jobs',
    label: 'Jobs',
    description: 'Apex job management',
    scopes: ['jobs:read', 'jobs:write', 'jobs:delete'],
    children: [
      { id: 'jobs.estimates', label: 'Estimates', scopes: ['jobs.estimates:read', 'jobs.estimates:write'] },
      { id: 'jobs.payments', label: 'Payments', scopes: ['jobs.payments:read', 'jobs.payments:write'] },
      { id: 'jobs.labor', label: 'Labor', scopes: ['jobs.labor:read', 'jobs.labor:write'] },
      { id: 'jobs.notes', label: 'Job Notes', scopes: ['jobs.notes:read', 'jobs.notes:write', 'jobs.notes:delete'] },
      { id: 'jobs.phases', label: 'Phases', scopes: ['jobs.phases:read', 'jobs.phases:write'] }
    ]
  },
  {
    id: 'crm',
    label: 'CRM',
    description: 'Client/contact relationship management',
    scopes: ['crm:read', 'crm:write', 'crm:delete']
  },
  {
    id: 'documents',
    label: 'Documents',
    description: 'Document upload and management',
    scopes: ['documents:read', 'documents:write', 'documents:delete']
  },
  {
    id: 'inventory',
    label: 'Inventory',
    description: 'Equipment and material tracking',
    scopes: ['inventory:read', 'inventory:write', 'inventory:delete']
  },
  {
    id: 'workflows',
    label: 'Workflows',
    description: 'Job workflow templates',
    scopes: ['workflows:read', 'workflows:write', 'workflows:delete']
  },
  {
    id: 'drying',
    label: 'Drying Logs',
    description: 'Moisture monitoring and drying data',
    scopes: ['drying:read', 'drying:write', 'drying:delete']
  },
  {
    id: 'admin',
    label: 'Administration',
    description: 'User, role, and system management',
    scopes: ['users:read', 'users:write', 'users:admin', 'roles:read', 'roles:write', 'api_keys:manage', 'org:read', 'org:write', 'org:admin', 'system:read', 'audit:read', 'uploads:write', 'uploads:delete']
  }
];

// Flatten all scopes for validation
const ALL_SCOPES = SCOPE_GROUPS.flatMap(g => {
  const base = [...g.scopes];
  if (g.children) g.children.forEach(c => base.push(...c.scopes));
  return base;
});

module.exports = { SCOPE_GROUPS, ALL_SCOPES };
