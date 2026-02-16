// ============================================
// Bases Feature - Notion/Airtable-style databases
// ============================================

const basesApi = {
  async list() {
    return api.request('/bases');
  },
  async get(id) {
    return api.request(`/bases/${id}`);
  },
  async create(data) {
    return api.request('/bases', {
      method: 'POST',
      body: data
    });
  },
  async update(id, data) {
    return api.request(`/bases/${id}`, {
      method: 'PUT',
      body: data
    });
  },
  async delete(id) {
    return api.request(`/bases/${id}`, { method: 'DELETE' });
  },
  // Properties
  async addProperty(baseId, data) {
    return api.request(`/bases/${baseId}/properties`, {
      method: 'POST',
      body: data
    });
  },
  async updateProperty(baseId, propId, data) {
    return api.request(`/bases/${baseId}/properties/${propId}`, {
      method: 'PUT',
      body: data
    });
  },
  async deleteProperty(baseId, propId) {
    return api.request(`/bases/${baseId}/properties/${propId}`, { method: 'DELETE' });
  },
  async reorderProperties(baseId, order) {
    return api.request(`/bases/${baseId}/properties/reorder`, {
      method: 'POST',
      body: { order }
    });
  },
  // Records
  async addRecord(baseId, values = {}) {
    return api.request(`/bases/${baseId}/records`, {
      method: 'POST',
      body: { values }
    });
  },
  async updateRecord(baseId, recordId, values) {
    return api.request(`/bases/${baseId}/records/${recordId}`, {
      method: 'PUT',
      body: { values }
    });
  },
  async deleteRecord(baseId, recordId) {
    return api.request(`/bases/${baseId}/records/${recordId}`, { method: 'DELETE' });
  },
  // Views
  async getViews(baseId) {
    return api.request(`/bases/${baseId}/views`);
  },
  async createView(baseId, data) {
    return api.request(`/bases/${baseId}/views`, {
      method: 'POST',
      body: data
    });
  },
  async updateView(baseId, viewId, data) {
    return api.request(`/bases/${baseId}/views/${viewId}`, {
      method: 'PUT',
      body: data
    });
  },
  async deleteView(baseId, viewId) {
    return api.request(`/bases/${baseId}/views/${viewId}`, { method: 'DELETE' });
  },
  // Groups
  async listGroups() {
    return api.request('/bases/groups/list');
  },
  async createGroup(data) {
    return api.request('/bases/groups', {
      method: 'POST',
      body: data
    });
  },
  async updateGroup(groupId, data) {
    return api.request(`/bases/groups/${groupId}`, {
      method: 'PUT',
      body: data
    });
  },
  async deleteGroup(groupId) {
    return api.request(`/bases/groups/${groupId}`, { method: 'DELETE' });
  },
  async toggleGroup(groupId) {
    return api.request(`/bases/groups/${groupId}/toggle`, { method: 'PUT' });
  },
  async collapseAllGroups() {
    return api.request('/bases/groups/collapse-all', { method: 'POST' });
  },
  async expandAllGroups() {
    return api.request('/bases/groups/expand-all', { method: 'POST' });
  },
  async setBaseGroup(baseId, groupId, position = 0) {
    return api.request(`/bases/${baseId}/group`, {
      method: 'PUT',
      body: { group_id: groupId, position }
    });
  },
  async reorderGroups(order) {
    return api.request("/bases/groups/reorder", {
      method: "POST",
      body: { order }
    });
  },
  // Core Bases
  async listCoreBases() {
    return api.request("/bases/core/list");
  },
  async getCoreBase(id) {
    return api.request(`/bases/core/${id}`);
  },
  async addCoreRecord(baseId, values = {}) {
    return api.request(`/bases/core/${baseId}/records`, {
      method: "POST",
      body: { values }
    });
  },
  async updateCoreRecord(baseId, recordId, values) {
    return api.request(`/bases/core/${baseId}/records/${recordId}`, {
      method: "PUT",
      body: { values }
    });
  },
  async deleteCoreRecord(baseId, recordId) {
    return api.request(`/bases/core/${baseId}/records/${recordId}`, { method: "DELETE" });
  },
  async getCoreBaseReadme(baseId) {
    return api.request(`/bases/core/${baseId}/readme`);
  },
};

// ============================================
// State
// ============================================
let basesState = {
  bases: [],
  groups: [],               // Groups for sidebar organization
  currentBase: null,
  editingCell: null,
  // View state
  displayMode: 'cards',     // 'cards' or 'list'
  cardSize: 'medium',       // 'small', 'medium', 'large'
  // Sorting state
  sortColumn: null,
  sortDirection: 'asc',
  // Show/hide system columns
  showGlobalId: true,
  showDateAdded: true,
  showDateModified: true,
  // Drag state for column reordering
  draggingColumn: null,
  // Saved Views state
  views: [],
  currentViewId: null,      // null = default view (no saved view applied)
  // Filters state (array of filter conditions)
  filters: [],              // [{propertyId, operator, value}, ...]
  // Column visibility (null = all visible, otherwise array of visible column ids)
  visibleColumns: null,     // null or ['prop1', 'prop2', '_global_id', ...]
  // Column order override (null = use property order from server)
  columnOrder: null,        // null or ['_global_id', 'prop1', 'prop2', ...]
  // Sidebar state
  sidebarCollapsed: false,
  // Core bases state
  coreBases: [],
  coreBasesCollapsed: false
};

