/**
 * Job Detail Modals - All 8 modal form components
 * Uses a shared overlay container #job-detail-modal-overlay
 */

const jobDetailModals = {

    // ========================================
    // Shared modal infrastructure
    // ========================================
    _ensureOverlay() {
        let overlay = document.getElementById('job-detail-modal-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'job-detail-modal-overlay';
            overlay.className = 'jdm-overlay';
            overlay.style.display = 'none';
            overlay.innerHTML = `
                <div class="jdm-backdrop" onclick="jobDetailModals.closeModal()"></div>
                <div class="modal-content jdm-card"></div>
            `;
            document.body.appendChild(overlay);
        }
        return overlay;
    },

    openModal(title, contentHtml) {
        const overlay = this._ensureOverlay();
        overlay.querySelector('.jdm-card').innerHTML = `
            <div class="modal-header jdm-header">
                <h2 class="jdm-title">${title}</h2>
                <button class="modal-close jdm-close" onclick="jobDetailModals.closeModal()">&times;</button>
            </div>
            <div class="modal-body jdm-body">${contentHtml}</div>
        `;
        overlay.style.display = 'flex';
    },

    closeModal() {
        const overlay = document.getElementById('job-detail-modal-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            overlay.querySelector('.jdm-card').innerHTML = '';
        }
    },

    _fmt(amount) {
        return `$${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    },

    _formFooter(cancelLabel, actionLabel, actionOnclick) {
        return `
            <div class="jdm-footer">
                <button type="button" class="jdm-btn jdm-btn-cancel" onclick="jobDetailModals.closeModal()">${apexJobs.escapeHtml(cancelLabel || 'Cancel')}</button>
                <button type="button" class="jdm-btn jdm-btn-action" onclick="${actionOnclick}">${apexJobs.escapeHtml(actionLabel || 'Save')}</button>
            </div>
        `;
    },

    // ========================================
    // 8.1 Edit Job Modal
    // ========================================
    async openEditJobModal(job, onSave) {
        const esc = apexJobs.escapeHtml;
        this._pendingOnSave = onSave;

        // Fetch team assignments for dynamic dropdowns
        let team = [];
        try { team = await api.getTeamAssignments(); } catch (err) { console.warn('Failed to load team assignments:', err); }

        // Helper to build <option> lists with current value pre-selected
        const opt = (val, label, current) =>
            `<option value="${esc(val)}" ${current === val ? 'selected' : ''}>${esc(label)}</option>`;

        // Parse current assignment values for pre-selection
        const parseAssignment = (fieldName) => {
            let arr = [];
            try { arr = JSON.parse(job[fieldName] || '[]'); } catch { arr = []; }
            if (!Array.isArray(arr)) arr = [];
            return arr;
        };

        const states = ['AZ','CA','CO','NM','NV','TX','UT'];
        const stateOpts = (current) => ['<option value="">--</option>'].concat(
            states.map(s => opt(s, s, current))
        ).join('');

        const lossTypes = [
            {v:'water', l:'Water Damage'}, {v:'fire', l:'Fire Damage'}, {v:'mold', l:'Mold Remediation'},
            {v:'storm', l:'Storm Damage'}, {v:'sewage', l:'Sewage Backup'}, {v:'vandalism', l:'Vandalism'}, {v:'other', l:'Other'}
        ];
        const waterCats = [
            {v:'cat1', l:'Cat 1 - Clean Water'}, {v:'cat2', l:'Cat 2 - Gray Water'}, {v:'cat3', l:'Cat 3 - Black Water'}
        ];
        const damageCls = [
            {v:'class1', l:'Class 1 - Minimal'}, {v:'class2', l:'Class 2 - Significant'},
            {v:'class3', l:'Class 3 - Extensive'}, {v:'class4', l:'Class 4 - Specialty'}
        ];
        const propTypes = [
            {v:'residential', l:'Residential'}, {v:'commercial', l:'Commercial'},
            {v:'multi-family', l:'Multi-Family'}, {v:'industrial', l:'Industrial'}
        ];
        const relations = [
            {v:'owner', l:'Property Owner'}, {v:'tenant', l:'Tenant'},
            {v:'manager', l:'Property Manager'}, {v:'agent', l:'Insurance Agent'}, {v:'other', l:'Other'}
        ];
        const referralOpts = [
            {v:'insurance', l:'Insurance Company'}, {v:'agent', l:'Insurance Agent'}, {v:'past-client', l:'Past Client'},
            {v:'google', l:'Google Search'}, {v:'facebook', l:'Facebook'}, {v:'nextdoor', l:'Nextdoor'},
            {v:'thumbtack', l:'Thumbtack'}, {v:'yelp', l:'Yelp'}, {v:'word-of-mouth', l:'Word of Mouth'}, {v:'other', l:'Other'}
        ];

        const html = `
            <form id="jdm-edit-job-form" class="jdm-edit-form">

                <div class="jdm-section">
                    <h3 class="jdm-section-title">Client Info</h3>
                    <div class="jdm-field-grid">
                        <div class="jdm-field jdm-field-full">
                            <label>Name</label>
                            <input type="text" class="jdm-input" name="client_name" value="${esc(job.client_name || '')}">
                        </div>
                        <div class="jdm-field">
                            <label>Phone</label>
                            <input type="tel" class="jdm-input" name="client_phone" value="${esc(job.client_phone || '')}">
                        </div>
                        <div class="jdm-field">
                            <label>Email</label>
                            <input type="email" class="jdm-input" name="client_email" value="${esc(job.client_email || '')}">
                        </div>
                        <div class="jdm-field jdm-field-full">
                            <label>Street</label>
                            <input type="text" class="jdm-input" name="client_street" value="${esc(job.client_street || '')}">
                        </div>
                        <div class="jdm-field">
                            <label>City</label>
                            <input type="text" class="jdm-input" name="client_city" value="${esc(job.client_city || '')}">
                        </div>
                        <div class="jdm-field jdm-field-half">
                            <label>State</label>
                            <select class="jdm-select" name="client_state">${stateOpts(job.client_state || '')}</select>
                        </div>
                        <div class="jdm-field jdm-field-half">
                            <label>Zip</label>
                            <input type="text" class="jdm-input" name="client_zip" value="${esc(job.client_zip || '')}" maxlength="10">
                        </div>
                        <div class="jdm-field jdm-field-full">
                            <label>Relation</label>
                            <select class="jdm-select" name="client_relation">
                                ${relations.map(r => opt(r.v, r.l, job.client_relation || 'owner')).join('')}
                            </select>
                        </div>
                    </div>
                </div>

                <div class="jdm-section">
                    <h3 class="jdm-section-title">Property Info</h3>
                    <div class="jdm-field-grid">
                        <div class="jdm-field jdm-field-full">
                            <label>Street</label>
                            <input type="text" class="jdm-input" name="prop_street" value="${esc(job.prop_street || '')}">
                        </div>
                        <div class="jdm-field">
                            <label>City</label>
                            <input type="text" class="jdm-input" name="prop_city" value="${esc(job.prop_city || '')}">
                        </div>
                        <div class="jdm-field jdm-field-half">
                            <label>State</label>
                            <select class="jdm-select" name="prop_state">${stateOpts(job.prop_state || '')}</select>
                        </div>
                        <div class="jdm-field jdm-field-half">
                            <label>Zip</label>
                            <input type="text" class="jdm-input" name="prop_zip" value="${esc(job.prop_zip || '')}" maxlength="10">
                        </div>
                        <div class="jdm-field jdm-field-full">
                            <label>Property Type</label>
                            <select class="jdm-select" name="prop_type">
                                ${propTypes.map(t => opt(t.v, t.l, job.prop_type || 'residential')).join('')}
                            </select>
                        </div>
                        <div class="jdm-field-divider">Occupant (if different)</div>
                        <div class="jdm-field jdm-field-full">
                            <label>Occupant Name</label>
                            <input type="text" class="jdm-input" name="occ_name" value="${esc(job.occ_name || '')}">
                        </div>
                        <div class="jdm-field">
                            <label>Phone</label>
                            <input type="tel" class="jdm-input" name="occ_phone" value="${esc(job.occ_phone || '')}">
                        </div>
                        <div class="jdm-field">
                            <label>Email</label>
                            <input type="email" class="jdm-input" name="occ_email" value="${esc(job.occ_email || '')}">
                        </div>
                        <div class="jdm-field jdm-field-full">
                            <label>Access Info</label>
                            <input type="text" class="jdm-input" name="access_info" value="${esc(job.access_info || '')}" placeholder="Gate code, lockbox, etc.">
                        </div>
                    </div>
                </div>

                <div class="jdm-section">
                    <h3 class="jdm-section-title">Insurance Info</h3>
                    <div class="jdm-field-grid">
                        <div class="jdm-field jdm-field-full">
                            <label>Carrier</label>
                            <input type="text" class="jdm-input" name="ins_carrier" value="${esc(job.ins_carrier || '')}">
                        </div>
                        <div class="jdm-field">
                            <label>Claim #</label>
                            <input type="text" class="jdm-input" name="ins_claim" value="${esc(job.ins_claim || '')}">
                        </div>
                        <div class="jdm-field">
                            <label>Policy #</label>
                            <input type="text" class="jdm-input" name="ins_policy" value="${esc(job.ins_policy || '')}">
                        </div>
                        <div class="jdm-field">
                            <label>Deductible</label>
                            <input type="number" class="jdm-input" name="deductible" step="0.01" min="0" value="${esc(job.deductible || '')}">
                        </div>
                        <div class="jdm-field-divider">Adjuster</div>
                        <div class="jdm-field jdm-field-full">
                            <label>Adjuster Name</label>
                            <input type="text" class="jdm-input" name="adj_name" value="${esc(job.adj_name || '')}">
                        </div>
                        <div class="jdm-field">
                            <label>Phone</label>
                            <input type="tel" class="jdm-input" name="adj_phone" value="${esc(job.adj_phone || '')}">
                        </div>
                        <div class="jdm-field">
                            <label>Email</label>
                            <input type="email" class="jdm-input" name="adj_email" value="${esc(job.adj_email || '')}">
                        </div>
                    </div>
                </div>

                <div class="jdm-section">
                    <h3 class="jdm-section-title">Loss Info</h3>
                    <div class="jdm-field-grid">
                        <div class="jdm-field">
                            <label>Source of Loss</label>
                            <select class="jdm-select" name="loss_type">
                                <option value="">Select...</option>
                                ${lossTypes.map(t => opt(t.v, t.l, job.loss_type || '')).join('')}
                            </select>
                        </div>
                        <div class="jdm-field">
                            <label>Date of Loss</label>
                            <input type="date" class="jdm-input" name="loss_date" value="${esc(job.loss_date || '')}">
                        </div>
                        <div class="jdm-field">
                            <label>Water Category</label>
                            <select class="jdm-select" name="water_category">
                                <option value="">Select...</option>
                                ${waterCats.map(c => opt(c.v, c.l, job.water_category || '')).join('')}
                            </select>
                        </div>
                        <div class="jdm-field">
                            <label>Damage Class</label>
                            <select class="jdm-select" name="damage_class">
                                <option value="">Select...</option>
                                ${damageCls.map(c => opt(c.v, c.l, job.damage_class || '')).join('')}
                            </select>
                        </div>
                        <div class="jdm-field jdm-field-full">
                            <label>Areas Affected</label>
                            <input type="text" class="jdm-input" name="areas_affected" value="${esc(job.areas_affected || '')}" placeholder="Kitchen, basement, etc.">
                        </div>
                        <div class="jdm-field jdm-field-full">
                            <label>Hazards</label>
                            <input type="text" class="jdm-input" name="hazards" value="${esc(job.hazards || '')}" placeholder="Asbestos, lead, etc.">
                        </div>
                        <div class="jdm-field jdm-field-full">
                            <label>Description</label>
                            <textarea class="jdm-textarea" name="loss_description" rows="2" placeholder="Brief description of the loss...">${esc(job.loss_description || '')}</textarea>
                        </div>
                        <div class="jdm-field jdm-field-full">
                            <label>Scope Notes</label>
                            <textarea class="jdm-textarea" name="scope_notes" rows="2" placeholder="Initial scope of work...">${esc(job.scope_notes || '')}</textarea>
                        </div>
                        <div class="jdm-field jdm-field-full">
                            <label class="jdm-checkbox-label">
                                <input type="checkbox" name="urgent" ${job.urgent ? 'checked' : ''}> Urgent
                            </label>
                        </div>
                    </div>
                </div>

                <div class="jdm-section">
                    <h3 class="jdm-section-title">Team Assignment</h3>
                    <div class="jdm-field-grid">
                        <div class="jdm-field">
                            <label>Mitigation PM</label>
                            <div class="team-select" data-field="mitigation_pm"></div>
                            <select name="mitigation_pm" multiple class="team-select-hidden"></select>
                        </div>
                        <div class="jdm-field">
                            <label>Reconstruction PM</label>
                            <div class="team-select" data-field="reconstruction_pm"></div>
                            <select name="reconstruction_pm" multiple class="team-select-hidden"></select>
                        </div>
                        <div class="jdm-field">
                            <label>Estimator</label>
                            <div class="team-select" data-field="estimator"></div>
                            <select name="estimator" multiple class="team-select-hidden"></select>
                        </div>
                        <div class="jdm-field">
                            <label>Project Coordinator</label>
                            <div class="team-select" data-field="project_coordinator"></div>
                            <select name="project_coordinator" multiple class="team-select-hidden"></select>
                        </div>
                        <div class="jdm-field jdm-field-full">
                            <label>Mitigation Technician(s)</label>
                            <div class="team-select" data-field="mitigation_techs"></div>
                            <select name="mitigation_techs" multiple class="team-select-hidden"></select>
                        </div>
                    </div>
                </div>

                <div class="jdm-section">
                    <h3 class="jdm-section-title">Referral &amp; Tracking</h3>
                    <div class="jdm-field-grid">
                        <div class="jdm-field">
                            <label>Referral Source</label>
                            <select class="jdm-select" name="referral_source">
                                <option value="">Select...</option>
                                ${referralOpts.map(r => opt(r.v, r.l, job.referral_source || '')).join('')}
                            </select>
                        </div>
                        <div class="jdm-field">
                            <label>How They Heard</label>
                            <input type="text" class="jdm-input" name="how_heard" value="${esc(job.how_heard || '')}" placeholder="Details...">
                        </div>
                        <div class="jdm-field jdm-field-full">
                            <label>Internal Notes</label>
                            <textarea class="jdm-textarea" name="internal_notes" rows="2" placeholder="Private notes for the team...">${esc(job.internal_notes || '')}</textarea>
                        </div>
                    </div>
                </div>

                ${this._formFooter('Cancel', 'Save Changes', "jobDetailModals._saveEditJob('" + job.id + "')")}
            </form>
        `;

        this.openModal('Edit Job', html);

        // Initialize custom team dropdowns with current selections
        const overlay = document.getElementById('job-detail-modal-overlay');
        if (overlay) {
            const fields = ['mitigation_pm', 'reconstruction_pm', 'estimator', 'project_coordinator', 'mitigation_techs'];
            for (const fieldName of fields) {
                const container = overlay.querySelector(`.team-select[data-field="${fieldName}"]`);
                teamSelect.render(container, fieldName, team, parseAssignment(fieldName));
            }
        }
    },

    async _saveEditJob(jobId) {
        const form = document.getElementById('jdm-edit-job-form');
        if (!form) return;
        const data = {};
        const formData = new FormData(form);
        // Handle multi-select fields (FormData emits duplicate keys for <select multiple>)
        for (const [key, value] of formData.entries()) {
            if (data[key] !== undefined) {
                if (!Array.isArray(data[key])) data[key] = [data[key]];
                data[key].push(value);
            } else {
                data[key] = value;
            }
        }
        // Ensure assignment fields are always arrays
        ['mitigation_pm', 'reconstruction_pm', 'estimator', 'project_coordinator', 'mitigation_techs'].forEach(f => {
            if (data[f] && !Array.isArray(data[f])) data[f] = [data[f]];
            else if (!data[f]) data[f] = [];
        });
        // Handle urgent checkbox
        data.urgent = !!form.querySelector('[name="urgent"]')?.checked;
        try {
            await api.updateApexJob(jobId, data);
            this.closeModal();
            if (this._pendingOnSave) this._pendingOnSave();
        } catch (err) {
            console.error('Failed to update job:', err);
        }
    },

    // ========================================
    // 8.2 Add Estimate Modal
    // ========================================
    openAddEstimateModal(jobId, existingEstimates, onSave) {
        const esc = apexJobs.escapeHtml;
        this._pendingOnSave = onSave;

        // Cache estimates for version computation and original-amount lookups
        this._cachedEstimates = existingEstimates || apexJobs.currentJob?.estimates || [];

        const types = ['mitigation', 'reconstruction', 'remediation', 'abatement', 'remodel'];
        const preselect = apexJobs.selectedAccountingType || '';

        const typeOpts = types.map(t =>
            `<option value="${t}" ${preselect === t ? 'selected' : ''}>${t.charAt(0).toUpperCase() + t.slice(1)}</option>`
        ).join('');

        // Default status to "submitted"
        const statusOpts = ['draft', 'submitted', 'approved'].map(s =>
            `<option value="${s}" ${s === 'submitted' ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`
        ).join('');

        const html = `
            <form id="jdm-estimate-form">
                <div class="apex-detail-grid">
                    <div class="apex-detail-item">
                        <label class="apex-detail-label">Estimate Type</label>
                        <select class="jdm-select" name="estimate_type" id="jdm-est-type" onchange="jobDetailModals._estTypeChange()">${typeOpts}</select>
                    </div>
                    <div class="apex-detail-item">
                        <label class="apex-detail-label">Version</label>
                        <input type="number" class="jdm-input" name="version" id="jdm-est-version" value="1" readonly>
                    </div>
                    <div class="apex-detail-item">
                        <label class="apex-detail-label">Amount</label>
                        <input type="number" class="jdm-input" name="amount" id="jdm-est-amount" step="0.01" min="0" placeholder="0.00" required
                            oninput="jobDetailModals._estAmountChange()">
                        <div id="jdm-est-original-amount" class="jdm-est-helper" style="display:none"></div>
                        <div id="jdm-est-reduction" class="jdm-est-helper" style="display:none"></div>
                    </div>
                    <div class="apex-detail-item">
                        <label class="apex-detail-label">Status</label>
                        <select class="jdm-select" name="status" id="jdm-est-status" onchange="jobDetailModals._estStatusChange()">${statusOpts}</select>
                    </div>
                    <div class="apex-detail-item" id="jdm-est-submitted-wrap">
                        <label class="apex-detail-label">Submitted Date</label>
                        <input type="date" class="jdm-input" name="submitted_date">
                    </div>
                    <div class="apex-detail-item" id="jdm-est-approved-wrap" style="display:none">
                        <label class="apex-detail-label">Approved Date</label>
                        <input type="date" class="jdm-input" name="approved_date">
                    </div>
                    <div class="apex-detail-item full-width">
                        <label class="apex-detail-label">Notes</label>
                        <textarea class="jdm-textarea" name="notes" rows="3" placeholder="Estimate notes..."></textarea>
                    </div>
                </div>
                ${this._formFooter('Cancel', 'Create Estimate', "jobDetailModals._saveEstimate('" + jobId + "')")}
            </form>
        `;

        this.openModal('Add Estimate', html);

        // Trigger initial version computation for the pre-selected type
        this._estTypeChange();
        // Trigger status visibility (submitted is default, so show submitted date)
        this._estStatusChange();
    },

    /** Recompute version when estimate type changes */
    _estTypeChange() {
        const typeEl = document.getElementById('jdm-est-type');
        const versionEl = document.getElementById('jdm-est-version');
        if (!typeEl || !versionEl) return;

        const selectedType = typeEl.value;
        const existing = this._cachedEstimates || [];
        const ofType = existing.filter(e => (e.estimate_type || e.type) === selectedType);
        const nextVersion = ofType.length > 0
            ? Math.max(...ofType.map(e => e.version || 0)) + 1
            : 1;

        versionEl.value = nextVersion;

        // Update original amount display and reduction preview
        this._updateOriginalAmount();
        this._estAmountChange();
    },

    /** Show v1 original amount when version > 1 */
    _updateOriginalAmount() {
        const typeEl = document.getElementById('jdm-est-type');
        const versionEl = document.getElementById('jdm-est-version');
        const origEl = document.getElementById('jdm-est-original-amount');
        if (!typeEl || !versionEl || !origEl) return;

        const version = parseInt(versionEl.value) || 1;
        const selectedType = typeEl.value;

        if (version > 1) {
            const existing = this._cachedEstimates || [];
            const v1 = existing.find(e =>
                (e.estimate_type || e.type) === selectedType && (e.version || 1) === 1
            );
            if (v1 && v1.amount != null) {
                this._originalAmountForReduction = parseFloat(v1.amount) || 0;
                origEl.textContent = `Original (v1): ${this._fmt(v1.amount)}`;
                origEl.style.display = '';
                return;
            }
        }

        this._originalAmountForReduction = null;
        origEl.style.display = 'none';
        origEl.textContent = '';
    },

    /** Calculate and display reduction delta from original */
    _estAmountChange() {
        const versionEl = document.getElementById('jdm-est-version');
        const amountEl = document.getElementById('jdm-est-amount');
        const reductionEl = document.getElementById('jdm-est-reduction');
        if (!reductionEl) return;

        const version = parseInt(versionEl?.value) || 1;
        const amount = parseFloat(amountEl?.value) || 0;
        const original = this._originalAmountForReduction;

        if (version > 1 && original && original > 0 && amount > 0) {
            const delta = original - amount;
            const pct = (delta / original) * 100;

            // Color coding by reduction percentage
            let colorClass = '';
            if (pct > 0) {
                if (pct <= 10) colorClass = 'reduction-green';
                else if (pct <= 15) colorClass = 'reduction-yellow';
                else if (pct <= 20) colorClass = 'reduction-orange';
                else colorClass = 'reduction-red';
            }

            const sign = delta >= 0 ? '-' : '+';
            const absDelta = Math.abs(delta);
            const absPct = Math.abs(pct);
            const formatted = `$${absDelta.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            reductionEl.textContent = `\u0394 ${sign}${formatted} (${sign}${absPct.toFixed(1)}%)`;
            reductionEl.className = `jdm-est-helper ${colorClass}`;
            reductionEl.style.display = '';
        } else {
            reductionEl.style.display = 'none';
            reductionEl.textContent = '';
            reductionEl.className = 'jdm-est-helper';
        }
    },

    _estStatusChange() {
        const status = document.getElementById('jdm-est-status')?.value;
        const submitted = document.getElementById('jdm-est-submitted-wrap');
        const approved = document.getElementById('jdm-est-approved-wrap');
        if (submitted) submitted.style.display = (status === 'submitted' || status === 'approved') ? '' : 'none';
        if (approved) approved.style.display = status === 'approved' ? '' : 'none';
    },

    async _saveEstimate(jobId) {
        const form = document.getElementById('jdm-estimate-form');
        if (!form) return;
        const data = Object.fromEntries(new FormData(form));
        data.amount = parseFloat(data.amount) || 0;
        data.version = parseInt(data.version) || 1;
        try {
            await api.createApexJobEstimate(jobId, data);
            this.closeModal();
            // Refresh sidebar data instead of full page reload
            if (typeof apexJobs.refreshSidebarData === 'function') {
                apexJobs.refreshSidebarData();
            } else if (this._pendingOnSave) {
                this._pendingOnSave();
            }
        } catch (err) {
            console.error('Failed to create estimate:', err);
        }
    },

    // ========================================
    // 8.3 Estimate Viewer Modal (read-only)
    // ========================================
    openEstimateViewerModal(estimate) {
        const esc = apexJobs.escapeHtml;
        const fmt = this._fmt;

        const statusClass = `phase-status-${estimate.status || 'draft'}`;
        const statusLabel = (estimate.status || 'draft').replace(/_/g, ' ');

        const html = `
            <div class="apex-detail-grid">
                <div class="apex-detail-item">
                    <span class="apex-detail-label">Type</span>
                    <span class="apex-detail-value">${esc(((estimate.estimate_type || estimate.type || '')).charAt(0).toUpperCase() + ((estimate.estimate_type || estimate.type || '')).slice(1))}</span>
                </div>
                <div class="apex-detail-item">
                    <span class="apex-detail-label">Version</span>
                    <span class="apex-detail-value">v${esc(String(estimate.version || 1))}</span>
                </div>
                <div class="apex-detail-item">
                    <span class="apex-detail-label">Status</span>
                    <span class="apex-status-badge ${statusClass}">${esc(statusLabel)}</span>
                </div>
                <div class="apex-detail-item">
                    <span class="apex-detail-label">Amount</span>
                    <span class="apex-detail-value">${fmt(estimate.amount)}</span>
                </div>
                ${estimate.submitted_date ? `
                <div class="apex-detail-item">
                    <span class="apex-detail-label">Submitted</span>
                    <span class="apex-detail-value">${new Date(estimate.submitted_date).toLocaleDateString()}</span>
                </div>` : ''}
                ${estimate.approved_date ? `
                <div class="apex-detail-item">
                    <span class="apex-detail-label">Approved</span>
                    <span class="apex-detail-value">${new Date(estimate.approved_date).toLocaleDateString()}</span>
                </div>` : ''}
                ${estimate.notes ? `
                <div class="apex-detail-item full-width">
                    <span class="apex-detail-label">Notes</span>
                    <span class="apex-detail-value">${esc(estimate.notes)}</span>
                </div>` : ''}
            </div>
            <div class="jdm-footer">
                <button type="button" class="jdm-btn jdm-btn-cancel" onclick="jobDetailModals.closeModal()">Close</button>
            </div>
        `;

        this.openModal('Estimate - ' + (estimate.estimate_type || estimate.type || 'Details'), html);
    },

    // ========================================
    // 8.4 Record Payment Modal
    // ========================================
    openRecordPaymentModal(jobId, estimates, onSave) {
        const esc = apexJobs.escapeHtml;
        this._pendingOnSave = onSave;

        const methodOpts = ['check', 'ach', 'credit', 'cash'].map(m =>
            `<option value="${m}">${m.charAt(0).toUpperCase() + m.slice(1)}</option>`
        ).join('');

        const typeOpts = ['initial', 'progress', 'supplement', 'final', 'deductible'].map(t =>
            `<option value="${t}">${t.charAt(0).toUpperCase() + t.slice(1)}</option>`
        ).join('');

        const estOpts = ['<option value="">-- None --</option>'].concat(
            (estimates || []).map(e =>
                `<option value="${esc(e.id)}">${esc(e.type || 'Estimate')} v${e.version || 1} - ${this._fmt(e.amount)}</option>`
            )
        ).join('');

        const html = `
            <form id="jdm-payment-form">
                <div class="apex-detail-grid">
                    <div class="apex-detail-item">
                        <label class="apex-detail-label">Amount</label>
                        <input type="number" class="jdm-input" name="amount" step="0.01" min="0" placeholder="0.00" required>
                    </div>
                    <div class="apex-detail-item">
                        <label class="apex-detail-label">Payment Method</label>
                        <select class="jdm-select" name="payment_method" id="jdm-pay-method" onchange="jobDetailModals._payMethodChange()">${methodOpts}</select>
                    </div>
                    <div class="apex-detail-item">
                        <label class="apex-detail-label">Payment Type</label>
                        <select class="jdm-select" name="payment_type">${typeOpts}</select>
                    </div>
                    <div class="apex-detail-item" id="jdm-pay-check-wrap" style="display:none">
                        <label class="apex-detail-label">Check Number</label>
                        <input type="text" class="jdm-input" name="check_number" placeholder="Check #">
                    </div>
                    <div class="apex-detail-item">
                        <label class="apex-detail-label">Received Date</label>
                        <input type="date" class="jdm-input" name="received_date">
                    </div>
                    <div class="apex-detail-item">
                        <label class="apex-detail-label">Deposited Date</label>
                        <input type="date" class="jdm-input" name="deposited_date">
                    </div>
                    <div class="apex-detail-item">
                        <label class="apex-detail-label">Invoice Number</label>
                        <input type="text" class="jdm-input" name="invoice_number" placeholder="INV-...">
                    </div>
                    <div class="apex-detail-item">
                        <label class="apex-detail-label">Linked Estimate</label>
                        <select class="jdm-select" name="estimate_id">${estOpts}</select>
                    </div>
                    <div class="apex-detail-item full-width">
                        <label class="apex-detail-label">Notes</label>
                        <textarea class="jdm-textarea" name="notes" rows="2" placeholder="Payment notes..."></textarea>
                    </div>
                </div>
                ${this._formFooter('Cancel', 'Record Payment', "jobDetailModals._savePayment('" + jobId + "')")}
            </form>
        `;

        this.openModal('Record Payment', html);
    },

    _payMethodChange() {
        const method = document.getElementById('jdm-pay-method')?.value;
        const checkWrap = document.getElementById('jdm-pay-check-wrap');
        if (checkWrap) checkWrap.style.display = method === 'check' ? '' : 'none';
    },

    async _savePayment(jobId) {
        const form = document.getElementById('jdm-payment-form');
        if (!form) return;
        const data = Object.fromEntries(new FormData(form));
        data.amount = parseFloat(data.amount) || 0;
        data.phase_id = window.apexJobs?.selectedPhaseId || null;
        try {
            await api.createApexJobPayment(jobId, data);
            this.closeModal();
            if (this._pendingOnSave) this._pendingOnSave();
        } catch (err) {
            console.error('Failed to record payment:', err);
        }
    },

    // ========================================
    // 8.5 Labor Entry Modal
    // ========================================
    openLaborEntryModal(jobId, entry, onSave) {
        const esc = apexJobs.escapeHtml;
        this._pendingOnSave = onSave;
        const isEdit = !!entry;

        const categoryOpts = ['demo', 'drying', 'cleanup', 'monitoring', 'repair', 'admin', 'travel', 'other'].map(c =>
            `<option value="${c}" ${isEdit && (entry.work_category || entry.category) === c ? 'selected' : ''}>${c.charAt(0).toUpperCase() + c.slice(1)}</option>`
        ).join('');

        const deleteBtn = isEdit
            ? `<button type="button" class="jdm-btn jdm-btn-danger" onclick="jobDetailModals._deleteLabor('${jobId}', '${entry.id}')">Delete</button>`
            : '';

        const html = `
            <form id="jdm-labor-form">
                <div class="apex-detail-grid">
                    <div class="apex-detail-item">
                        <label class="apex-detail-label">Date</label>
                        <input type="date" class="jdm-input" name="work_date" value="${esc(isEdit ? entry.work_date || entry.date || '' : new Date().toISOString().slice(0, 10))}" required>
                    </div>
                    <div class="apex-detail-item">
                        <label class="apex-detail-label">Hours</label>
                        <input type="number" class="jdm-input" name="hours" min="0" max="24" step="0.25" value="${isEdit ? entry.hours || '' : ''}" required
                            oninput="jobDetailModals._calcLaborCost()">
                    </div>
                    <div class="apex-detail-item">
                        <label class="apex-detail-label">Work Category</label>
                        <select class="jdm-select" name="work_category">${categoryOpts}</select>
                    </div>
                    <div class="apex-detail-item">
                        <label class="apex-detail-label">Hourly Rate</label>
                        <input type="number" class="jdm-input" name="hourly_rate" step="0.01" min="0" value="${isEdit ? entry.hourly_rate || entry.rate || '' : ''}" placeholder="0.00"
                            oninput="jobDetailModals._calcLaborCost()">
                    </div>
                    <div class="apex-detail-item">
                        <label class="apex-detail-label">Employee Name</label>
                        <input type="text" class="jdm-input" name="employee_name" value="${esc(isEdit ? entry.employee_name || entry.employee || '' : '')}">
                    </div>
                    <div class="apex-detail-item">
                        <label class="apex-detail-label">Estimated Cost</label>
                        <span class="apex-detail-value" id="jdm-labor-cost">${this._fmt(isEdit ? (entry.hours || 0) * (entry.hourly_rate || entry.rate || 0) : 0)}</span>
                    </div>
                    <div class="apex-detail-item full-width">
                        <label class="apex-detail-label">Description</label>
                        <textarea class="jdm-textarea" name="description" rows="2" placeholder="Work description...">${esc(isEdit ? entry.description || '' : '')}</textarea>
                    </div>
                    <div class="apex-detail-item">
                        <label class="jdm-checkbox-label">
                            <input type="checkbox" name="billable" ${isEdit ? (entry.billable !== false ? 'checked' : '') : 'checked'}>
                            Billable
                        </label>
                    </div>
                </div>
                <div class="jdm-footer">
                    ${deleteBtn}
                    <button type="button" class="jdm-btn jdm-btn-cancel" onclick="jobDetailModals.closeModal()">Cancel</button>
                    <button type="button" class="jdm-btn jdm-btn-action" onclick="jobDetailModals._saveLabor('${jobId}', ${isEdit ? "'" + entry.id + "'" : 'null'})">${isEdit ? 'Update' : 'Log Hours'}</button>
                </div>
            </form>
        `;

        this.openModal(isEdit ? 'Edit Labor Entry' : 'Log Hours', html);
    },

    _calcLaborCost() {
        const form = document.getElementById('jdm-labor-form');
        if (!form) return;
        const hours = parseFloat(form.querySelector('[name="hours"]')?.value) || 0;
        const rate = parseFloat(form.querySelector('[name="hourly_rate"]')?.value) || 0;
        const costEl = document.getElementById('jdm-labor-cost');
        if (costEl) costEl.textContent = this._fmt(hours * rate);
    },

    async _saveLabor(jobId, entryId) {
        const form = document.getElementById('jdm-labor-form');
        if (!form) return;
        const data = Object.fromEntries(new FormData(form));
        data.hours = parseFloat(data.hours) || 0;
        data.hourly_rate = parseFloat(data.hourly_rate) || 0;
        data.billable = !!form.querySelector('[name="billable"]')?.checked;
        data.phase_id = window.apexJobs?.selectedPhaseId || null;
        try {
            if (entryId) {
                await api.updateApexJobLabor(jobId, entryId, data);
            } else {
                await api.createApexJobLabor(jobId, data);
            }
            this.closeModal();
            if (this._pendingOnSave) this._pendingOnSave();
        } catch (err) {
            console.error('Failed to save labor entry:', err);
        }
    },

    async _deleteLabor(jobId, entryId) {
        if (!confirm('Delete this labor entry?')) return;
        try {
            await api.deleteApexJobLabor(jobId, entryId);
            this.closeModal();
            if (this._pendingOnSave) this._pendingOnSave();
        } catch (err) {
            console.error('Failed to delete labor entry:', err);
        }
    },

    // ========================================
    // 8.6 Receipt Modal
    // ========================================
    openReceiptModal(jobId, receipt, onSave) {
        const esc = apexJobs.escapeHtml;
        this._pendingOnSave = onSave;
        const isEdit = !!receipt;

        const categoryOpts = ['materials', 'equipment_rental', 'subcontractor', 'disposal', 'permit', 'supplies', 'other'].map(c => {
            const label = c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            return `<option value="${c}" ${isEdit && (receipt.expense_category || receipt.category) === c ? 'selected' : ''}>${esc(label)}</option>`;
        }).join('');

        const paidByOpts = ['company_card', 'cash', 'personal_reimbursement', 'vendor_invoice'].map(p => {
            const label = p.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            return `<option value="${p}" ${isEdit && receipt.paid_by === p ? 'selected' : ''}>${esc(label)}</option>`;
        }).join('');

        const deleteBtn = isEdit
            ? `<button type="button" class="jdm-btn jdm-btn-danger" onclick="jobDetailModals._deleteReceipt('${jobId}', '${receipt.id}')">Delete</button>`
            : '';

        const html = `
            <form id="jdm-receipt-form">
                <div class="apex-detail-grid">
                    <div class="apex-detail-item">
                        <label class="apex-detail-label">Date</label>
                        <input type="date" class="jdm-input" name="expense_date" value="${esc(isEdit ? receipt.expense_date || receipt.date || '' : new Date().toISOString().slice(0, 10))}" required>
                    </div>
                    <div class="apex-detail-item">
                        <label class="apex-detail-label">Amount</label>
                        <input type="number" class="jdm-input" name="amount" step="0.01" min="0" value="${isEdit ? receipt.amount || '' : ''}" placeholder="0.00" required>
                    </div>
                    <div class="apex-detail-item">
                        <label class="apex-detail-label">Category</label>
                        <select class="jdm-select" name="expense_category">${categoryOpts}</select>
                    </div>
                    <div class="apex-detail-item">
                        <label class="apex-detail-label">Vendor</label>
                        <input type="text" class="jdm-input" name="vendor" value="${esc(isEdit ? receipt.vendor || '' : '')}">
                    </div>
                    <div class="apex-detail-item">
                        <label class="apex-detail-label">Paid By</label>
                        <select class="jdm-select" name="paid_by">${paidByOpts}</select>
                    </div>
                    <div class="apex-detail-item">
                        <label class="jdm-checkbox-label">
                            <input type="checkbox" name="reimbursable" ${isEdit ? (receipt.reimbursable ? 'checked' : '') : ''}>
                            Reimbursable
                        </label>
                    </div>
                    <div class="apex-detail-item full-width">
                        <label class="apex-detail-label">Description</label>
                        <textarea class="jdm-textarea" name="description" rows="2" placeholder="Receipt description...">${esc(isEdit ? receipt.description || '' : '')}</textarea>
                    </div>
                </div>
                <div class="jdm-footer">
                    ${deleteBtn}
                    <button type="button" class="jdm-btn jdm-btn-cancel" onclick="jobDetailModals.closeModal()">Cancel</button>
                    <button type="button" class="jdm-btn jdm-btn-action" onclick="jobDetailModals._saveReceipt('${jobId}', ${isEdit ? "'" + receipt.id + "'" : 'null'})">${isEdit ? 'Update' : 'Add Receipt'}</button>
                </div>
            </form>
        `;

        this.openModal(isEdit ? 'Edit Receipt' : 'Add Receipt', html);
    },

    async _saveReceipt(jobId, receiptId) {
        const form = document.getElementById('jdm-receipt-form');
        if (!form) return;
        const data = Object.fromEntries(new FormData(form));
        data.amount = parseFloat(data.amount) || 0;
        data.reimbursable = !!form.querySelector('[name="reimbursable"]')?.checked;
        data.phase_id = window.apexJobs?.selectedPhaseId || null;
        try {
            if (receiptId) {
                await api.updateApexJobReceipt(jobId, receiptId, data);
            } else {
                await api.createApexJobReceipt(jobId, data);
            }
            this.closeModal();
            if (this._pendingOnSave) this._pendingOnSave();
        } catch (err) {
            console.error('Failed to save receipt:', err);
        }
    },

    async _deleteReceipt(jobId, receiptId) {
        if (!confirm('Delete this receipt?')) return;
        try {
            await api.deleteApexJobReceipt(jobId, receiptId);
            this.closeModal();
            if (this._pendingOnSave) this._pendingOnSave();
        } catch (err) {
            console.error('Failed to delete receipt:', err);
        }
    },

    // ========================================
    // 8.7 Work Order Modal
    // ========================================
    openWorkOrderModal(jobId, workOrder, onSave) {
        const esc = apexJobs.escapeHtml;
        this._pendingOnSave = onSave;
        const isEdit = !!workOrder;

        const statusOpts = ['draft', 'approved', 'in_progress', 'completed', 'cancelled'].map(s => {
            const label = s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            return `<option value="${s}" ${isEdit && workOrder.status === s ? 'selected' : ''}>${esc(label)}</option>`;
        }).join('');

        const deleteBtn = isEdit
            ? `<button type="button" class="jdm-btn jdm-btn-danger" onclick="jobDetailModals._deleteWorkOrder('${jobId}', '${workOrder.id}')">Delete</button>`
            : '';

        const html = `
            <form id="jdm-wo-form">
                <div class="apex-detail-grid">
                    <div class="apex-detail-item">
                        <label class="apex-detail-label">WO #</label>
                        <input type="text" class="jdm-input" name="wo_number" value="${esc(isEdit ? workOrder.wo_number || '' : '')}" placeholder="WO-001">
                    </div>
                    <div class="apex-detail-item">
                        <label class="apex-detail-label">Status</label>
                        <select class="jdm-select" name="status">${statusOpts}</select>
                    </div>
                    <div class="apex-detail-item full-width">
                        <label class="apex-detail-label">Title</label>
                        <input type="text" class="jdm-input" name="title" value="${esc(isEdit ? workOrder.title || '' : '')}" placeholder="Work order title" required>
                    </div>
                    <div class="apex-detail-item full-width">
                        <label class="apex-detail-label">Description</label>
                        <textarea class="jdm-textarea" name="description" rows="3" placeholder="Scope of work...">${esc(isEdit ? workOrder.description || '' : '')}</textarea>
                    </div>
                    <div class="apex-detail-item">
                        <label class="apex-detail-label">Budget Amount</label>
                        <input type="number" class="jdm-input" name="budget_amount" step="0.01" min="0" value="${isEdit ? workOrder.budget_amount || workOrder.budget || '' : ''}" placeholder="0.00">
                    </div>
                </div>
                <div class="jdm-footer">
                    ${deleteBtn}
                    <button type="button" class="jdm-btn jdm-btn-cancel" onclick="jobDetailModals.closeModal()">Cancel</button>
                    <button type="button" class="jdm-btn jdm-btn-action" onclick="jobDetailModals._saveWorkOrder('${jobId}', ${isEdit ? "'" + workOrder.id + "'" : 'null'})">${isEdit ? 'Update' : 'Create Work Order'}</button>
                </div>
            </form>
        `;

        this.openModal(isEdit ? 'Edit Work Order' : 'Create Work Order', html);
    },

    async _saveWorkOrder(jobId, woId) {
        const form = document.getElementById('jdm-wo-form');
        if (!form) return;
        const data = Object.fromEntries(new FormData(form));
        data.budget_amount = parseFloat(data.budget_amount) || 0;
        data.phase_id = window.apexJobs?.selectedPhaseId || null;
        try {
            if (woId) {
                await api.updateApexJobWorkOrder(jobId, woId, data);
            } else {
                await api.createApexJobWorkOrder(jobId, data);
            }
            this.closeModal();
            if (this._pendingOnSave) this._pendingOnSave();
        } catch (err) {
            console.error('Failed to save work order:', err);
        }
    },

    async _deleteWorkOrder(jobId, woId) {
        if (!confirm('Delete this work order?')) return;
        try {
            await api.deleteApexJobWorkOrder(jobId, woId);
            this.closeModal();
            if (this._pendingOnSave) this._pendingOnSave();
        } catch (err) {
            console.error('Failed to delete work order:', err);
        }
    },

    // ========================================
    // 8.8 Add Contact Modal
    // ========================================
    openAddContactModal(jobId, onSave) {
        const esc = apexJobs.escapeHtml;
        this._pendingOnSave = onSave;

        const roleOpts = [
            'primary_adjuster', 'field_adjuster', 'project_manager',
            'technician', 'claims_rep', 'contractor', 'other'
        ].map(r => {
            const label = r.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            return `<option value="${r}">${esc(label)}</option>`;
        }).join('');

        const html = `
            <form id="jdm-contact-form">
                <div class="apex-detail-grid">
                    <div class="apex-detail-item full-width">
                        <label class="apex-detail-label">Contact Name</label>
                        <input type="text" class="jdm-input" name="name" placeholder="Enter contact name" required>
                    </div>
                    <div class="apex-detail-item full-width">
                        <label class="apex-detail-label">Role</label>
                        <select class="jdm-select" name="role">${roleOpts}</select>
                    </div>
                </div>
                ${this._formFooter('Cancel', 'Add Contact', "jobDetailModals._saveContact('" + jobId + "')")}
            </form>
        `;

        this.openModal('Add Contact', html);
    },

    async _saveContact(jobId) {
        const form = document.getElementById('jdm-contact-form');
        if (!form) return;
        const data = Object.fromEntries(new FormData(form));
        if (!data.name?.trim()) return;
        try {
            await api.assignApexJobContact(jobId, data);
            this.closeModal();
            if (this._pendingOnSave) this._pendingOnSave();
        } catch (err) {
            console.error('Failed to assign contact:', err);
        }
    }
};

window.jobDetailModals = jobDetailModals;
