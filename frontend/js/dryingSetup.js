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
        dehuCounts: {},   // chamberId -> count
        equipment: {},    // roomId -> { AM: 0, NAFAN: 0, DEHU: 0, SPEC: 0 }
        atmospheric: {},  // key -> { tempF, rhPercent }
        moisture: {}      // refPointId -> readingValue
    },

    _overlay: null,

    STEP_TITLES: [
        'Rooms Review',
        'Create Chambers',
        'Assign Rooms to Chambers',
        'Dehumidifiers per Chamber',
        'Reference Points',
        'Baselines',
        'Equipment per Room',
        'Atmospheric Readings',
        'Moisture Readings'
    ],

    TOTAL_STEPS: 9,

    // ── Public API ───────────────────────────────────────────────────

    async open(jobId) {
        this._state.jobId = jobId;
        this._state.currentStep = 0;
        this._state.dehuCounts = {};
        this._state.equipment = {};
        this._state.atmospheric = {};
        this._state.moisture = {};

        try {
            // Fetch existing data to detect partial setup
            const [chambers, rooms, refPoints, baselines, visits] = await Promise.all([
                api.getDryingChambers(jobId),
                api.getDryingRooms(jobId),
                api.getDryingRefPoints(jobId),
                api.getDryingBaselines(jobId),
                api.getDryingVisits(jobId)
            ]);

            this._state.chambers = chambers || [];
            this._state.rooms = rooms || [];
            this._state.refPoints = refPoints || [];
            this._state.baselines = baselines || [];

            // Initialize dehu counts from existing chambers
            for (const ch of this._state.chambers) {
                if (!this._state.dehuCounts[ch.id]) {
                    this._state.dehuCounts[ch.id] = 1;
                }
            }

            // Initialize equipment from existing rooms
            for (const rm of this._state.rooms) {
                if (!this._state.equipment[rm.id]) {
                    this._state.equipment[rm.id] = { AM: 0, NAFAN: 0, DEHU: 0, SPEC: 0 };
                }
            }

            // If visits exist, setup is already complete — don't re-open wizard
            if (visits && visits.length > 0) {
                console.log('Setup already complete — visits exist');
                return;
            }

            // Auto-advance to first incomplete step
            this._state.currentStep = this._detectFirstIncompleteStep();

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
                    <h3 class="dry-wizard-title"></h3>
                    <div class="dry-step-indicator"></div>
                    <button class="jdm-close" style="background:none;border:none;color:rgba(255,255,255,0.5);font-size:1.4rem;cursor:pointer;padding:0.25rem;">&times;</button>
                </div>
                <div class="dry-wizard-progress"><div class="dry-wizard-progress-fill"></div></div>
                <div class="dry-wizard-body"></div>
                <div class="dry-wizard-footer"></div>
            </div>
        `;
        document.body.appendChild(this._overlay);

        // Close on backdrop click
        this._overlay.querySelector('.dry-wizard-backdrop').addEventListener('click', () => this.close());
        // Close button
        this._overlay.querySelector('.jdm-close').addEventListener('click', () => this.close());
    },

    // ── Rendering ────────────────────────────────────────────────────

    _render() {
        const step = this._state.currentStep;
        const title = this._overlay.querySelector('.dry-wizard-title');
        title.textContent = `Step ${step + 1}: ${this.STEP_TITLES[step]}`;

        this._renderStepIndicator();
        this._renderProgressBar();

        const body = this._overlay.querySelector('.dry-wizard-body');
        const stepRenderers = [
            '_renderStep0', '_renderStep1', '_renderStep2', '_renderStep3',
            '_renderStep4', '_renderStep5', '_renderStep6', '_renderStep7',
            '_renderStep8'
        ];
        body.innerHTML = this[stepRenderers[step]]();
        this._renderNavButtons();

        // Attach step-specific event listeners after DOM is rendered
        this._attachStepListeners(step);
    },

    _renderStepIndicator() {
        const container = this._overlay.querySelector('.dry-step-indicator');
        let html = '';
        for (let i = 0; i < this.TOTAL_STEPS; i++) {
            let cls = 'dry-step-dot';
            if (i === this._state.currentStep) cls += ' active';
            else if (i < this._state.currentStep) cls += ' completed';
            html += `<div class="${cls}"></div>`;
        }
        container.innerHTML = html;
    },

    _renderProgressBar() {
        const fill = this._overlay.querySelector('.dry-wizard-progress-fill');
        const pct = ((this._state.currentStep + 1) / this.TOTAL_STEPS) * 100;
        fill.style.width = pct + '%';
    },

    _renderNavButtons() {
        const footer = this._overlay.querySelector('.dry-wizard-footer');
        const step = this._state.currentStep;

        let html = '';
        if (step > 0) {
            html += `<button class="dry-btn dry-btn-secondary dry-wizard-back">Back</button>`;
        } else {
            html += `<div></div>`;
        }

        if (step < this.TOTAL_STEPS - 1) {
            html += `<button class="dry-btn dry-btn-primary dry-wizard-next">Next</button>`;
        } else {
            html += `<button class="dry-btn dry-btn-primary dry-wizard-save">Save &amp; Complete Setup</button>`;
        }

        footer.innerHTML = html;

        const backBtn = footer.querySelector('.dry-wizard-back');
        const nextBtn = footer.querySelector('.dry-wizard-next');
        const saveBtn = footer.querySelector('.dry-wizard-save');

        if (backBtn) backBtn.addEventListener('click', () => this._prevStep());
        if (nextBtn) nextBtn.addEventListener('click', () => this._nextStep());
        if (saveBtn) saveBtn.addEventListener('click', () => this._saveAndComplete());
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
        // Step 0: rooms — always let user review
        if (!rooms.length) return 0;
        // Step 1: chambers
        if (!chambers.length) return 1;
        // Step 2: assign rooms — check if any room lacks a chamber
        const hasUnassigned = rooms.some(r => !r.chamber_id);
        if (hasUnassigned) return 2;
        // Step 3: dehu counts (local state, always incomplete on fresh open)
        // Step 4: ref points
        if (!refPoints.length) return 4;
        // Step 5: baselines
        const usedCodes = [...new Set(refPoints.map(rp => rp.material_code))];
        const baselineCodes = new Set(baselines.map(b => b.material_code));
        const missingBaselines = usedCodes.some(c => !baselineCodes.has(c));
        if (missingBaselines) return 5;
        // Steps 6-8 are always local-state; start at step 6 if everything else is done
        return 6;
    },

    // ── Collect current step state from inputs ───────────────────────

    _collectCurrentStepState() {
        const step = this._state.currentStep;
        const body = this._overlay.querySelector('.dry-wizard-body');

        if (step === 3) {
            // Dehu counts
            const inputs = body.querySelectorAll('[data-dehu-chamber]');
            inputs.forEach(inp => {
                const chamberId = inp.dataset.dehuChamber;
                this._state.dehuCounts[chamberId] = parseInt(inp.value, 10) || 1;
            });
        } else if (step === 6) {
            // Equipment
            const inputs = body.querySelectorAll('[data-equip-room]');
            inputs.forEach(inp => {
                const roomId = inp.dataset.equipRoom;
                const type = inp.dataset.equipType;
                if (!this._state.equipment[roomId]) {
                    this._state.equipment[roomId] = { AM: 0, NAFAN: 0, DEHU: 0, SPEC: 0 };
                }
                this._state.equipment[roomId][type] = parseInt(inp.value, 10) || 0;
            });
        } else if (step === 7) {
            this._collectAtmosphericFromInputs();
        } else if (step === 8) {
            this._collectMoistureFromInputs();
        }
    },

    // ── Step Renderers ───────────────────────────────────────────────

    // Step 0: Rooms Review
    _renderStep0() {
        const { rooms } = this._state;
        const esc = dryingUtils.escapeHtml;
        let html = `<p style="color:rgba(255,255,255,0.5);font-size:0.82rem;margin:0 0 1rem">
            Rooms were pre-populated from the job's affected areas. Rename, remove, or add rooms below.
        </p>`;
        html += `<div class="dry-room-list" id="dry-wiz-rooms">`;
        for (const room of rooms) {
            html += `
                <div class="dry-room-item" data-room-id="${esc(room.id)}">
                    <input type="text" class="dry-input dry-room-name" value="${esc(room.name)}"
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

    // Step 1: Create Chambers
    _renderStep1() {
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

    // Step 2: Assign Rooms to Chambers
    _renderStep2() {
        const { rooms, chambers } = this._state;
        const esc = dryingUtils.escapeHtml;
        let html = `<p style="color:rgba(255,255,255,0.5);font-size:0.82rem;margin:0 0 1rem">
            Assign each room to a chamber. Use the dropdown to select which chamber a room belongs to.
        </p>`;
        html += `<div class="dry-room-list">`;
        for (const room of rooms) {
            html += `
                <div class="dry-room-item">
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

    // Step 3: Dehumidifiers per Chamber
    _renderStep3() {
        const { chambers, dehuCounts } = this._state;
        const esc = dryingUtils.escapeHtml;
        let html = `<p style="color:rgba(255,255,255,0.5);font-size:0.82rem;margin:0 0 1rem">
            How many dehumidifiers are in each chamber? This determines atmospheric reading rows.
        </p>`;
        for (const ch of chambers) {
            const count = dehuCounts[ch.id] || 1;
            const colorDot = ch.color ? `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${ch.color};margin-right:0.4rem;vertical-align:middle;"></span>` : '';
            html += `
                <div class="dry-equipment-row">
                    <span class="dry-equipment-label">${colorDot}${esc(ch.name)}</span>
                    <input type="number" class="dry-equipment-input" min="1" max="20" value="${count}"
                           data-dehu-chamber="${esc(ch.id)}" />
                </div>`;
        }
        return html;
    },

    // Step 4: Reference Points per Room
    _renderStep4() {
        const { rooms, refPoints } = this._state;
        const esc = dryingUtils.escapeHtml;
        let html = `<p style="color:rgba(255,255,255,0.5);font-size:0.82rem;margin:0 0 1rem">
            Add moisture reference points for each room. Select the material type for each point.
        </p>`;
        for (const room of rooms) {
            const roomRPs = refPoints.filter(rp => rp.room_id === room.id);
            html += `<div class="dry-chamber-card" data-room-id="${esc(room.id)}">
                <div class="dry-chamber-header"><span>${esc(room.name)}</span></div>`;
            if (roomRPs.length) {
                html += `<div class="dry-room-list" style="margin-bottom:0.5rem">`;
                for (const rp of roomRPs) {
                    const materialLabel = (dryingUtils.MATERIAL_CODES.find(m => m.code === rp.material_code) || {}).label || rp.material_code;
                    html += `<div class="dry-room-item">
                        <span style="color:var(--apex-primary);font-weight:600;min-width:30px">#${rp.ref_number}</span>
                        <span style="flex:1">${esc(materialLabel)} (${esc(rp.material_code)})</span>
                    </div>`;
                }
                html += `</div>`;
            }
            html += `<div style="display:flex;gap:0.5rem;align-items:center">
                ${dryingUtils.buildMaterialSelect('', 'material_code', 'dry-mat-' + room.id)}
                <button class="dry-btn dry-btn-sm dry-btn-primary dry-rp-add" data-room-id="${esc(room.id)}">+ Add</button>
            </div></div>`;
        }
        return html;
    },

    // Step 5: Baselines
    _renderStep5() {
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
            html += `<p style="color:rgba(255,255,255,0.4);font-size:0.85rem;">No reference points added yet. Go back to Step 5 to add some.</p>`;
            return html;
        }

        for (const code of usedCodes) {
            const mat = dryingUtils.MATERIAL_CODES.find(m => m.code === code) || {};
            const val = baselineMap[code] !== undefined ? baselineMap[code] : '';
            html += `
                <div class="dry-equipment-row">
                    <span class="dry-equipment-label">${esc(mat.label || code)} (${esc(code)})</span>
                    <input type="number" class="dry-equipment-input" step="0.1" min="0" max="100" value="${val}"
                           data-baseline-code="${esc(code)}" placeholder="e.g. 12" />
                    <button class="dry-btn dry-btn-sm dry-btn-primary dry-baseline-save"
                            data-baseline-code="${esc(code)}">Save</button>
                </div>`;
        }
        return html;
    },

    // Step 6: Equipment per Room
    _renderStep6() {
        const { rooms, equipment } = this._state;
        const esc = dryingUtils.escapeHtml;
        const types = [
            { key: 'AM', label: 'Air Movers' },
            { key: 'NAFAN', label: 'Neg Air / Fan' },
            { key: 'DEHU', label: 'Dehumidifier' },
            { key: 'SPEC', label: 'Specialty' }
        ];

        let html = `<p style="color:rgba(255,255,255,0.5);font-size:0.82rem;margin:0 0 1rem">
            Enter equipment quantities placed in each room.
        </p>`;

        for (const room of rooms) {
            const eq = equipment[room.id] || { AM: 0, NAFAN: 0, DEHU: 0, SPEC: 0 };
            html += `<div class="dry-chamber-card">
                <div class="dry-chamber-header"><span>${esc(room.name)}</span></div>`;
            for (const t of types) {
                html += `
                    <div class="dry-equipment-row">
                        <span class="dry-equipment-label">${t.label}</span>
                        <input type="number" class="dry-equipment-input" min="0" max="99"
                               value="${eq[t.key]}" data-equip-room="${esc(room.id)}" data-equip-type="${t.key}" />
                    </div>`;
            }
            html += `</div>`;
        }
        return html;
    },

    // Step 7: First Atmospheric Readings
    _renderStep7() {
        const { chambers, dehuCounts, atmospheric } = this._state;
        const esc = dryingUtils.escapeHtml;

        const _val = (key, field) => {
            const v = (atmospheric[key] || {})[field];
            return v !== undefined && v !== null ? v : '';
        };
        const _gpp = (key) => {
            const entry = atmospheric[key] || {};
            const t = parseFloat(entry.tempF);
            const r = parseFloat(entry.rhPercent);
            if (!isNaN(t) && !isNaN(r)) return dryingUtils.formatGPP(dryingUtils.calculateGPP(t, r));
            return '--';
        };

        let html = `<p style="color:rgba(255,255,255,0.5);font-size:0.82rem;margin:0 0 1rem">
            Record atmospheric conditions. GPP is auto-calculated.
        </p>`;

        // Job-level readings
        html += `<div class="dry-atmo-section"><h4>Job-Level Readings</h4>`;
        html += `<div class="dry-atmo-table">`;
        // Unaffected
        html += this._atmoRow('unaffected', 'Unaffected Area', _val, _gpp);
        // Outside
        html += this._atmoRow('outside', 'Outside', _val, _gpp);
        html += `</div></div>`;

        // Per-chamber readings
        for (const ch of chambers) {
            const count = dehuCounts[ch.id] || 1;
            const colorDot = ch.color ? `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${ch.color};margin-right:0.3rem;vertical-align:middle;"></span>` : '';
            html += `<div class="dry-atmo-section"><h4>${colorDot}${esc(ch.name)}</h4>`;
            html += `<div class="dry-atmo-table">`;
            // Intake
            const intakeKey = `intake_${ch.id}`;
            html += this._atmoRow(intakeKey, 'Intake', _val, _gpp);
            // Dehu exhausts
            for (let d = 1; d <= count; d++) {
                const dehuKey = `dehu_${ch.id}_${d}`;
                html += this._atmoRow(dehuKey, `Dehu Exhaust #${d}`, _val, _gpp);
            }
            html += `</div></div>`;
        }
        return html;
    },

    _atmoRow(key, label, valFn, gppFn) {
        const esc = dryingUtils.escapeHtml;
        return `<div class="dry-atmo-row">
            <div class="dry-atmo-label">${esc(label)}</div>
            <div class="dry-atmo-cell">
                <input type="number" step="0.1" class="dry-atmo-input" placeholder="Temp °F"
                       data-atmo-key="${esc(key)}" data-atmo-field="tempF" value="${valFn(key, 'tempF')}" />
            </div>
            <div class="dry-atmo-cell">
                <input type="number" step="0.1" class="dry-atmo-input" placeholder="RH %"
                       data-atmo-key="${esc(key)}" data-atmo-field="rhPercent" value="${valFn(key, 'rhPercent')}" />
            </div>
            <div class="dry-gpp-value dry-gpp-auto" data-gpp-key="${esc(key)}">${gppFn(key)}</div>
        </div>`;
    },

    // Step 8: First Moisture Readings
    _renderStep8() {
        const { rooms, refPoints, baselines, moisture } = this._state;
        const esc = dryingUtils.escapeHtml;
        const baselineMap = {};
        for (const b of baselines) baselineMap[b.material_code] = b.baseline_value;

        let html = `<p style="color:rgba(255,255,255,0.5);font-size:0.82rem;margin:0 0 1rem">
            Enter the first moisture reading for each reference point.
        </p>`;

        for (const room of rooms) {
            const roomRPs = refPoints.filter(rp => rp.room_id === room.id);
            if (!roomRPs.length) continue;

            html += `<div class="dry-chamber-card">
                <div class="dry-chamber-header"><span>${esc(room.name)}</span></div>
                <div class="dry-moisture-table">
                    <div class="dry-moisture-header">
                        <div class="dry-moisture-cell">Ref #</div>
                        <div class="dry-moisture-cell">Material</div>
                        <div class="dry-moisture-cell">Baseline</div>
                        <div class="dry-moisture-cell">Reading</div>
                        <div class="dry-moisture-cell">Status</div>
                    </div>`;

            for (const rp of roomRPs) {
                const mat = dryingUtils.MATERIAL_CODES.find(m => m.code === rp.material_code) || {};
                const bl = baselineMap[rp.material_code];
                const val = moisture[rp.id] !== undefined ? moisture[rp.id] : '';
                const numVal = parseFloat(val);
                const isDry = !isNaN(numVal) && bl !== undefined && dryingUtils.meetsDryStandard(numVal, bl);
                const rowCls = isDry ? 'dry-moisture-row dry-moisture-dry' : 'dry-moisture-row';

                html += `<div class="${rowCls}" data-rp-id="${esc(rp.id)}">
                    <div class="dry-moisture-cell" style="font-weight:600;color:var(--apex-primary)">#${rp.ref_number}</div>
                    <div class="dry-moisture-cell">${esc(mat.label || rp.material_code)}</div>
                    <div class="dry-moisture-cell">${bl !== undefined ? bl : '--'}</div>
                    <div class="dry-moisture-cell">
                        <input type="number" step="0.1" min="0" max="100" value="${val}"
                               data-moisture-rp="${esc(rp.id)}" class="dry-atmo-input" />
                    </div>
                    <div class="dry-moisture-cell dry-moisture-status" data-status-rp="${esc(rp.id)}">${isDry ? '<span style="color:var(--apex-success);font-weight:600">DRY</span>' : '--'}</div>
                </div>`;
            }
            html += `</div></div>`;
        }

        if (!refPoints.length) {
            html += `<p style="color:rgba(255,255,255,0.4);font-size:0.85rem;">No reference points added. Go back to Step 5 to add some.</p>`;
        }

        return html;
    },

    // ── Event Listeners per Step ─────────────────────────────────────

    _attachStepListeners(step) {
        const body = this._overlay.querySelector('.dry-wizard-body');

        if (step === 0) {
            // Add Room
            const addBtn = body.querySelector('.dry-room-add');
            if (addBtn) addBtn.addEventListener('click', () => this._addRoom());
            // Rename buttons
            body.querySelectorAll('.dry-room-rename').forEach(btn => {
                btn.addEventListener('click', () => {
                    const roomId = btn.dataset.roomId;
                    const input = body.querySelector(`input.dry-room-name[data-room-id="${roomId}"]`);
                    if (input) this._renameRoom(roomId, input.value.trim());
                });
            });
            // Delete buttons
            body.querySelectorAll('.dry-room-delete').forEach(btn => {
                btn.addEventListener('click', () => this._deleteRoom(btn.dataset.roomId));
            });
        } else if (step === 1) {
            // Add Chamber
            const addBtn = body.querySelector('.dry-chamber-add');
            if (addBtn) addBtn.addEventListener('click', () => this._addChamber());
            // Delete buttons
            body.querySelectorAll('.dry-chamber-delete').forEach(btn => {
                btn.addEventListener('click', () => this._deleteChamber(btn.dataset.chamberId));
            });
            // Rename on blur
            body.querySelectorAll('.dry-chamber-name').forEach(input => {
                input.addEventListener('change', () => {
                    const chamberId = input.dataset.chamberId;
                    this._updateChamber(chamberId, { name: input.value.trim() });
                });
            });
            // Color picker clicks
            body.querySelectorAll('.dry-chamber-color').forEach(container => {
                const chamberId = container.dataset.chamberId;
                container.querySelectorAll('.dry-color-swatch').forEach(swatch => {
                    swatch.addEventListener('click', () => {
                        const color = swatch.dataset.color;
                        // Update selected state visually
                        container.querySelectorAll('.dry-color-swatch').forEach(s => s.classList.remove('selected', 'dry-color-selected'));
                        swatch.classList.add('selected', 'dry-color-selected');
                        this._updateChamber(chamberId, { color });
                    });
                });
            });
        } else if (step === 2) {
            // Assign rooms to chambers
            body.querySelectorAll('.dry-room-chamber-select').forEach(sel => {
                sel.addEventListener('change', () => {
                    this._assignRoomToChamber(sel.dataset.roomId, sel.value);
                });
            });
        } else if (step === 4) {
            // Add ref point buttons
            body.querySelectorAll('.dry-rp-add').forEach(btn => {
                btn.addEventListener('click', () => {
                    const roomId = btn.dataset.roomId;
                    const select = body.querySelector(`#dry-mat-${roomId}`);
                    if (select && select.value) {
                        this._addRefPoint(roomId, select.value);
                    }
                });
            });
        } else if (step === 5) {
            // Save baseline buttons
            body.querySelectorAll('.dry-baseline-save').forEach(btn => {
                btn.addEventListener('click', () => {
                    const code = btn.dataset.baselineCode;
                    const input = body.querySelector(`input[data-baseline-code="${code}"]`);
                    if (input && input.value !== '') {
                        this._saveBaseline(code, parseFloat(input.value));
                    }
                });
            });
        } else if (step === 7) {
            // Atmospheric GPP auto-calc
            body.querySelectorAll('.dry-atmo-input').forEach(input => {
                input.addEventListener('input', () => {
                    const key = input.dataset.atmoKey;
                    const field = input.dataset.atmoField;
                    if (!this._state.atmospheric[key]) {
                        this._state.atmospheric[key] = {};
                    }
                    this._state.atmospheric[key][field] = input.value;

                    // Recalculate GPP
                    const entry = this._state.atmospheric[key];
                    const t = parseFloat(entry.tempF);
                    const r = parseFloat(entry.rhPercent);
                    const gppEl = body.querySelector(`[data-gpp-key="${key}"]`);
                    if (gppEl) {
                        if (!isNaN(t) && !isNaN(r)) {
                            gppEl.textContent = dryingUtils.formatGPP(dryingUtils.calculateGPP(t, r));
                        } else {
                            gppEl.textContent = '--';
                        }
                    }
                });
            });
        } else if (step === 8) {
            // Moisture reading with live dry-standard check
            const baselineMap = {};
            for (const b of this._state.baselines) baselineMap[b.material_code] = b.baseline_value;

            body.querySelectorAll('[data-moisture-rp]').forEach(input => {
                input.addEventListener('input', () => {
                    const rpId = input.dataset.moistureRp;
                    this._state.moisture[rpId] = input.value;

                    // Check dry standard
                    const rp = this._state.refPoints.find(r => r.id === rpId);
                    if (!rp) return;
                    const bl = baselineMap[rp.material_code];
                    const val = parseFloat(input.value);
                    const isDry = !isNaN(val) && bl !== undefined && dryingUtils.meetsDryStandard(val, bl);

                    const row = input.closest('.dry-moisture-row');
                    const statusEl = body.querySelector(`[data-status-rp="${rpId}"]`);
                    if (isDry) {
                        if (row) row.classList.add('dry-moisture-dry');
                        if (statusEl) statusEl.innerHTML = '<span style="color:var(--apex-success);font-weight:600">DRY</span>';
                    } else {
                        if (row) row.classList.remove('dry-moisture-dry');
                        if (statusEl) statusEl.textContent = '--';
                    }
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
            return;
        }
        try {
            await api.createDryingRoom(jobId, { chamber_id: chamberId, name: 'New Room' });
            this._state.rooms = await api.getDryingRooms(jobId);
            // Init equipment for new rooms
            for (const rm of this._state.rooms) {
                if (!this._state.equipment[rm.id]) {
                    this._state.equipment[rm.id] = { AM: 0, NAFAN: 0, DEHU: 0, SPEC: 0 };
                }
            }
            this._render();
        } catch (err) {
            console.error('Failed to add room:', err);
        }
    },

    async _deleteRoom(roomId) {
        try {
            await api.deleteDryingRoom(this._state.jobId, roomId);
            this._state.rooms = await api.getDryingRooms(this._state.jobId);
            this._state.refPoints = await api.getDryingRefPoints(this._state.jobId);
            delete this._state.equipment[roomId];
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
            // Init dehu count for new chamber
            for (const ch of this._state.chambers) {
                if (!this._state.dehuCounts[ch.id]) this._state.dehuCounts[ch.id] = 1;
            }
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
            delete this._state.dehuCounts[chamberId];
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
        try {
            await api.updateDryingRoom(this._state.jobId, roomId, { chamber_id: chamberId });
            this._state.rooms = await api.getDryingRooms(this._state.jobId);
        } catch (err) {
            console.error('Failed to assign room to chamber:', err);
        }
    },

    async _addRefPoint(roomId, materialCode) {
        try {
            await api.createDryingRefPoint(this._state.jobId, { room_id: roomId, material_code: materialCode });
            this._state.refPoints = await api.getDryingRefPoints(this._state.jobId);
            this._render();
        } catch (err) {
            console.error('Failed to add ref point:', err);
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

    async _saveAndComplete() {
        // Collect final state from inputs
        this._collectCurrentStepState();

        const saveBtn = this._overlay.querySelector('.dry-wizard-save');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
        }

        try {
            const jobId = this._state.jobId;

            // 1. Create first visit
            const visit = await api.createDryingVisit(jobId);
            const visitId = visit.id;

            // 2. Build bulk save payload
            const atmospheric = this._buildAtmosphericPayload();
            const moisture = this._buildMoisturePayload();
            const equipment = this._buildEquipmentPayload();

            // 3. Bulk save
            await api.saveDryingVisit(jobId, visitId, { atmospheric, moisture, equipment });

            // 4. Close wizard
            this.close();

            // 5. Refresh drying tab
            if (typeof jobDetailTabs !== 'undefined' && jobDetailTabs._loadDryingState) {
                jobDetailTabs._loadDryingState(jobId);
            }
        } catch (err) {
            console.error('Failed to save and complete setup:', err);
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = 'Save &amp; Complete Setup';
            }
        }
    },

    // ── Payload Builders ─────────────────────────────────────────────

    _collectAtmosphericFromInputs() {
        const body = this._overlay.querySelector('.dry-wizard-body');
        if (!body) return;
        body.querySelectorAll('.dry-atmo-input').forEach(input => {
            const key = input.dataset.atmoKey;
            const field = input.dataset.atmoField;
            if (!this._state.atmospheric[key]) this._state.atmospheric[key] = {};
            this._state.atmospheric[key][field] = input.value;
        });
    },

    _collectMoistureFromInputs() {
        const body = this._overlay.querySelector('.dry-wizard-body');
        if (!body) return;
        body.querySelectorAll('[data-moisture-rp]').forEach(input => {
            this._state.moisture[input.dataset.moistureRp] = input.value;
        });
    },

    _buildAtmosphericPayload() {
        const { atmospheric, chambers, dehuCounts } = this._state;
        const rows = [];

        // Unaffected
        const ua = atmospheric['unaffected'] || {};
        if (ua.tempF || ua.rhPercent) {
            rows.push({
                readingType: 'unaffected',
                chamberId: null,
                dehuNumber: null,
                tempF: parseFloat(ua.tempF) || 0,
                rhPercent: parseFloat(ua.rhPercent) || 0
            });
        }

        // Outside
        const out = atmospheric['outside'] || {};
        if (out.tempF || out.rhPercent) {
            rows.push({
                readingType: 'outside',
                chamberId: null,
                dehuNumber: null,
                tempF: parseFloat(out.tempF) || 0,
                rhPercent: parseFloat(out.rhPercent) || 0
            });
        }

        // Per-chamber
        for (const ch of chambers) {
            // Intake
            const intakeKey = `intake_${ch.id}`;
            const intake = atmospheric[intakeKey] || {};
            if (intake.tempF || intake.rhPercent) {
                rows.push({
                    readingType: 'chamber_intake',
                    chamberId: ch.id,
                    dehuNumber: null,
                    tempF: parseFloat(intake.tempF) || 0,
                    rhPercent: parseFloat(intake.rhPercent) || 0
                });
            }

            // Dehu exhausts
            const count = dehuCounts[ch.id] || 1;
            for (let d = 1; d <= count; d++) {
                const dehuKey = `dehu_${ch.id}_${d}`;
                const dehu = atmospheric[dehuKey] || {};
                if (dehu.tempF || dehu.rhPercent) {
                    rows.push({
                        readingType: 'chamber_dehu_exhaust',
                        chamberId: ch.id,
                        dehuNumber: d,
                        tempF: parseFloat(dehu.tempF) || 0,
                        rhPercent: parseFloat(dehu.rhPercent) || 0
                    });
                }
            }
        }

        return rows;
    },

    _buildMoisturePayload() {
        const { moisture } = this._state;
        const rows = [];
        for (const [refPointId, val] of Object.entries(moisture)) {
            const v = parseFloat(val);
            if (!isNaN(v)) {
                rows.push({ refPointId, readingValue: v });
            }
        }
        return rows;
    },

    _buildEquipmentPayload() {
        const { equipment } = this._state;
        const typeMap = { AM: 'AM', NAFAN: 'NAFAN', DEHU: 'DEHU', SPEC: 'SPEC' };
        const rows = [];
        for (const [roomId, eq] of Object.entries(equipment)) {
            for (const [key, qty] of Object.entries(eq)) {
                if (qty > 0) {
                    rows.push({
                        roomId,
                        equipmentType: typeMap[key] || key,
                        quantity: qty
                    });
                }
            }
        }
        return rows;
    }
};

window.dryingSetup = dryingSetup;