// ============================================
// Filter Operators by Property Type
// ============================================
const filterOperators = {
  text: [
    { value: 'contains', label: 'contains' },
    { value: 'equals', label: 'equals' },
    { value: 'starts_with', label: 'starts with' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' }
  ],
  number: [
    { value: 'eq', label: 'equals (=)' },
    { value: 'neq', label: 'not equals (≠)' },
    { value: 'gt', label: 'greater than (>)' },
    { value: 'lt', label: 'less than (<)' },
    { value: 'gte', label: 'greater or equal (≥)' },
    { value: 'lte', label: 'less or equal (≤)' },
    { value: 'is_empty', label: 'is empty' }
  ],
  select: [
    { value: 'is', label: 'is' },
    { value: 'is_not', label: 'is not' },
    { value: 'is_empty', label: 'is empty' }
  ],
  multi_select: [
    { value: 'contains', label: 'contains' },
    { value: 'does_not_contain', label: 'does not contain' },
    { value: 'is_empty', label: 'is empty' }
  ],
  checkbox: [
    { value: 'is_checked', label: 'is checked' },
    { value: 'is_not_checked', label: 'is not checked' }
  ],
  date: [
    { value: 'is', label: 'is' },
    { value: 'before', label: 'before' },
    { value: 'after', label: 'after' },
    { value: 'is_empty', label: 'is empty' }
  ],
  url: [
    { value: 'contains', label: 'contains' },
    { value: 'equals', label: 'equals' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' }
  ],
  relation: [
    { value: 'contains', label: 'contains' },
    { value: 'does_not_contain', label: 'does not contain' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' }
  ]
};

// Load preferences from localStorage
function loadBasesPreferences() {
  try {
    const saved = localStorage.getItem('basesViewPrefs');
    if (saved) {
      const prefs = JSON.parse(saved);
      basesState.displayMode = prefs.displayMode || 'cards';
      basesState.cardSize = prefs.cardSize || 'medium';
    }
  } catch (e) {}
}

function saveBasesPreferences() {
  localStorage.setItem('basesViewPrefs', JSON.stringify({
    displayMode: basesState.displayMode,
    cardSize: basesState.cardSize
  }));
}

// ============================================
// System Columns Definition
// ============================================
const systemColumns = {
  _global_id: { 
    id: '_global_id',
    name: 'ID', 
    type: 'system_id', 
    icon: '#',
    isSystem: true,
    width: 60,
    description: 'Auto-generated row identifier'
  },
  _date_added: { 
    id: '_date_added',
    name: 'Date Added', 
    type: 'system_date', 
    icon: '📅',
    isSystem: true,
    width: 160,
    description: 'When this row was created'
  },
  _date_modified: { 
    id: '_date_modified',
    name: 'Date Modified', 
    type: 'system_date', 
    icon: '🔄',
    isSystem: true,
    width: 160,
    description: 'When this row was last updated'
  }
};

// ============================================
// Property Type Definitions
// ============================================
const propertyTypes = {
  text: { label: 'Text', icon: 'T' },
  number: { label: 'Number', icon: '#' },
  select: { label: 'Select', icon: '▼' },
  multi_select: { label: 'Multi-select', icon: '☰' },
  date: { label: "Date", icon: "📅" },
  time: { label: "Time", icon: "🕐" },
  datetime: { label: "Date & Time", icon: "📅" },
  checkbox: { label: 'Checkbox', icon: '☑' },
  url: { label: 'URL', icon: '🔗' },
  relation: { label: 'Relation', icon: '↗' },
  files: { label: 'Files', icon: '📎' }
};

// ============================================
// Relation Cache - stores fetched related records
// ============================================
const relationCache = {
  records: {},    // { baseId: { recordId: displayName } }
  bases: null,    // Array of all bases (for dropdown)
  
  async getRecordDisplay(baseId, recordId) {
    if (!baseId || !recordId) return null;
    
    // Check cache first
    if (this.records[baseId] && this.records[baseId][recordId]) {
      return this.records[baseId][recordId];
    }
    
    // Fetch the base if not cached
    if (!this.records[baseId]) {
      await this.loadBaseRecords(baseId);
    }
    
    return this.records[baseId]?.[recordId] || null;
  },
  
  async loadBaseRecords(baseId) {
    try {
      const base = await basesApi.get(baseId);
      this.records[baseId] = {};
      
      // Find the first text property to use as display name
      const nameProperty = base.properties.find(p => p.type === 'text') || base.properties[0];
      const namePropId = nameProperty?.id;
      
      base.records.forEach(record => {
        const displayName = namePropId ? (record.values[namePropId] || `Record ${record.global_id}`) : `Record ${record.global_id}`;
        this.records[baseId][record.id] = displayName;
      });
      
      return base;
    } catch (error) {
      console.error('Failed to load base records:', error);
      return null;
    }
  },
  
  async getAllBases() {
    if (this.bases) return this.bases;
    
    try {
      this.bases = await basesApi.list();
      return this.bases;
    } catch (error) {
      console.error('Failed to load bases:', error);
      return [];
    }
  },
  
  invalidateBase(baseId) {
    delete this.records[baseId];
  },
  
  invalidateAll() {
    this.records = {};
    this.bases = null;
  },
  
  // Preload relation data for all relation properties in a base
  async preloadForBase(base) {
    if (!base || !base.properties) return;
    
    // Find all relation properties
    const relationProps = base.properties.filter(p => p.type === 'relation');
    
    // Load each related base's records into the cache
    const relatedBaseIds = [...new Set(
      relationProps
        .map(p => p.options?.relatedBaseId)
        .filter(Boolean)
    )];
    
    await Promise.all(relatedBaseIds.map(baseId => this.loadBaseRecords(baseId)));
  }
};

// Helper to normalize option format
function normalizeOption(opt) {
  if (typeof opt === 'string') {
    return { value: opt, label: opt, color: null };
  }
  return { value: opt.value || opt, label: opt.label || opt.value || opt, color: opt.color || null };
}

// Helper to get file icon based on MIME type
function getFileIcon(mimeType) {
  if (!mimeType) return '📎';
  
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType === 'application/pdf') return '📄';
  
  // Word documents
  if (mimeType === 'application/msword' || 
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return '📝';
  }
  
  // Excel spreadsheets
  if (mimeType === 'application/vnd.ms-excel' || 
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    return '📊';
  }
  
  return '📎';
}

// Color palette for auto-selection
const tagColors = [
  '#bf5af2', '#0af', '#ff6b35', '#05ffa1', '#ff2a6d', '#ffe66d',
  '#64b5f6', '#ff8a65', '#81c784', '#ba68c8', '#4db6ac', '#f06292',
];

function getNextAvailableColor(usedColors) {
  // Normalize used colors to lowercase for comparison
  const normalizedUsed = (usedColors || []).map(c => c?.toLowerCase());
  
  for (const color of tagColors) {
    if (!normalizedUsed.includes(color.toLowerCase())) return color;
  }
  // If all colors used, pick a random one from tagColors (never black)
  return tagColors[Math.floor(Math.random() * tagColors.length)];
}

// Ensure a color is never black - returns a valid color from palette
function ensureValidColor(color) {
  if (!color || color === '#000000' || color === '#000' || color.toLowerCase() === 'black') {
    return tagColors[0]; // Default to first color in palette
  }
  return color;
}

// ============================================
// Date Formatting Helper
// ============================================
function formatSystemDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  
  let hours = date.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${month} ${day}, ${year} ${hours}:${minutes} ${ampm}`;
}

function formatRelativeDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

// ============================================
// Sorting Functions
// ============================================

// ============================================
// Filter Logic
// ============================================

function applyFilters(records) {
  if (!basesState.filters || basesState.filters.length === 0) {
    return records;
  }
  
  const base = basesState.currentBase;
  if (!base) return records;
  
  return records.filter(record => {
    return basesState.filters.every(filter => {
      const { propertyId, operator, value } = filter;
      
      // Handle system columns
      if (propertyId === '_global_id') {
        const recordValue = record.global_id;
        return evaluateFilter(recordValue, operator, value, 'number');
      }
      if (propertyId === '_date_added') {
        const recordValue = record.created_at;
        return evaluateFilter(recordValue, operator, value, 'date');
      }
      if (propertyId === '_date_modified') {
        const recordValue = record.updated_at;
        return evaluateFilter(recordValue, operator, value, 'date');
      }
      
      // Handle property columns
      const prop = base.properties.find(p => p.id === propertyId);
      if (!prop) return true; // Skip unknown properties
      
      const recordValue = record.values[propertyId];
      return evaluateFilter(recordValue, operator, value, prop.type, prop);
    });
  });
}

function evaluateFilter(recordValue, operator, filterValue, type, prop = null) {
  // Handle empty checks first
  if (operator === 'is_empty') {
    if (type === 'multi_select' || type === 'relation') {
      return !recordValue || (Array.isArray(recordValue) && recordValue.length === 0);
    }
    return recordValue === null || recordValue === undefined || recordValue === '';
  }
  if (operator === 'is_not_empty') {
    if (type === 'multi_select' || type === 'relation') {
      return recordValue && Array.isArray(recordValue) && recordValue.length > 0;
    }
    return recordValue !== null && recordValue !== undefined && recordValue !== '';
  }
  
  // Handle checkbox
  if (operator === 'is_checked') {
    return recordValue === true;
  }
  if (operator === 'is_not_checked') {
    return recordValue !== true;
  }
  
  // Handle text/url operators
  if (type === 'text' || type === 'url') {
    const strValue = (recordValue || '').toString().toLowerCase();
    const strFilter = (filterValue || '').toString().toLowerCase();
    
    switch (operator) {
      case 'contains': return strValue.includes(strFilter);
      case 'equals': return strValue === strFilter;
      case 'starts_with': return strValue.startsWith(strFilter);
      default: return true;
    }
  }
  
  // Handle number operators
  if (type === 'number') {
    const numValue = parseFloat(recordValue);
    const numFilter = parseFloat(filterValue);
    
    if (isNaN(numValue)) return false;
    if (isNaN(numFilter)) return true;
    
    switch (operator) {
      case 'eq': return numValue === numFilter;
      case 'neq': return numValue !== numFilter;
      case 'gt': return numValue > numFilter;
      case 'lt': return numValue < numFilter;
      case 'gte': return numValue >= numFilter;
      case 'lte': return numValue <= numFilter;
      default: return true;
    }
  }
  
  // Handle select operators
  if (type === 'select') {
    switch (operator) {
      case 'is': return recordValue === filterValue;
      case 'is_not': return recordValue !== filterValue;
      default: return true;
    }
  }
  
  // Handle multi_select operators
  if (type === 'multi_select') {
    const values = Array.isArray(recordValue) ? recordValue : [];
    switch (operator) {
      case 'contains': return values.includes(filterValue);
      case 'does_not_contain': return !values.includes(filterValue);
      default: return true;
    }
  }
  
  // Handle relation operators - resolve UUIDs to display names for text search
  if (type === 'relation') {
    const values = Array.isArray(recordValue) ? recordValue : [];
    const relatedBaseId = prop?.options?.relatedBaseId;
    
    // For contains/does_not_contain, resolve UUIDs to display names and search those
    if (operator === 'contains' || operator === 'does_not_contain') {
      const searchText = (filterValue || '').toString().toLowerCase();
      
      // Get display names from the relation cache
      const displayNames = values.map(recordId => {
        const cachedName = relationCache.records[relatedBaseId]?.[recordId];
        return cachedName || '';
      });
      
      // Join all display names and search
      const combinedText = displayNames.join(' ').toLowerCase();
      const matches = combinedText.includes(searchText);
      
      return operator === 'contains' ? matches : !matches;
    }
    
    return true;
  }
  
  // Handle date operators
  if (type === 'date' || type === 'system_date') {
    if (!recordValue) return false;
    
    const dateValue = new Date(recordValue);
    const dateFilter = new Date(filterValue);
    
    if (isNaN(dateValue.getTime()) || isNaN(dateFilter.getTime())) return true;
    
    // Compare dates only (ignore time for user date fields)
    const dateValueStr = dateValue.toISOString().split('T')[0];
    const dateFilterStr = dateFilter.toISOString().split('T')[0];
    
    switch (operator) {
      case 'is': return dateValueStr === dateFilterStr;
      case 'before': return dateValue < dateFilter;
      case 'after': return dateValue > dateFilter;
      default: return true;
    }
  }
  
  return true;
}

function getSortedRecords() {
  const base = basesState.currentBase;
  if (!base || !base.records) return [];
  
  // First apply filters
  let records = applyFilters([...base.records]);
  
  if (!basesState.sortColumn) {
    return records;
  }
  
  const sortCol = basesState.sortColumn;
  const direction = basesState.sortDirection === 'asc' ? 1 : -1;
  
  records.sort((a, b) => {
    let valA, valB;
    
    if (sortCol === '_global_id') {
      valA = a.global_id || 0;
      valB = b.global_id || 0;
      return (valA - valB) * direction;
    }
    
    if (sortCol === '_date_added') {
      valA = a.created_at ? new Date(a.created_at).getTime() : 0;
      valB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return (valA - valB) * direction;
    }
    
    if (sortCol === '_date_modified') {
      valA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      valB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return (valA - valB) * direction;
    }
    
    const prop = base.properties.find(p => p.id === sortCol);
    if (!prop) return 0;
    
    valA = a.values[sortCol];
    valB = b.values[sortCol];
    
    switch (prop.type) {
      case 'number':
        valA = valA !== undefined && valA !== null ? Number(valA) : (direction > 0 ? Infinity : -Infinity);
        valB = valB !== undefined && valB !== null ? Number(valB) : (direction > 0 ? Infinity : -Infinity);
        return (valA - valB) * direction;
      
      case 'date':
        valA = valA ? new Date(valA).getTime() : (direction > 0 ? Infinity : -Infinity);
        valB = valB ? new Date(valB).getTime() : (direction > 0 ? Infinity : -Infinity);
        return (valA - valB) * direction;
    
      
      case 'select':
        valA = valA || '';
        valB = valB || '';
        return valA.localeCompare(valB) * direction;
      
      case 'multi_select':
        valA = Array.isArray(valA) ? valA.join(', ') : '';
        valB = Array.isArray(valB) ? valB.join(', ') : '';
        return valA.localeCompare(valB) * direction;
      
      case 'relation':
        // Sort by number of linked records
        valA = Array.isArray(valA) ? valA.length : 0;
        valB = Array.isArray(valB) ? valB.length : 0;
        return (valA - valB) * direction;
      
      case 'text':
      case 'url':
      default:
        valA = (valA || '').toString().toLowerCase();
        valB = (valB || '').toString().toLowerCase();
        return valA.localeCompare(valB) * direction;
    }
  });
  
  return records;
}

function toggleSort(columnId) {
  if (basesState.sortColumn === columnId) {
    basesState.sortDirection = basesState.sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    basesState.sortColumn = columnId;
    basesState.sortDirection = 'asc';
  }
  renderTableView();
}

function getSortIndicator(columnId) {
  if (basesState.sortColumn !== columnId) return '';
  return basesState.sortDirection === 'asc' ? ' ↑' : ' ↓';
}

// ============================================
// Column Drag & Drop
// ============================================

function initColumnDragDrop() {
  const container = document.getElementById('base-table-container');
  if (!container) return;
  
  let draggedTh = null;
  let draggedPropId = null;
  let placeholder = null;
  let initialX = 0;
  
  function getDraggableHeaders() {
    return Array.from(container.querySelectorAll('.base-th.draggable'));
  }
  
  container.addEventListener('mousedown', (e) => {
    const th = e.target.closest('.base-th.draggable');
    if (!th || e.target.closest('.prop-resizer')) return;
    if (e.button !== 0) return;
    
    draggedTh = th;
    draggedPropId = th.dataset.propId;
    initialX = e.clientX;
    
    const onMouseMove = (moveEvent) => {
      const distance = Math.abs(moveEvent.clientX - initialX);
      if (distance > 5 && !draggedTh.classList.contains('dragging')) {
        draggedTh.classList.add('dragging');
        document.body.classList.add('column-dragging');
        
        placeholder = document.createElement('th');
        placeholder.className = 'base-th drag-placeholder';
        placeholder.style.width = draggedTh.offsetWidth + 'px';
        draggedTh.parentNode.insertBefore(placeholder, draggedTh.nextSibling);
      }
      
      if (draggedTh.classList.contains('dragging')) {
        updateDragPosition(moveEvent);
      }
    };
    
    const onMouseUp = async () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      
      if (draggedTh && draggedTh.classList.contains('dragging')) {
        draggedTh.classList.remove('dragging');
        document.body.classList.remove('column-dragging');
        
        const headers = getDraggableHeaders();
        const newOrder = headers.map((h, i) => ({
          id: h.dataset.propId,
          position: i
        }));
        
        if (placeholder) {
          placeholder.remove();
          placeholder = null;
        }
        
        if (newOrder.length > 0) {
          try {
            await basesApi.reorderProperties(basesState.currentBase.id, newOrder);
            newOrder.forEach(item => {
              const prop = basesState.currentBase.properties.find(p => p.id === item.id);
              if (prop) prop.position = item.position;
            });
            basesState.currentBase.properties.sort((a, b) => a.position - b.position);
          } catch (error) {
            console.error('Failed to reorder columns:', error);
          }
        }
        
        renderTableView();
      }
      
      draggedTh = null;
      draggedPropId = null;
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
  
  function updateDragPosition(e) {
    if (!draggedTh || !placeholder) return;
    
    const headers = getDraggableHeaders();
    
    for (const header of headers) {
      if (header === draggedTh) continue;
      
      const rect = header.getBoundingClientRect();
      const midPoint = rect.left + rect.width / 2;
      
      if (e.clientX < midPoint) {
        if (header.nextSibling !== draggedTh) {
          header.parentNode.insertBefore(draggedTh, header);
          header.parentNode.insertBefore(placeholder, draggedTh.nextSibling);
        }
        return;
      }
    }
    
    // Place at the end of the draggable columns
    const lastHeader = headers[headers.length - 1];
    if (lastHeader && draggedTh !== lastHeader) {
      lastHeader.parentNode.insertBefore(draggedTh, lastHeader.nextSibling);
      if (placeholder) {
        lastHeader.parentNode.insertBefore(placeholder, draggedTh.nextSibling);
      }
    }
  }
}

// ============================================
// Display Mode Functions
// ============================================

function switchBasesDisplay(display) {
  basesState.displayMode = display;
  saveBasesPreferences();
  
  // Update buttons
  document.querySelectorAll('.bases-display-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.display === display);
  });
  
  // Show/hide card size control
  const sizeControl = document.getElementById('bases-card-size-control');
  if (sizeControl) {
    sizeControl.style.display = display === 'cards' ? 'flex' : 'none';
  }
  
  renderBasesList();
}

function switchBasesCardSize(size) {
  basesState.cardSize = size;
  saveBasesPreferences();
  
  // Update buttons
  document.querySelectorAll('.bases-card-size-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.size === size);
  });
  
  renderBasesList();
}

// ============================================
// Render Functions
// ============================================

function renderBasesWithSidebar() {
  renderSidebar();
  renderBasesList();
  attachSidebarListeners();
}

function renderSidebar() {
  const container = document.getElementById('sidebar-content');
  if (!container) return;
  
  const groups = basesState.groups || [];
  const bases = basesState.bases || [];
  const coreBases = basesState.coreBases || [];
  
  // Get bases organized by group
  const groupedBases = {};
  const ungroupedBases = [];
  
  for (const base of bases) {
    if (base.group_id) {
      if (!groupedBases[base.group_id]) {
        groupedBases[base.group_id] = [];
      }
      groupedBases[base.group_id].push(base);
    } else {
      ungroupedBases.push(base);
    }
  }
  
  let html = '';
  
  // Render groups
  for (const group of groups) {
    const groupBases = groupedBases[group.id] || [];
    const isCollapsed = group.collapsed;
    const itemsHeight = groupBases.length > 0 ? (groupBases.length * 32 + 10) : 40;
    
    const folderIconClass = isCollapsed ? 'folder-icon folder-icon-closed' : 'folder-icon folder-icon-open';
    
    html += `
      <div class="sidebar-group ${isCollapsed ? 'collapsed' : ''}" data-group-id="${group.id}" draggable="true">
        <div class="sidebar-group-header" data-group-id="${group.id}">
          <span class="sidebar-group-drag-handle">⋮⋮</span>
          <span class="sidebar-group-toggle">▼</span>
          <span class="sidebar-group-icon"><span class="${folderIconClass}"></span></span>
          <span class="sidebar-group-name">${escapeHtml(group.name)}</span>
          <span class="sidebar-group-count">${groupBases.length}</span>
          <div class="sidebar-group-actions">
            <button class="sidebar-group-action edit" data-group-id="${group.id}" title="Edit group">✏️</button>
            <button class="sidebar-group-action delete" data-group-id="${group.id}" title="Delete group">×</button>
          </div>
        </div>
        <div class="sidebar-group-items" style="max-height: ${isCollapsed ? '0' : itemsHeight + 'px'}">
          ${groupBases.length > 0 
            ? groupBases.map(base => renderSidebarBaseItem(base)).join('')
            : '<div class="sidebar-group-empty">Drop bases here</div>'
          }
        </div>
      </div>
    `;
  }
  
  // Render ungrouped bases
  if (ungroupedBases.length > 0) {
    html += `
      <div class="sidebar-ungrouped">
        ${groups.length > 0 ? '<div class="sidebar-ungrouped-label">Ungrouped</div>' : ''}
        ${ungroupedBases.map(base => renderSidebarBaseItem(base)).join('')}
      </div>
    `;
  }
  
  // Empty state for user bases
  if (bases.length === 0 && groups.length === 0) {
    html += `
      <div class="sidebar-empty">
        <p class="text-muted" style="padding: 1rem; text-align: center; font-size: 0.8rem;">
          No bases yet
        </p>
      </div>
    `;
  }
  
  container.innerHTML = html;

  // ============================================
  // CORE BASES SECTION (rendered separately at bottom)
  // ============================================
  renderCoreBases();
}

function renderCoreBases() {
  const container = document.getElementById('sidebar-core-bases-container');
  if (!container) return;

  const coreBases = basesState.coreBases || [];

  if (coreBases.length > 0) {
    const isCollapsed = basesState.coreBasesCollapsed;
    const itemsHeight = coreBases.length * 32 + 10;

    // Header first, items below - header moves up as items expand
    container.innerHTML = `
      <div class="sidebar-core-bases ${isCollapsed ? 'collapsed' : ''}">
        <div class="sidebar-core-header" id="core-bases-header">
          <span class="sidebar-core-toggle">▼</span>
          <span class="sidebar-core-icon">⚡</span>
          <span class="sidebar-core-title">Core Bases</span>
          <span class="sidebar-core-count">${coreBases.length}</span>
        </div>
        <div class="sidebar-core-items" style="max-height: ${isCollapsed ? '0' : itemsHeight + 'px'}">
          ${coreBases.map(base => renderSidebarCoreBaseItem(base)).join('')}
        </div>
      </div>
    `;
  } else {
    container.innerHTML = '';
  }
}

function renderSidebarCoreBaseItem(base) {
  const isActive = basesState.currentBase?.id === base.id;
  return `
    <div class="sidebar-core-item ${isActive ? 'active' : ''}" data-core-base-id="${base.id}">
      <span class="sidebar-core-item-icon">${base.icon || '📊'}</span>
      <span class="sidebar-core-item-name">${escapeHtml(base.name)}</span>
    </div>
  `;
}


function renderSidebarBaseItem(base) {
  const isActive = basesState.currentBase?.id === base.id;
  return `
    <div class="sidebar-base-item ${isActive ? 'active' : ''}" data-base-id="${base.id}" draggable="true">
      <span class="sidebar-base-drag-handle">⋮⋮</span>
      <span class="sidebar-base-icon">${base.icon || '📊'}</span>
      <span class="sidebar-base-name">${escapeHtml(base.name)}</span>
    </div>
  `;
}

function attachSidebarListeners() {
  // Group header click (toggle)
  document.querySelectorAll('.sidebar-group-header').forEach(header => {
    header.addEventListener('click', async (e) => {
      // Don't toggle if clicking action buttons
      if (e.target.closest('.sidebar-group-actions')) return;
      
      const groupId = header.dataset.groupId;
      await toggleGroupCollapse(groupId);
    });
  });
  
  // Group edit button
  document.querySelectorAll('.sidebar-group-action.edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showEditGroupModal(btn.dataset.groupId);
    });
  });
  
  // Group delete button
  document.querySelectorAll('.sidebar-group-action.delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmDeleteGroup(btn.dataset.groupId);
    });
  });
  
  // Base item click
  document.querySelectorAll('.sidebar-base-item').forEach(item => {
    item.addEventListener('click', () => {
      openBase(item.dataset.baseId);
    });
  });
  
  // Core base item click
  document.querySelectorAll(".sidebar-core-item").forEach(item => {
    item.addEventListener("click", () => {
      openCoreBase(item.dataset.coreBaseId);
    });
  });
  
  // Core bases header click (toggle)
  const coreHeader = document.getElementById("core-bases-header");
  if (coreHeader) {
    coreHeader.addEventListener("click", () => {
      toggleCoreBasesCollapse();
    });
  }

  // Note: Static sidebar buttons (add-group-btn, toggle-all-groups-btn, sidebar-new-base-btn)
  // are now initialized once in initBases() to avoid duplicate listeners
  
  // ===== DRAG & DROP FOR BASES INTO GROUPS =====
  initSidebarDragDrop();
  
  // ===== DRAG & DROP FOR GROUP REORDERING =====
  initGroupDragDrop();
}

function initSidebarDragDrop() {
  let draggedBaseId = null;
  
  // Make base items draggable
  document.querySelectorAll('.sidebar-base-item').forEach(item => {
    item.addEventListener('dragstart', (e) => {
      draggedBaseId = item.dataset.baseId;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.dataset.baseId);
    });
    
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      draggedBaseId = null;
      // Remove all drag-over highlights
      document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    });
  });
  
  // Make groups drop targets (for base items only, not group reordering)
  document.querySelectorAll('.sidebar-group').forEach(group => {
    group.addEventListener('dragover', (e) => {
      // Ignore group drag events - those are handled by initGroupDragDrop
      if (e.dataTransfer.types.includes('application/group-drag')) {
        return;
      }
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      group.classList.add('drag-over');
    });
    
    group.addEventListener('dragleave', (e) => {
      // Ignore group drag events
      if (e.dataTransfer.types.includes('application/group-drag')) {
        return;
      }
      // Only remove if leaving the group entirely
      if (!group.contains(e.relatedTarget)) {
        group.classList.remove('drag-over');
      }
    });
    
    group.addEventListener('drop', async (e) => {
      // Ignore group drag events
      if (e.dataTransfer.types.includes('application/group-drag')) {
        return;
      }
      e.preventDefault();
      group.classList.remove('drag-over');
      
      const baseId = e.dataTransfer.getData('text/plain') || draggedBaseId;
      const groupId = group.dataset.groupId;
      
      if (!baseId || !groupId) return;
      
      try {
        await basesApi.setBaseGroup(baseId, groupId);
        
        // Update local state
        const base = basesState.bases.find(b => b.id === baseId);
        if (base) {
          base.group_id = groupId;
        }
        
        // Re-render sidebar
        renderSidebar();
        attachSidebarListeners();
      } catch (error) {
        console.error('Failed to move base to group:', error);
      }
    });
  });
  
  // Make ungrouped section a drop target
  const ungroupedSection = document.querySelector('.sidebar-ungrouped');
  if (ungroupedSection) {
    ungroupedSection.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      ungroupedSection.classList.add('drag-over');
    });
    
    ungroupedSection.addEventListener('dragleave', (e) => {
      if (!ungroupedSection.contains(e.relatedTarget)) {
        ungroupedSection.classList.remove('drag-over');
      }
    });
    
    ungroupedSection.addEventListener('drop', async (e) => {
      e.preventDefault();
      ungroupedSection.classList.remove('drag-over');
      
      const baseId = e.dataTransfer.getData('text/plain') || draggedBaseId;
      
      if (!baseId) return;
      
      try {
        // Set group to null (ungrouped)
        await basesApi.setBaseGroup(baseId, null);
        
        // Update local state
        const base = basesState.bases.find(b => b.id === baseId);
        if (base) {
          base.group_id = null;
        }
        
        // Re-render sidebar
        renderSidebar();
        attachSidebarListeners();
      } catch (error) {
        console.error('Failed to ungroup base:', error);
      }
    });
  }
  
  // Also make the sidebar content area a drop target for ungrouping
  const sidebarContent = document.getElementById('sidebar-content');
  if (sidebarContent) {
    sidebarContent.addEventListener('dragover', (e) => {
      // Only act if not over a group
      if (!e.target.closest('.sidebar-group') && !e.target.closest('.sidebar-ungrouped')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }
    });
    
    sidebarContent.addEventListener('drop', async (e) => {
      // Only act if not over a group
      if (!e.target.closest('.sidebar-group') && !e.target.closest('.sidebar-ungrouped')) {
        e.preventDefault();
        
        const baseId = e.dataTransfer.getData('text/plain') || draggedBaseId;
        
        if (!baseId) return;
        
        try {
          await basesApi.setBaseGroup(baseId, null);
          
          const base = basesState.bases.find(b => b.id === baseId);
          if (base) {
            base.group_id = null;
          }
          
          renderSidebar();
          attachSidebarListeners();
        } catch (error) {
          console.error('Failed to ungroup base:', error);
        }
      }
    });
  }
}

// ============================================
// GROUP DRAG & DROP (for reordering groups)
// ============================================

function initGroupDragDrop() {
  let draggedGroup = null;
  let draggedGroupId = null;
  let placeholder = null;
  let lastMousedownTarget = null;
  
  // Get all group elements
  const groupElements = document.querySelectorAll('.sidebar-group[draggable="true"]');
  
  groupElements.forEach(group => {
    // Track mousedown target so we know what was actually clicked when drag starts
    // (e.target in dragstart is always the draggable element, not the clicked element)
    group.addEventListener('mousedown', (e) => {
      lastMousedownTarget = e.target;
    });
    
    // Prevent dragging when clicking on action buttons or base items
    group.addEventListener('dragstart', (e) => {
      // Use the tracked mousedown target to determine where the drag originated
      const clickedElement = lastMousedownTarget || e.target;
      
      // If drag started from a base item, let the base item's drag handler take over
      if (clickedElement.closest('.sidebar-base-item')) {
        e.preventDefault();
        return;
      }
      
      // Only allow drag from the header or drag handle
      const header = clickedElement.closest('.sidebar-group-header');
      const dragHandle = clickedElement.closest('.sidebar-group-drag-handle');
      
      if (!header && !dragHandle) {
        e.preventDefault();
        return;
      }
      
      draggedGroup = group;
      draggedGroupId = group.dataset.groupId;
      
      // Create placeholder
      placeholder = document.createElement('div');
      placeholder.className = 'sidebar-group-placeholder';
      placeholder.style.height = group.offsetHeight + 'px';
      
      // Set drag data to distinguish from base dragging
      e.dataTransfer.setData('application/group-drag', draggedGroupId);
      e.dataTransfer.effectAllowed = 'move';
      
      // Add dragging class after a small delay for visual feedback
      setTimeout(() => {
        group.classList.add('group-dragging');
        // Insert placeholder where the group was
        group.parentNode.insertBefore(placeholder, group);
      }, 0);
    });
    
    group.addEventListener('dragend', async () => {
      if (!draggedGroup) return;
      
      draggedGroup.classList.remove('group-dragging');
      
      // Remove placeholder
      if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
      }
      placeholder = null;
      
      // Remove all drag states
      document.querySelectorAll('.sidebar-group').forEach(g => {
        g.classList.remove('group-drag-over');
      });
      
      // Calculate new order based on current DOM positions
      const groups = Array.from(document.querySelectorAll('.sidebar-group[draggable="true"]'));
      const newOrder = groups.map((g, i) => ({
        id: g.dataset.groupId,
        position: i
      }));
      
      // Save to backend
      try {
        const updatedGroups = await basesApi.reorderGroups(newOrder);
        basesState.groups = updatedGroups;
        // Re-render to ensure consistency
        renderSidebar();
        attachSidebarListeners();
      } catch (error) {
        console.error('Failed to reorder groups:', error);
        // Re-render to reset to original state
        renderSidebar();
        attachSidebarListeners();
      }
      
      draggedGroup = null;
      draggedGroupId = null;
      lastMousedownTarget = null;
    });
    
    group.addEventListener('dragover', (e) => {
      // Only handle group drag, not base drag
      if (!e.dataTransfer.types.includes('application/group-drag')) {
        return;
      }
      
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      if (!draggedGroup || group === draggedGroup) return;
      if (!placeholder) return;
      
      const rect = group.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      
      // Move placeholder and dragged group based on cursor position
      if (e.clientY < midY) {
        // Insert before this group
        if (group.previousElementSibling !== draggedGroup && 
            group.previousElementSibling !== placeholder) {
          group.parentNode.insertBefore(placeholder, group);
          group.parentNode.insertBefore(draggedGroup, placeholder);
        }
      } else {
        // Insert after this group
        if (group.nextElementSibling !== draggedGroup && 
            group.nextElementSibling !== placeholder) {
          const nextSibling = group.nextElementSibling;
          if (nextSibling) {
            group.parentNode.insertBefore(placeholder, nextSibling);
            group.parentNode.insertBefore(draggedGroup, placeholder);
          } else {
            group.parentNode.appendChild(placeholder);
            group.parentNode.insertBefore(draggedGroup, placeholder);
          }
        }
      }
      
      group.classList.add('group-drag-over');
    });
    
    group.addEventListener('dragleave', (e) => {
      // Only handle group drag
      if (!e.dataTransfer.types.includes('application/group-drag')) {
        return;
      }
      
      if (!group.contains(e.relatedTarget)) {
        group.classList.remove('group-drag-over');
      }
    });
    
    group.addEventListener('drop', (e) => {
      // Only handle group drag, not base drag
      if (!e.dataTransfer.types.includes('application/group-drag')) {
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      group.classList.remove('group-drag-over');
      // The actual reordering happened during dragover
    });
  });
}

async function toggleGroupCollapse(groupId) {
  try {
    const group = await basesApi.toggleGroup(groupId);
    const idx = basesState.groups.findIndex(g => g.id === groupId);
    if (idx !== -1) {
      basesState.groups[idx] = group;
    }

    // Animate the toggle instead of re-rendering
    const groupEl = document.querySelector(`.sidebar-group[data-group-id="${groupId}"]`);
    if (groupEl) {
      const itemsEl = groupEl.querySelector('.sidebar-group-items');
      const isCollapsed = group.collapsed;

      if (isCollapsed) {
        // Collapse: animate to 0
        itemsEl.style.maxHeight = itemsEl.scrollHeight + 'px';
        // Force reflow
        itemsEl.offsetHeight;
        groupEl.classList.add('collapsed');
        itemsEl.style.maxHeight = '0';
      } else {
        // Expand: animate to full height
        groupEl.classList.remove('collapsed');
        itemsEl.style.maxHeight = itemsEl.scrollHeight + 'px';
        // After animation, remove max-height for dynamic content
        setTimeout(() => {
          if (!groupEl.classList.contains('collapsed')) {
            itemsEl.style.maxHeight = itemsEl.scrollHeight + 'px';
          }
        }, 350);
      }
    }
  } catch (error) {
    console.error('Failed to toggle group:', error);
  }
}

async function expandAllGroups() {
  try {
    basesState.groups = await basesApi.expandAllGroups();
    renderSidebar();
    attachSidebarListeners();
  } catch (error) {
    console.error('Failed to expand groups:', error);
  }
}

async function collapseAllGroups() {
  try {
    basesState.groups = await basesApi.collapseAllGroups();
    renderSidebar();
    attachSidebarListeners();
  } catch (error) {
    console.error('Failed to collapse groups:', error);
  }
}

// Track if groups are currently expanded
let groupsExpanded = true;

async function toggleAllGroups() {
  const btn = document.getElementById('toggle-all-groups-btn');
  try {
    if (groupsExpanded) {
      basesState.groups = await basesApi.collapseAllGroups();
      btn?.classList.add('collapsed');
    } else {
      basesState.groups = await basesApi.expandAllGroups();
      btn?.classList.remove('collapsed');
    }
    groupsExpanded = !groupsExpanded;
    renderSidebar();
    attachSidebarListeners();
  } catch (error) {
    console.error('Failed to toggle groups:', error);
  }
}


function showAddGroupModal() {
  // Get ungrouped bases for selection
  const ungroupedBases = basesState.bases.filter(b => !b.group_id);
  
  const modal = document.createElement('div');
  modal.className = 'modal open';
  modal.id = 'add-group-modal';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content modal-small">
      <button class="modal-close-corner" aria-label="Close">×</button>
      <h2>New Group</h2>
      <div class="modal-body">
        <div class="form-group">
          <label for="group-name-input">Name</label>
          <input type="text" id="group-name-input" placeholder="Group name" class="form-input" />
        </div>
        ${ungroupedBases.length > 0 ? `
        <div class="form-group">
          <label>Add bases to this group (optional)</label>
          <div class="group-bases-checkboxes">
            ${ungroupedBases.map(base => `
              <label class="group-base-checkbox">
                <input type="checkbox" value="${base.id}" />
                <span class="base-checkbox-icon">${base.icon || '📊'}</span>
                <span class="base-checkbox-name">${escapeHtml(base.name)}</span>
              </label>
            `).join('')}
          </div>
        </div>
        ` : ''}
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="create-group-btn">Create Group</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const nameInput = modal.querySelector('#group-name-input');
  nameInput.focus();
  
  const closeModal = () => modal.remove();
  modal.querySelector('.modal-close-corner').addEventListener('click', closeModal);
  modal.querySelector('.modal-cancel').addEventListener('click', closeModal);
  modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
  
  modal.querySelector('#create-group-btn').addEventListener('click', async () => {
    const name = nameInput.value.trim();
    
    if (!name) {
      nameInput.focus();
      return;
    }
    
    try {
      // Create the group (folder icons are used instead of custom icons)
      const group = await basesApi.createGroup({ name });
      basesState.groups.push(group);
      
      // Get selected bases
      const selectedBases = Array.from(modal.querySelectorAll('.group-base-checkbox input:checked'))
        .map(cb => cb.value);
      
      // Assign selected bases to the new group
      for (const baseId of selectedBases) {
        await basesApi.setBaseGroup(baseId, group.id);
        const base = basesState.bases.find(b => b.id === baseId);
        if (base) {
          base.group_id = group.id;
        }
      }
      
      renderSidebar();
      attachSidebarListeners();
      closeModal();
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  });
  
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      modal.querySelector('#create-group-btn').click();
    }
  });
}

function showEditGroupModal(groupId) {
  const group = basesState.groups.find(g => g.id === groupId);
  if (!group) return;
  
  const modal = document.createElement('div');
  modal.className = 'modal open';
  modal.id = 'edit-group-modal';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content modal-small">
      <button class="modal-close-corner" aria-label="Close">×</button>
      <h2>Edit Group</h2>
      <div class="modal-body">
        <div class="form-group">
          <label for="edit-group-name-input">Name</label>
          <input type="text" id="edit-group-name-input" value="${escapeHtml(group.name)}" class="form-input" />
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="save-group-btn">Confirm</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const nameInput = modal.querySelector('#edit-group-name-input');
  nameInput.focus();
  nameInput.select();
  
  const closeModal = () => modal.remove();
  modal.querySelector('.modal-close-corner').addEventListener('click', closeModal);
  modal.querySelector('.modal-cancel').addEventListener('click', closeModal);
  modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
  
  modal.querySelector('#save-group-btn').addEventListener('click', async () => {
    const name = nameInput.value.trim();
    
    if (!name) {
      nameInput.focus();
      return;
    }
    
    try {
      const updated = await basesApi.updateGroup(groupId, { name });
      const idx = basesState.groups.findIndex(g => g.id === groupId);
      if (idx !== -1) {
        basesState.groups[idx] = updated;
      }
      renderSidebar();
      attachSidebarListeners();
      closeModal();
    } catch (error) {
      console.error('Failed to update group:', error);
    }
  });
}

async function confirmDeleteGroup(groupId) {
  const group = basesState.groups.find(g => g.id === groupId);
  if (!group) return;
  
  if (!confirm(`Delete group "${group.name}"? Bases in this group will become ungrouped.`)) {
    return;
  }
  
  try {
    await basesApi.deleteGroup(groupId);
    basesState.groups = basesState.groups.filter(g => g.id !== groupId);
    // Update bases to remove group_id
    basesState.bases.forEach(b => {
      if (b.group_id === groupId) {
        b.group_id = null;
      }
    });
    renderSidebar();
    attachSidebarListeners();
  } catch (error) {
    console.error('Failed to delete group:', error);
  }
}

function renderBasesList() {
  const container = document.getElementById('bases-list');
  if (!container) return;
  
  container.innerHTML = '';
  
  // On mobile, show empty state — bases are selected via context sheet (tap-again)
  // On desktop, show the full card/list grid
  const isMobile = window.innerWidth < 1200;
  
  if (isMobile) {
    container.innerHTML = `
      <div class="bases-empty">
        <div class="bases-empty-icon">📊</div>
        <p>Select a base</p>
        <p class="text-muted">Tap <strong>Bases</strong> again to browse</p>
      </div>
    `;
    return;
  }
  
  // Desktop: combine core + user bases
  const coreBases = (basesState.coreBases || []).map(b => Object.assign({}, b, { _isCore: true }));
  const allBases = coreBases.concat(basesState.bases);
  
  if (allBases.length === 0) {
    container.innerHTML = `
      <div class="bases-empty">
        <div class="bases-empty-icon">📊</div>
        <p>No bases yet</p>
        <p class="text-muted">Create your first database to get started</p>
      </div>
    `;
    return;
  }
  
  if (basesState.displayMode === 'list') {
    renderBasesListView(container, allBases);
  } else {
    renderBasesCardsView(container, allBases);
  }
}

function renderBasesListView(container, basesList) {
  const bases = basesList || basesState.bases;
  container.className = 'bases-list bases-list-table';
  
  container.innerHTML = `
    <div class="bases-table-wrapper">
      <table class="bases-overview-table">
        <thead>
          <tr>
            <th class="bases-th-icon"></th>
            <th class="bases-th-name">Name</th>
            <th class="bases-th-desc">Description</th>
            <th class="bases-th-records">Records</th>
            <th class="bases-th-modified">Last Modified</th>
            <th class="bases-th-actions"></th>
          </tr>
        </thead>
        <tbody>
          ${bases.map(base => {
            const openFn = (base._isCore || base.is_core) ? 'openCoreBase' : 'openBase';
            const isCore = base._isCore || base.is_core;
            return `
            <tr class="bases-table-row${isCore ? ' bases-table-row-core' : ''}" data-base-id="${base.id}">
              <td class="bases-td-icon" onclick="${openFn}('${base.id}')">
                <span class="base-row-icon">${base.icon || ''}</span>
              </td>
              <td class="bases-td-name" onclick="${openFn}('${base.id}')">
                <span class="base-row-name">${escapeHtml(base.name)}</span>
              </td>
              <td class="bases-td-desc" onclick="${openFn}('${base.id}')">
                <span class="base-row-desc">${escapeHtml(base.description || '')}</span>
              </td>
              <td class="bases-td-records" onclick="${openFn}('${base.id}')">
                <span class="base-row-records">${base.record_count || 0}</span>
              </td>
              <td class="bases-td-modified" onclick="${openFn}('${base.id}')">
                <span class="base-row-modified">${formatRelativeDate(base.updated_at)}</span>
              </td>
              <td class="bases-td-actions">
                ${isCore ? '' : `<button class="base-row-edit" title="Edit base" onclick="event.stopPropagation(); showEditBaseModal('${base.id}')">✏️</button>
                <button class="base-row-delete" title="Delete base" onclick="event.stopPropagation(); confirmDeleteBase(${JSON.stringify(base).replace(/'/g, "\\'").replace(/"/g, '&quot;')})">×</button>`}
              </td>
            </tr>
          `}).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderBasesCardsView(container, basesList) {
  const bases = basesList || basesState.bases;
  const size = basesState.cardSize;
  container.className = `bases-list bases-cards-grid size-${size}`;
  
  bases.forEach(base => {
    const card = document.createElement('div');
    card.className = `base-card base-card-${size}${(base._isCore || base.is_core) ? ' base-card-core' : ''}`;
    card.dataset.baseId = base.id;
    
    const descPreview = base.description 
      ? (size === 'small' ? '' : (size === 'large' ? base.description : base.description.substring(0, 80) + (base.description.length > 80 ? '...' : '')))
      : '';
    
    const recordCount = base.record_count || 0;
    const columnCount = base.column_count || 0;
    
    let cardContent = '';
    
    if (size === 'small') {
      // Small: Just icon and name
      cardContent = `
        <div class="base-card-icon">${base.icon || ''}</div>
        <div class="base-card-content">
          <div class="base-card-name">${escapeHtml(base.name)}</div>
        </div>
        <button class="base-card-delete" title="Delete base">×</button>
      `;
    } else if (size === 'medium') {
      // Medium: Icon, name, description preview, record count
      cardContent = `
        <div class="base-card-icon">${base.icon || ''}</div>
        <div class="base-card-content">
          <div class="base-card-name">${escapeHtml(base.name)}</div>
          <div class="base-card-meta">${descPreview || 'No description'}</div>
          <div class="base-card-stats">
            <span class="base-stat">📝 ${recordCount} records</span>
          </div>
        </div>
        <button class="base-card-edit" title="Edit base">✏️</button>
        <button class="base-card-delete" title="Delete base">×</button>
      `;
    } else {
      // Large: Full details including columns preview and last modified
      const columnsPreview = base.columns ? base.columns.slice(0, 4).map(c => c.name).join(', ') : '';
      cardContent = `
        <div class="base-card-header-row">
          <div class="base-card-icon">${base.icon || ''}</div>
          <div class="base-card-title-area">
            <div class="base-card-name">${escapeHtml(base.name)}</div>
            <div class="base-card-modified">Modified ${formatRelativeDate(base.updated_at)}</div>
          </div>
          <button class="base-card-edit" title="Edit base">✏️</button>
          <button class="base-card-delete" title="Delete base">×</button>
        </div>
        <div class="base-card-description">${escapeHtml(base.description) || '<span class="text-muted">No description</span>'}</div>
        <div class="base-card-stats-row">
          <span class="base-stat">📝 ${recordCount} records</span>
          <span class="base-stat">📊 ${columnCount} columns</span>
        </div>
        ${columnsPreview ? `<div class="base-card-columns"><span class="columns-label">Columns:</span> ${escapeHtml(columnsPreview)}${base.columns && base.columns.length > 4 ? '...' : ''}</div>` : ''}
      `;
    }
    
    card.innerHTML = cardContent;
    
    // Click handlers
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.base-card-delete') && !e.target.closest('.base-card-edit')) {
        if (base._isCore || base.is_core) {
          openCoreBase(base.id);
        } else {
          openBase(base.id);
        }
      }
    });
    
    card.querySelector('.base-card-delete')?.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmDeleteBase(base);
    });
    
    card.querySelector('.base-card-edit')?.addEventListener('click', (e) => {
      e.stopPropagation();
      showEditBaseModal(base.id);
    });
    
    container.appendChild(card);
  });
}

function renderTableView() {
  const container = document.getElementById('base-table-container');
  if (!container || !basesState.currentBase) return;
  
  const base = basesState.currentBase;
  const allProperties = base.properties || [];
  const records = getSortedRecords();
  
  // Determine visible columns
  const visibleCols = basesState.visibleColumns;
  const showId = visibleCols ? visibleCols.includes('_global_id') : basesState.showGlobalId;
  const showDateAdded = visibleCols ? visibleCols.includes('_date_added') : basesState.showDateAdded;
  const showDateModified = visibleCols ? visibleCols.includes('_date_modified') : basesState.showDateModified;
  
  // Filter properties based on visibility
  const properties = visibleCols 
    ? allProperties.filter(p => visibleCols.includes(p.id))
    : allProperties;
  
  // Apply column order if set
  const orderedProperties = basesState.columnOrder 
    ? [...properties].sort((a, b) => {
        const aIdx = basesState.columnOrder.indexOf(a.id);
        const bIdx = basesState.columnOrder.indexOf(b.id);
        if (aIdx === -1 && bIdx === -1) return 0;
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      })
    : properties;
  
  const systemColCount = (showId ? 1 : 0) + (showDateAdded ? 1 : 0) + (showDateModified ? 1 : 0);
  const totalCols = orderedProperties.length + systemColCount + 1; // +1 for row actions column
  
  // Build views tabs HTML
  const viewsHtml = renderViewsTabs();
  
  // Build active filters pills HTML
  const filterPillsHtml = renderFilterPills();
  
  // Check if we have active filters or non-default visibility
  const hasActiveFilters = basesState.filters && basesState.filters.length > 0;
  const hasCustomVisibility = basesState.visibleColumns !== null;
  
  container.innerHTML = `
    <div class="views-toolbar">
      <div class="views-toolbar-left">
        ${!base.is_core ? `<button class="toolbar-btn add-property-btn" id="add-property-btn" title="Add property">
          <span class="btn-icon">+</span>
          <span>Property</span>
        </button>` : ''}
        <div class="views-tabs-container">
          ${viewsHtml}
        </div>
      </div>
      <div class="views-actions">
        <button class="toolbar-btn filter-btn ${hasActiveFilters ? 'active' : ''}" id="filter-dropdown-btn">
          <span class="btn-icon">⫘</span>
          <span>Filter${hasActiveFilters ? ` (${basesState.filters.length})` : ''}</span>
        </button>
        <button class="toolbar-btn columns-btn ${hasCustomVisibility ? 'active' : ''}" id="columns-dropdown-btn">
          <span class="btn-icon">☰</span>
          <span>Columns</span>
        </button>
        ${!base.is_core ? `<button class="toolbar-btn save-view-btn" id="save-view-btn" title="Save current view">
          <span class="btn-icon">💾</span>
          <span>Save View</span>
        </button>` : ''}
      </div>
    </div>
    ${filterPillsHtml}
    <div class="table-wrapper">
      <table class="base-table">
        <thead>
          <tr>
            ${showId ? `
              <th class="base-th base-th-system base-th-id sortable" data-sort-col="_global_id" style="width: 60px">
                <div class="base-th-content" title="System column: Auto-generated row ID">
                  <span class="prop-type-icon system-icon">#</span>
                  <span class="prop-name">ID${getSortIndicator('_global_id')}</span>
                </div>
              </th>
            ` : ''}
            ${orderedProperties.map(prop => `
              <th class="base-th sortable draggable" data-prop-id="${prop.id}" data-sort-col="${prop.id}" style="width: ${prop.width || 200}px">
                <div class="base-th-content" title="${base.is_core ? 'Click to sort' : 'Click to sort, drag to reorder, right-click to edit'}">
                  <span class="drag-handle">⋮⋮</span>
                  <span class="prop-type-icon">${propertyTypes[prop.type]?.icon || 'T'}</span>
                  <span class="prop-name">${escapeHtml(prop.name)}${getSortIndicator(prop.id)}</span>
                </div>
                <div class="prop-resizer"></div>
              </th>
            `).join('')}
            ${showDateAdded ? `
              <th class="base-th base-th-system sortable" data-sort-col="_date_added" style="width: 160px">
                <div class="base-th-content" title="System column: When this row was created">
                  <span class="prop-type-icon system-icon">📅</span>
                  <span class="prop-name">Date Added${getSortIndicator('_date_added')}</span>
                </div>
              </th>
            ` : ''}
            ${showDateModified ? `
              <th class="base-th base-th-system sortable" data-sort-col="_date_modified" style="width: 160px">
                <div class="base-th-content" title="System column: When this row was last modified">
                  <span class="prop-type-icon system-icon">🔄</span>
                  <span class="prop-name">Modified${getSortIndicator('_date_modified')}</span>
                </div>
              </th>
            ` : ''}
          </tr>
        </thead>
        <tbody>
          ${records.map(record => `
            <tr class="base-row" data-record-id="${record.id}">
              ${showId ? `
                <td class="base-cell base-cell-system base-cell-id" data-record-id="${record.id}">
                  <span class="global-id-value">${record.global_id || '-'}</span>
                </td>
              ` : ''}
              ${orderedProperties.map(prop => `
                <td class="base-cell" data-prop-id="${prop.id}" data-record-id="${record.id}">
                  ${renderCellContent(prop, record.values[prop.id])}
                </td>
              `).join('')}
              ${showDateAdded ? `
                <td class="base-cell base-cell-system base-cell-date" data-record-id="${record.id}">
                  <span class="system-date-value">${formatSystemDate(record.created_at)}</span>
                </td>
              ` : ''}
              ${showDateModified ? `
                <td class="base-cell base-cell-system base-cell-date" data-record-id="${record.id}">
                  <span class="system-date-value">${formatSystemDate(record.updated_at)}</span>
                </td>
              ` : ''}
              <td class="base-cell row-actions">
                <button class="row-delete-btn" title="Delete row">×</button>
              </td>
            </tr>
          `).join('')}
          <tr class="base-row add-row">
            <td colspan="${totalCols}">
              <button class="add-row-btn">+ New record</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
  
  attachTableListeners();
  attachViewsToolbarListeners();
  initColumnDragDrop();
  
  // Populate relation pill names asynchronously
  populateRelationPills();
}

// ============================================
// Views Toolbar Rendering
// ============================================

function renderViewsTabs() {
  // Use enhanced views module if available
  if (typeof baseViews !== 'undefined') {
    return baseViews.renderViewsTabs();
  }
  const views = basesState.views || [];
  const currentViewId = basesState.currentViewId;
  
  return `
    <div class="views-tabs">
      <button class="view-tab ${!currentViewId ? 'active' : ''}" data-view-id="">
        <span>All</span>
      </button>
      ${views.map(view => `
        <button class="view-tab ${currentViewId === view.id ? 'active' : ''}" data-view-id="${view.id}">
          <span>${escapeHtml(view.name)}</span>
          <span class="view-tab-actions">
            <button class="view-tab-edit" data-view-id="${view.id}" title="Edit view">✏️</button>
            <button class="view-tab-delete" data-view-id="${view.id}" title="Delete view">×</button>
          </span>
        </button>
      `).join('')}
    </div>
  `;
}

function renderFilterPills() {
  const filters = basesState.filters || [];
  if (filters.length === 0) return '';
  
  const base = basesState.currentBase;
  
  const pills = filters.map((filter, idx) => {
    let propName = '';
    let propType = 'text';
    
    if (filter.propertyId === '_global_id') {
      propName = 'ID';
      propType = 'number';
    } else if (filter.propertyId === '_date_added') {
      propName = 'Date Added';
      propType = 'date';
    } else if (filter.propertyId === '_date_modified') {
      propName = 'Date Modified';
      propType = 'date';
    } else {
      const prop = base.properties.find(p => p.id === filter.propertyId);
      if (prop) {
        propName = prop.name;
        propType = prop.type;
      }
    }
    
    const operatorLabel = getOperatorLabel(propType, filter.operator);
    const valueDisplay = getFilterValueDisplay(filter, propType, base);
    
    return `
      <span class="filter-pill" data-filter-idx="${idx}">
        <span class="filter-pill-content">
          <strong>${escapeHtml(propName)}</strong> ${operatorLabel} ${valueDisplay}
        </span>
        <button class="filter-pill-remove" data-filter-idx="${idx}" title="Remove filter">×</button>
      </span>
    `;
  }).join('');
  
  return `
    <div class="filter-pills-bar">
      ${pills}
      <button class="clear-all-filters-btn" title="Clear all filters">Clear all</button>
    </div>
  `;
}

function getOperatorLabel(type, operator) {
  const operators = filterOperators[type] || filterOperators.text;
  const op = operators.find(o => o.value === operator);
  return op ? op.label : operator;
}

function getFilterValueDisplay(filter, type, base) {
  const { operator, value } = filter;
  
  // Operators that don't need a value
  if (['is_empty', 'is_not_empty', 'is_checked', 'is_not_checked'].includes(operator)) {
    return '';
  }
  
  if (type === 'select' || type === 'multi_select') {
    const prop = base.properties.find(p => p.id === filter.propertyId);
    if (prop && prop.options) {
      const opt = prop.options.find(o => normalizeOption(o).value === value);
      if (opt) return `"${escapeHtml(normalizeOption(opt).label)}"`;
    }
  }
  
  return value ? `"${escapeHtml(value)}"` : '';
}

function attachViewsToolbarListeners() {
  const container = document.getElementById('base-table-container');
  if (!container) return;
  
  // View tabs
  container.querySelectorAll('.view-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      if (e.target.closest('.view-tab-edit') || e.target.closest('.view-tab-delete')) return;
      const viewId = tab.dataset.viewId;
      applyView(viewId || null);
    });
  });
  
  // View edit/delete
  container.querySelectorAll('.view-tab-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showEditViewModal(btn.dataset.viewId);
    });
  });
  
  container.querySelectorAll('.view-tab-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmDeleteView(btn.dataset.viewId);
    });
  });
  
  // Filter dropdown button
  container.querySelector('#filter-dropdown-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    showFilterDropdown(e.currentTarget);
  });
  
  // Columns dropdown button
  container.querySelector('#columns-dropdown-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    showColumnsDropdown(e.currentTarget);
  });
  
  // Save view button
  container.querySelector('#save-view-btn')?.addEventListener('click', () => {
    showSaveViewModal();
  });
  
  // "+" add view button (from base-views.js)
  if (typeof baseViews !== 'undefined') {
    baseViews.attachAddViewListener(container);
  }

  // Filter pill remove buttons
  container.querySelectorAll('.filter-pill-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.filterIdx);
      removeFilter(idx);
    });
  });
  
  // Clear all filters
  container.querySelector('.clear-all-filters-btn')?.addEventListener('click', () => {
    clearAllFilters();
  });
}

