/* ===================================================================
   dryingVisit.js — Drying Visit Modal (add / view / edit)
   Exports: window.dryingVisit
   =================================================================== */

const dryingVisit = {

    _overlay: null,

    _state: {
        jobId: null,
        visitId: null,
        mode: 'add',          // 'add' | 'readonly' | 'edit'
        visit: null,
        priorVisit: null,     // { atmospheric, moisture, equipment }
        chambers: [],
        rooms: [],
        refPoints: [],
        baselines: [],
        activeRoomId: null,
        atmospheric: {},      // keyed by composite key  e.g. 'unaffected|null|null'
        moisture: {},         // keyed by refPointId
        equipment: {},        // keyed by roomId|equipmentType
        noteText: '',
        photoFiles: [],
        photoPreviewUrls: []
    },

    // ========================================
    // Public API
    // ========================================

    /** Add new visit */
    async open(jobId) {
        this._resetState();
        this._state.jobId = jobId;
        this._state.mode = 'add';
        this._ensureOverlay();
        this._overlay.style.display = 'flex';
        this._showLoading();

        try {
            // Fetch structural data in parallel
            const [chambers, rooms, refPoints, baselines, allVisits] = await Promise.all([
                api.getDryingChambers(jobId),
                api.getDryingRooms(jobId),
                api.getDryingRefPoints(jobId),
                api.getDryingBaselines(jobId),
                api.getDryingVisits(jobId)
            ]);

            this._state.chambers = chambers;
            this._state.rooms = rooms;
            this._state.refPoints = refPoints;
            this._state.baselines = baselines;

            // Create a new visit
            const newVisit = await api.createDryingVisit(jobId);
            this._state.visit = newVisit;
            this._state.visitId = newVisit.id;

            // Load prior visit data for comparison
            const sorted = allVisits.sort((a, b) => a.visit_number - b.visit_number);
            const priorVisitRow = sorted.length > 0 ? sorted[sorted.length - 1] : null;
            if (priorVisitRow) {
                const priorData = await api.getDryingVisit(jobId, priorVisitRow.id);
                this._state.priorVisit = priorData;
            }

            // Pre-populate equipment from prior visit
            this._initEquipmentFromPrior();

            // Set first room active
            if (rooms.length > 0) {
                this._state.activeRoomId = rooms[0].id;
            }

            this._render();
        } catch (err) {
            console.error('Failed to open visit modal:', err);
            this.close();
        }
    },

    /** View past visit (read-only) */
    async openReadOnly(jobId, visitId) {
        this._resetState();
        this._state.jobId = jobId;
        this._state.visitId = visitId;
        this._state.mode = 'readonly';
        this._ensureOverlay();
        this._overlay.style.display = 'flex';
        this._showLoading();

        try {
            const [chambers, rooms, refPoints, baselines, allVisits, visitData] = await Promise.all([
                api.getDryingChambers(jobId),
                api.getDryingRooms(jobId),
                api.getDryingRefPoints(jobId),
                api.getDryingBaselines(jobId),
                api.getDryingVisits(jobId),
                api.getDryingVisit(jobId, visitId)
            ]);

            this._state.chambers = chambers;
            this._state.rooms = rooms;
            this._state.refPoints = refPoints;
            this._state.baselines = baselines;
            this._state.visit = visitData.visit;

            // Populate atmospheric/moisture/equipment state from fetched data
            this._populateStateFromVisitData(visitData);

            // Load prior visit data for comparison columns
            const sorted = allVisits.sort((a, b) => a.visit_number - b.visit_number);
            const thisIdx = sorted.findIndex(v => v.id === visitId);
            if (thisIdx > 0) {
                const priorData = await api.getDryingVisit(jobId, sorted[thisIdx - 1].id);
                this._state.priorVisit = priorData;
            }

            if (rooms.length > 0) {
                this._state.activeRoomId = rooms[0].id;
            }

            this._render();
        } catch (err) {
            console.error('Failed to open visit (read-only):', err);
            this.close();
        }
    },

    /** Edit existing visit */
    async openEdit(jobId, visitId) {
        this._resetState();
        this._state.jobId = jobId;
        this._state.visitId = visitId;
        this._state.mode = 'edit';
        this._ensureOverlay();
        this._overlay.style.display = 'flex';
        this._showLoading();

        try {
            const [chambers, rooms, refPoints, baselines, allVisits, visitData] = await Promise.all([
                api.getDryingChambers(jobId),
                api.getDryingRooms(jobId),
                api.getDryingRefPoints(jobId),
                api.getDryingBaselines(jobId),
                api.getDryingVisits(jobId),
                api.getDryingVisit(jobId, visitId)
            ]);

            this._state.chambers = chambers;
            this._state.rooms = rooms;
            this._state.refPoints = refPoints;
            this._state.baselines = baselines;
            this._state.visit = visitData.visit;

            // Populate from existing data
            this._populateStateFromVisitData(visitData);

            // Load prior visit for comparison
            const sorted = allVisits.sort((a, b) => a.visit_number - b.visit_number);
            const thisIdx = sorted.findIndex(v => v.id === visitId);
            if (thisIdx > 0) {
                const priorData = await api.getDryingVisit(jobId, sorted[thisIdx - 1].id);
                this._state.priorVisit = priorData;
            }

            if (rooms.length > 0) {
                this._state.activeRoomId = rooms[0].id;
            }

            this._render();
        } catch (err) {
            console.error('Failed to open visit (edit):', err);
            this.close();
        }
    },

    close() {
        if (this._overlay) {
            this._overlay.style.display = 'none';
        }
        // Revoke object URLs
        for (const url of this._state.photoPreviewUrls) {
            URL.revokeObjectURL(url);
        }
        this._resetState();
    },

    // ========================================
    // Overlay
    // ========================================

    _ensureOverlay() {
        if (this._overlay) return;
        const el = document.createElement('div');
        el.className = 'dry-visit-overlay';
        el.style.display = 'none';
        el.innerHTML = `<div class="dry-visit-backdrop"></div><div class="dry-visit-modal"></div>`;
        el.querySelector('.dry-visit-backdrop').addEventListener('click', () => this.close());
        document.body.appendChild(el);
        this._overlay = el;
    },

    _showLoading() {
        const modal = this._overlay.querySelector('.dry-visit-modal');
        modal.innerHTML = `
            <div class="dry-visit-header">
                <h3>Loading...</h3>
                <button class="dry-btn dry-btn-sm" onclick="dryingVisit.close()">&times;</button>
            </div>
            <div class="dry-visit-body">
                <div class="apex-empty-state">Loading visit data...</div>
            </div>`;
    },

    // ========================================
    // State helpers
    // ========================================

    _resetState() {
        this._state = {
            jobId: null,
            visitId: null,
            mode: 'add',
            visit: null,
            priorVisit: null,
            chambers: [],
            rooms: [],
            refPoints: [],
            baselines: [],
            activeRoomId: null,
            atmospheric: {},
            moisture: {},
            equipment: {},
            noteText: '',
            photoFiles: [],
            photoPreviewUrls: []
        };
    },

    _populateStateFromVisitData(data) {
        // Atmospheric
        if (data.atmospheric) {
            for (const r of data.atmospheric) {
                const key = this._atmoKey(r.reading_type, r.chamber_id, r.dehu_number);
                this._state.atmospheric[key] = {
                    tempF: r.temp_f,
                    rhPercent: r.rh_percent,
                    gpp: r.gpp
                };
            }
        }
        // Moisture
        if (data.moisture) {
            for (const r of data.moisture) {
                this._state.moisture[r.ref_point_id] = r.reading_value;
            }
        }
        // Equipment
        if (data.equipment) {
            for (const e of data.equipment) {
                const key = `${e.room_id}|${e.equipment_type}`;
                this._state.equipment[key] = e.quantity;
            }
        }
    },

    _initEquipmentFromPrior() {
        if (!this._state.priorVisit || !this._state.priorVisit.equipment) return;
        for (const e of this._state.priorVisit.equipment) {
            const key = `${e.room_id}|${e.equipment_type}`;
            this._state.equipment[key] = e.quantity;
        }
    },

    _atmoKey(readingType, chamberId, dehuNumber) {
        return `${readingType}|${chamberId || ''}|${dehuNumber || ''}`;
    },

    // ========================================
    // Render
    // ========================================

    _render() {
        const modal = this._overlay.querySelector('.dry-visit-modal');
        const isReadOnly = this._state.mode === 'readonly';

        modal.innerHTML = `
            ${this._renderHeader()}
            <div class="dry-visit-body">
                ${this._renderAtmosphericSection()}
                ${this._renderRoomTabs()}
                <div id="dv-room-panels">${this._renderRoomContent(this._state.activeRoomId)}</div>
                ${this._renderNotesSection()}
            </div>
            ${isReadOnly ? '' : this._renderSaveBar()}
        `;

        this._bindEvents();
    },

    _renderHeader() {
        const { visit, mode } = this._state;
        const esc = dryingUtils.escapeHtml;
        let title = 'Add Visit';
        if (mode === 'readonly' && visit) {
            const d = visit.visited_at ? new Date(visit.visited_at).toLocaleDateString() : '';
            title = `Visit #${visit.visit_number}` + (d ? ` &mdash; ${esc(d)}` : '');
        } else if (mode === 'edit' && visit) {
            title = `Edit Visit #${visit.visit_number}`;
        }

        return `<div class="dry-visit-header">
            <h3>${title}</h3>
            <button class="dry-btn dry-btn-sm" onclick="dryingVisit.close()">&times;</button>
        </div>`;
    },

    // ── Atmospheric ─────────────────────────

    _renderAtmosphericSection() {
        const { chambers, mode } = this._state;
        const isInput = mode !== 'readonly';
        const esc = dryingUtils.escapeHtml;

        let rows = '';

        // Header row
        rows += `<div class="dry-atmo-row" style="background:rgba(255,255,255,0.04);">
            <div class="dry-atmo-label" style="font-weight:600;color:rgba(255,255,255,0.5);font-size:0.72rem;text-transform:uppercase;letter-spacing:0.04em;">Location</div>
            <div class="dry-atmo-cell" style="font-weight:600;color:rgba(255,255,255,0.5);font-size:0.72rem;text-transform:uppercase;letter-spacing:0.04em;text-align:center;">Temp / RH</div>
            <div class="dry-atmo-cell" style="font-weight:600;color:rgba(255,255,255,0.5);font-size:0.72rem;text-transform:uppercase;letter-spacing:0.04em;text-align:center;">GPP / Prior</div>
            <div class="dry-gpp-value" style="font-weight:600;color:rgba(255,255,255,0.5);font-size:0.72rem;text-transform:uppercase;letter-spacing:0.04em;">Delta</div>
        </div>`;

        // Unaffected
        rows += this._renderAtmoRow('Unaffected Area', 'unaffected', null, null, isInput);
        // Outside
        rows += this._renderAtmoRow('Outside', 'outside', null, null, isInput);

        // Per chamber
        for (const ch of chambers) {
            const color = esc(ch.color || '#bf5af2');
            // Chamber header
            rows += `<div class="dry-atmo-row" style="background:rgba(255,255,255,0.05);border-left:3px solid ${color};">
                <div class="dry-atmo-label" style="grid-column:1/-1;font-weight:600;color:${color};font-size:0.8rem;">${esc(ch.name)}</div>
            </div>`;
            // Intake
            rows += this._renderAtmoRow('Intake', 'chamber_intake', ch.id, null, isInput);
            // Dehu exhausts
            const dehuCount = this._getDehuCount(ch.id);
            for (let n = 1; n <= dehuCount; n++) {
                rows += this._renderAtmoRow(`Dehu Exhaust #${n}`, 'chamber_dehu_exhaust', ch.id, n, isInput);
            }
        }

        return `<div class="dry-atmo-section">
            <h4>Atmospheric Readings</h4>
            <div class="dry-atmo-table">${rows}</div>
        </div>`;
    },

    _renderAtmoRow(label, readingType, chamberId, dehuNumber, isInput) {
        const key = this._atmoKey(readingType, chamberId, dehuNumber);
        const current = this._state.atmospheric[key] || {};
        const tempF = current.tempF;
        const rhPercent = current.rhPercent;
        const gpp = (tempF != null && rhPercent != null) ? dryingUtils.calculateGPP(tempF, rhPercent) : null;
        const priorGPP = this._getPriorAtmoGPP(readingType, chamberId, dehuNumber);
        const deltaText = dryingUtils.formatDelta(gpp, priorGPP);
        const deltaClass = this._deltaClass(gpp, priorGPP);
        const esc = dryingUtils.escapeHtml;

        if (isInput) {
            return `<div class="dry-atmo-row">
                <div class="dry-atmo-label">${esc(label)}</div>
                <div class="dry-atmo-cell" style="display:flex;gap:4px;">
                    <input type="number" step="0.1" class="dry-atmo-input" data-atmo-key="${esc(key)}" data-field="tempF" placeholder="Temp" value="${tempF != null ? tempF : ''}">
                    <input type="number" step="0.1" min="0" max="100" class="dry-atmo-input" data-atmo-key="${esc(key)}" data-field="rhPercent" placeholder="RH%" value="${rhPercent != null ? rhPercent : ''}">
                </div>
                <div class="dry-atmo-cell" style="display:flex;gap:4px;align-items:center;justify-content:center;">
                    <span class="dry-gpp-value dry-gpp-auto" data-gpp-key="${esc(key)}">${dryingUtils.formatGPP(gpp)}</span>
                    <span style="color:rgba(255,255,255,0.3);font-size:0.75rem;">/</span>
                    <span style="font-size:0.8rem;color:rgba(255,255,255,0.45);">${dryingUtils.formatGPP(priorGPP)}</span>
                </div>
                <div class="dry-gpp-value"><span class="dry-delta ${deltaClass}" data-delta-key="${esc(key)}">${deltaText}</span></div>
            </div>`;
        }

        // Read-only
        return `<div class="dry-atmo-row">
            <div class="dry-atmo-label">${esc(label)}</div>
            <div class="dry-atmo-cell" style="text-align:center;font-size:0.82rem;">
                <span>${tempF != null ? tempF : '--'}</span> / <span>${rhPercent != null ? rhPercent + '%' : '--'}</span>
            </div>
            <div class="dry-atmo-cell" style="display:flex;gap:4px;align-items:center;justify-content:center;">
                <span class="dry-gpp-value dry-gpp-auto">${dryingUtils.formatGPP(gpp)}</span>
                <span style="color:rgba(255,255,255,0.3);font-size:0.75rem;">/</span>
                <span style="font-size:0.8rem;color:rgba(255,255,255,0.45);">${dryingUtils.formatGPP(priorGPP)}</span>
            </div>
            <div class="dry-gpp-value"><span class="dry-delta ${deltaClass}">${deltaText}</span></div>
        </div>`;
    },

    // ── Room Tabs ───────────────────────────

    _renderRoomTabs() {
        const { rooms, chambers, activeRoomId } = this._state;
        if (rooms.length === 0) return '<p style="color:rgba(255,255,255,0.4);font-size:0.82rem;">No rooms configured.</p>';

        const esc = dryingUtils.escapeHtml;
        let html = '<div class="dry-room-tabs">';
        for (const room of rooms) {
            const chamber = chambers.find(c => c.id === room.chamber_id);
            const color = chamber ? chamber.color : 'transparent';
            const active = room.id === activeRoomId ? ' active' : '';
            html += `<button class="dry-room-tab${active}" data-room-id="${esc(room.id)}" style="--tab-chamber-color:${esc(color)};">${esc(room.name)}</button>`;
        }
        html += '</div>';
        return html;
    },

    _renderRoomContent(roomId) {
        if (!roomId) return '';
        return `<div class="dry-room-content active">
            ${this._renderMoistureTable(roomId)}
            ${this._renderEquipmentSection(roomId)}
        </div>`;
    },

    // ── Moisture Table ──────────────────────

    _renderMoistureTable(roomId) {
        const { refPoints, mode } = this._state;
        const isInput = mode !== 'readonly';
        const esc = dryingUtils.escapeHtml;

        const roomRPs = refPoints.filter(rp => rp.room_id === roomId);
        if (roomRPs.length === 0 && !isInput) {
            return '<p style="color:rgba(255,255,255,0.4);font-size:0.82rem;margin-bottom:1rem;">No reference points in this room.</p>';
        }

        let html = `<div class="dry-moisture-table">`;
        // Header
        html += `<div class="dry-moisture-header">
            <div class="dry-moisture-cell">Ref #</div>
            <div class="dry-moisture-cell">Material</div>
            <div class="dry-moisture-cell">Prior</div>
            <div class="dry-moisture-cell">Today</div>
            <div class="dry-moisture-cell">Progress</div>
            <div class="dry-moisture-cell">${isInput ? 'Actions' : ''}</div>
        </div>`;

        for (const rp of roomRPs) {
            const isDemolished = !!rp.demolished_at;
            const rowClass = isDemolished ? ' dry-moisture-demolished' : this._moistureRowClass(rp);
            const priorVal = this._getPriorMoisture(rp.id);
            const todayVal = this._state.moisture[rp.id];
            const progress = this._moistureProgress(todayVal, priorVal);
            const progressClass = this._moistureProgressClass(todayVal, priorVal);

            const materialLabel = this._materialLabel(rp.material_code);

            if (isDemolished) {
                html += `<div class="dry-moisture-row${rowClass}">
                    <div class="dry-moisture-cell">${esc(String(rp.ref_number))}</div>
                    <div class="dry-moisture-cell">${esc(materialLabel)}</div>
                    <div class="dry-moisture-cell">${priorVal != null ? priorVal : '--'}</div>
                    <div class="dry-moisture-cell">Demolished</div>
                    <div class="dry-moisture-cell">--</div>
                    <div class="dry-moisture-cell"></div>
                </div>`;
            } else if (isInput) {
                html += `<div class="dry-moisture-row${rowClass}" data-rp-id="${esc(rp.id)}">
                    <div class="dry-moisture-cell">${esc(String(rp.ref_number))}</div>
                    <div class="dry-moisture-cell">${esc(materialLabel)}</div>
                    <div class="dry-moisture-cell">${priorVal != null ? priorVal : '--'}</div>
                    <div class="dry-moisture-cell">
                        <input type="number" step="0.1" class="dv-moisture-input" data-rp-id="${esc(rp.id)}" value="${todayVal != null ? todayVal : ''}">
                    </div>
                    <div class="dry-moisture-cell"><span class="dry-delta ${progressClass}" data-progress-rp="${esc(rp.id)}">${progress}</span></div>
                    <div class="dry-moisture-cell">
                        <button class="dry-btn dry-btn-danger dry-btn-sm dv-demo-btn" data-rp-id="${esc(rp.id)}">Demo</button>
                    </div>
                </div>`;
            } else {
                // read-only
                html += `<div class="dry-moisture-row${rowClass}">
                    <div class="dry-moisture-cell">${esc(String(rp.ref_number))}</div>
                    <div class="dry-moisture-cell">${esc(materialLabel)}</div>
                    <div class="dry-moisture-cell">${priorVal != null ? priorVal : '--'}</div>
                    <div class="dry-moisture-cell">${todayVal != null ? todayVal : '--'}</div>
                    <div class="dry-moisture-cell"><span class="dry-delta ${progressClass}">${progress}</span></div>
                    <div class="dry-moisture-cell"></div>
                </div>`;
            }
        }

        html += '</div>';

        // Add ref point button (input modes only)
        if (isInput) {
            html += `<button class="dry-btn dry-btn-secondary dry-btn-sm dv-add-rp-btn" data-room-id="${dryingUtils.escapeHtml(roomId)}" style="margin-bottom:1rem;">+ Add Reference Point</button>`;
        }

        return html;
    },

    // ── Equipment Section ───────────────────

    _renderEquipmentSection(roomId) {
        const { mode } = this._state;
        const isInput = mode !== 'readonly';
        const esc = dryingUtils.escapeHtml;

        const equipTypes = dryingUtils.EQUIPMENT_TYPES.filter(et => et.category === 'equipment');
        const specTypes = dryingUtils.EQUIPMENT_TYPES.filter(et => et.category === 'specialty');

        const renderCol = (types, title) => {
            let col = `<div class="dry-equipment-col"><h4>${esc(title)}</h4>`;
            for (const et of types) {
                const key = `${roomId}|${et.type}`;
                const qty = this._state.equipment[key] != null ? this._state.equipment[key] : 0;
                if (isInput) {
                    col += `<div class="dry-equipment-row">
                        <div class="dry-equipment-label">${esc(et.label)}</div>
                        <input type="number" min="0" class="dry-equipment-input dv-equip-input" data-room-id="${esc(roomId)}" data-equip-type="${esc(et.type)}" value="${qty}">
                    </div>`;
                } else {
                    col += `<div class="dry-equipment-row">
                        <div class="dry-equipment-label">${esc(et.label)}</div>
                        <span style="font-size:0.85rem;color:rgba(255,255,255,0.85);">${qty}</span>
                    </div>`;
                }
            }
            col += '</div>';
            return col;
        };

        let html = '<div class="dry-equipment-section">';
        html += '<div class="dry-equipment-grid">';
        html += renderCol(equipTypes, 'Equipment');
        html += renderCol(specTypes, 'Specialty Equipment');
        html += '</div></div>';
        return html;
    },

    // ── Notes ───────────────────────────────

    _renderNotesSection() {
        const { mode } = this._state;
        const esc = dryingUtils.escapeHtml;

        if (mode === 'readonly') {
            // Show existing notes as read-only
            const notes = (this._state.priorVisit && this._state.visitId)
                ? []  // we'll pull from fetched visit data
                : [];
            return this._renderReadOnlyNotes();
        }

        // Input mode
        return `<div class="dry-notes-section">
            <h4>Notes</h4>
            <textarea class="dry-note-input" id="dv-note-text" placeholder="Add notes about this visit...">${esc(this._state.noteText)}</textarea>
            <div class="dry-photo-upload">
                <label><input type="file" accept="image/*" multiple id="dv-photo-input"> + Add Photos</label>
            </div>
            <div class="dry-photo-thumbs" id="dv-photo-thumbs"></div>
        </div>`;
    },

    _renderReadOnlyNotes() {
        // Pull notes from the visit data we fetched via getDryingVisit
        // We stored the full visit composite in _populateStateFromVisitData, but notes
        // are accessed from the original fetch. We need to re-fetch or store them.
        // Since openReadOnly stores visitData, let's store notes on state.
        const notes = this._state._visitNotes || [];
        const esc = dryingUtils.escapeHtml;

        if (notes.length === 0) {
            return `<div class="dry-notes-section"><h4>Notes</h4><p style="color:rgba(255,255,255,0.4);font-size:0.82rem;">No notes for this visit.</p></div>`;
        }

        let html = '<div class="dry-notes-section"><h4>Notes</h4>';
        for (const note of notes) {
            const photos = typeof note.photos === 'string' ? JSON.parse(note.photos || '[]') : (note.photos || []);
            html += `<div style="padding:0.6rem 0.75rem;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;margin-bottom:0.5rem;">
                <p style="margin:0;font-size:0.82rem;color:rgba(255,255,255,0.85);">${esc(note.content)}</p>`;
            if (photos.length > 0) {
                html += '<div class="dry-photo-thumbs" style="margin-top:0.5rem;">';
                for (const p of photos) {
                    const src = `/api/apex-jobs/${this._state.jobId}/drying/photos/${esc(p.thumbPath || p.path || p.id + '_thumb.jpg')}`;
                    html += `<div class="dry-photo-thumb"><img src="${src}" alt="photo"></div>`;
                }
                html += '</div>';
            }
            html += '</div>';
        }
        html += '</div>';
        return html;
    },

    // ── Save Bar ────────────────────────────

    _renderSaveBar() {
        const canSave = this._canSave();
        return `<div class="dry-save-bar">
            <button class="dry-save-btn" id="dv-save-btn" ${canSave ? '' : 'disabled'}>Save Visit</button>
        </div>`;
    },

    // ========================================
    // Event binding
    // ========================================

    _bindEvents() {
        const modal = this._overlay.querySelector('.dry-visit-modal');

        // Room tabs
        modal.querySelectorAll('.dry-room-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this._switchRoom(tab.dataset.roomId);
            });
        });

        if (this._state.mode === 'readonly') return;

        // Atmospheric inputs
        modal.querySelectorAll('.dry-atmo-input').forEach(input => {
            input.addEventListener('input', () => {
                this._onAtmoInput(input.dataset.atmoKey, input.dataset.field, input.value);
            });
        });

        // Moisture inputs
        modal.querySelectorAll('.dv-moisture-input').forEach(input => {
            input.addEventListener('input', () => {
                this._onMoistureInput(input.dataset.rpId, input.value);
            });
        });

        // Equipment inputs
        modal.querySelectorAll('.dv-equip-input').forEach(input => {
            input.addEventListener('input', () => {
                this._onEquipmentInput(input.dataset.roomId, input.dataset.equipType, input.value);
            });
        });

        // Demo buttons
        modal.querySelectorAll('.dv-demo-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this._demolishRefPoint(btn.dataset.rpId);
            });
        });

        // Add reference point buttons
        modal.querySelectorAll('.dv-add-rp-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this._addRefPoint(btn.dataset.roomId);
            });
        });

        // Note text
        const noteInput = modal.querySelector('#dv-note-text');
        if (noteInput) {
            noteInput.addEventListener('input', () => {
                this._state.noteText = noteInput.value;
            });
        }

        // Photo input
        const photoInput = modal.querySelector('#dv-photo-input');
        if (photoInput) {
            photoInput.addEventListener('change', () => {
                this._onPhotoChange(photoInput);
            });
        }

        // Save button
        const saveBtn = modal.querySelector('#dv-save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this._save();
            });
        }

        // Enter key navigates horizontally then down across all number inputs
        modal.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            const active = document.activeElement;
            if (!active || active.tagName === 'TEXTAREA') return;
            if (active.tagName !== 'INPUT') return;
            e.preventDefault();

            // Gather all visible number/text inputs in the modal (not buttons, not textareas)
            const allInputs = [...modal.querySelectorAll('input[type="number"], input[type="text"], input:not([type])')].filter(
                el => el.offsetParent !== null && !el.disabled && !el.readOnly
            );
            const idx = allInputs.indexOf(active);
            if (idx === -1) return;

            const next = idx + 1 < allInputs.length ? allInputs[idx + 1] : allInputs[0];
            next.focus();
            next.select();
        });
    },

    // ========================================
    // Tab switching
    // ========================================

    _switchRoom(roomId) {
        this._state.activeRoomId = roomId;
        // Update tab active states
        this._overlay.querySelectorAll('.dry-room-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.roomId === roomId);
        });
        // Re-render room content
        const panel = this._overlay.querySelector('#dv-room-panels');
        if (panel) {
            panel.innerHTML = this._renderRoomContent(roomId);
            this._bindRoomEvents();
        }
    },

    _bindRoomEvents() {
        const panel = this._overlay.querySelector('#dv-room-panels');
        if (!panel || this._state.mode === 'readonly') return;

        panel.querySelectorAll('.dv-moisture-input').forEach(input => {
            input.addEventListener('input', () => {
                this._onMoistureInput(input.dataset.rpId, input.value);
            });
        });

        panel.querySelectorAll('.dv-equip-input').forEach(input => {
            input.addEventListener('input', () => {
                this._onEquipmentInput(input.dataset.roomId, input.dataset.equipType, input.value);
            });
        });

        panel.querySelectorAll('.dv-demo-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this._demolishRefPoint(btn.dataset.rpId);
            });
        });

        panel.querySelectorAll('.dv-add-rp-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this._addRefPoint(btn.dataset.roomId);
            });
        });
    },

    // ========================================
    // Real-time calculations
    // ========================================

    _onAtmoInput(key, field, value) {
        if (!this._state.atmospheric[key]) {
            this._state.atmospheric[key] = {};
        }
        const parsed = value === '' ? null : parseFloat(value);
        this._state.atmospheric[key][field] = parsed;

        const current = this._state.atmospheric[key];
        const gpp = dryingUtils.calculateGPP(current.tempF, current.rhPercent);

        // Update GPP display
        const gppEl = this._overlay.querySelector(`[data-gpp-key="${CSS.escape(key)}"]`);
        if (gppEl) {
            gppEl.textContent = dryingUtils.formatGPP(gpp);
        }

        // Update delta display
        const parts = key.split('|');
        const priorGPP = this._getPriorAtmoGPP(parts[0], parts[1] || null, parts[2] ? parseInt(parts[2]) : null);
        const deltaEl = this._overlay.querySelector(`[data-delta-key="${CSS.escape(key)}"]`);
        if (deltaEl) {
            deltaEl.textContent = dryingUtils.formatDelta(gpp, priorGPP);
            deltaEl.className = 'dry-delta ' + this._deltaClass(gpp, priorGPP);
        }

        this._updateSaveBtn();
    },

    _onMoistureInput(refPointId, value) {
        const parsed = value === '' ? null : parseFloat(value);
        this._state.moisture[refPointId] = parsed;

        // Check dry standard
        const rp = this._state.refPoints.find(r => r.id === refPointId);
        const baseline = rp ? this._state.baselines.find(b => b.material_code === rp.material_code) : null;
        const baselineVal = baseline ? baseline.baseline_value : null;
        const isDry = parsed != null && baselineVal != null && dryingUtils.meetsDryStandard(parsed, baselineVal);

        // Toggle dry class on row
        const row = this._overlay.querySelector(`.dry-moisture-row[data-rp-id="${CSS.escape(refPointId)}"]`);
        if (row) {
            row.classList.toggle('dry-moisture-dry', isDry);
        }

        // Update progress delta
        const priorVal = this._getPriorMoisture(refPointId);
        const progressEl = this._overlay.querySelector(`[data-progress-rp="${CSS.escape(refPointId)}"]`);
        if (progressEl) {
            progressEl.textContent = this._moistureProgress(parsed, priorVal);
            progressEl.className = 'dry-delta ' + this._moistureProgressClass(parsed, priorVal);
        }

        this._updateSaveBtn();
    },

    _onEquipmentInput(roomId, equipType, value) {
        const key = `${roomId}|${equipType}`;
        this._state.equipment[key] = value === '' ? 0 : parseInt(value) || 0;
    },

    // ========================================
    // Photo handling
    // ========================================

    _onPhotoChange(input) {
        const files = Array.from(input.files);
        for (const file of files) {
            this._state.photoFiles.push(file);
            const url = URL.createObjectURL(file);
            this._state.photoPreviewUrls.push(url);
        }
        this._renderPhotoThumbs();
        // Reset file input so same file can be re-selected
        input.value = '';
    },

    _renderPhotoThumbs() {
        const container = this._overlay.querySelector('#dv-photo-thumbs');
        if (!container) return;
        container.innerHTML = '';
        for (let i = 0; i < this._state.photoPreviewUrls.length; i++) {
            const url = this._state.photoPreviewUrls[i];
            const thumb = document.createElement('div');
            thumb.className = 'dry-photo-thumb';
            thumb.innerHTML = `<img src="${url}" alt="photo preview"><button class="dry-photo-remove" data-idx="${i}">&times;</button>`;
            thumb.querySelector('.dry-photo-remove').addEventListener('click', () => {
                URL.revokeObjectURL(this._state.photoPreviewUrls[i]);
                this._state.photoFiles.splice(i, 1);
                this._state.photoPreviewUrls.splice(i, 1);
                this._renderPhotoThumbs();
            });
            container.appendChild(thumb);
        }
    },

    // ========================================
    // Actions
    // ========================================

    async _demolishRefPoint(rpId) {
        const { jobId, visitId } = this._state;
        if (!confirm('Demolish this reference point?')) return;

        try {
            await api.demolishDryingRefPoint(jobId, rpId, visitId);

            // Ask about replacement
            const addNew = confirm('Add new reference point to replace it?');
            if (addNew) {
                const rp = this._state.refPoints.find(r => r.id === rpId);
                const roomId = rp ? rp.room_id : this._state.activeRoomId;
                await this._promptAddRefPoint(roomId);
            }

            // Refresh ref points and re-render room
            this._state.refPoints = await api.getDryingRefPoints(jobId);
            this._switchRoom(this._state.activeRoomId);
        } catch (err) {
            console.error('Failed to demolish ref point:', err);
        }
    },

    async _addRefPoint(roomId) {
        await this._promptAddRefPoint(roomId);
    },

    async _promptAddRefPoint(roomId) {
        // Build a simple material select prompt
        const codes = dryingUtils.MATERIAL_CODES;
        const labels = codes.map(m => `${m.code} - ${m.label}`);
        const choice = prompt('Select material code:\n' + labels.map((l, i) => `${i + 1}. ${l}`).join('\n') + '\n\nEnter number:');
        if (!choice) return;

        const idx = parseInt(choice) - 1;
        if (idx < 0 || idx >= codes.length) return;

        const materialCode = codes[idx].code;
        try {
            await api.createDryingRefPoint(this._state.jobId, {
                room_id: roomId,
                material_code: materialCode
            });
            this._state.refPoints = await api.getDryingRefPoints(this._state.jobId);
            this._switchRoom(this._state.activeRoomId);
        } catch (err) {
            console.error('Failed to add ref point:', err);
        }
    },

    async _save() {
        const { jobId, visitId } = this._state;
        const saveBtn = this._overlay.querySelector('#dv-save-btn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
        }

        try {
            // Build atmospheric array
            const atmospheric = [];
            for (const [key, vals] of Object.entries(this._state.atmospheric)) {
                if (vals.tempF == null && vals.rhPercent == null) continue;
                const [readingType, chamberId, dehuNum] = key.split('|');
                atmospheric.push({
                    readingType,
                    chamberId: chamberId || null,
                    dehuNumber: dehuNum ? parseInt(dehuNum) : null,
                    tempF: vals.tempF,
                    rhPercent: vals.rhPercent
                });
            }

            // Build moisture array
            const moisture = [];
            for (const [refPointId, val] of Object.entries(this._state.moisture)) {
                if (val == null) continue;
                moisture.push({ refPointId, readingValue: val });
            }

            // Build equipment array
            const equipment = [];
            for (const [key, qty] of Object.entries(this._state.equipment)) {
                const [roomId, equipmentType] = key.split('|');
                if (qty > 0) {
                    equipment.push({ roomId, equipmentType, quantity: qty });
                }
            }

            // Save visit data
            await api.saveDryingVisit(jobId, visitId, { atmospheric, moisture, equipment });

            // Save note if any
            if (this._state.noteText.trim() || this._state.photoFiles.length > 0) {
                let photos = [];
                if (this._state.photoFiles.length > 0) {
                    const uploaded = await api.uploadDryingPhotos(jobId, this._state.photoFiles);
                    photos = uploaded;
                }
                if (this._state.noteText.trim() || photos.length > 0) {
                    await api.createDryingVisitNote(jobId, visitId, {
                        content: this._state.noteText.trim(),
                        photos
                    });
                }
            }

            this.close();

            // Refresh drying tab
            if (window.jobDetailTabs && typeof jobDetailTabs._loadDryingState === 'function') {
                jobDetailTabs._loadDryingState(jobId);
            }
        } catch (err) {
            console.error('Failed to save visit:', err);
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Visit';
            }
        }
    },

    _canSave() {
        const { atmospheric, moisture, refPoints } = this._state;

        // Check all expected atmospheric rows have values
        const atmoKeys = this._getExpectedAtmoKeys();
        for (const key of atmoKeys) {
            const vals = atmospheric[key];
            if (!vals || vals.tempF == null || vals.rhPercent == null) return false;
        }

        // Check all non-demolished ref points have moisture readings
        const activeRPs = refPoints.filter(rp => !rp.demolished_at);
        for (const rp of activeRPs) {
            if (moisture[rp.id] == null) return false;
        }

        return true;
    },

    _updateSaveBtn() {
        const btn = this._overlay.querySelector('#dv-save-btn');
        if (btn) {
            btn.disabled = !this._canSave();
        }
    },

    // ========================================
    // Helpers
    // ========================================

    _getExpectedAtmoKeys() {
        const keys = [];
        keys.push(this._atmoKey('unaffected', null, null));
        keys.push(this._atmoKey('outside', null, null));
        for (const ch of this._state.chambers) {
            keys.push(this._atmoKey('chamber_intake', ch.id, null));
            const dehuCount = this._getDehuCount(ch.id);
            for (let n = 1; n <= dehuCount; n++) {
                keys.push(this._atmoKey('chamber_dehu_exhaust', ch.id, n));
            }
        }
        return keys;
    },

    _getPriorAtmoGPP(readingType, chamberId, dehuNumber) {
        if (!this._state.priorVisit || !this._state.priorVisit.atmospheric) return null;
        const match = this._state.priorVisit.atmospheric.find(r =>
            r.reading_type === readingType &&
            (r.chamber_id || null) === (chamberId || null) &&
            (r.dehu_number || null) === (dehuNumber || null)
        );
        return match ? match.gpp : null;
    },

    _getPriorMoisture(refPointId) {
        if (!this._state.priorVisit || !this._state.priorVisit.moisture) return null;
        const match = this._state.priorVisit.moisture.find(m => m.ref_point_id === refPointId);
        return match ? match.reading_value : null;
    },

    _getPriorEquipment(roomId, equipmentType) {
        if (!this._state.priorVisit || !this._state.priorVisit.equipment) return 0;
        const match = this._state.priorVisit.equipment.find(e => e.room_id === roomId && e.equipment_type === equipmentType);
        return match ? match.quantity : 0;
    },

    _getDehuCount(chamberId) {
        // Check current visit's atmospheric readings first
        const currentDehus = Object.keys(this._state.atmospheric).filter(key => {
            const [type, chId] = key.split('|');
            return type === 'chamber_dehu_exhaust' && chId === chamberId;
        });
        if (currentDehus.length > 0) return currentDehus.length;

        // Fall back to prior visit
        if (this._state.priorVisit && this._state.priorVisit.atmospheric) {
            const dehus = this._state.priorVisit.atmospheric.filter(
                r => r.reading_type === 'chamber_dehu_exhaust' && r.chamber_id === chamberId
            );
            if (dehus.length > 0) return dehus.length;
        }

        // Fall back to equipment count
        const eqDehus = Object.keys(this._state.equipment).filter(key => {
            const [roomId, type] = key.split('|');
            return type === 'DEHU' && this._state.rooms.some(r => r.id === roomId && r.chamber_id === chamberId);
        });
        const eqTotal = eqDehus.reduce((sum, key) => sum + (this._state.equipment[key] || 0), 0);
        if (eqTotal > 0) return eqTotal;

        return 1; // absolute default
    },

    _materialLabel(code) {
        const m = dryingUtils.MATERIAL_CODES.find(mc => mc.code === code);
        return m ? m.label : code;
    },

    _deltaClass(current, prior) {
        if (current == null || prior == null) return 'dry-delta-flat';
        const diff = current - prior;
        if (diff < 0) return 'dry-delta-down';
        if (diff > 0) return 'dry-delta-up';
        return 'dry-delta-flat';
    },

    _moistureRowClass(rp) {
        const val = this._state.moisture[rp.id];
        if (val == null) return '';
        const baseline = this._state.baselines.find(b => b.material_code === rp.material_code);
        if (!baseline) return '';
        return dryingUtils.meetsDryStandard(val, baseline.baseline_value) ? ' dry-moisture-dry' : '';
    },

    _moistureProgress(today, prior) {
        if (today == null || prior == null) return '--';
        const diff = today - prior;
        if (diff < 0) return '\u2193' + Math.abs(diff).toFixed(1);
        if (diff > 0) return '\u2191' + diff.toFixed(1);
        return '\u2193' + '0.0';
    },

    _moistureProgressClass(today, prior) {
        if (today == null || prior == null) return 'dry-delta-flat';
        const diff = today - prior;
        if (diff < 0) return 'dry-delta-down';
        if (diff > 0) return 'dry-delta-up';
        return 'dry-delta-flat';
    }
};

// Store notes on state during populate
const _origPopulate = dryingVisit._populateStateFromVisitData;
dryingVisit._populateStateFromVisitData = function(data) {
    _origPopulate.call(this, data);
    this._state._visitNotes = data.notes || [];
};

window.dryingVisit = dryingVisit;
