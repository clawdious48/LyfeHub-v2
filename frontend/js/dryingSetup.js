/* ===================================================================
   dryingSetup.js — Multi-step wizard for initial drying log setup
   Exports: window.dryingSetup
   =================================================================== */

const dryingSetup = {

    // ── State ────────────────────────────────────────────────────────
    _state: {
        jobId: null,
        currentStep: 0,
        chambers: [],
        rooms: [],
        refPoints: [],
        baselines: [],
        activeRoomId: null, // currently selected room tab in ref points step
        previewRoomId: null  // currently selected room tab in preview step
    },

    _overlay: null,

    STEP_TITLES: [
        'Create Chambers',
        'Rooms Review',
        'Assign Rooms to Chambers',
        'Reference Points',
        'Baselines',
        'Preview'
    ],

    TOTAL_STEPS: 6,

    // ── Public API ───────────────────────────────────────────────────

    async open(jobId) {
        this._state.jobId = jobId;
        this._state.currentStep = 0;

        try {
            // Fetch existing data to detect partial setup
            const [chambers, rooms, refPoints, baselines] = await Promise.all([
                api.getDryingChambers(jobId),
                api.getDryingRooms(jobId),
                api.getDryingRefPoints(jobId),
                api.getDryingBaselines(jobId)
            ]);

            this._state.chambers = chambers || [];
            this._state.rooms = rooms || [];
            this._state.refPoints = refPoints || [];
            this._state.baselines = baselines || [];

            // Auto-assign colors to chambers that don't have one
            const usedColors = new Set(this._state.chambers.filter(c => c.color).map(c => c.color));
            for (const ch of this._state.chambers) {
                if (!ch.color) {
                    const available = dryingUtils.CHAMBER_COLORS.filter(c => !usedColors.has(c.hex));
                    const pick = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : dryingUtils.CHAMBER_COLORS[0];
                    ch.color = pick.hex;
                    usedColors.add(pick.hex);
                    api.updateDryingChamber(jobId, ch.id, { color: pick.hex }).catch(() => {});
                }
            }

            // Always start at step 0 — user should review rooms even if pre-populated.
            // Only auto-advance if resuming a partially-completed wizard
            // (i.e., user has already created ref points or extra chambers beyond Default).
            const hasManualSetup = this._state.refPoints.length > 0 ||
                this._state.chambers.length > 1 ||
                this._state.baselines.length > 0;
            this._state.currentStep = hasManualSetup ? this._detectFirstIncompleteStep() : 0;

        } catch (err) {
            console.error('Failed to load drying setup data:', err);
        }

        this._ensureOverlay();
        this._overlay.style.display = 'flex';
        this._render();
    },

    close() {
        if (this._overlay) {
            this._overlay.style.display = 'none';
        }
    },

    // ── Overlay ──────────────────────────────────────────────────────

    _ensureOverlay() {
        if (this._overlay) return;
        this._overlay = document.createElement('div');
        this._overlay.className = 'dry-wizard-overlay';
        this._overlay.style.display = 'none';
        this._overlay.innerHTML = `
            <div class="dry-wizard-backdrop"></div>
            <div class="dry-wizard-card">
                <div class="dry-wizard-header">
                    <div class="dry-wizard-nav"></div>
                    <div class="dry-step-indicator"></div>
                </div>
                <div class="dry-wizard-progress"><div class="dry-wizard-progress-fill"></div></div>
                <div class="dry-wizard-body"></div>
            </div>
        `;
        document.body.appendChild(this._overlay);

        // Close on backdrop click
        this._overlay.querySelector('.dry-wizard-backdrop').addEventListener('click', () => this.close());

        // Hover tooltip for step dots
        const tooltip = document.createElement('div');
        tooltip.className = 'dry-dot-tooltip';
        this._overlay.querySelector('.dry-step-indicator').appendChild(tooltip);
        this._dotTooltipEl = tooltip;
        this._dotTooltipVisible = false;
        this._dotShowTimer = null;
        this._dotHideTimer = null;

        const indicator = this._overlay.querySelector('.dry-step-indicator');
        let currentDot = null;

        indicator.addEventListener('mouseover', (e) => {
            const dot = e.target.closest('.dry-step-dot');
            if (!dot || dot === currentDot) return;
            currentDot = dot;
            clearTimeout(this._dotHideTimer);

            const stepIdx = parseInt(dot.dataset.step);
            const name = this.STEP_TITLES[stepIdx];
            const containerRect = indicator.getBoundingClientRect();
            const dotRect = dot.getBoundingClientRect();
            const left = dotRect.left - containerRect.left + dotRect.width / 2;

            if (this._dotTooltipVisible) {
                tooltip.textContent = name;
                tooltip.style.left = left + 'px';
            } else {
                clearTimeout(this._dotShowTimer);
                this._dotShowTimer = setTimeout(() => {
                    tooltip.textContent = name;
                    tooltip.style.left = left + 'px';
                    tooltip.classList.add('visible');
                    this._dotTooltipVisible = true;
                }, 100);
            }
        });

        indicator.addEventListener('mouseout', (e) => {
            const dot = e.target.closest('.dry-step-dot');
            if (!dot) return;
            const related = e.relatedTarget?.closest('.dry-step-dot');
            if (related) return;
            currentDot = null;
            clearTimeout(this._dotShowTimer);
            this._dotHideTimer = setTimeout(() => {
                tooltip.classList.remove('visible');
                this._dotTooltipVisible = false;
            }, 60);
        });

        indicator.addEventListener('click', (e) => {
            const dot = e.target.closest('.dry-step-dot');
            if (!dot) return;
            const stepIdx = parseInt(dot.dataset.step);
            if (!isNaN(stepIdx)) this._goToStep(stepIdx);
        });
    },

    // ── Rendering ────────────────────────────────────────────────────

    _render() {
        const step = this._state.currentStep;

        this._renderNavButtons();
        this._renderStepIndicator();
        this._renderProgressBar();

        const body = this._overlay.querySelector('.dry-wizard-body');
        const stepRenderers = [
            '_renderStep3', '_renderStep0', '_renderStep4',
            '_renderStep1', '_renderStep2', '_renderStep5'
        ];
        body.innerHTML = this[stepRenderers[step]]();

        // Attach step-specific event listeners after DOM is rendered
        this._attachStepListeners(step);

        // Auto-populate default baselines when entering step 4
        if (step === 4) {
            this._ensureDefaultBaselines();
        }
    },

    _renderStepIndicator() {
        const container = this._overlay.querySelector('.dry-step-indicator');
        let html = '';
        for (let i = 0; i < this.TOTAL_STEPS; i++) {
            let cls = 'dry-step-dot';
            if (i === this._state.currentStep) cls += ' active';
            else if (i < this._state.currentStep) cls += ' completed';
            html += `<div class="${cls}" data-step="${i}"></div>`;
        }
        container.innerHTML = html;
    },

    _renderProgressBar() {
        const fill = this._overlay.querySelector('.dry-wizard-progress-fill');
        const pct = ((this._state.currentStep + 1) / this.TOTAL_STEPS) * 100;
        fill.style.width = pct + '%';
    },

    _renderNavButtons() {
        const nav = this._overlay.querySelector('.dry-wizard-nav');
        const step = this._state.currentStep;
        const disabled = this._isNextDisabled(step) ? ' disabled' : '';

        let html = '';
        if (step > 0) {
            html += `<button class="dry-btn dry-btn-secondary dry-btn-sm dry-wizard-back">Back</button>`;
        } else {
            html += `<div></div>`;
        }

        html += `<h3 class="dry-wizard-title">Step ${step + 1}: ${this.STEP_TITLES[step]}</h3>`;

        html += `<div style="display:flex;gap:0.5rem;align-items:center">`;
        if (step < this.TOTAL_STEPS - 1) {
            html += `<button class="dry-btn dry-btn-primary dry-btn-sm dry-wizard-next"${disabled}>Next</button>`;
        } else {
            html += `<button class="dry-btn dry-btn-secondary dry-btn-sm dry-wizard-edit">Edit</button>`;
            html += `<button class="dry-btn dry-btn-confirm dry-btn-sm dry-wizard-confirm">Confirm Setup</button>`;
        }
        html += `<button class="dry-wizard-close" title="Close">&times;</button>`;
        html += `</div>`;

        nav.innerHTML = html;

        const backBtn = nav.querySelector('.dry-wizard-back');
        const nextBtn = nav.querySelector('.dry-wizard-next');
        const editBtn = nav.querySelector('.dry-wizard-edit');
        const confirmBtn = nav.querySelector('.dry-wizard-confirm');
        const closeBtn = nav.querySelector('.dry-wizard-close');

        if (backBtn) backBtn.addEventListener('click', () => this._prevStep());
        if (nextBtn) nextBtn.addEventListener('click', () => this._nextStep());
        if (editBtn) editBtn.addEventListener('click', () => this._goToStep(0));
        if (confirmBtn) confirmBtn.addEventListener('click', () => this._confirmSetup());
        if (closeBtn) closeBtn.addEventListener('click', () => this.close());
    },

    _isNextDisabled(step) {
        if (step === 3) {
            const { rooms, refPoints } = this._state;
            return rooms.some(r => !refPoints.some(rp => rp.room_id === r.id));
        }
        return false;
    },

    // ── Navigation ───────────────────────────────────────────────────

    _nextStep() {
        this._collectCurrentStepState();
        if (this._state.currentStep < this.TOTAL_STEPS - 1) {
            this._state.currentStep++;
            this._render();
        }
    },

    _prevStep() {
        this._collectCurrentStepState();
        if (this._state.currentStep > 0) {
            this._state.currentStep--;
            this._render();
        }
    },

    _goToStep(n) {
        if (n >= 0 && n < this.TOTAL_STEPS) {
            this._collectCurrentStepState();
            this._state.currentStep = n;
            this._render();
        }
    },

    // ── Detect first incomplete step ─────────────────────────────────

    _detectFirstIncompleteStep() {
        const { chambers, rooms, refPoints, baselines } = this._state;
        if (!chambers.length || chambers.length <= 1) return 0;
        if (!rooms.length) return 1;
        const hasUnassigned = rooms.some(r => !r.chamber_id);
        if (hasUnassigned) return 2;
        if (!refPoints.length) return 3;
        const usedCodes = [...new Set(refPoints.map(rp => rp.material_code))];
        const baselineCodes = new Set(baselines.map(b => b.material_code));
        if (usedCodes.some(c => !baselineCodes.has(c))) return 4;
        return 5;
    },

    // ── Collect current step state from inputs ───────────────────────

    _collectCurrentStepState() {
        // No equipment/atmospheric/moisture to collect during setup anymore
    },

    // ── Step Renderers ───────────────────────────────────────────────

    // Step 0: Rooms Review
    _renderStep0() {
        const { rooms } = this._state;
        const esc = dryingUtils.escapeHtml;
        const message = rooms.length
            ? 'Rooms were pre-populated from the job\'s affected areas. Rename, remove, or add rooms below.'
            : 'No rooms yet. Add your first room below.';
        let html = `<p style="color:rgba(255,255,255,0.5);font-size:0.82rem;margin:0 0 1rem">
            ${message}
        </p>`;
        html += `<div class="dry-room-list" id="dry-wiz-rooms">`;
        for (const room of rooms) {
            html += `
                <div class="dry-room-item" data-room-id="${esc(room.id)}">
                    <input type="text" class="dry-input dry-room-name" value="${esc(room.name)}" placeholder="New Room"
                           data-room-id="${esc(room.id)}" style="flex:1" />
                    <button class="dry-btn dry-btn-sm dry-btn-secondary dry-room-rename"
                            data-room-id="${esc(room.id)}" title="Save name">Rename</button>
                    <button class="dry-btn dry-btn-sm dry-btn-danger dry-room-delete"
                            data-room-id="${esc(room.id)}" title="Delete room">&times;</button>
                </div>`;
        }
        html += `</div>`;
        html += `<button class="dry-btn dry-btn-secondary dry-room-add" style="margin-top:0.75rem">+ Add Room</button>`;
        return html;
    },

    // Step 1: Reference Points per Room (tabbed, two-step: surface → material)
    _renderStep1() {
        const { rooms, refPoints, chambers } = this._state;
        const esc = dryingUtils.escapeHtml;

        // Default to first room if no active room selected
        if (!this._state.activeRoomId || !rooms.find(r => r.id === this._state.activeRoomId)) {
            this._state.activeRoomId = rooms.length ? rooms[0].id : null;
        }
        const activeId = this._state.activeRoomId;

        let html = `<p style="color:rgba(255,255,255,0.5);font-size:0.82rem;margin:0 0 0.75rem">
            Add moisture reference points for each room. Pick a surface type, then a material.
        </p>`;

        // Room tabs (sorted by chamber)
        const sortedRooms = [...rooms].sort((a, b) => {
            const ai = chambers.findIndex(c => c.id === a.chamber_id);
            const bi = chambers.findIndex(c => c.id === b.chamber_id);
            return ai - bi;
        });
        html += `<div class="dry-room-tabs">`;
        for (const room of sortedRooms) {
            const isActive = room.id === activeId;
            const chamber = chambers.find(c => c.id === room.chamber_id);
            const borderColor = chamber && chamber.color ? chamber.color : 'var(--apex-primary)';
            const rpCount = refPoints.filter(rp => rp.room_id === room.id).length;
            html += `<button class="dry-room-tab${isActive ? ' active' : ''}" data-room-tab="${esc(room.id)}"
                style="border-color:${borderColor}">
                ${esc(room.name)}${rpCount ? ` <span style="opacity:0.5;font-size:0.75rem">(${rpCount})</span>` : ''}
            </button>`;
        }
        html += `</div>`;

        // Active room content
        if (activeId) {
            const roomRPs = refPoints.filter(rp => rp.room_id === activeId);

            html += `<div class="dry-room-content active" style="padding:0.75rem 0">`;
            if (roomRPs.length) {
                // Group ref points by surface type (stored in label)
                const bySurface = {};
                for (const rp of roomRPs) {
                    const surface = rp.label || 'Other';
                    if (!bySurface[surface]) bySurface[surface] = [];
                    bySurface[surface].push(rp);
                }
                html += `<div class="dry-room-list" style="margin-bottom:0.75rem">`;
                for (const [surface, items] of Object.entries(bySurface)) {
                    html += `<div class="dry-rp-category-label">${esc(surface)}</div>`;
                    for (const rp of items) {
                        const mat = dryingUtils.MATERIAL_CODES.find(m => m.code === rp.material_code) || { label: rp.material_code };
                        html += `<div class="dry-room-item dry-rp-item" data-rp-id="${esc(rp.id)}">
                            <span class="dry-rp-number">#${rp.ref_number}</span>
                            <span class="dry-rp-material" data-rp-id="${esc(rp.id)}" data-current-code="${esc(rp.material_code)}" data-surface="${esc(rp.label || '')}" title="Click to change material">${esc(mat.label)}</span>
                            <button class="dry-rp-delete" data-rp-delete="${esc(rp.id)}" title="Delete">&times;</button>
                        </div>`;
                    }
                }
                html += `</div>`;
            }
            // Inline surface type → material chips (multi-select)
            html += `<div class="dry-rp-selectors">`;
            html += `<div class="dry-surface-chips">`;
            for (const st of dryingUtils.SURFACE_TYPES) {
                html += `<button class="dry-chip dry-chip-surface" data-surface="${esc(st.key)}">${esc(st.label)}</button>`;
            }
            html += `</div>`;
            html += `<div class="dry-material-chips"></div>`;
            html += `<button class="dry-btn dry-btn-primary dry-btn-sm dry-add-selected" style="display:none;align-self:flex-start;margin-top:0.25rem" disabled>Add</button>`;
            html += `</div>`;
            html += `</div>`;
        }

        return html;
    },

    // Step 2: Baselines
    _renderStep2() {
        const { refPoints, baselines } = this._state;
        const esc = dryingUtils.escapeHtml;
        // Find unique material codes used
        const usedCodes = [...new Set(refPoints.map(rp => rp.material_code))];
        const baselineMap = {};
        for (const b of baselines) baselineMap[b.material_code] = b.baseline_value;

        let html = `<p style="color:rgba(255,255,255,0.5);font-size:0.82rem;margin:0 0 1rem">
            Set baseline (unaffected) moisture values for each material type in use.
        </p>`;

        if (!usedCodes.length) {
            html += `<p style="color:rgba(255,255,255,0.4);font-size:0.85rem;">No reference points added yet. Go back to the Reference Points step to add some.</p>`;
            return html;
        }

        for (const code of usedCodes) {
            const mat = dryingUtils.MATERIAL_CODES.find(m => m.code === code) || { label: code };
            const val = baselineMap[code] !== undefined ? baselineMap[code] : '';
            html += `
                <div class="dry-equipment-row">
                    <span class="dry-equipment-label">${esc(mat.label)} (${esc(code)})</span>
                    <input type="number" class="dry-equipment-input" step="0.1" min="0" max="100" value="${val}"
                           data-baseline-code="${esc(code)}" placeholder="e.g. 12" />
                </div>`;
        }
        return html;
    },

    // Step 3: Create Chambers
    _renderStep3() {
        const { chambers } = this._state;
        const esc = dryingUtils.escapeHtml;
        let html = `<p style="color:rgba(255,255,255,0.5);font-size:0.82rem;margin:0 0 1rem">
            Chambers group rooms that share the same dehumidification zone. Rename the default or add more.
        </p>`;
        for (const ch of chambers) {
            html += `
                <div class="dry-chamber-card" data-chamber-id="${esc(ch.id)}">
                    <div class="dry-chamber-header">
                        <input type="text" class="dry-input dry-chamber-name" value="${esc(ch.name)}"
                               data-chamber-id="${esc(ch.id)}" style="width:200px" />
                        ${chambers.length > 1 ? `<button class="dry-btn dry-btn-sm dry-btn-danger dry-chamber-delete"
                            data-chamber-id="${esc(ch.id)}">&times;</button>` : ''}
                    </div>
                    <div class="dry-chamber-color" data-chamber-id="${esc(ch.id)}">
                        ${dryingUtils.buildColorPicker(ch.color)}
                    </div>
                </div>`;
        }
        html += `<button class="dry-btn dry-btn-secondary dry-chamber-add" style="margin-top:0.75rem">+ Add Chamber</button>`;
        return html;
    },

    // Step 4: Assign Rooms to Chambers
    _renderStep4() {
        const { rooms, chambers } = this._state;
        const esc = dryingUtils.escapeHtml;

        const sorted = [...rooms].sort((a, b) => {
            const ai = chambers.findIndex(c => c.id === a.chamber_id);
            const bi = chambers.findIndex(c => c.id === b.chamber_id);
            return ai - bi;
        });

        let html = `<p style="color:rgba(255,255,255,0.5);font-size:0.82rem;margin:0 0 1rem">
            Assign each room to a chamber. Use the dropdown to select which chamber a room belongs to.
        </p>`;
        html += `<div class="dry-room-list">`;

        let lastChamberId = null;
        for (const room of sorted) {
            const chamber = chambers.find(c => c.id === room.chamber_id);
            const borderColor = chamber && chamber.color ? chamber.color : 'var(--apex-primary)';

            if (room.chamber_id !== lastChamberId) {
                if (chamber) {
                    html += `<div class="dry-chamber-divider">
                        <span class="dry-chamber-dot" style="background:${borderColor}"></span>
                        <span style="color:${borderColor}">${esc(chamber.name)}</span>
                    </div>`;
                }
                lastChamberId = room.chamber_id;
            }

            html += `
                <div class="dry-room-item" data-room-id="${esc(room.id)}" style="border-color:${borderColor}">
                    <span class="dry-room-name">${esc(room.name)}</span>
                    <select class="dry-input dry-room-chamber-select" data-room-id="${esc(room.id)}" style="width:180px">`;
            for (const ch of chambers) {
                const sel = room.chamber_id === ch.id ? ' selected' : '';
                html += `<option value="${esc(ch.id)}"${sel}>${esc(ch.name)}</option>`;
            }
            html += `</select></div>`;
        }
        html += `</div>`;
        return html;
    },

    // Step 5: Preview — read-only mockup of the Add Visit layout
    _renderStep5() {
        const { rooms, chambers, refPoints, baselines } = this._state;
        const esc = dryingUtils.escapeHtml;

        let html = `<div class="dry-wizard-preview">`;

        // ── Atmospheric Preview ──
        html += `<div class="dry-atmo-section"><h4>Atmospheric Readings</h4>`;
        html += `<div class="dry-atmo-table">`;
        html += `<div class="dry-atmo-row" style="background:rgba(255,255,255,0.04);">
            <div class="dry-atmo-label" style="font-weight:600;color:rgba(255,255,255,0.5);font-size:0.72rem;text-transform:uppercase;letter-spacing:0.04em;">Location</div>
            <div class="dry-atmo-cell" style="font-weight:600;color:rgba(255,255,255,0.5);font-size:0.72rem;text-transform:uppercase;letter-spacing:0.04em;text-align:center;">Temp / RH</div>
            <div class="dry-atmo-cell" style="font-weight:600;color:rgba(255,255,255,0.5);font-size:0.72rem;text-transform:uppercase;letter-spacing:0.04em;text-align:center;">GPP</div>
        </div>`;
        html += this._previewAtmoRow('Unaffected Area');
        html += this._previewAtmoRow('Outside');
        for (const ch of chambers) {
            const color = ch.color || 'var(--apex-primary)';
            html += `<div class="dry-atmo-row" style="background:rgba(255,255,255,0.05);border-left:3px solid ${color};">
                <div class="dry-atmo-label" style="grid-column:1/-1;font-weight:600;color:${color};font-size:0.8rem;">${esc(ch.name)}</div>
            </div>`;
            html += this._previewAtmoRow('Intake');
            html += this._previewAtmoRow('Dehu Exhaust #1');
        }
        html += `</div></div>`;

        // ── Room Tabs (non-interactive) ──
        const sortedRooms = [...rooms].sort((a, b) => {
            const ai = chambers.findIndex(c => c.id === a.chamber_id);
            const bi = chambers.findIndex(c => c.id === b.chamber_id);
            return ai - bi;
        });
        if (!this._state.previewRoomId || !sortedRooms.find(r => r.id === this._state.previewRoomId)) {
            this._state.previewRoomId = sortedRooms.length ? sortedRooms[0].id : null;
        }
        const previewRoomId = this._state.previewRoomId;

        html += `<div class="dry-room-tabs">`;
        for (const room of sortedRooms) {
            const isActive = room.id === previewRoomId;
            const chamber = chambers.find(c => c.id === room.chamber_id);
            const borderColor = chamber && chamber.color ? chamber.color : 'var(--apex-primary)';
            html += `<button class="dry-room-tab${isActive ? ' active' : ''}" data-room-id="${esc(room.id)}" style="border-color:${borderColor}">${esc(room.name)}</button>`;
        }
        html += `</div>`;

        // ── Moisture Table Preview for first room ──
        if (previewRoomId) {
            const roomRPs = refPoints.filter(rp => rp.room_id === previewRoomId);
            const baselineMap = {};
            for (const b of baselines) baselineMap[b.material_code] = b.baseline_value;

            html += `<div class="dry-moisture-table">`;
            html += `<div class="dry-moisture-header">
                <div class="dry-moisture-cell">Ref #</div>
                <div class="dry-moisture-cell">Material</div>
                <div class="dry-moisture-cell">Baseline</div>
                <div class="dry-moisture-cell">Today</div>
                <div class="dry-moisture-cell">Progress</div>
            </div>`;
            for (const rp of roomRPs) {
                const mat = dryingUtils.MATERIAL_CODES.find(m => m.code === rp.material_code) || { label: rp.material_code };
                const bl = baselineMap[rp.material_code];
                html += `<div class="dry-moisture-row">
                    <div class="dry-moisture-cell">${esc(String(rp.ref_number))}</div>
                    <div class="dry-moisture-cell">${esc(mat.label)}</div>
                    <div class="dry-moisture-cell">${bl != null ? bl : '--'}</div>
                    <div class="dry-moisture-cell" style="opacity:0.3">--</div>
                    <div class="dry-moisture-cell" style="opacity:0.3">--</div>
                </div>`;
            }
            html += `</div>`;

            // ── Equipment Preview (2-column) ──
            html += `<div class="dry-equipment-section">`;
            const equipTypes = dryingUtils.EQUIPMENT_TYPES.filter(et => et.category === 'equipment');
            const specTypes = dryingUtils.EQUIPMENT_TYPES.filter(et => et.category === 'specialty');
            html += `<div class="dry-equipment-grid">`;
            html += `<div class="dry-equipment-col"><h4>Equipment</h4>`;
            for (const et of equipTypes) {
                html += `<div class="dry-equipment-row">
                    <div class="dry-equipment-label">${esc(et.label)}</div>
                    <span style="font-size:0.85rem;color:rgba(255,255,255,0.3);">0</span>
                </div>`;
            }
            html += `</div>`;
            html += `<div class="dry-equipment-col"><h4>Specialty Equipment</h4>`;
            for (const et of specTypes) {
                html += `<div class="dry-equipment-row">
                    <div class="dry-equipment-label">${esc(et.label)}</div>
                    <span style="font-size:0.85rem;color:rgba(255,255,255,0.3);">0</span>
                </div>`;
            }
            html += `</div></div></div>`;
        }

        html += `</div>`;
        return html;
    },

    _previewAtmoRow(label) {
        const esc = dryingUtils.escapeHtml;
        return `<div class="dry-atmo-row">
            <div class="dry-atmo-label">${esc(label)}</div>
            <div class="dry-atmo-cell"><span style="opacity:0.3">--</span></div>
            <div class="dry-atmo-cell"><span style="opacity:0.3">--</span></div>
        </div>`;
    },

    // ── Event Listeners per Step ─────────────────────────────────────

    _attachStepListeners(step) {
        const body = this._overlay.querySelector('.dry-wizard-body');

        if (step === 0) {
            // Step 0: Create Chambers
            const addBtn = body.querySelector('.dry-chamber-add');
            if (addBtn) addBtn.addEventListener('click', () => this._addChamber());
            body.querySelectorAll('.dry-chamber-delete').forEach(btn => {
                btn.addEventListener('click', () => this._deleteChamber(btn.dataset.chamberId));
            });
            body.querySelectorAll('.dry-chamber-name').forEach(input => {
                input.addEventListener('change', () => {
                    const chamberId = input.dataset.chamberId;
                    this._updateChamber(chamberId, { name: input.value.trim() });
                });
            });
            body.querySelectorAll('.dry-chamber-color').forEach(container => {
                const chamberId = container.dataset.chamberId;
                container.querySelectorAll('.dry-color-swatch').forEach(swatch => {
                    swatch.addEventListener('click', () => {
                        const color = swatch.dataset.color;
                        container.querySelectorAll('.dry-color-swatch').forEach(s => s.classList.remove('selected', 'dry-color-selected'));
                        swatch.classList.add('selected', 'dry-color-selected');
                        this._updateChamber(chamberId, { color });
                    });
                });
            });
        } else if (step === 1) {
            // Step 1: Rooms Review
            const addBtn = body.querySelector('.dry-room-add');
            if (addBtn) addBtn.addEventListener('click', () => this._addRoom());
            body.querySelectorAll('.dry-room-rename').forEach(btn => {
                btn.addEventListener('click', () => {
                    const roomId = btn.dataset.roomId;
                    const input = body.querySelector(`input.dry-room-name[data-room-id="${roomId}"]`);
                    if (input) this._renameRoom(roomId, input.value.trim());
                });
            });
            body.querySelectorAll('.dry-room-delete').forEach(btn => {
                btn.addEventListener('click', () => this._deleteRoom(btn.dataset.roomId));
            });
            // Enter key creates next room
            body.querySelectorAll('.dry-room-name').forEach(input => {
                input.addEventListener('keydown', async (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const roomId = input.dataset.roomId;
                        const name = input.value.trim();
                        if (name) {
                            await this._renameRoom(roomId, name);
                        }
                        await this._addRoom();
                    }
                });
            });
        } else if (step === 2) {
            // Step 2: Assign Rooms to Chambers
            body.querySelectorAll('.dry-room-chamber-select').forEach(sel => {
                sel.addEventListener('change', () => {
                    this._assignRoomToChamber(sel.dataset.roomId, sel.value);
                });
            });
        } else if (step === 3) {
            // Step 3: Reference Points
            body.querySelectorAll('.dry-room-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    this._collectCurrentStepState();
                    this._state.activeRoomId = tab.dataset.roomTab;
                    this._render();
                });
            });
            const addBtn = body.querySelector('.dry-add-selected');
            const matContainer = body.querySelector('.dry-material-chips');

            const updateAddBtn = () => {
                if (!addBtn || !matContainer) return;
                const count = matContainer.querySelectorAll('.dry-chip-material.active').length;
                if (count > 0) {
                    addBtn.style.display = 'inline-flex';
                    addBtn.disabled = false;
                    addBtn.textContent = `Add (${count})`;
                } else {
                    addBtn.style.display = 'none';
                    addBtn.disabled = true;
                }
            };

            body.querySelectorAll('.dry-chip-surface').forEach(chip => {
                chip.addEventListener('click', () => {
                    body.querySelectorAll('.dry-chip-surface').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    const surfaceKey = chip.dataset.surface;
                    const codes = dryingUtils.SURFACE_MATERIALS[surfaceKey] || [];
                    let matHtml = '';
                    for (const code of codes) {
                        const m = dryingUtils.MATERIAL_CODES.find(mc => mc.code === code);
                        if (m) matHtml += `<button class="dry-chip dry-chip-material" data-mat-code="${dryingUtils.escapeHtml(m.code)}">${dryingUtils.escapeHtml(m.label)}</button>`;
                    }
                    matContainer.innerHTML = matHtml;
                    updateAddBtn();
                    matContainer.querySelectorAll('.dry-chip-material').forEach(matChip => {
                        matChip.addEventListener('click', () => {
                            matChip.classList.toggle('active');
                            updateAddBtn();
                        });
                    });
                });
            });

            if (addBtn) {
                addBtn.addEventListener('click', async () => {
                    const surfaceChip = body.querySelector('.dry-chip-surface.active');
                    if (!surfaceChip || !matContainer) return;
                    const surfaceKey = surfaceChip.dataset.surface;
                    const surfaceLabel = (dryingUtils.SURFACE_TYPES.find(s => s.key === surfaceKey) || {}).label || surfaceKey;
                    const selectedCodes = [...matContainer.querySelectorAll('.dry-chip-material.active')].map(c => c.dataset.matCode);
                    if (!selectedCodes.length) return;
                    addBtn.disabled = true;
                    addBtn.textContent = 'Adding...';
                    for (const code of selectedCodes) {
                        await api.createDryingRefPoint(this._state.jobId, { room_id: this._state.activeRoomId, material_code: code, label: surfaceLabel });
                    }
                    this._state.refPoints = await api.getDryingRefPoints(this._state.jobId);
                    this._render();
                });
            }
            body.querySelectorAll('.dry-rp-material').forEach(span => {
                span.style.cursor = 'pointer';
                span.addEventListener('click', () => {
                    const rpId = span.dataset.rpId;
                    const currentCode = span.dataset.currentCode;
                    const surfaceLabel = span.dataset.surface;
                    const surfaceKey = dryingUtils.getSurfaceKeyFromLabel(surfaceLabel);
                    const wrapper = document.createElement('span');
                    if (surfaceKey) {
                        wrapper.innerHTML = dryingUtils.buildFilteredMaterialSelect(surfaceKey, currentCode, '_chg_' + rpId);
                    } else {
                        wrapper.innerHTML = dryingUtils.buildMaterialSelect(currentCode, '_change_mat', '_chg_' + rpId);
                    }
                    const sel = wrapper.querySelector('select');
                    sel.style.maxWidth = '220px';
                    span.replaceWith(sel);
                    sel.focus();
                    const commit = () => {
                        if (sel.value && sel.value !== currentCode) {
                            this._updateRefPointMaterial(rpId, sel.value);
                        } else {
                            this._render();
                        }
                    };
                    sel.addEventListener('change', commit);
                    sel.addEventListener('blur', () => { setTimeout(() => this._render(), 150); });
                });
            });
            body.querySelectorAll('.dry-rp-delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this._deleteRefPoint(btn.dataset.rpDelete);
                });
            });
        } else if (step === 4) {
            // Step 4: Baselines
            body.querySelectorAll('input[data-baseline-code]').forEach(inp => {
                inp.addEventListener('change', () => {
                    const code = inp.dataset.baselineCode;
                    if (inp.value !== '') {
                        this._saveBaseline(code, parseFloat(inp.value));
                    }
                });
            });
        } else if (step === 5) {
            // Step 5: Preview — clickable room tabs
            body.querySelectorAll('.dry-room-tab[data-room-id]').forEach(tab => {
                tab.addEventListener('click', () => {
                    this._state.previewRoomId = tab.dataset.roomId;
                    this._render();
                });
            });
        }
    },

    // ── Actions ──────────────────────────────────────────────────────

    async _addRoom() {
        const jobId = this._state.jobId;
        // Need a chamber_id — use first chamber
        const chamberId = this._state.chambers.length ? this._state.chambers[0].id : null;
        if (!chamberId) {
            console.error('Cannot add room: no chambers exist');
            alert('Cannot add room: please create a chamber first (go back to Step 1).');
            return;
        }
        try {
            await api.createDryingRoom(jobId, { chamber_id: chamberId, name: '' });
            this._state.rooms = await api.getDryingRooms(jobId);
            this._render();
            setTimeout(() => {
                const inputs = this._overlay.querySelectorAll('.dry-room-name');
                if (inputs.length) inputs[inputs.length - 1].focus();
            }, 50);
        } catch (err) {
            console.error('Failed to add room:', err);
            alert('Failed to add room: ' + (err.message || 'Unknown error'));
        }
    },

    async _deleteRoom(roomId) {
        try {
            await api.deleteDryingRoom(this._state.jobId, roomId);
            this._state.rooms = await api.getDryingRooms(this._state.jobId);
            this._state.refPoints = await api.getDryingRefPoints(this._state.jobId);
            this._render();
        } catch (err) {
            console.error('Failed to delete room:', err);
        }
    },

    async _renameRoom(roomId, newName) {
        if (!newName) return;
        try {
            await api.updateDryingRoom(this._state.jobId, roomId, { name: newName });
            this._state.rooms = await api.getDryingRooms(this._state.jobId);
            this._render();
        } catch (err) {
            console.error('Failed to rename room:', err);
        }
    },

    async _addChamber() {
        const colors = dryingUtils.CHAMBER_COLORS;
        const usedColors = new Set(this._state.chambers.map(c => c.color));
        const nextColor = colors.find(c => !usedColors.has(c.hex)) || colors[0];
        try {
            await api.createDryingChamber(this._state.jobId, {
                name: `Chamber ${this._state.chambers.length + 1}`,
                color: nextColor.hex
            });
            this._state.chambers = await api.getDryingChambers(this._state.jobId);
            this._render();
        } catch (err) {
            console.error('Failed to add chamber:', err);
        }
    },

    async _deleteChamber(chamberId) {
        if (this._state.chambers.length <= 1) return;
        try {
            await api.deleteDryingChamber(this._state.jobId, chamberId);
            this._state.chambers = await api.getDryingChambers(this._state.jobId);
            this._state.rooms = await api.getDryingRooms(this._state.jobId);
            this._render();
        } catch (err) {
            console.error('Failed to delete chamber:', err);
        }
    },

    async _updateChamber(chamberId, data) {
        try {
            await api.updateDryingChamber(this._state.jobId, chamberId, data);
            this._state.chambers = await api.getDryingChambers(this._state.jobId);
        } catch (err) {
            console.error('Failed to update chamber:', err);
        }
    },

    async _assignRoomToChamber(roomId, chamberId) {
        if (this._flipAnimating) return;
        this._flipAnimating = true;

        const body = this._overlay.querySelector('.dry-wizard-body');

        // FIRST: capture current positions by room ID
        const firstRects = {};
        body.querySelectorAll('.dry-room-item[data-room-id]').forEach(el => {
            firstRects[el.dataset.roomId] = el.getBoundingClientRect();
        });

        // Update backend + refresh state
        try {
            await api.updateDryingRoom(this._state.jobId, roomId, { chamber_id: chamberId });
            this._state.rooms = await api.getDryingRooms(this._state.jobId);
        } catch (err) {
            console.error('Failed to assign room to chamber:', err);
            this._flipAnimating = false;
            return;
        }

        // LAST: re-render with new sort order + colors
        body.innerHTML = this._renderStep4();
        this._attachStepListeners(2);

        // INVERT + PLAY
        body.querySelectorAll('.dry-room-item[data-room-id]').forEach(el => {
            const oldRect = firstRects[el.dataset.roomId];
            if (!oldRect) return;

            const newRect = el.getBoundingClientRect();
            const deltaX = oldRect.left - newRect.left;
            const deltaY = oldRect.top - newRect.top;
            if (deltaX === 0 && deltaY === 0) return;

            // Invert: place at old position instantly
            el.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            el.style.transition = 'none';
            el.offsetHeight; // force reflow

            // Play: animate to new position
            el.style.transition = 'transform 350ms cubic-bezier(0.4, 0, 0.2, 1)';
            el.style.transform = '';

            el.addEventListener('transitionend', () => {
                el.style.transition = '';
                el.style.transform = '';
            }, { once: true });
        });

        // Fade in chamber dividers
        body.querySelectorAll('.dry-chamber-divider').forEach(div => {
            div.style.opacity = '0';
            div.offsetHeight;
            div.style.transition = 'opacity 250ms ease 100ms';
            div.style.opacity = '1';
            div.addEventListener('transitionend', () => {
                div.style.transition = '';
            }, { once: true });
        });

        setTimeout(() => { this._flipAnimating = false; }, 400);
    },

    async _addRefPoint(roomId, materialCode, label) {
        try {
            await api.createDryingRefPoint(this._state.jobId, { room_id: roomId, material_code: materialCode, label: label || '' });
            this._state.refPoints = await api.getDryingRefPoints(this._state.jobId);
            this._render();
        } catch (err) {
            console.error('Failed to add ref point:', err);
        }
    },

    async _updateRefPointMaterial(rpId, newCode) {
        try {
            await api.updateDryingRefPoint(this._state.jobId, rpId, { material_code: newCode });
            this._state.refPoints = await api.getDryingRefPoints(this._state.jobId);
            this._render();
        } catch (err) {
            console.error('Failed to update ref point:', err);
        }
    },

    async _deleteRefPoint(rpId) {
        try {
            await api.deleteDryingRefPoint(this._state.jobId, rpId);
            this._state.refPoints = await api.getDryingRefPoints(this._state.jobId);
            this._render();
        } catch (err) {
            console.error('Failed to delete ref point:', err);
        }
    },

    _getDefaultBaseline(code) {
        if (code === 'D') return 11;
        return Math.floor(Math.random() * 4) + 6; // 6, 7, 8, or 9
    },

    async _ensureDefaultBaselines() {
        const { refPoints, baselines, jobId } = this._state;
        const usedCodes = [...new Set(refPoints.map(rp => rp.material_code))];
        const existingCodes = new Set(baselines.map(b => b.material_code));
        let changed = false;
        for (const code of usedCodes) {
            if (!existingCodes.has(code)) {
                const val = this._getDefaultBaseline(code);
                await api.upsertDryingBaseline(jobId, { material_code: code, baseline_value: val });
                changed = true;
            }
        }
        if (changed) {
            this._state.baselines = await api.getDryingBaselines(jobId);
            this._render(); // re-render to show populated values
        }
    },

    async _saveBaseline(materialCode, value) {
        try {
            await api.upsertDryingBaseline(this._state.jobId, {
                material_code: materialCode,
                baseline_value: value
            });
            this._state.baselines = await api.getDryingBaselines(this._state.jobId);
            this._render();
        } catch (err) {
            console.error('Failed to save baseline:', err);
        }
    },

    async _confirmSetup() {
        const btn = this._overlay.querySelector('.dry-wizard-confirm');
        if (btn) { btn.disabled = true; btn.textContent = 'Confirming...'; }
        try {
            await api.updateDryingLog(this._state.jobId, { setup_complete: 1 });
            this.close();
            if (typeof jobDetailTabs !== 'undefined' && jobDetailTabs._loadDryingState) {
                apexJobs.activeTab = 'drying';
                jobDetailTabs._loadDryingState(this._state.jobId, true);
            }
        } catch (err) {
            console.error('Failed to confirm setup:', err);
            if (btn) { btn.disabled = false; btn.textContent = 'Confirm Setup'; }
        }
    }
};

window.dryingSetup = dryingSetup;