function renderCellContent(prop, value) {
  switch (prop.type) {
    case 'checkbox':
      return `<label class="cell-checkbox"><input type="checkbox" ${value ? 'checked' : ''} /><span></span></label>`;
    
    case 'select':
      const normalizedOpts = (prop.options || []).map(normalizeOption);
      const option = normalizedOpts.find(o => o.value === value);
      if (option) {
        return `<span class="cell-tag" style="--tag-color: ${option.color || 'var(--neon-purple)'}">${escapeHtml(option.label)}</span>`;
      }
      return `<span class="cell-placeholder">Select...</span>`;
    
    case 'multi_select':
      const values = Array.isArray(value) ? value : [];
      if (values.length === 0) return `<span class="cell-placeholder">Select...</span>`;
      const normalizedMultiOpts = (prop.options || []).map(normalizeOption);
      return values.map(v => {
        const opt = normalizedMultiOpts.find(o => o.value === v);
        if (opt) {
          return `<span class="cell-tag" style="--tag-color: ${opt.color || 'var(--neon-purple)'}">${escapeHtml(opt.label)}</span>`;
        }
        return `<span class="cell-tag">${escapeHtml(v)}</span>`;
      }).join('');
    
    case 'date':
      if (!value) return `<span class="cell-placeholder">Pick date...</span>`;
      return new Date(value).toLocaleDateString();
    
    
    case "time":
      if (!value) return `<span class="cell-placeholder">Pick time...</span>`;
      return value;
    
    case "datetime":
      if (!value) return `<span class="cell-placeholder">Pick date & time...</span>`;
      return new Date(value).toLocaleString();
    case 'number':
      return value !== undefined && value !== null ? String(value) : `<span class="cell-placeholder">0</span>`;
    
    case 'url':
      if (!value) return `<span class="cell-placeholder">Add URL...</span>`;
      return `<a href="${escapeHtml(value)}" target="_blank" class="cell-link">${escapeHtml(value)}</a>`;
    
    case 'relation':
      const relatedIds = Array.isArray(value) ? value : (value ? [value] : []);
      if (relatedIds.length === 0) return `<span class="cell-placeholder">Link records...</span>`;
      const relatedBaseId = prop.options?.relatedBaseId;
      // Render placeholder pills that will be populated async
      return relatedIds.map(recordId => {
        const cacheKey = `relation-${relatedBaseId}-${recordId}`;
        const cachedName = relationCache.records[relatedBaseId]?.[recordId];
        return `<span class="cell-relation-pill" data-record-id="${escapeHtml(recordId)}" data-base-id="${escapeHtml(relatedBaseId || '')}">${cachedName ? escapeHtml(cachedName) : '...'}</span>`;
      }).join('');
    
    case 'files':
      const files = Array.isArray(value) ? value : [];
      if (files.length === 0) return '<span class="cell-placeholder">Add files...</span>';
      return files.map(f => {
        const hasUrl = f.url || f.path;
        const fileName = f.originalName || f.filename;
        const fileUrl = hasUrl ? `/api${f.url || f.path}` : '';
        const mimeType = f.mimeType || f.type || '';
        const isViewable = mimeType.startsWith('image/') || mimeType === 'application/pdf';
        return `
          <span class="cell-file-pill ${hasUrl ? 'clickable' : ''}" 
                ${hasUrl ? `data-file-url="${escapeHtml(fileUrl)}" data-file-name="${escapeHtml(fileName)}" data-viewable="${isViewable}"` : ''}>
            <span class="file-icon">${getFileIcon(mimeType)}</span>
            <span class="file-name">${escapeHtml(fileName)}</span>
          </span>
        `;
      }).join(' ');
    
    case 'text':
    default:
      return value ? escapeHtml(value) : `<span class="cell-placeholder">Empty</span>`;
  }
}

