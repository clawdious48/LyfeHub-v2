/**
 * Apex CRM Module — Organizations & Contacts Management
 * Accessible as a sub-view within the Apex section.
 */

const apexCrm = {
    currentView: 'organizations', // 'organizations' | 'contacts'
    orgs: [],
    contacts: [],
    orgTags: [],
    contactTags: [],
    searchQuery: '',
    filterTag: '',
    expandedId: null,

    // ========================================
    // Initialization
    // ========================================
    async init() {
        this.bindNavEvents();
    },

    bindNavEvents() {
        // CRM nav button in Apex view controls
        const crmBtn = document.getElementById('apex-crm-nav-btn');
        if (crmBtn) {
            crmBtn.addEventListener('click', () => this.show());
        }
    },

    // ========================================
    // Show / Hide CRM View
    // ========================================
    show() {
        const jobsContent = document.getElementById('apex-jobs-content');
        const crmContent = document.getElementById('apex-crm-content');
        if (jobsContent) jobsContent.style.display = 'none';
        if (crmContent) {
            crmContent.style.display = 'block';
            crmContent.classList.add('active');
        }
        this.loadData();
    },

    hide() {
        const jobsContent = document.getElementById('apex-jobs-content');
        const crmContent = document.getElementById('apex-crm-content');
        if (crmContent) {
            crmContent.style.display = 'none';
            crmContent.classList.remove('active');
        }
        if (jobsContent) jobsContent.style.display = '';
    },

    // ========================================
    // Data Loading
    // ========================================
    async loadData() {
        try {
            const [orgs, contacts, orgTags, contactTags] = await Promise.all([
                api.getCrmOrgs({ limit: 200 }),
                api.getCrmContacts({ limit: 200 }),
                api.getCrmOrgTags().catch(() => []),
                api.getCrmContactTags().catch(() => []),
            ]);
            this.orgs = Array.isArray(orgs) ? orgs : (orgs.data || orgs.orgs || []);
            this.contacts = Array.isArray(contacts) ? contacts : (contacts.data || contacts.contacts || []);
            this.orgTags = Array.isArray(orgTags) ? orgTags : [];
            this.contactTags = Array.isArray(contactTags) ? contactTags : [];
        } catch (err) {
            console.error('Failed to load CRM data:', err);
            this.orgs = [];
            this.contacts = [];
        }
        this.render();
    },

    // ========================================
    // Rendering
    // ========================================
    render() {
        const container = document.getElementById('apex-crm-content');
        if (!container) return;

        container.innerHTML = `
            <div class="crm-header">
                <button class="crm-back-btn" onclick="apexCrm.hide()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
                    Back to Jobs
                </button>
                <h2 class="crm-title">CRM</h2>
                <div class="crm-view-toggle">
                    <button class="crm-view-btn ${this.currentView === 'organizations' ? 'active' : ''}" onclick="apexCrm.switchView('organizations')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                        Organizations
                    </button>
                    <button class="crm-view-btn ${this.currentView === 'contacts' ? 'active' : ''}" onclick="apexCrm.switchView('contacts')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        Contacts
                    </button>
                </div>
            </div>
            <div class="crm-toolbar">
                <input type="text" class="crm-search" id="crm-search" placeholder="Search ${this.currentView}..." value="${this._esc(this.searchQuery)}" oninput="apexCrm.onSearch(this.value)">
                <select class="crm-filter-tag" id="crm-filter-tag" onchange="apexCrm.onFilterTag(this.value)">
                    <option value="">All Tags</option>
                    ${(this.currentView === 'organizations' ? this.orgTags : this.contactTags).map(t =>
                        `<option value="${this._esc(t.id || t.name)}" ${this.filterTag === (t.id || t.name) ? 'selected' : ''}>${this._esc(t.name)}</option>`
                    ).join('')}
                </select>
                <button class="btn btn-primary crm-add-btn" onclick="apexCrm.openAddForm()">
                    + Add ${this.currentView === 'organizations' ? 'Organization' : 'Contact'}
                </button>
            </div>
            <div class="crm-list" id="crm-list">
                ${this.currentView === 'organizations' ? this.renderOrgList() : this.renderContactList()}
            </div>
        `;
    },

    switchView(view) {
        this.currentView = view;
        this.searchQuery = '';
        this.filterTag = '';
        this.expandedId = null;
        this.render();
    },

    onSearch(query) {
        this.searchQuery = query.toLowerCase();
        const listEl = document.getElementById('crm-list');
        if (listEl) {
            listEl.innerHTML = this.currentView === 'organizations' ? this.renderOrgList() : this.renderContactList();
        }
    },

    onFilterTag(tagId) {
        this.filterTag = tagId;
        const listEl = document.getElementById('crm-list');
        if (listEl) {
            listEl.innerHTML = this.currentView === 'organizations' ? this.renderOrgList() : this.renderContactList();
        }
    },

    // ========================================
    // Organizations
    // ========================================
    getFilteredOrgs() {
        return this.orgs.filter(org => {
            if (this.searchQuery) {
                const name = (org.name || '').toLowerCase();
                const type = (org.type || '').toLowerCase();
                if (!name.includes(this.searchQuery) && !type.includes(this.searchQuery)) return false;
            }
            if (this.filterTag && org.tags) {
                const hasTg = org.tags.some(t => (t.id || t.tag_id || t.name) === this.filterTag);
                if (!hasTg) return false;
            }
            return true;
        });
    },

    renderOrgList() {
        const orgs = this.getFilteredOrgs();
        if (orgs.length === 0) {
            return '<div class="apex-empty-state">No organizations found</div>';
        }
        return orgs.map(org => this.renderOrgRow(org)).join('');
    },

    renderOrgRow(org) {
        const isExpanded = this.expandedId === org.id;
        const tags = (org.tags || []).map(t =>
            `<span class="crm-tag" style="background:${t.color || 'rgba(0,170,255,0.2)'}">${this._esc(t.name || t.tag)}</span>`
        ).join('');
        const contactCount = org.contact_count || 0;
        const typeLabel = (org.type || '').replace(/_/g, ' ');

        return `
            <div class="crm-row ${isExpanded ? 'expanded' : ''}" data-id="${org.id}">
                <div class="crm-row-main" onclick="apexCrm.toggleExpand('${org.id}')">
                    <div class="crm-row-left">
                        <span class="crm-row-name">${this._esc(org.name)}</span>
                        <span class="crm-row-type">${this._esc(typeLabel)}</span>
                        ${tags}
                    </div>
                    <div class="crm-row-right">
                        <span class="crm-row-count" title="Contacts">${contactCount} contact${contactCount !== 1 ? 's' : ''}</span>
                        <span class="crm-row-arrow">${isExpanded ? '▲' : '▼'}</span>
                    </div>
                </div>
                ${isExpanded ? this.renderOrgExpanded(org) : ''}
            </div>
        `;
    },

    renderOrgExpanded(org) {
        const fields = [
            { label: 'Phone', value: org.phone },
            { label: 'Email', value: org.email },
            { label: 'Website', value: org.website },
            { label: 'Trade', value: org.trade },
            { label: 'Address', value: [org.address_line1, org.address_line2, org.address_city, org.address_state, org.address_zip].filter(Boolean).join(', ') },
        ].filter(f => f.value);

        const notes = org.notes || '';

        return `
            <div class="crm-expanded">
                <div class="crm-expanded-details">
                    ${fields.map(f => `
                        <div class="crm-detail-item">
                            <span class="crm-detail-label">${f.label}</span>
                            <span class="crm-detail-value">${this._esc(f.value)}</span>
                        </div>
                    `).join('')}
                    ${notes ? `<div class="crm-detail-item full"><span class="crm-detail-label">Notes</span><span class="crm-detail-value">${this._esc(notes)}</span></div>` : ''}
                </div>
                <div class="crm-expanded-contacts" id="crm-org-contacts-${org.id}">
                    <h4>Contacts at this Organization</h4>
                    <div class="crm-loading">Loading contacts...</div>
                </div>
                <div class="crm-expanded-actions">
                    <button class="crm-action-btn" onclick="apexCrm.editOrg('${org.id}')">Edit</button>
                    <button class="crm-action-btn" onclick="apexCrm.manageOrgTags('${org.id}')">Tags</button>
                    <button class="crm-action-btn danger" onclick="apexCrm.deleteOrg('${org.id}')">Delete</button>
                </div>
            </div>
        `;
    },

    async toggleExpand(id) {
        if (this.expandedId === id) {
            this.expandedId = null;
        } else {
            this.expandedId = id;
        }
        const listEl = document.getElementById('crm-list');
        if (listEl) {
            listEl.innerHTML = this.currentView === 'organizations' ? this.renderOrgList() : this.renderContactList();
        }
        // Load contacts for expanded org
        if (this.expandedId && this.currentView === 'organizations') {
            this.loadOrgContacts(id);
        }
        if (this.expandedId && this.currentView === 'contacts') {
            this.loadContactOrgs(id);
        }
    },

    async loadOrgContacts(orgId) {
        const container = document.getElementById(`crm-org-contacts-${orgId}`);
        if (!container) return;
        try {
            const contacts = await api.getCrmOrgContacts(orgId);
            const list = Array.isArray(contacts) ? contacts : [];
            if (list.length === 0) {
                container.innerHTML = '<h4>Contacts at this Organization</h4><div class="apex-empty-state">No contacts linked</div>';
            } else {
                container.innerHTML = `
                    <h4>Contacts at this Organization</h4>
                    ${list.map(c => {
                        const name = [c.first_name, c.last_name].filter(Boolean).join(' ');
                        return `<div class="crm-mini-contact">
                            <span class="crm-mini-name">${this._esc(name)}</span>
                            ${c.role_title ? `<span class="crm-mini-role">${this._esc(c.role_title)}</span>` : ''}
                            ${c.phone ? `<span class="crm-mini-phone">${this._esc(c.phone)}</span>` : ''}
                            ${c.email ? `<span class="crm-mini-email">${this._esc(c.email)}</span>` : ''}
                        </div>`;
                    }).join('')}
                `;
            }
        } catch (err) {
            container.innerHTML = '<h4>Contacts</h4><div class="apex-empty-state">Failed to load contacts</div>';
        }
    },

    // ========================================
    // Contacts
    // ========================================
    getFilteredContacts() {
        return this.contacts.filter(c => {
            if (this.searchQuery) {
                const name = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
                const email = (c.email || '').toLowerCase();
                const title = (c.title || '').toLowerCase();
                if (!name.includes(this.searchQuery) && !email.includes(this.searchQuery) && !title.includes(this.searchQuery)) return false;
            }
            if (this.filterTag && c.tags) {
                const hasTg = c.tags.some(t => (t.id || t.tag_id || t.name) === this.filterTag);
                if (!hasTg) return false;
            }
            return true;
        });
    },

    renderContactList() {
        const contacts = this.getFilteredContacts();
        if (contacts.length === 0) {
            return '<div class="apex-empty-state">No contacts found</div>';
        }
        return contacts.map(c => this.renderContactRow(c)).join('');
    },

    renderContactRow(contact) {
        const isExpanded = this.expandedId === contact.id;
        const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ');
        const tags = (contact.tags || []).map(t =>
            `<span class="crm-tag" style="background:${t.color || 'rgba(5,255,161,0.2)'}">${this._esc(t.name || t.tag)}</span>`
        ).join('');
        const orgs = (contact.organizations || contact.orgs || []).map(o =>
            `<span class="crm-org-badge">${this._esc(o.name || o.org_name || '')}</span>`
        ).join('');

        return `
            <div class="crm-row ${isExpanded ? 'expanded' : ''}" data-id="${contact.id}">
                <div class="crm-row-main" onclick="apexCrm.toggleExpand('${contact.id}')">
                    <div class="crm-row-left">
                        <span class="crm-row-name">${this._esc(name)}</span>
                        ${contact.title ? `<span class="crm-row-type">${this._esc(contact.title)}</span>` : ''}
                        ${orgs}
                        ${tags}
                    </div>
                    <div class="crm-row-right">
                        ${contact.phone ? `<span class="crm-row-phone">${this._esc(contact.phone)}</span>` : ''}
                        <span class="crm-row-arrow">${isExpanded ? '▲' : '▼'}</span>
                    </div>
                </div>
                ${isExpanded ? this.renderContactExpanded(contact) : ''}
            </div>
        `;
    },

    renderContactExpanded(contact) {
        const fields = [
            { label: 'Email', value: contact.email },
            { label: 'Phone', value: contact.phone },
            { label: 'Alt Phone', value: contact.phone_alt },
            { label: 'Title', value: contact.title },
            { label: 'Address', value: [contact.address_line1, contact.address_line2, contact.address_city, contact.address_state, contact.address_zip].filter(Boolean).join(', ') },
        ].filter(f => f.value);

        const notes = contact.notes || '';

        return `
            <div class="crm-expanded">
                <div class="crm-expanded-details">
                    ${fields.map(f => `
                        <div class="crm-detail-item">
                            <span class="crm-detail-label">${f.label}</span>
                            <span class="crm-detail-value">${this._esc(f.value)}</span>
                        </div>
                    `).join('')}
                    ${notes ? `<div class="crm-detail-item full"><span class="crm-detail-label">Notes</span><span class="crm-detail-value">${this._esc(notes)}</span></div>` : ''}
                </div>
                <div class="crm-expanded-orgs" id="crm-contact-orgs-${contact.id}">
                    <h4>Organization Memberships</h4>
                    ${(contact.organizations || contact.orgs || []).length > 0
                        ? (contact.organizations || contact.orgs || []).map(o => `
                            <div class="crm-mini-contact">
                                <span class="crm-mini-name">${this._esc(o.name || o.org_name || '')}</span>
                                ${o.role_title ? `<span class="crm-mini-role">${this._esc(o.role_title)}</span>` : ''}
                                <button class="crm-remove-link" onclick="event.stopPropagation(); apexCrm.removeContactFromOrg('${contact.id}', '${o.crm_org_id || o.id}')" title="Remove">×</button>
                            </div>
                        `).join('')
                        : '<div class="apex-empty-state">No organizations linked</div>'
                    }
                    <button class="crm-action-btn small" onclick="apexCrm.linkContactToOrg('${contact.id}')">+ Link to Org</button>
                </div>
                <div class="crm-expanded-actions">
                    <button class="crm-action-btn" onclick="apexCrm.editContact('${contact.id}')">Edit</button>
                    <button class="crm-action-btn" onclick="apexCrm.manageContactTags('${contact.id}')">Tags</button>
                    <button class="crm-action-btn danger" onclick="apexCrm.deleteContact('${contact.id}')">Delete</button>
                </div>
            </div>
        `;
    },

    async loadContactOrgs(contactId) {
        // Orgs should already be embedded in the contact data from the API
        // If not, we could fetch them. For now just rely on what's loaded.
    },

    // ========================================
    // CRUD Operations
    // ========================================
    openAddForm() {
        if (this.currentView === 'organizations') {
            this.openOrgForm();
        } else {
            this.openContactForm();
        }
    },

    openOrgForm(org = null) {
        const esc = this._esc;
        const isEdit = !!org;
        const typeOpts = ['insurance_carrier', 'property_mgmt', 'real_estate', 'subcontractor', 'vendor_supplier', 'marketing_networking', 'other']
            .map(t => `<option value="${t}" ${org?.type === t ? 'selected' : ''}>${t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>`).join('');

        const tradeOpts = ['', 'electrical', 'plumbing', 'flooring', 'hvac', 'siding', 'drywall', 'roofing', 'painting', 'general']
            .map(t => `<option value="${t}" ${org?.trade === t ? 'selected' : ''}>${t ? t.charAt(0).toUpperCase() + t.slice(1) : 'None'}</option>`).join('');

        const html = `
            <form id="crm-org-form" class="crm-form">
                <div class="crm-form-grid">
                    <div class="crm-form-field full">
                        <label>Name *</label>
                        <input type="text" name="name" value="${esc(org?.name || '')}" required>
                    </div>
                    <div class="crm-form-field">
                        <label>Type *</label>
                        <select name="type">${typeOpts}</select>
                    </div>
                    <div class="crm-form-field">
                        <label>Trade</label>
                        <select name="trade">${tradeOpts}</select>
                    </div>
                    <div class="crm-form-field">
                        <label>Phone</label>
                        <input type="text" name="phone" value="${esc(org?.phone || '')}">
                    </div>
                    <div class="crm-form-field">
                        <label>Email</label>
                        <input type="email" name="email" value="${esc(org?.email || '')}">
                    </div>
                    <div class="crm-form-field">
                        <label>Website</label>
                        <input type="text" name="website" value="${esc(org?.website || '')}">
                    </div>
                    <div class="crm-form-field">
                        <label>Address Line 1</label>
                        <input type="text" name="address_line1" value="${esc(org?.address_line1 || '')}">
                    </div>
                    <div class="crm-form-field">
                        <label>City</label>
                        <input type="text" name="address_city" value="${esc(org?.address_city || '')}">
                    </div>
                    <div class="crm-form-field half">
                        <label>State</label>
                        <input type="text" name="address_state" value="${esc(org?.address_state || '')}">
                    </div>
                    <div class="crm-form-field half">
                        <label>ZIP</label>
                        <input type="text" name="address_zip" value="${esc(org?.address_zip || '')}">
                    </div>
                    <div class="crm-form-field full">
                        <label>Notes</label>
                        <textarea name="notes" rows="3">${esc(org?.notes || '')}</textarea>
                    </div>
                </div>
                <div class="crm-form-actions">
                    <button type="button" class="crm-action-btn" onclick="apexCrm.closeModal()">Cancel</button>
                    <button type="button" class="crm-action-btn primary" onclick="apexCrm.saveOrg(${isEdit ? `'${org.id}'` : 'null'})">${isEdit ? 'Update' : 'Create'}</button>
                </div>
            </form>
        `;
        this.openModal(isEdit ? 'Edit Organization' : 'New Organization', html);
    },

    openContactForm(contact = null) {
        const esc = this._esc;
        const isEdit = !!contact;

        const html = `
            <form id="crm-contact-form" class="crm-form">
                <div class="crm-form-grid">
                    <div class="crm-form-field">
                        <label>First Name *</label>
                        <input type="text" name="first_name" value="${esc(contact?.first_name || '')}" required>
                    </div>
                    <div class="crm-form-field">
                        <label>Last Name</label>
                        <input type="text" name="last_name" value="${esc(contact?.last_name || '')}">
                    </div>
                    <div class="crm-form-field">
                        <label>Email</label>
                        <input type="email" name="email" value="${esc(contact?.email || '')}">
                    </div>
                    <div class="crm-form-field">
                        <label>Phone</label>
                        <input type="text" name="phone" value="${esc(contact?.phone || '')}">
                    </div>
                    <div class="crm-form-field">
                        <label>Alt Phone</label>
                        <input type="text" name="phone_alt" value="${esc(contact?.phone_alt || '')}">
                    </div>
                    <div class="crm-form-field">
                        <label>Title</label>
                        <input type="text" name="title" value="${esc(contact?.title || '')}" placeholder="e.g. Adjuster, Project Manager">
                    </div>
                    <div class="crm-form-field full">
                        <label>Notes</label>
                        <textarea name="notes" rows="3">${esc(contact?.notes || '')}</textarea>
                    </div>
                </div>
                <div class="crm-form-actions">
                    <button type="button" class="crm-action-btn" onclick="apexCrm.closeModal()">Cancel</button>
                    <button type="button" class="crm-action-btn primary" onclick="apexCrm.saveContact(${isEdit ? `'${contact.id}'` : 'null'})">${isEdit ? 'Update' : 'Create'}</button>
                </div>
            </form>
        `;
        this.openModal(isEdit ? 'Edit Contact' : 'New Contact', html);
    },

    async saveOrg(id) {
        const form = document.getElementById('crm-org-form');
        if (!form) return;
        const data = Object.fromEntries(new FormData(form));
        if (!data.name?.trim()) return alert('Name is required');
        // Remove empty strings
        Object.keys(data).forEach(k => { if (data[k] === '') delete data[k]; });
        try {
            if (id) {
                await api.updateCrmOrg(id, data);
            } else {
                await api.createCrmOrg(data);
            }
            this.closeModal();
            await this.loadData();
        } catch (err) {
            console.error('Failed to save org:', err);
            alert('Failed to save organization');
        }
    },

    async saveContact(id) {
        const form = document.getElementById('crm-contact-form');
        if (!form) return;
        const data = Object.fromEntries(new FormData(form));
        if (!data.first_name?.trim()) return alert('First name is required');
        Object.keys(data).forEach(k => { if (data[k] === '') delete data[k]; });
        try {
            if (id) {
                await api.updateCrmContact(id, data);
            } else {
                await api.createCrmContact(data);
            }
            this.closeModal();
            await this.loadData();
        } catch (err) {
            console.error('Failed to save contact:', err);
            alert('Failed to save contact');
        }
    },

    async editOrg(id) {
        try {
            const org = await api.getCrmOrg(id);
            this.openOrgForm(org);
        } catch (err) {
            console.error('Failed to load org for editing:', err);
        }
    },

    async editContact(id) {
        try {
            const contact = await api.getCrmContact(id);
            this.openContactForm(contact);
        } catch (err) {
            console.error('Failed to load contact for editing:', err);
        }
    },

    async deleteOrg(id) {
        if (!confirm('Delete this organization?')) return;
        try {
            await api.deleteCrmOrg(id);
            this.expandedId = null;
            await this.loadData();
        } catch (err) {
            console.error('Failed to delete org:', err);
            alert('Failed to delete organization');
        }
    },

    async deleteContact(id) {
        if (!confirm('Delete this contact?')) return;
        try {
            await api.deleteCrmContact(id);
            this.expandedId = null;
            await this.loadData();
        } catch (err) {
            console.error('Failed to delete contact:', err);
            alert('Failed to delete contact');
        }
    },

    // ========================================
    // Tags Management
    // ========================================
    manageOrgTags(orgId) {
        const org = this.orgs.find(o => o.id === orgId);
        if (!org) return;
        const currentTags = (org.tags || []).map(t => t.id || t.tag_id);
        const allTags = this.orgTags;

        const html = `
            <div class="crm-tags-manager">
                <div class="crm-tags-current">
                    ${allTags.map(t => {
                        const checked = currentTags.includes(t.id) ? 'checked' : '';
                        return `<label class="crm-tag-checkbox">
                            <input type="checkbox" value="${t.id}" ${checked}>
                            <span class="crm-tag" style="background:${t.color || 'rgba(0,170,255,0.2)'}">${this._esc(t.name)}</span>
                        </label>`;
                    }).join('')}
                    ${allTags.length === 0 ? '<div class="apex-empty-state">No tags defined yet</div>' : ''}
                </div>
                <div class="crm-tags-add">
                    <input type="text" id="crm-new-tag-name" placeholder="New tag name...">
                    <button class="crm-action-btn small" onclick="apexCrm.createAndApplyOrgTag('${orgId}')">Add Tag</button>
                </div>
                <div class="crm-form-actions">
                    <button type="button" class="crm-action-btn" onclick="apexCrm.closeModal()">Cancel</button>
                    <button type="button" class="crm-action-btn primary" onclick="apexCrm.saveOrgTags('${orgId}')">Save Tags</button>
                </div>
            </div>
        `;
        this.openModal('Manage Tags — ' + (org.name || ''), html);
    },

    async createAndApplyOrgTag(orgId) {
        const input = document.getElementById('crm-new-tag-name');
        const name = input?.value?.trim();
        if (!name) return;
        try {
            const tag = await api.createCrmOrgTag(name);
            this.orgTags.push(tag);
            input.value = '';
            this.manageOrgTags(orgId); // Re-render
        } catch (err) {
            console.error('Failed to create tag:', err);
        }
    },

    async saveOrgTags(orgId) {
        const checkboxes = document.querySelectorAll('.crm-tags-manager .crm-tag-checkbox input[type="checkbox"]');
        const tag_ids = [];
        checkboxes.forEach(cb => { if (cb.checked) tag_ids.push(cb.value); });
        try {
            await api.setCrmOrgTags(orgId, tag_ids);
            this.closeModal();
            await this.loadData();
        } catch (err) {
            console.error('Failed to save tags:', err);
        }
    },

    manageContactTags(contactId) {
        const contact = this.contacts.find(c => c.id === contactId);
        if (!contact) return;
        const currentTags = (contact.tags || []).map(t => t.id || t.tag_id);
        const allTags = this.contactTags;

        const html = `
            <div class="crm-tags-manager">
                <div class="crm-tags-current">
                    ${allTags.map(t => {
                        const checked = currentTags.includes(t.id) ? 'checked' : '';
                        return `<label class="crm-tag-checkbox">
                            <input type="checkbox" value="${t.id}" ${checked}>
                            <span class="crm-tag" style="background:${t.color || 'rgba(5,255,161,0.2)'}">${this._esc(t.name)}</span>
                        </label>`;
                    }).join('')}
                    ${allTags.length === 0 ? '<div class="apex-empty-state">No tags defined yet</div>' : ''}
                </div>
                <div class="crm-tags-add">
                    <input type="text" id="crm-new-tag-name" placeholder="New tag name...">
                    <button class="crm-action-btn small" onclick="apexCrm.createAndApplyContactTag('${contactId}')">Add Tag</button>
                </div>
                <div class="crm-form-actions">
                    <button type="button" class="crm-action-btn" onclick="apexCrm.closeModal()">Cancel</button>
                    <button type="button" class="crm-action-btn primary" onclick="apexCrm.saveContactTags('${contactId}')">Save Tags</button>
                </div>
            </div>
        `;
        this.openModal('Manage Tags — ' + [contact.first_name, contact.last_name].filter(Boolean).join(' '), html);
    },

    async createAndApplyContactTag(contactId) {
        const input = document.getElementById('crm-new-tag-name');
        const name = input?.value?.trim();
        if (!name) return;
        try {
            const tag = await api.createCrmContactTag(name);
            this.contactTags.push(tag);
            input.value = '';
            this.manageContactTags(contactId);
        } catch (err) {
            console.error('Failed to create tag:', err);
        }
    },

    async saveContactTags(contactId) {
        const checkboxes = document.querySelectorAll('.crm-tags-manager .crm-tag-checkbox input[type="checkbox"]');
        const tag_ids = [];
        checkboxes.forEach(cb => { if (cb.checked) tag_ids.push(cb.value); });
        try {
            await api.setCrmContactTags(contactId, tag_ids);
            this.closeModal();
            await this.loadData();
        } catch (err) {
            console.error('Failed to save tags:', err);
        }
    },

    // ========================================
    // Link Contact to Org
    // ========================================
    linkContactToOrg(contactId) {
        const orgOpts = this.orgs.map(o =>
            `<option value="${o.id}">${this._esc(o.name)}</option>`
        ).join('');

        const html = `
            <form id="crm-link-org-form" class="crm-form">
                <div class="crm-form-grid">
                    <div class="crm-form-field full">
                        <label>Organization</label>
                        <select name="crm_org_id">${orgOpts}</select>
                    </div>
                    <div class="crm-form-field full">
                        <label>Role / Title at this Org</label>
                        <input type="text" name="role_title" placeholder="e.g. Senior Adjuster">
                    </div>
                    <div class="crm-form-field full">
                        <label><input type="checkbox" name="is_primary" value="true"> Primary contact at this org</label>
                    </div>
                </div>
                <div class="crm-form-actions">
                    <button type="button" class="crm-action-btn" onclick="apexCrm.closeModal()">Cancel</button>
                    <button type="button" class="crm-action-btn primary" onclick="apexCrm.saveLinkContactToOrg('${contactId}')">Link</button>
                </div>
            </form>
        `;
        this.openModal('Link Contact to Organization', html);
    },

    async saveLinkContactToOrg(contactId) {
        const form = document.getElementById('crm-link-org-form');
        if (!form) return;
        const data = Object.fromEntries(new FormData(form));
        try {
            await api.addCrmContactToOrg(contactId, data.crm_org_id, data.role_title || null, data.is_primary === 'true');
            this.closeModal();
            await this.loadData();
            this.expandedId = contactId;
            const listEl = document.getElementById('crm-list');
            if (listEl) listEl.innerHTML = this.renderContactList();
        } catch (err) {
            console.error('Failed to link contact to org:', err);
            alert('Failed to link contact to organization');
        }
    },

    async removeContactFromOrg(contactId, crmOrgId) {
        if (!confirm('Remove this organization link?')) return;
        try {
            await api.removeCrmContactFromOrg(contactId, crmOrgId);
            await this.loadData();
            this.expandedId = contactId;
            const listEl = document.getElementById('crm-list');
            if (listEl) listEl.innerHTML = this.renderContactList();
        } catch (err) {
            console.error('Failed to remove link:', err);
        }
    },

    // ========================================
    // Modal Infrastructure
    // ========================================
    openModal(title, html) {
        let overlay = document.getElementById('crm-modal-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'crm-modal-overlay';
            overlay.className = 'crm-modal-overlay';
            overlay.innerHTML = `
                <div class="crm-modal-backdrop" onclick="apexCrm.closeModal()"></div>
                <div class="crm-modal-card">
                    <div class="crm-modal-header">
                        <h3 class="crm-modal-title"></h3>
                        <button class="crm-modal-close" onclick="apexCrm.closeModal()">&times;</button>
                    </div>
                    <div class="crm-modal-body"></div>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        overlay.querySelector('.crm-modal-title').textContent = title;
        overlay.querySelector('.crm-modal-body').innerHTML = html;
        overlay.style.display = 'flex';
    },

    closeModal() {
        const overlay = document.getElementById('crm-modal-overlay');
        if (overlay) overlay.style.display = 'none';
    },

    // ========================================
    // Utilities
    // ========================================
    _esc(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },
};

window.apexCrm = apexCrm;

// Initialize when apex-jobs is ready
document.addEventListener('DOMContentLoaded', () => {
    apexCrm.init();
});