function attachTableListeners() {
  const container = document.getElementById('base-table-container');
  if (!container) return;
  
  container.querySelectorAll('.base-th.sortable').forEach(th => {
    th.addEventListener('click', (e) => {
      if (e.target.classList.contains('prop-resizer')) return;
      if (th.classList.contains('dragging')) return;
      if (document.body.classList.contains('column-dragging')) return;
      
      const sortCol = th.dataset.sortCol;
      if (sortCol) {
        toggleSort(sortCol);
      }
    });
  });
  
  container.querySelectorAll('.base-cell:not(.row-actions):not(.base-cell-system)').forEach(cell => {
    cell.addEventListener('click', () => startEditingCell(cell));
  });
  
  container.querySelector('.add-row-btn')?.addEventListener('click', addRecord);
  container.querySelector('#add-property-btn')?.addEventListener('click', showAddPropertyModal);
  
  container.querySelectorAll('.row-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const row = btn.closest('.base-row');
      const recordId = row.dataset.recordId;
      deleteRecord(recordId);
    });
  });
  
  container.querySelectorAll('.base-th.draggable[data-prop-id]').forEach(th => {
    th.addEventListener('contextmenu', (e) => {
      // Don't show context menu for core bases
      if (basesState.currentBase?.is_core) return;
      e.preventDefault();
      e.stopPropagation();
      const propId = th.dataset.propId;
      showPropertyMenu(propId, e);
    });
  });
  
  container.querySelectorAll('.cell-checkbox input').forEach(checkbox => {
    checkbox.addEventListener('change', async (e) => {
      e.stopPropagation();
      const cell = checkbox.closest('.base-cell');
      const propId = cell.dataset.propId;
      const recordId = cell.dataset.recordId;
      await updateCellValue(recordId, propId, checkbox.checked);
    });
  });
  
  // File pill click handlers - open/download files
  container.querySelectorAll('.cell-file-pill.clickable').forEach(pill => {
    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      const fileUrl = pill.dataset.fileUrl;
      const fileName = pill.dataset.fileName;
      const isViewable = pill.dataset.viewable === 'true';
      
      if (!fileUrl) return;
      
      if (isViewable) {
        // Images and PDFs - open in new tab
        window.open(fileUrl, '_blank');
      } else {
        // Other files - trigger download
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    });
  });
}

// ============================================
// Cell Editing
// ============================================

function startEditingCell(cell) {
  if (cell.querySelector('.cell-checkbox')) return;
  
  const propId = cell.dataset.propId;
  const recordId = cell.dataset.recordId;
  const prop = basesState.currentBase.properties.find(p => p.id === propId);
  const record = basesState.currentBase.records.find(r => r.id === recordId);
  const value = record?.values[propId];
  
  closeEditor();
  
  basesState.editingCell = { cell, propId, recordId };
  cell.classList.add('editing');
  
  let editorHtml = '';
  
  switch (prop.type) {
    case 'text':
    case 'url':
      editorHtml = `<input type="${prop.type === 'url' ? 'url' : 'text'}" class="cell-editor" value="${escapeHtml(value || '')}" placeholder="${prop.type === 'url' ? 'https://...' : ''}" />`;
      break;
    
    case 'number':
      editorHtml = `<input type="number" class="cell-editor" value="${value ?? ''}" />`;
      break;
    
    case 'date':
      editorHtml = `<input type="date" class="cell-editor" value="${value || ''}" />`;
      break;
    
    
    case "time":
      editorHtml = `<input type="time" class="cell-editor" value="${value || ''}" />`;
      break;
    
    case "datetime":
      editorHtml = `<input type="datetime-local" class="cell-editor" value="${value || ''}" />`;
      break;
    case 'select':
      editorHtml = `
        <div class="cell-select-editor">
          ${(prop.options || []).map(o => { const opt = normalizeOption(o); return `
            <button class="select-option ${value === opt.value ? 'selected' : ''}" data-value="${escapeHtml(opt.value)}" style="--tag-color: ${opt.color || 'var(--neon-purple)'}">
              ${escapeHtml(opt.label)}
            </button>
          `; }).join('')}
          <button class="select-option clear-option" data-value="">Clear</button>
        </div>
      `;
      break;
    
    case 'multi_select':
      const selectedValues = Array.isArray(value) ? value : [];
      editorHtml = `
        <div class="cell-select-editor multi">
          ${(prop.options || []).map(o => { const opt = normalizeOption(o); return `
            <button class="select-option ${selectedValues.includes(opt.value) ? 'selected' : ''}" data-value="${escapeHtml(opt.value)}" style="--tag-color: ${opt.color || 'var(--neon-purple)'}">
              ${escapeHtml(opt.label)}
            </button>
          `; }).join('')}
        </div>
      `;
      break;
    
    case 'relation':
      // For relations, we show a special picker modal
      showRelationPicker(cell, prop, record, value);
      return; // Don't set editorHtml, the picker handles everything
    
    case 'files':
      // For files, we show the file upload modal
      showFileUploadModal(cell, prop, record, value);
      return; // Don't set editorHtml, the modal handles everything
    
    default:
      editorHtml = `<input type="text" class="cell-editor" value="${escapeHtml(value || '')}" />`;
  }
  
  cell.innerHTML = editorHtml;
  
  const input = cell.querySelector('input');
  if (input) {
    input.focus();
    // Auto-open date picker when clicking date field
    if (["date", "time", "datetime-local"].includes(input.type) && input.showPicker) {
      try { input.showPicker(); } catch(e) {}
    }
    input.select();
    
    input.addEventListener('blur', () => saveAndCloseEditor());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveAndCloseEditor();
      } else if (e.key === 'Escape') {
        closeEditor();
      }
    });
  }
  
  cell.querySelectorAll('.select-option').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const selectedValue = btn.dataset.value;
      
      if (prop.type === 'multi_select') {
        btn.classList.toggle('selected');
      } else {
        await updateCellValue(recordId, propId, selectedValue || null);
        closeEditor();
      }
    });
  });
}

async function saveAndCloseEditor() {
  if (!basesState.editingCell) return;
  
  const { cell, propId, recordId } = basesState.editingCell;
  const prop = basesState.currentBase.properties.find(p => p.id === propId);
  
  let value;
  
  if (prop.type === 'multi_select') {
    const selected = cell.querySelectorAll('.select-option.selected:not(.clear-option)');
    value = Array.from(selected).map(btn => btn.dataset.value);
  } else {
    const input = cell.querySelector('input');
    if (input) {
      if (prop.type === 'number') {
        value = input.value ? parseFloat(input.value) : null;
      } else {
        value = input.value || null;
      }
    }
  }
  
  await updateCellValue(recordId, propId, value);
  closeEditor();
}

function closeEditor() {
  if (!basesState.editingCell) return;
  
  const { cell, propId, recordId } = basesState.editingCell;
  const prop = basesState.currentBase.properties.find(p => p.id === propId);
  const record = basesState.currentBase.records.find(r => r.id === recordId);
  
  cell.classList.remove('editing');
  cell.innerHTML = renderCellContent(prop, record?.values[propId]);
  
  const checkbox = cell.querySelector('.cell-checkbox input');
  if (checkbox) {
    checkbox.addEventListener('change', async (e) => {
      e.stopPropagation();
      await updateCellValue(recordId, propId, checkbox.checked);
    });
  }
  
  basesState.editingCell = null;
}

async function updateCellValue(recordId, propId, value) {
  const base = basesState.currentBase;
  const record = base.records.find(r => r.id === recordId);
  
  if (!record) return;
  
  record.values[propId] = value;
  
  try {
    const updatedRecord = base.is_core 
      ? await basesApi.updateCoreRecord(base.id, recordId, { ...record.values, [propId]: value })
      : await basesApi.updateRecord(base.id, recordId, { [propId]: value });
    record.updated_at = updatedRecord.updated_at;
    renderTableView();
  } catch (error) {
    console.error('Failed to update record:', error);
    await openBase(base.id);
  }
}

// ============================================
// Relation Picker
// ============================================

async function showRelationPicker(cell, prop, record, currentValue) {
  const relatedBaseId = prop.options?.relatedBaseId;
  const allowMultiple = prop.options?.allowMultiple ?? false;
  
  if (!relatedBaseId) {
    alert('This relation property is not configured. Please edit the property to select a related base.');
    return;
  }
  
  // Get selected IDs
  let selectedIds = Array.isArray(currentValue) ? [...currentValue] : (currentValue ? [currentValue] : []);
  
  // Fetch the related base records
  let relatedBase;
  try {
    relatedBase = await relationCache.loadBaseRecords(relatedBaseId);
    if (!relatedBase) {
      alert('Could not load the related base. It may have been deleted.');
      return;
    }
  } catch (error) {
    console.error('Failed to load related base:', error);
    alert('Failed to load related records.');
    return;
  }
  
  // Find display name property
  const nameProperty = relatedBase.properties.find(p => p.type === 'text') || relatedBase.properties[0];
  const namePropId = nameProperty?.id;
  
  // Create the picker modal
  const modal = document.createElement('div');
  modal.className = 'modal open';
  modal.id = 'relation-picker-modal';
  
  const recordItems = relatedBase.records.map(r => {
    const displayName = namePropId ? (r.values[namePropId] || `Record ${r.global_id}`) : `Record ${r.global_id}`;
    const isSelected = selectedIds.includes(r.id);
    return { id: r.id, displayName, isSelected, globalId: r.global_id };
  });
  
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content modal-small relation-picker-modal">
      <button class="modal-close-corner" aria-label="Close">×</button>
      <h2>Link to ${escapeHtml(relatedBase.name)}</h2>
      <div class="modal-body">
        <div class="relation-search-bar">
          <input type="text" id="relation-search-input" placeholder="Search records..." class="form-input" autocomplete="off" />
        </div>
        <div class="relation-records-list" id="relation-records-list">
          ${recordItems.length === 0 ? '<p class="text-muted" style="text-align: center; padding: 1rem;">No records in this base</p>' : ''}
          ${recordItems.map(r => `
            <div class="relation-record-item ${r.isSelected ? 'selected' : ''}" data-record-id="${r.id}">
              <span class="relation-record-check">${r.isSelected ? '✓' : ''}</span>
              <span class="relation-record-name">${escapeHtml(r.displayName)}</span>
              <span class="relation-record-id">#${r.globalId}</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="relation-clear-btn">Clear</button>
        <div style="flex: 1;"></div>
        <button class="btn btn-secondary modal-cancel">Cancel</button>
        ${allowMultiple ? '<button class="btn btn-primary" id="relation-done-btn">Done</button>' : ''}
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const searchInput = modal.querySelector('#relation-search-input');
  const recordsList = modal.querySelector('#relation-records-list');
  
  searchInput.focus();
  
  // Search/filter functionality
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    const items = recordsList.querySelectorAll('.relation-record-item');
    
    items.forEach(item => {
      const name = item.querySelector('.relation-record-name').textContent.toLowerCase();
      const id = item.querySelector('.relation-record-id').textContent.toLowerCase();
      const matches = name.includes(query) || id.includes(query);
      item.style.display = matches ? 'flex' : 'none';
    });
  });
  
  // Handle record selection
  recordsList.addEventListener('click', async (e) => {
    const item = e.target.closest('.relation-record-item');
    if (!item) return;
    
    const recordId = item.dataset.recordId;
    
    if (allowMultiple) {
      // Toggle selection
      if (selectedIds.includes(recordId)) {
        selectedIds = selectedIds.filter(id => id !== recordId);
        item.classList.remove('selected');
        item.querySelector('.relation-record-check').textContent = '';
      } else {
        selectedIds.push(recordId);
        item.classList.add('selected');
        item.querySelector('.relation-record-check').textContent = '✓';
      }
    } else {
      // Single select - save and close
      await updateCellValue(record.id, prop.id, [recordId]);
      modal.remove();
    }
  });
  
  // Clear button
  modal.querySelector('#relation-clear-btn')?.addEventListener('click', async () => {
    await updateCellValue(record.id, prop.id, []);
    modal.remove();
  });
  
  // Done button (multi-select only)
  modal.querySelector('#relation-done-btn')?.addEventListener('click', async () => {
    await updateCellValue(record.id, prop.id, selectedIds);
    modal.remove();
  });
  
  // Close handlers
  const closeModal = () => modal.remove();
  modal.querySelector('.modal-close-corner').addEventListener('click', closeModal);
  modal.querySelector('.modal-cancel').addEventListener('click', closeModal);
  modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
  
  // ESC to close
  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);
}

// Function to populate relation pill names after table render
async function populateRelationPills() {
  const pills = document.querySelectorAll('.cell-relation-pill');
  
  for (const pill of pills) {
    const recordId = pill.dataset.recordId;
    const baseId = pill.dataset.baseId;
    
    if (!recordId || !baseId) continue;
    if (pill.textContent !== '...') continue; // Already populated
    
    const displayName = await relationCache.getRecordDisplay(baseId, recordId);
    if (displayName) {
      pill.textContent = displayName;
    } else {
      pill.textContent = `[Deleted]`;
      pill.classList.add('deleted');
    }
  }
  
  // Add click handlers for pills to highlight them
  attachRelationPillClickHandlers();
}

function attachRelationPillClickHandlers() {
  document.querySelectorAll('.cell-relation-pill:not(.pill-handler-attached)').forEach(pill => {
    pill.classList.add('pill-handler-attached');
    pill.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent cell editing from triggering
      
      // Toggle highlighted state
      const wasHighlighted = pill.classList.contains('highlighted');
      
      // Remove highlight from all pills first
      document.querySelectorAll('.cell-relation-pill.highlighted').forEach(p => {
        p.classList.remove('highlighted');
      });
      
      // Add highlight if it wasn't already highlighted
      if (!wasHighlighted) {
        pill.classList.add('highlighted');
        
        // Auto-remove highlight after 2 seconds
        setTimeout(() => {
          pill.classList.remove('highlighted');
        }, 2000);
      }
    });
  });
}

// ============================================
// File Upload Modal
// ============================================

// Constants for file upload
const LARGE_FILE_WARNING_SIZE = 100 * 1024 * 1024; // 100MB - warn about large files
const UPLOAD_TIMEOUT_MS = 120000; // 2 minutes timeout

// Upload status enum
const UploadStatus = {
  PENDING: 'pending',
  UPLOADING: 'uploading',
  SUCCESS: 'success',
  ERROR: 'error'
};

// Classify error types for better messaging
function classifyUploadError(error, response = null) {
  // Check for network/offline errors
  if (!navigator.onLine) {
    return {
      type: 'network',
      title: 'No Internet Connection',
      message: 'Please check your internet connection and try again.',
      icon: '📡',
      canRetry: true
    };
  }
  
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return {
      type: 'network',
      title: 'Network Error',
      message: 'Could not connect to the server. Please check your connection.',
      icon: '🌐',
      canRetry: true
    };
  }
  
  if (error.name === 'AbortError' || error.message.includes('timeout')) {
    return {
      type: 'timeout',
      title: 'Upload Timed Out',
      message: 'The upload took too long. Try uploading smaller files or check your connection.',
      icon: '⏱️',
      canRetry: true
    };
  }
  
  // Check for server errors based on status code
  if (response) {
    if (response.status >= 500) {
      return {
        type: 'server',
        title: 'Server Error',
        message: `The server encountered an error (${response.status}). Please try again later.`,
        icon: '🖥️',
        canRetry: true
      };
    }
    
    if (response.status === 413) {
      return {
        type: 'size',
        title: 'File Too Large',
        message: 'The file(s) exceed the maximum allowed size.',
        icon: '📦',
        canRetry: false
      };
    }
    
    if (response.status === 415 || (error.message && error.message.includes('not allowed'))) {
      return {
        type: 'filetype',
        title: 'File Type Not Allowed',
        message: error.message || 'This file type is not supported for upload.',
        icon: '🚫',
        canRetry: false
      };
    }
    
    if (response.status === 401 || response.status === 403) {
      return {
        type: 'auth',
        title: 'Authentication Error',
        message: 'Your session may have expired. Please refresh the page and try again.',
        icon: '🔒',
        canRetry: false
      };
    }
  }
  
  // Check error message for file type issues
  if (error.message && error.message.includes('not allowed')) {
    return {
      type: 'filetype',
      title: 'File Type Not Allowed',
      message: error.message,
      icon: '🚫',
      canRetry: false
    };
  }
  
  // Generic error
  return {
    type: 'unknown',
    title: 'Upload Failed',
    message: error.message || 'An unexpected error occurred. Please try again.',
    icon: '⚠️',
    canRetry: true
  };
}

function showFileUploadModal(cell, prop, record, currentValue) {
  const files = Array.isArray(currentValue) ? [...currentValue] : [];
  let pendingFiles = []; // Files waiting to be uploaded: { name, size, type, file, status, error }
  let isUploading = false;
  let hasErrors = false; // Track if any files have errors
  
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'modal open';
  modal.id = 'file-upload-modal';
  
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content modal-file-upload">
      <button class="modal-close-corner" aria-label="Close">×</button>
      <div class="modal-header">
        <h2>📎 Attachments</h2>
      </div>
      <div class="modal-body">
        <div class="file-drop-zone" id="file-drop-zone">
          <div class="drop-zone-content">
            <span class="drop-zone-icon">📁</span>
            <p class="drop-zone-text">Drag & drop files here</p>
            <p class="drop-zone-subtext">or</p>
            <button class="btn btn-secondary browse-btn" id="browse-files-btn">Browse Files</button>
            <input type="file" id="file-input" multiple accept="*/*" style="position: absolute; opacity: 0; pointer-events: none; width: 1px; height: 1px;" />
          </div>
          <div class="drop-zone-overlay">
            <span>Drop files to upload</span>
          </div>
        </div>
        
        <div class="upload-status-banner" id="upload-status-banner" style="display: none;"></div>
        
        <div class="upload-progress" id="upload-progress" style="display: none;">
          <div class="upload-progress-bar">
            <div class="upload-progress-fill"></div>
          </div>
          <span class="upload-progress-text">Uploading...</span>
        </div>
        
        <div class="file-list-section">
          <h4 class="file-list-header">Attached Files <span class="file-count" id="file-count">(${files.length})</span></h4>
          <div class="file-list" id="file-list">
            ${files.length === 0 ? '<p class="no-files">No files attached</p>' : ''}
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="save-files-btn">Confirm</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const dropZone = modal.querySelector('#file-drop-zone');
  const fileInput = modal.querySelector('#file-input');
  const browseBtn = modal.querySelector('#browse-files-btn');
  const fileList = modal.querySelector('#file-list');
  const fileCount = modal.querySelector('#file-count');
  const uploadProgress = modal.querySelector('#upload-progress');
  const statusBanner = modal.querySelector('#upload-status-banner');
  
  // Show a status banner (for warnings, errors)
  function showStatusBanner(type, message, showRetryAll = false) {
    const icons = { warning: '⚠️', error: '❌', success: '✅', info: 'ℹ️' };
    statusBanner.className = `upload-status-banner ${type}`;
    statusBanner.innerHTML = `
      <span class="status-icon">${icons[type] || 'ℹ️'}</span>
      <span class="status-message">${escapeHtml(message)}</span>
      ${showRetryAll ? '<button class="btn btn-small btn-secondary retry-all-btn">Retry All Failed</button>' : ''}
    `;
    statusBanner.style.display = 'flex';
    
    if (showRetryAll) {
      statusBanner.querySelector('.retry-all-btn').addEventListener('click', retryAllFailed);
    }
  }
  
  function hideStatusBanner() {
    statusBanner.style.display = 'none';
  }
  
  // Retry all failed files
  function retryAllFailed() {
    const failedFiles = pendingFiles.filter(f => f.status === UploadStatus.ERROR && f.file);
    if (failedFiles.length > 0) {
      // Reset their status
      failedFiles.forEach(f => {
        f.status = UploadStatus.PENDING;
        f.error = null;
      });
      hideStatusBanner();
      renderFileList();
      uploadPendingFiles();
    }
  }
  
  // Render current files
  function renderFileList() {
    const allFiles = [...files, ...pendingFiles];
    const successCount = files.length + pendingFiles.filter(f => f.status === UploadStatus.SUCCESS).length;
    const pendingCount = pendingFiles.filter(f => f.status === UploadStatus.PENDING || f.status === UploadStatus.UPLOADING).length;
    const errorCount = pendingFiles.filter(f => f.status === UploadStatus.ERROR).length;
    
    // Update count with status indicators
    let countText = `(${successCount}`;
    if (pendingCount > 0) countText += ` + ${pendingCount} uploading`;
    if (errorCount > 0) countText += ` · ${errorCount} failed`;
    countText += ')';
    fileCount.textContent = countText;
    
    if (allFiles.length === 0) {
      fileList.innerHTML = '<p class="no-files">No files attached</p>';
      return;
    }
    
    fileList.innerHTML = allFiles.map((file, index) => {
      const isPending = pendingFiles.includes(file);
      const isUploaded = files.includes(file);
      const fileName = file.filename || file.name;
      const fileSize = formatFileSize(file.size);
      const fileIcon = getFileIcon(fileName);
      const hasUrl = isUploaded && file.url;
      const fileUrl = hasUrl ? `/api${file.url}` : '';
      const mimeType = file.type || '';
      const isImage = mimeType.startsWith('image/');
      const isViewable = isImage || mimeType === 'application/pdf';
      
      // Check for large file warning
      const isLargeFile = file.size && file.size > LARGE_FILE_WARNING_SIZE;
      const sizeWarning = isLargeFile && isPending && file.status !== UploadStatus.SUCCESS;
      
      // Status-based classes
      let statusClass = '';
      let statusIndicator = '';
      if (isPending) {
        switch (file.status) {
          case UploadStatus.UPLOADING:
            statusClass = 'uploading';
            statusIndicator = '<span class="file-status-indicator uploading">⏳</span>';
            break;
          case UploadStatus.ERROR:
            statusClass = 'error';
            statusIndicator = '<span class="file-status-indicator error">❌</span>';
            break;
          case UploadStatus.SUCCESS:
            statusClass = 'success';
            statusIndicator = '<span class="file-status-indicator success">✓</span>';
            break;
          default:
            statusClass = 'pending';
            statusIndicator = '<span class="file-status-indicator pending">⏸</span>';
        }
      }
      
      // Determine what to show: thumbnail for images, icon for others
      let iconHtml;
      if (isImage && hasUrl) {
        iconHtml = `<img src="${escapeHtml(fileUrl)}" class="file-thumbnail" alt="${escapeHtml(fileName)}" />`;
      } else if (isImage && isPending) {
        iconHtml = `<span class="file-icon file-thumbnail-placeholder" data-file-index="${index}">${fileIcon}</span>`;
      } else {
        iconHtml = `<span class="file-icon">${fileIcon}</span>`;
      }
      
      // Error message row if there's an error
      const errorRow = file.error ? `
        <div class="file-error-row">
          <span class="file-error-icon">${file.error.icon || '⚠️'}</span>
          <span class="file-error-message">${escapeHtml(file.error.message)}</span>
          ${file.error.canRetry ? `<button class="btn btn-small btn-secondary file-retry-btn" data-index="${index}">Retry</button>` : ''}
        </div>
      ` : '';
      
      // Size warning row
      const warningRow = sizeWarning ? `
        <div class="file-warning-row">
          <span class="file-warning-icon">⚠️</span>
          <span class="file-warning-message">Large file - upload may take a while</span>
        </div>
      ` : '';
      
      const pendingIndex = isPending ? pendingFiles.indexOf(file) : -1;
      
      return `
        <div class="file-item ${statusClass}" data-index="${index}" data-pending="${isPending}" data-pending-index="${pendingIndex}">
          <div class="file-item-main">
            <div class="file-item-info">
              ${statusIndicator}
              ${iconHtml}
              <div class="file-details">
                ${hasUrl 
                  ? `<span class="file-name clickable" data-file-url="${escapeHtml(fileUrl)}" data-file-name="${escapeHtml(fileName)}" data-viewable="${isViewable}" title="Click to ${isViewable ? 'view' : 'download'}">${escapeHtml(fileName)}</span>`
                  : `<span class="file-name">${escapeHtml(fileName)}</span>`
                }
                <span class="file-size">${fileSize}</span>
              </div>
            </div>
            <div class="file-item-actions">
              ${hasUrl ? `<button class="file-action view-file" data-file-url="${escapeHtml(fileUrl)}" data-file-name="${escapeHtml(fileName)}" data-viewable="${isViewable}" title="${isViewable ? 'View' : 'Download'}">👁️</button>` : ''}
              <button class="file-action delete-file" data-index="${index}" data-pending="${isPending}" data-pending-index="${pendingIndex}" title="Remove">×</button>
            </div>
          </div>
          ${errorRow}
          ${warningRow}
        </div>
      `;
    }).join('');
    
    // Generate thumbnails for pending image files using FileReader
    pendingFiles.forEach((file, pendingIdx) => {
      if (file.type && file.type.startsWith('image/') && file.file) {
        const actualIndex = files.length + pendingIdx;
        const placeholder = fileList.querySelector(`.file-thumbnail-placeholder[data-file-index="${actualIndex}"]`);
        if (placeholder) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'file-thumbnail';
            img.alt = file.name;
            placeholder.replaceWith(img);
          };
          reader.readAsDataURL(file.file);
        }
      }
    });
    
    // Attach retry handlers for individual files
    fileList.querySelectorAll('.file-retry-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index);
        const pendingIdx = idx - files.length;
        if (pendingIdx >= 0 && pendingIdx < pendingFiles.length) {
          const file = pendingFiles[pendingIdx];
          if (file.file) {
            file.status = UploadStatus.PENDING;
            file.error = null;
            renderFileList();
            await uploadSingleFile(file, pendingIdx);
          }
        }
      });
    });
    
    // Attach delete handlers
    fileList.querySelectorAll('.delete-file').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index);
        const isPending = btn.dataset.pending === 'true';
        const pendingIdx = parseInt(btn.dataset.pendingIndex);
        
        if (isPending && pendingIdx >= 0) {
          // Pending files haven't been uploaded yet, just remove from array
          pendingFiles.splice(pendingIdx, 1);
          updateErrorState();
          renderFileList();
        } else if (!isPending) {
          // Uploaded files - confirm and delete from server
          const file = files[idx];
          const fileName = file.filename || file.name || 'this file';
          
          if (!confirm(`Delete "${fileName}"? This cannot be undone.`)) {
            return;
          }
          
          // If file has a path (was uploaded to server), delete from server
          if (file.path) {
            try {
              await deleteFileFromServer(file.path);
            } catch (error) {
              console.error('Failed to delete file from server:', error);
              alert('Failed to delete file. Please try again.');
              return;
            }
          }
          
          // Remove from local array
          files.splice(idx, 1);
          renderFileList();
        }
      });
    });
    
    // Attach file open/download handlers (for both file name and view button)
    const handleFileClick = (el) => {
      const fileUrl = el.dataset.fileUrl;
      const fileName = el.dataset.fileName;
      const isViewable = el.dataset.viewable === 'true';
      
      if (!fileUrl) return;
      
      if (isViewable) {
        // Images and PDFs - open in new tab
        window.open(fileUrl, '_blank');
      } else {
        // Other files - trigger download with original name
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    };
    
    fileList.querySelectorAll('.file-name.clickable').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        handleFileClick(el);
      });
    });
    
    fileList.querySelectorAll('.view-file').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleFileClick(btn);
      });
    });
  }
  
  // Update error state and banner
  function updateErrorState() {
    const errorFiles = pendingFiles.filter(f => f.status === UploadStatus.ERROR);
    hasErrors = errorFiles.length > 0;
    
    if (hasErrors) {
      const message = errorFiles.length === 1 
        ? '1 file failed to upload' 
        : `${errorFiles.length} files failed to upload`;
      showStatusBanner('error', message, true);
    } else {
      hideStatusBanner();
    }
  }
  
  // Delete file from server
  async function deleteFileFromServer(filePath) {
    const response = await fetch('/api/uploads', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath }),
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Delete failed' }));
      throw new Error(error.error || 'Delete failed');
    }
    
    return true;
  }
  
  // Format file size
  function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }
  
  // Get file icon based on extension
  function getFileIcon(filename) {
    const ext = (filename || '').split('.').pop().toLowerCase();
    const icons = {
      pdf: '📄',
      doc: '📝', docx: '📝',
      xls: '📊', xlsx: '📊',
      ppt: '📽️', pptx: '📽️',
      jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', webp: '🖼️', svg: '🖼️',
      mp3: '🎵', wav: '🎵', ogg: '🎵',
      mp4: '🎬', mov: '🎬', avi: '🎬', webm: '🎬',
      zip: '📦', rar: '📦', '7z': '📦', tar: '📦', gz: '📦',
      txt: '📄',
      json: '📋', xml: '📋', csv: '📋',
      js: '💻', ts: '💻', py: '💻', html: '💻', css: '💻',
    };
    return icons[ext] || '📎';
  }
  
  // Handle file selection
  async function handleFiles(selectedFiles) {
    if (isUploading) return;
    
    const fileArray = Array.from(selectedFiles);
    
    // Check for large files and show warning
    const largeFiles = fileArray.filter(f => f.size > LARGE_FILE_WARNING_SIZE);
    if (largeFiles.length > 0) {
      const totalSize = fileArray.reduce((sum, f) => sum + f.size, 0);
      showStatusBanner('warning', `Large files detected (${formatFileSize(totalSize)} total) - upload may take a while`);
    }
    
    // Add files to pending list with metadata and status
    for (const file of fileArray) {
      pendingFiles.push({
        name: file.name,
        size: file.size,
        type: file.type,
        file: file, // Keep the File object for upload
        status: UploadStatus.PENDING,
        error: null
      });
    }
    
    renderFileList();
    
    // Don't upload yet - wait for Save button
    // Files will be uploaded when user clicks Save
  }
  
  // Upload a single file
  async function uploadSingleFile(fileObj, pendingIdx) {
    if (!fileObj.file) return;
    
    fileObj.status = UploadStatus.UPLOADING;
    renderFileList();
    
    // Check online status before upload
    if (!navigator.onLine) {
      fileObj.status = UploadStatus.ERROR;
      fileObj.error = classifyUploadError(new Error('No internet connection'));
      updateErrorState();
      renderFileList();
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('files', fileObj.file);
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
      
      // Update status to show we're sending
      const progressText = document.querySelector('.upload-progress-text');
      if (progressText) progressText.textContent = 'Sending file...';
      
      const response = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Update status to show we're processing response
      if (progressText) progressText.textContent = 'Processing response...';
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.error || `Upload failed (${response.status})`);
        fileObj.status = UploadStatus.ERROR;
        fileObj.error = classifyUploadError(error, response);
        updateErrorState();
        renderFileList();
        return;
      }
      
      // Get response as text first to avoid potential JSON parsing issues
      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response:', responseText);
        throw new Error('Invalid response from server');
      }
      
      // Success - move to files array
      if (result.files && result.files.length > 0) {
        const uploadedFile = result.files[0];
        files.push({
          id: uploadedFile.id,
          filename: uploadedFile.originalName || uploadedFile.filename,
          size: uploadedFile.size,
          type: uploadedFile.mimeType,
          url: uploadedFile.path,
          path: uploadedFile.path,
          uploaded_at: uploadedFile.uploadedAt
        });
        
        // Remove from pending
        const idx = pendingFiles.indexOf(fileObj);
        if (idx !== -1) {
          pendingFiles.splice(idx, 1);
        }
      }
      
      updateErrorState();
      renderFileList();
      
    } catch (error) {
      console.error('Upload failed for file:', fileObj.name, error);
      fileObj.status = UploadStatus.ERROR;
      fileObj.error = classifyUploadError(error);
      updateErrorState();
      renderFileList();
    }
  }
  
  // Upload all pending files
  async function uploadPendingFiles() {
    const filesToUpload = pendingFiles.filter(f => f.status === UploadStatus.PENDING && f.file);
    if (filesToUpload.length === 0) return;
    
    isUploading = true;
    uploadProgress.style.display = 'block';
    dropZone.classList.add('disabled');
    
    // Update progress text
    const progressText = uploadProgress.querySelector('.upload-progress-text');
    const progressFill = uploadProgress.querySelector('.upload-progress-fill');
    
    let completed = 0;
    const total = filesToUpload.length;
    
    // Use indeterminate animation style (full width with pulse)
    progressFill.style.width = '100%';
    progressFill.classList.add('indeterminate');
    
    // Upload files one by one to track individual progress
    for (const fileObj of filesToUpload) {
      const pendingIdx = pendingFiles.indexOf(fileObj);
      progressText.textContent = `Uploading ${completed + 1} of ${total}...`;
      
      await uploadSingleFile(fileObj, pendingIdx);
      completed++;
      
      // Update text for multi-file uploads
      if (completed < total) {
        progressText.textContent = `Uploading ${completed + 1} of ${total}...`;
      }
    }
    
    progressFill.classList.remove('indeterminate');
    progressFill.style.width = '100%';
    progressText.textContent = 'Complete!';
    
    // Brief delay to show completion
    await new Promise(resolve => setTimeout(resolve, 800));
    
    isUploading = false;
    uploadProgress.style.display = 'none';
    dropZone.classList.remove('disabled');
    
    // Show final status
    const errorFiles = pendingFiles.filter(f => f.status === UploadStatus.ERROR);
    if (errorFiles.length > 0) {
      updateErrorState();
    } else {
      hideStatusBanner();
    }
    
    renderFileList();
  }
  
  // Drag and drop handlers
  dropZone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
  });
  
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
  });
  
  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only remove class if leaving the drop zone entirely
    if (!dropZone.contains(e.relatedTarget)) {
      dropZone.classList.remove('drag-over');
    }
  });
  
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  });
  
  // Browse button click
  browseBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileInput.click();
  });
  
  // Also make the entire drop zone clickable (better for mobile)
  dropZone.addEventListener('click', (e) => {
    // Only trigger if clicking the zone itself, not the button (button has its own handler)
    if (e.target === dropZone || e.target.closest('.file-drop-zone') && !e.target.closest('.browse-btn')) {
      fileInput.click();
    }
  });
  
  // File input change
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleFiles(fileInput.files);
      fileInput.value = ''; // Reset for next selection
    }
  });
  
  // Close modal handler - prevent closing if there are errors
  const closeModal = (force = false) => {
    // Check if there are failed uploads
    const hasFailedUploads = pendingFiles.some(f => f.status === UploadStatus.ERROR);
    
    if (hasFailedUploads && !force) {
      const confirmClose = confirm('Some files failed to upload. Are you sure you want to close? Failed files will be lost.');
      if (!confirmClose) return;
    }
    
    modal.remove();
    closeEditor();
  };
  
  modal.querySelector('.modal-backdrop').addEventListener('click', () => closeModal(false));
  modal.querySelector('.modal-close-corner').addEventListener('click', () => closeModal(false));
  modal.querySelector('.modal-cancel').addEventListener('click', () => closeModal(true)); // Cancel always closes
  
  // Save button
  modal.querySelector('#save-files-btn').addEventListener('click', async () => {
    const saveBtn = modal.querySelector('#save-files-btn');
    
    // Prevent double-click
    if (saveBtn.disabled) return;
    
    // Check if still uploading
    if (isUploading) {
      alert('Please wait for uploads to complete.');
      return;
    }
    
    // Disable button immediately
    saveBtn.disabled = true;
    
    // Check for files still pending upload
    const stillPending = pendingFiles.filter(f => f.status === UploadStatus.PENDING && f.file);
    if (stillPending.length > 0) {
      saveBtn.textContent = 'Uploading...';
      await uploadPendingFiles();
    }
    
    // Check for pending uploads with errors
    const failedFiles = pendingFiles.filter(f => f.status === UploadStatus.ERROR);
    if (failedFiles.length > 0) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Confirm';
      const confirmSave = confirm(`${failedFiles.length} file(s) failed to upload. Save anyway? Failed files will not be included.`);
      if (!confirmSave) return;
      saveBtn.disabled = true;
    }
    
    // Show saving state
    saveBtn.textContent = 'Saving...';
    
    try {
      // Update the record with the files array (only successfully uploaded files)
      const recordId = record.id;
      const propId = prop.id;
      
      await updateCellValue(recordId, propId, files.length > 0 ? files : null);
      modal.remove();
    } catch (error) {
      console.error('Failed to save attachments:', error);
      alert('Failed to save attachments. Please try again.');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Confirm';
    }
  });
  
  // Keyboard handler
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  });
  
  // Initial render
  renderFileList();
}

// ============================================
// CRUD Operations
// ============================================

async function loadBases() {
  console.log("[BASES] loadBases() called");
  try {
    // Load bases, groups, and core bases in parallel
    const [bases, groups, coreBases] = await Promise.all([
      basesApi.list(),
      basesApi.listGroups().catch(() => []),
      basesApi.listCoreBases().catch(() => [])
    ]);
    basesState.bases = bases;
    basesState.groups = groups;
    basesState.coreBases = coreBases;
    
    // Load core bases collapsed state from localStorage
    try {
      const collapsed = localStorage.getItem("coreBasesCollapsed");
      basesState.coreBasesCollapsed = collapsed === "true";
    } catch (e) {}
    
    renderBasesWithSidebar();
  } catch (error) {
    console.error("Failed to load bases:", error);
  }
}

async function createBase() {
  const name = document.getElementById('new-base-name')?.value?.trim();
  const description = document.getElementById('new-base-description')?.value?.trim() || '';
  if (!name) return;
  
  try {
    const base = await basesApi.create({ name, description });
    basesState.bases.unshift(base);
    renderBasesList();
    closeNewBaseModal();
    openBase(base.id);
  } catch (error) {
    console.error('Failed to create base:', error);
  }
}

async function updateBaseInfo(id, data) {
  try {
    await basesApi.update(id, data);
    // Refresh list
    await loadBases();
    closeEditBaseModal();
  } catch (error) {
    console.error('Failed to update base:', error);
  }
}

async function openBase(id) {
  try {
    const base = await basesApi.get(id);
    basesState.currentBase = base;
    basesState.sortColumn = null;
    basesState.sortDirection = 'asc';
    
    // Reset view state
    basesState.currentViewId = null;
    basesState.filters = [];
    basesState.visibleColumns = null;
    basesState.columnOrder = null;
    
    // Preload relation data for filtering (don't await - let it load in background)
    relationCache.preloadForBase(base);
    
    // Load saved views
    try {
      basesState.views = await basesApi.getViews(id);
    } catch (e) {
      console.error('Failed to load views:', e);
      basesState.views = [];
    }
    
    document.getElementById('bases-list-view').style.display = 'none';
    document.getElementById('base-table-view').style.display = 'block';
    document.getElementById('base-name-display').textContent = base.name;

    // Hide README button for regular bases
    document.getElementById('base-readme-btn').style.display = 'none';

    // Update sidebar active state
    renderSidebar();
    attachSidebarListeners();

    // Auto-apply default view if one exists
    if (typeof baseViews !== 'undefined' && baseViews.applyDefaultView()) {
      // Default view applied (which calls renderTableView internally)
    } else {
      renderTableView();
    }
  } catch (error) {
    console.error('Failed to open base:', error);
  }
}

function closeBase() {
  basesState.currentBase = null;
  basesState.views = [];
  basesState.currentViewId = null;
  basesState.filters = [];
  basesState.visibleColumns = null;
  basesState.columnOrder = null;
  document.getElementById('base-table-view').style.display = 'none';
  document.getElementById('bases-list-view').style.display = 'block';
  loadBases();
}

// ============================================
// Core Bases Functions
// ============================================

async function openCoreBase(id) {
  try {
    const base = await basesApi.getCoreBase(id);
    basesState.currentBase = base;
    basesState.sortColumn = null;
    basesState.sortDirection = "asc";
    
    // Reset view state
    basesState.currentViewId = null;
    basesState.filters = [];
    basesState.visibleColumns = null;
    basesState.columnOrder = null;
    basesState.views = []; // Core bases don"t have saved views
    
    document.getElementById("bases-list-view").style.display = "none";
    document.getElementById("base-table-view").style.display = "block";
    document.getElementById("base-name-display").textContent = base.name;

    // Show README button for core bases (if they have readme content)
    const readmeBtn = document.getElementById('base-readme-btn');
    readmeBtn.style.display = 'inline-flex';

    // Update sidebar active state
    renderSidebar();
    attachSidebarListeners();

    renderTableView();
  } catch (error) {
    console.error("Failed to open core base:", error);
  }
}

function toggleCoreBasesCollapse() {
  basesState.coreBasesCollapsed = !basesState.coreBasesCollapsed;
  localStorage.setItem("coreBasesCollapsed", basesState.coreBasesCollapsed);

  // Animate the toggle instead of re-rendering
  const coreBasesEl = document.querySelector('.sidebar-core-bases');
  if (coreBasesEl) {
    const itemsEl = coreBasesEl.querySelector('.sidebar-core-items');
    const isCollapsed = basesState.coreBasesCollapsed;

    if (isCollapsed) {
      // Collapse: animate to 0
      itemsEl.style.maxHeight = itemsEl.scrollHeight + 'px';
      // Force reflow
      itemsEl.offsetHeight;
      coreBasesEl.classList.add('collapsed');
      itemsEl.style.maxHeight = '0';
    } else {
      // Expand: animate to full height
      coreBasesEl.classList.remove('collapsed');
      itemsEl.style.maxHeight = itemsEl.scrollHeight + 'px';
      // After animation, keep max-height set for content
      setTimeout(() => {
        if (!coreBasesEl.classList.contains('collapsed')) {
          itemsEl.style.maxHeight = itemsEl.scrollHeight + 'px';
        }
      }, 350);
    }
  }
}

function isCoreBase(base) {
  return base && base.is_core === true;
}

/**
 * Show README modal for core base
 */
async function showCoreBaseReadme() {
  const base = basesState.currentBase;
  if (!base || !base.is_core) return;

  try {
    const response = await basesApi.getCoreBaseReadme(base.id);
    if (!response || !response.readme) {
      console.error('No readme content found');
      return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal open';
    modal.id = 'readme-modal';
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content modal-large readme-modal-content">
        <button class="modal-close-corner" aria-label="Close">×</button>
        <div class="readme-modal-header">
          <span class="readme-modal-icon">${base.icon || '📊'}</span>
          <h2>${escapeHtml(base.name)} Guide</h2>
        </div>
        <div class="readme-modal-body">
          ${renderMarkdown(response.readme)}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close handlers
    const closeModal = () => modal.remove();
    modal.querySelector('.modal-close-corner').addEventListener('click', closeModal);
    modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);

    // ESC key to close
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);

  } catch (error) {
    console.error('Failed to load readme:', error);
  }
}

/**
 * Simple markdown to HTML renderer for README content
 */
function renderMarkdown(markdown) {
  if (!markdown) return '';

  let html = markdown
    // Escape HTML first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    // Bold and italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Lists (unordered)
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Wrap consecutive list items in ul
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    // Paragraphs (double newline)
    .replace(/\n\n/g, '</p><p>')
    // Single newlines within paragraphs
    .replace(/\n/g, '<br>');

  // Wrap in paragraph tags
  html = '<p>' + html + '</p>';

  // Clean up empty paragraphs and fix nesting
  html = html
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<h[234]>)/g, '$1')
    .replace(/(<\/h[234]>)<\/p>/g, '$1')
    .replace(/<p>(<ul>)/g, '$1')
    .replace(/(<\/ul>)<\/p>/g, '$1')
    .replace(/<br><\/p>/g, '</p>')
    .replace(/<p><br>/g, '<p>');

  return html;
}

// ============================================
// Filter Modal
// ============================================

function showFilterDropdown(button) {
  closeAllDropdowns();
  
  const base = basesState.currentBase;
  if (!base) return;
  
  // Build list of filterable columns
  const allColumns = [
    { id: '_global_id', name: 'ID', type: 'number' },
    ...base.properties.map(p => ({ id: p.id, name: p.name, type: p.type, options: p.options })),
    { id: '_date_added', name: 'Date Added', type: 'date' },
    { id: '_date_modified', name: 'Date Modified', type: 'date' }
  ];
  
  const modal = document.createElement('div');
  modal.className = 'modal open';
  modal.id = 'filter-modal';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content modal-small">
      <button class="modal-close-corner" aria-label="Close">×</button>
      <h2>Add Filter</h2>
      <div class="modal-body">
        <div class="form-group">
          <label>Column</label>
          <select class="form-input filter-property-select">
            <option value="">Select a column...</option>
            ${allColumns.map(col => `<option value="${col.id}" data-type="${col.type}">${escapeHtml(col.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Condition</label>
          <select class="form-input filter-operator-select" disabled>
            <option value="">Select column first...</option>
          </select>
        </div>
        <div class="form-group filter-value-group" style="display: none;">
          <label>Value</label>
          <input type="text" class="form-input filter-value-input" placeholder="Enter value..." />
          <select class="form-input filter-value-select" style="display: none;">
            <option value="">Select value...</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary modal-cancel">Cancel</button>
        <button class="btn btn-primary add-filter-btn" disabled>Add Filter</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Get elements
  const propSelect = modal.querySelector('.filter-property-select');
  const opSelect = modal.querySelector('.filter-operator-select');
  const valueGroup = modal.querySelector('.filter-value-group');
  const valueInput = modal.querySelector('.filter-value-input');
  const valueSelect = modal.querySelector('.filter-value-select');
  const addBtn = modal.querySelector('.add-filter-btn');
  
  // Close handlers
  const closeModal = () => modal.remove();
  modal.querySelector('.modal-close-corner').addEventListener('click', closeModal);
  modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
  modal.querySelector('.modal-cancel').addEventListener('click', closeModal);
  
  // ESC key to close
  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);
  
  // Property select handler
  propSelect.addEventListener('change', () => {
    const propId = propSelect.value;
    const col = allColumns.find(c => c.id === propId);
    
    if (!col) {
      opSelect.disabled = true;
      opSelect.innerHTML = '<option value="">Select column first...</option>';
      valueGroup.style.display = 'none';
      addBtn.disabled = true;
      return;
    }
    
    // Populate operators
    const operators = filterOperators[col.type] || filterOperators.text;
    opSelect.innerHTML = operators.map(op => `<option value="${op.value}">${op.label}</option>`).join('');
    opSelect.disabled = false;
    
    updateFilterValueInputModal(col, opSelect.value, valueGroup, valueInput, valueSelect);
    updateAddButtonState();
  });
  
  opSelect.addEventListener('change', () => {
    const propId = propSelect.value;
    const col = allColumns.find(c => c.id === propId);
    if (col) {
      updateFilterValueInputModal(col, opSelect.value, valueGroup, valueInput, valueSelect);
      updateAddButtonState();
    }
  });
  
  valueInput.addEventListener('input', updateAddButtonState);
  valueSelect.addEventListener('change', updateAddButtonState);
  
  function updateAddButtonState() {
    const propId = propSelect.value;
    const operator = opSelect.value;
    
    if (!propId || !operator) {
      addBtn.disabled = true;
      return;
    }
    
    // Operators that don't need a value
    if (['is_empty', 'is_not_empty', 'is_checked', 'is_not_checked'].includes(operator)) {
      addBtn.disabled = false;
      return;
    }
    
    // Check if value is provided
    const hasValue = valueInput.style.display !== 'none' 
      ? valueInput.value.trim() !== ''
      : valueSelect.value !== '';
    
    addBtn.disabled = !hasValue;
  }
  
  addBtn.addEventListener('click', () => {
    const propId = propSelect.value;
    const operator = opSelect.value;
    let value = valueInput.style.display !== 'none' ? valueInput.value : valueSelect.value;
    
    if (!propId || !operator) return;
    
    // Don't require value for empty/checked operators
    if (!['is_empty', 'is_not_empty', 'is_checked', 'is_not_checked'].includes(operator) && !value) {
      return;
    }
    
    addFilter({ propertyId: propId, operator, value });
    closeModal();
  });
}

function updateFilterValueInputModal(col, operator, valueGroup, valueInput, valueSelect) {
  // Hide value group first
  valueGroup.style.display = 'none';
  valueInput.style.display = 'none';
  valueSelect.style.display = 'none';
  valueInput.value = '';
  valueSelect.value = '';
  
  // Operators that don't need a value
  if (['is_empty', 'is_not_empty', 'is_checked', 'is_not_checked'].includes(operator)) {
    return;
  }
  
  // Show value group
  valueGroup.style.display = 'block';
  
  // Select/multi-select use dropdown
  if (col.type === 'select' || col.type === 'multi_select') {
    const options = (col.options || []).map(normalizeOption);
    valueSelect.innerHTML = `
      <option value="">Select value...</option>
      ${options.map(o => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join('')}
    `;
    valueSelect.style.display = 'block';
    valueInput.style.display = 'none';
  } else if (col.type === 'date') {
    valueInput.type = 'date';
    valueInput.placeholder = '';
    valueInput.style.display = 'block';
    valueSelect.style.display = 'none';
  } else if (col.type === 'number') {
    valueInput.type = 'number';
    valueInput.placeholder = 'Enter number...';
    valueInput.style.display = 'block';
    valueSelect.style.display = 'none';
  } else {
    valueInput.type = 'text';
    valueInput.placeholder = 'Enter value...';
    valueInput.style.display = 'block';
    valueSelect.style.display = 'none';
  }
}

function addFilter(filter) {
  basesState.filters.push(filter);
  renderTableView();
}

function removeFilter(idx) {
  basesState.filters.splice(idx, 1);
  renderTableView();
}

function clearAllFilters() {
  basesState.filters = [];
  renderTableView();
}

// ============================================
// Columns Modal
// ============================================

function showColumnsDropdown(button) {
  // Close any existing dropdowns
  closeAllDropdowns();
  
  const base = basesState.currentBase;
  if (!base) return;
  
  // Build list of all columns with visibility state
  const visibleCols = basesState.visibleColumns;
  
  const allColumns = [
    { id: '_global_id', name: 'ID', type: 'system' },
    ...base.properties.map(p => ({ id: p.id, name: p.name, type: p.type })),
    { id: '_date_added', name: 'Date Added', type: 'system' },
    { id: '_date_modified', name: 'Date Modified', type: 'system' }
  ];
  
  const modal = document.createElement('div');
  modal.className = 'modal open';
  modal.id = 'columns-modal';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content modal-small">
      <button class="modal-close-corner" aria-label="Close">×</button>
      <h2>Show/Hide Columns</h2>
      <div class="modal-body">
        <div class="columns-list">
          ${allColumns.map(col => {
            const isVisible = visibleCols === null || visibleCols.includes(col.id);
            const isSystem = col.type === 'system';
            return `
              <label class="column-toggle ${isSystem ? 'system-column' : ''}">
                <input type="checkbox" data-col-id="${col.id}" ${isVisible ? 'checked' : ''} />
                <span class="column-name">${escapeHtml(col.name)}</span>
                ${isSystem ? '<span class="system-badge">System</span>' : ''}
              </label>
            `;
          }).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary show-all-btn">Show All</button>
        <button class="btn btn-secondary hide-system-btn">Hide System</button>
        <button class="btn btn-primary modal-done">Done</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Checkbox handlers - update visibility in real-time
  modal.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      updateColumnVisibilityFromModal(modal);
    });
  });
  
  // Show All button
  modal.querySelector('.show-all-btn').addEventListener('click', () => {
    modal.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
    updateColumnVisibilityFromModal(modal);
  });
  
  // Hide System button
  modal.querySelector('.hide-system-btn').addEventListener('click', () => {
    modal.querySelectorAll('.system-column input[type="checkbox"]').forEach(cb => cb.checked = false);
    updateColumnVisibilityFromModal(modal);
  });
  
  // Close handlers
  const closeModal = () => modal.remove();
  modal.querySelector('.modal-close-corner').addEventListener('click', closeModal);
  modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
  modal.querySelector('.modal-done').addEventListener('click', closeModal);
  
  // ESC key to close
  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);
}

function updateColumnVisibilityFromModal(modal) {
  const checkboxes = modal.querySelectorAll('input[type="checkbox"]');
  const visibleCols = [];
  
  checkboxes.forEach(cb => {
    if (cb.checked) {
      visibleCols.push(cb.dataset.colId);
    }
  });
  
  // If all are visible, set to null (default)
  const base = basesState.currentBase;
  const allColIds = [
    '_global_id',
    ...base.properties.map(p => p.id),
    '_date_added',
    '_date_modified'
  ];
  
  if (visibleCols.length === allColIds.length) {
    basesState.visibleColumns = null;
  } else {
    basesState.visibleColumns = visibleCols;
  }
  
  renderTableView();
}

function closeAllDropdowns() {
  document.querySelectorAll('.toolbar-dropdown').forEach(d => d.remove());
}

// ============================================
// View Management
// ============================================

function applyView(viewId) {
  if (!viewId) {
    // Reset to default view
    basesState.currentViewId = null;
    basesState.filters = [];
    basesState.visibleColumns = null;
    basesState.columnOrder = null;
    renderTableView();
    return;
  }
  
  const view = basesState.views.find(v => v.id === viewId);
  if (!view) return;
  
  basesState.currentViewId = viewId;
  const config = view.config || {};
  
  basesState.filters = config.filters || [];
  basesState.visibleColumns = config.visibleColumns || null;
  basesState.columnOrder = config.columnOrder || null;
  
  renderTableView();
}

function showSaveViewModal() {
  const modal = document.createElement('div');
  modal.className = 'modal open';
  modal.id = 'save-view-modal';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content modal-small">
      <button class="modal-close-corner" aria-label="Close">×</button>
      <h2>Save View</h2>
      <div class="modal-body">
        <div class="form-group">
          <label for="view-name-input">View Name</label>
          <input type="text" id="view-name-input" placeholder="My View" class="form-input" />
        </div>
        <div class="view-config-summary">
          <p><strong>This view will save:</strong></p>
          <ul>
            <li>Filters: ${basesState.filters.length > 0 ? basesState.filters.length + ' active' : 'None'}</li>
            <li>Column visibility: ${basesState.visibleColumns ? 'Custom' : 'All visible'}</li>
            <li>Column order: ${basesState.columnOrder ? 'Custom' : 'Default'}</li>
          </ul>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="confirm-save-view">Save View</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const nameInput = modal.querySelector('#view-name-input');
  nameInput.focus();
  
  modal.querySelector('.modal-close-corner').addEventListener('click', () => modal.remove());
  modal.querySelector('.modal-cancel').addEventListener('click', () => modal.remove());
  modal.querySelector('.modal-backdrop').addEventListener('click', () => modal.remove());
  
  modal.querySelector('#confirm-save-view').addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.focus();
      return;
    }
    
    await saveCurrentView(name);
    modal.remove();
  });
  
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      modal.querySelector('#confirm-save-view').click();
    }
  });
}

async function saveCurrentView(name) {
  const base = basesState.currentBase;
  if (!base) return;
  
  const config = {
    filters: basesState.filters,
    visibleColumns: basesState.visibleColumns,
    columnOrder: basesState.columnOrder
  };
  
  try {
    const view = await basesApi.createView(base.id, { name, config });
    basesState.views.push(view);
    basesState.currentViewId = view.id;
    renderTableView();
  } catch (error) {
    console.error('Failed to save view:', error);
  }
}

function showEditViewModal(viewId) {
  // Use enhanced config panel if available
  if (typeof baseViews !== 'undefined') {
    baseViews.showFullViewConfigModal(viewId);
    return;
  }

  const view = basesState.views.find(v => v.id === viewId);
  if (!view) return;
  
  const modal = document.createElement('div');
  modal.className = 'modal open';
  modal.id = 'edit-view-modal';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content modal-small">
      <button class="modal-close-corner" aria-label="Close">×</button>
      <h2>Edit View</h2>
      <div class="modal-body">
        <div class="form-group">
          <label for="edit-view-name-input">View Name</label>
          <input type="text" id="edit-view-name-input" value="${escapeHtml(view.name)}" class="form-input" />
        </div>
        <div class="form-actions">
          <button class="btn btn-secondary" id="update-view-config">Update with Current Filters</button>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="confirm-edit-view">Save Changes</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const nameInput = modal.querySelector('#edit-view-name-input');
  nameInput.focus();
  nameInput.select();
  
  modal.querySelector('.modal-close-corner').addEventListener('click', () => modal.remove());
  modal.querySelector('.modal-cancel').addEventListener('click', () => modal.remove());
  modal.querySelector('.modal-backdrop').addEventListener('click', () => modal.remove());
  
  modal.querySelector('#update-view-config').addEventListener('click', async () => {
    const name = nameInput.value.trim() || view.name;
    const config = {
      filters: basesState.filters,
      visibleColumns: basesState.visibleColumns,
      columnOrder: basesState.columnOrder
    };
    
    await updateView(viewId, name, config);
    modal.remove();
  });
  
  modal.querySelector('#confirm-edit-view').addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.focus();
      return;
    }
    
    await updateView(viewId, name);
    modal.remove();
  });
}

async function updateView(viewId, name, config = null) {
  const base = basesState.currentBase;
  if (!base) return;
  
  try {
    const data = { name };
    if (config) {
      data.config = config;
    }
    
    const updatedView = await basesApi.updateView(base.id, viewId, data);
    const idx = basesState.views.findIndex(v => v.id === viewId);
    if (idx !== -1) {
      basesState.views[idx] = updatedView;
    }
    renderTableView();
  } catch (error) {
    console.error('Failed to update view:', error);
  }
}

async function confirmDeleteView(viewId) {
  const view = basesState.views.find(v => v.id === viewId);
  if (!view) return;
  
  if (!confirm(`Delete view "${view.name}"?`)) return;
  
  const base = basesState.currentBase;
  if (!base) return;
  
  try {
    await basesApi.deleteView(base.id, viewId);
    basesState.views = basesState.views.filter(v => v.id !== viewId);
    
    if (basesState.currentViewId === viewId) {
      basesState.currentViewId = null;
      basesState.filters = [];
      basesState.visibleColumns = null;
      basesState.columnOrder = null;
    }
    
    renderTableView();
  } catch (error) {
    console.error('Failed to delete view:', error);
  }
}

async function confirmDeleteBase(base) {
  if (!confirm(`Delete "${base.name}"? This cannot be undone.`)) return;
  
  try {
    await basesApi.delete(base.id);
    basesState.bases = basesState.bases.filter(b => b.id !== base.id);
    renderBasesList();
  } catch (error) {
    console.error('Failed to delete base:', error);
  }
}

async function addRecord() {
  const base = basesState.currentBase;
  if (!base) return;
  
  try {
    const record = base.is_core
      ? await basesApi.addCoreRecord(base.id, {})
      : await basesApi.addRecord(base.id, {});
    base.records.push(record);
    renderTableView();
  } catch (error) {
    console.error('Failed to add record:', error);
  }
}

async function deleteRecord(recordId) {
  const base = basesState.currentBase;
  if (!base) return;
  
  try {
    if (base.is_core) {
      await basesApi.deleteCoreRecord(base.id, recordId);
    } else {
      await basesApi.deleteRecord(base.id, recordId);
    }
    base.records = base.records.filter(r => r.id !== recordId);
    renderTableView();
  } catch (error) {
    console.error('Failed to delete record:', error);
  }
}

// ============================================
// Property Management
// ============================================

async function showAddPropertyModal() {
  const modal = document.getElementById('add-property-modal');
  if (!modal) return;
  
  modal.classList.add('open');
  document.getElementById('new-property-name').value = '';
  document.getElementById('new-property-type').value = 'text';
  document.getElementById('property-options-group').style.display = 'none';
  document.getElementById('property-relation-group').style.display = 'none';
  document.getElementById('property-options-list').innerHTML = '';
  
  // Reset relation config
  document.getElementById('relation-base-select').value = '';
  document.getElementById('relation-allow-multiple').checked = false;
  
  // Reset reverse relation config
  document.getElementById('relation-create-reverse').checked = false;
  document.getElementById('relation-reverse-name-group').style.display = 'none';
  document.getElementById('relation-reverse-name').value = '';
  document.getElementById('relation-reverse-label').textContent = 'Create reverse relation on target base';
  
  // Populate base dropdown for relation type
  await populateRelationBaseDropdown();
  
  document.getElementById('new-property-name').focus();
}

async function populateRelationBaseDropdown() {
  const select = document.getElementById('relation-base-select');
  if (!select) return;
  
  const currentBaseId = basesState.currentBase?.id;
  
  // Fetch all bases
  const bases = await relationCache.getAllBases();
  
  // Clear and repopulate
  select.innerHTML = '<option value="">Select a base...</option>';
  
  bases.forEach(base => {
    // Allow linking to any base including current one (self-referential)
    const option = document.createElement('option');
    option.value = base.id;
    option.textContent = `${base.icon || '📊'} ${base.name}`;
    if (base.id === currentBaseId) {
      option.textContent += ' (this base)';
    }
    select.appendChild(option);
  });
  
  // Add change listener to update reverse relation label
  select.addEventListener('change', updateReverseRelationLabel);
}

function updateReverseRelationLabel() {
  const select = document.getElementById('relation-base-select');
  const label = document.getElementById('relation-reverse-label');
  const reverseNameInput = document.getElementById('relation-reverse-name');
  
  if (!select || !label) return;
  
  const selectedOption = select.options[select.selectedIndex];
  const selectedBaseId = select.value;
  
  if (selectedBaseId && selectedOption) {
    // Extract base name (remove icon and "(this base)" suffix)
    let baseName = selectedOption.textContent;
    baseName = baseName.replace(/^[^\w\s]*\s*/, ''); // Remove leading emoji
    baseName = baseName.replace(/\s*\(this base\)$/, ''); // Remove suffix
    
    label.textContent = `Create reverse relation on "${baseName}"`;
    
    // Set default reverse name based on current base name
    const currentBaseName = basesState.currentBase?.name || 'Items';
    if (reverseNameInput && !reverseNameInput.value) {
      reverseNameInput.placeholder = `Related ${currentBaseName}`;
    }
  } else {
    label.textContent = 'Create reverse relation on target base';
  }
}

function closeAddPropertyModal() {
  const modal = document.getElementById('add-property-modal');
  if (modal) modal.classList.remove('open');
}

function updatePropertyTypeUI() {
  const type = document.getElementById('new-property-type').value;
  const optionsGroup = document.getElementById('property-options-group');
  const relationGroup = document.getElementById('property-relation-group');
  
  // Hide all conditional groups first
  optionsGroup.style.display = 'none';
  relationGroup.style.display = 'none';
  
  if (type === 'select' || type === 'multi_select') {
    optionsGroup.style.display = 'block';
  } else if (type === 'relation') {
    relationGroup.style.display = 'block';
  }
}

function addPropertyOption() {
  const container = document.getElementById('property-options-list');
  const colors = ['#bf5af2', '#0af', '#00f5d4', '#ff2a6d', '#ff6b35', '#ffe66d', '#05ffa1'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  
  const optionDiv = document.createElement('div');
  optionDiv.className = 'property-option-item';
  optionDiv.innerHTML = `
    <input type="text" class="option-label" placeholder="Option name" />
    <input type="color" class="option-color" value="${randomColor}" />
    <button type="button" class="option-remove">×</button>
  `;
  
  optionDiv.querySelector('.option-remove').addEventListener('click', () => {
    optionDiv.remove();
  });
  
  container.appendChild(optionDiv);
  optionDiv.querySelector('.option-label').focus();
}

async function addProperty() {
  const name = document.getElementById('new-property-name').value.trim();
  const type = document.getElementById('new-property-type').value;
  
  if (!name) return;
  
  const base = basesState.currentBase;
  if (!base) return;
  
  let options = {};
  let createReverse = false;
  let reverseName = '';
  
  if (type === 'select' || type === 'multi_select') {
    // For select types, options is an array of choice objects
    const choices = [];
    document.querySelectorAll('.property-option-item').forEach(item => {
      const label = item.querySelector('.option-label').value.trim();
      const color = item.querySelector('.option-color').value;
      if (label) {
        choices.push({ value: label.toLowerCase().replace(/\s+/g, '_'), label, color });
      }
    });
    options = choices;
  } else if (type === 'relation') {
    // For relation type, options contains config
    const relatedBaseId = document.getElementById('relation-base-select').value;
    const allowMultiple = document.getElementById('relation-allow-multiple').checked;
    
    if (!relatedBaseId) {
      alert('Please select a base to link to.');
      return;
    }
    
    options = {
      relatedBaseId,
      allowMultiple
    };
    
    // Check for reverse relation
    createReverse = document.getElementById('relation-create-reverse').checked;
    if (createReverse) {
      reverseName = document.getElementById('relation-reverse-name').value.trim();
      // If no name provided, use default
      if (!reverseName) {
        reverseName = `Related ${base.name}`;
      }
    }
  }
  
  try {
    const requestData = { name, type, options };
    if (createReverse) {
      requestData.createReverse = true;
      requestData.reverseName = reverseName;
    }
    
    const prop = await basesApi.addProperty(base.id, requestData);
    base.properties.push(prop);
    
    // Invalidate relation cache for target base if reverse was created
    if (prop.reverseProperty) {
      relationCache.invalidateBase(options.relatedBaseId);
      // Also refresh the bases list since we modified another base
      relationCache.bases = null;
    }
    
    renderTableView();
    closeAddPropertyModal();
  } catch (error) {
    console.error('Failed to add property:', error);
    alert(error.message || 'Failed to add property');
  }
}

async function deleteProperty(propId) {
  const base = basesState.currentBase;
  if (!base) return;
  
  if (!confirm('Delete this property? All data in this column will be lost.')) return;
  
  try {
    await basesApi.deleteProperty(base.id, propId);
    base.properties = base.properties.filter(p => p.id !== propId);
    base.records.forEach(r => {
      delete r.values[propId];
    });
    if (basesState.sortColumn === propId) {
      basesState.sortColumn = null;
    }
    renderTableView();
  } catch (error) {
    console.error('Failed to delete property:', error);
  }
}

function showPropertyMenu(propId, event) {
  document.querySelector('.property-menu')?.remove();
  
  const prop = basesState.currentBase.properties.find(p => p.id === propId);
  if (!prop) return;
  
  const hasOptions = prop.type === 'select' || prop.type === 'multi_select';
  
  const typeOptions = Object.entries(propertyTypes).map(([type, info]) => 
    `<button class="property-menu-item type-option ${prop.type === type ? 'selected' : ''}" data-type="${type}">${info.icon} ${info.label}</button>`
  ).join('');
  
  const menu = document.createElement('div');
  menu.className = 'property-menu';
  menu.innerHTML = `
    <div class="property-menu-header">${escapeHtml(prop.name)}</div>
    <button class="property-menu-item" data-action="rename">✏️ Rename</button>
    ${hasOptions ? '<button class="property-menu-item" data-action="edit-options">🏷️ Edit</button>' : ''}
    <div class="property-menu-divider"></div>
    <div class="property-menu-label">Change type to</div>
    ${typeOptions}
    <div class="property-menu-divider"></div>
    <button class="property-menu-item danger" data-action="delete">🗑️ Delete property</button>
  `;
  
  menu.style.position = 'fixed';
  menu.style.top = `${event.clientY}px`;
  menu.style.left = `${event.clientX}px`;
  
  document.body.appendChild(menu);
  
  const menuRect = menu.getBoundingClientRect();
  if (menuRect.right > window.innerWidth) {
    menu.style.left = `${window.innerWidth - menuRect.width - 8}px`;
  }
  if (menuRect.bottom > window.innerHeight) {
    menu.style.top = `${window.innerHeight - menuRect.height - 8}px`;
  }
  
  menu.addEventListener('click', async (e) => {
    const action = e.target.dataset.action;
    const newType = e.target.dataset.type;
    
    if (action === 'delete') {
      if (confirm(`Delete property "${prop.name}"? This cannot be undone.`)) {
        await deleteProperty(propId);
      }
      menu.remove();
    } else if (action === 'rename') {
      menu.remove();
      const newName = prompt('New property name:', prop.name);
      if (newName && newName.trim() && newName.trim() !== prop.name) {
        await basesApi.updateProperty(basesState.currentBase.id, propId, { name: newName.trim() });
        prop.name = newName.trim();
        renderTableView();
      }
    } else if (action === 'edit-options') {
      menu.remove();
      showOptionsEditorModal(propId);
    } else if (newType && newType !== prop.type) {
      await basesApi.updateProperty(basesState.currentBase.id, propId, { type: newType });
      prop.type = newType;
      if ((newType === 'select' || newType === 'multi_select') && !prop.options) {
        prop.options = [];
      }
      renderTableView();
      menu.remove();
    }
  });
  
  setTimeout(() => {
    document.addEventListener('click', function closeMenu(e) {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    });
  }, 0);
}

function showOptionsEditorModal(propId) {
  const prop = basesState.currentBase.properties.find(p => p.id === propId);
  if (!prop) return;
  
  const options = (prop.options || []).map(normalizeOption);
  
  const modal = document.createElement('div');
  modal.className = 'modal open';
  modal.id = 'options-editor-modal';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content modal-small options-editor-modal">
      <button class="modal-close-corner" aria-label="Close">×</button>
      <div class="modal-body">
        <div class="add-option-row">
          <input type="text" id="new-option-input" placeholder="Add new option..." class="option-input" />
          <input type="color" id="new-option-color" value="${getNextAvailableColor(options.map(o => o.color).filter(Boolean))}" class="color-input" title="Pick a color" />
          <button class="btn btn-primary" id="add-option-btn">+</button>
        </div>
        <div class="options-list" id="options-editor-list"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="save-options-btn">Confirm</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  let currentOptions = [...options];
  
  function renderOptionsList() {
    const list = document.getElementById('options-editor-list');
    if (!list) return;
    
    if (currentOptions.length === 0) {
      list.innerHTML = '<p class="text-muted">No options yet. Add one below.</p>';
      return;
    }
    
    list.innerHTML = currentOptions.map((opt, i) => `
      <div class="option-item" data-index="${i}">
        <input type="color" value="${opt.color || tagColors[i % tagColors.length]}" class="color-input option-color" data-index="${i}" title="Change color" />
        <input type="text" value="${escapeHtml(opt.label)}" class="option-input option-label" data-index="${i}" />
        <button class="btn btn-icon option-delete" data-index="${i}" title="Delete option">×</button>
      </div>
    `).join('');
    
    list.querySelectorAll('.option-color').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.index);
        // Never allow black
        currentOptions[idx].color = ensureValidColor(e.target.value);
        e.target.value = currentOptions[idx].color;
      });
    });
    
    list.querySelectorAll('.option-label').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index);
        currentOptions[idx].label = e.target.value;
        currentOptions[idx].value = e.target.value;
      });
    });
    
    list.querySelectorAll('.option-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.index);
        currentOptions.splice(idx, 1);
        renderOptionsList();
      });
    });
  }
  
  renderOptionsList();
  
  // Save function - used by both Enter key and Save button
  async function saveOptionsAndClose() {
    const validOptions = currentOptions.filter(o => o.label && o.label.trim());
    // Ensure no black colors
    validOptions.forEach(opt => {
      opt.color = ensureValidColor(opt.color);
    });
    await basesApi.updateProperty(basesState.currentBase.id, propId, { options: validOptions });
    prop.options = validOptions;
    modal.remove();
    renderTableView();
  }

  // Add option function
  function addCurrentOption() {
    const input = document.getElementById('new-option-input');
    const colorInput = document.getElementById('new-option-color');
    const name = input.value.trim();
    if (!name) return false;
    
    currentOptions.push({
      value: name,
      label: name,
      color: ensureValidColor(colorInput.value)
    });
    
    input.value = '';
    const usedColors = currentOptions.map(o => o.color).filter(Boolean);
    colorInput.value = getNextAvailableColor(usedColors);
    renderOptionsList();
    return true;
  }

  document.getElementById('add-option-btn').addEventListener('click', () => {
    addCurrentOption();
    document.getElementById('new-option-input').focus();
  });
  
  document.getElementById('new-option-input').addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Add the option if there's text, then save and close
      addCurrentOption();
      await saveOptionsAndClose();
    }
  });
  
  document.getElementById('save-options-btn').addEventListener('click', saveOptionsAndClose);
  
  modal.querySelector('.modal-close-corner').addEventListener('click', () => modal.remove());
  modal.querySelector('.modal-cancel').addEventListener('click', () => modal.remove());
  modal.querySelector('.modal-backdrop').addEventListener('click', () => modal.remove());
  
  document.getElementById('new-option-input').focus();
}

// ============================================
// Modals
// ============================================

function showNewBaseModal() {
  const modal = document.getElementById('new-base-modal');
  if (!modal) return;
  modal.classList.add('open');
  document.getElementById('new-base-name').value = '';
  document.getElementById('new-base-description').value = '';
  document.getElementById('new-base-name').focus();
}

function closeNewBaseModal() {
  const modal = document.getElementById('new-base-modal');
  if (modal) modal.classList.remove('open');
}

function showEditBaseModal(baseId) {
  const base = basesState.bases.find(b => b.id === baseId);
  if (!base) return;
  
  const modal = document.getElementById('edit-base-modal');
  if (!modal) return;
  
  modal.dataset.baseId = baseId;
  document.getElementById('edit-base-name').value = base.name || '';
  document.getElementById('edit-base-description').value = base.description || '';
  document.getElementById('edit-base-icon').value = base.icon || '';
  
  // Populate groups dropdown
  const groupSelect = document.getElementById('edit-base-group');
  if (groupSelect) {
    const groups = basesState.groups || [];
    groupSelect.innerHTML = `
      <option value="">No group (ungrouped)</option>
      ${groups.map(g => `<option value="${g.id}" ${base.group_id === g.id ? 'selected' : ''}>📂 ${escapeHtml(g.name)}</option>`).join('')}
    `;
  }
  
  const modalTitle = document.getElementById("edit-base-modal-title");
  if (modalTitle) modalTitle.textContent = base.name;
  modal.classList.add("open");
  document.getElementById('edit-base-name').focus();
}

function closeEditBaseModal() {
  const modal = document.getElementById('edit-base-modal');
  if (modal) {
    modal.classList.remove('open');
    delete modal.dataset.baseId;
  }
}

async function saveEditBase() {
  const modal = document.getElementById('edit-base-modal');
  const baseId = modal?.dataset?.baseId;
  if (!baseId) return;
  
  const name = document.getElementById('edit-base-name').value.trim();
  const description = document.getElementById('edit-base-description').value.trim();
  const icon = document.getElementById('edit-base-icon').value.trim();
  const groupId = document.getElementById('edit-base-group')?.value || null;
  
  if (!name) return;
  
  try {
    // Update base info (just the API call, don't refresh yet)
    await basesApi.update(baseId, { name, description, icon });
    
    // Update group assignment
    await basesApi.setBaseGroup(baseId, groupId);
    
    // Close modal
    closeEditBaseModal();
    
    // Refresh everything
    await loadBases();
  } catch (error) {
    console.error('Failed to save base:', error);
  }
}

// ============================================
// Utility
// ============================================

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// Initialization
// ============================================

function initBases() {
  console.log("[BASES] initBases() called");
  const basesTab = document.querySelector('[data-tab="bases"]');
  if (!basesTab) return;
  
  // Load preferences
  loadBasesPreferences();
  
  // Set initial button states
  document.querySelectorAll('.bases-display-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.display === basesState.displayMode);
  });
  document.querySelectorAll('.bases-card-size-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.size === basesState.cardSize);
  });
  
  // Show/hide card size control based on display mode
  const sizeControl = document.getElementById('bases-card-size-control');
  if (sizeControl) {
    sizeControl.style.display = basesState.displayMode === 'cards' ? 'flex' : 'none';
  }
  
  // ===== STATIC SIDEBAR BUTTON LISTENERS (initialized once) =====
  // Add group button
  document.getElementById('add-group-btn')?.addEventListener('click', showAddGroupModal);
  
  // Toggle all groups button (expand/collapse)
  document.getElementById('toggle-all-groups-btn')?.addEventListener('click', toggleAllGroups);
  
  // Sidebar new base button
  document.getElementById('sidebar-new-base-btn')?.addEventListener('click', showNewBaseModal);
  
  // Load bases when tab is clicked (also load immediately if already on bases tab)
  if (basesTab.classList.contains("active")) {
    loadBases();
  }

  // Also load on tab click
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      if (tab.dataset.tab === "bases") {
        console.log("[BASES] Tab click detected, calling loadBases");
        loadBases();
      }
    });
  });
  
  // Display toggle
  document.querySelectorAll('.bases-display-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchBasesDisplay(btn.dataset.display);
    });
  });
  
  // Card size toggle
  document.querySelectorAll('.bases-card-size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchBasesCardSize(btn.dataset.size);
    });
  });
  
  // New base modal handlers
  document.getElementById('add-base-btn')?.addEventListener('click', showNewBaseModal);
  document.getElementById('create-base-btn')?.addEventListener('click', createBase);
  document.getElementById('new-base-modal')?.querySelector('.modal-close')?.addEventListener('click', closeNewBaseModal);
  document.getElementById('new-base-modal')?.querySelector('.modal-cancel')?.addEventListener('click', closeNewBaseModal);
  document.getElementById('new-base-modal')?.querySelector('.modal-backdrop')?.addEventListener('click', closeNewBaseModal);
  
  document.getElementById('new-base-name')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') createBase();
  });
  
  // Edit base modal handlers
  document.getElementById('save-edit-base-btn')?.addEventListener('click', saveEditBase);
  document.getElementById('edit-base-modal')?.querySelector('.modal-close')?.addEventListener('click', closeEditBaseModal);
  document.getElementById('edit-base-modal')?.querySelector('.modal-cancel')?.addEventListener('click', closeEditBaseModal);
  document.getElementById('edit-base-modal')?.querySelector('.modal-backdrop')?.addEventListener('click', closeEditBaseModal);
  
  // Back button
  document.getElementById('back-to-bases')?.addEventListener('click', closeBase);

  // README button for core bases
  document.getElementById('base-readme-btn')?.addEventListener('click', showCoreBaseReadme);
  
  // Add property modal handlers
  document.getElementById('add-property-modal')?.querySelector('.modal-close')?.addEventListener('click', closeAddPropertyModal);
  document.getElementById('add-property-modal')?.querySelector('.modal-cancel')?.addEventListener('click', closeAddPropertyModal);
  document.getElementById('add-property-modal')?.querySelector('.modal-backdrop')?.addEventListener('click', closeAddPropertyModal);
  document.getElementById('new-property-type')?.addEventListener('change', updatePropertyTypeUI);
  document.getElementById('add-property-option-btn')?.addEventListener('click', addPropertyOption);
  document.getElementById('create-property-btn')?.addEventListener('click', addProperty);
  
  // Reverse relation checkbox handler
  document.getElementById('relation-create-reverse')?.addEventListener('change', (e) => {
    const reverseNameGroup = document.getElementById('relation-reverse-name-group');
    if (reverseNameGroup) {
      reverseNameGroup.style.display = e.target.checked ? 'block' : 'none';
    }
  });
  
  document.getElementById('new-property-name')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addProperty();
  });
}

// Make functions globally available
window.openBase = openBase;
window.confirmDeleteBase = confirmDeleteBase;
window.showEditBaseModal = showEditBaseModal;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBases);
} else {
  initBases();
}

console.log("[BASES] Script loaded, readyState:", document.readyState);
