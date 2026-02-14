/**
 * Apex Inventory Management Module
 * Manages consumable catalog, stock levels, purchases, and allocations
 */

const apexInventory = {
    items: [],
    stock: [],
    purchases: [],
    allocations: [],
    activeTab: 'catalog',

    async init() {
        this.render();
        this.loadCatalog();
    },

    render() {
        const container = document.getElementById('apex-inventory-content');
        if (!container) return;

        container.innerHTML = `
            <div class="inv-header">
                <h2>Inventory Management</h2>
                <button class="inv-back-btn" onclick="apexInventory.close()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
                    Back to Jobs
                </button>
            </div>
            <div class="inv-tabs">
                <button class="inv-tab active" data-tab="catalog" onclick="apexInventory.switchTab('catalog')">Catalog</button>
                <button class="inv-tab" data-tab="stock" onclick="apexInventory.switchTab('stock')">Stock</button>
                <button class="inv-tab" data-tab="allocations" onclick="apexInventory.switchTab('allocations')">Allocations</button>
            </div>
            <div id="inv-tab-panel" class="inv-tab-panel"></div>
        `;
    },

    switchTab(tab) {
        this.activeTab = tab;
        document.querySelectorAll('.inv-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
        if (tab === 'catalog') this.loadCatalog();
        else if (tab === 'stock') this.loadStock();
        else if (tab === 'allocations') this.loadAllocations();
    },

    open() {
        const jobsContent = document.getElementById('apex-jobs-content');
        const invContent = document.getElementById('apex-inventory-content');
        if (jobsContent) jobsContent.style.display = 'none';
        if (invContent) {
            invContent.style.display = 'block';
            this.init();
        }
    },

    close() {
        const jobsContent = document.getElementById('apex-jobs-content');
        const invContent = document.getElementById('apex-inventory-content');
        if (invContent) invContent.style.display = 'none';
        if (jobsContent) jobsContent.style.display = '';
    },

    // ========================================
    // Catalog Tab
    // ========================================
    async loadCatalog() {
        const panel = document.getElementById('inv-tab-panel');
        if (!panel) return;
        panel.innerHTML = '<div class="apex-empty-state">Loading catalog...</div>';

        try {
            const data = await api.getInventoryItems();
            this.items = Array.isArray(data) ? data : (data?.items || []);
            this.renderCatalog();
        } catch(e) {
            panel.innerHTML = '<div class="apex-empty-state">Failed to load catalog</div>';
            console.error(e);
        }
    },

    renderCatalog() {
        const panel = document.getElementById('inv-tab-panel');
        if (!panel) return;

        const categories = ['all', 'containment', 'ppe', 'cleaning', 'tools', 'general'];
        const esc = apexJobs.escapeHtml;

        const catBtns = categories.map(c =>
            `<button class="inv-cat-btn ${c === 'all' ? 'active' : ''}" data-cat="${c}" onclick="apexInventory._filterCatalog('${c}')">${c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}</button>`
        ).join('');

        const rows = this.items.map(item => {
            const stockLevel = item.stock_level != null ? item.stock_level : '—';
            const lowStock = item.min_threshold && item.stock_level != null && item.stock_level <= item.min_threshold;
            return `
                <div class="inv-item-row ${item.archived ? 'archived' : ''}" data-category="${item.category || 'general'}" data-id="${item.id}">
                    <span class="inv-item-name">${esc(item.name)}</span>
                    <span class="inv-item-unit">${esc(item.unit || 'ea')}</span>
                    <span class="inv-item-cost">$${Number(item.unit_cost || 0).toFixed(2)}</span>
                    <span class="inv-item-cat"><span class="jdt-category-badge">${esc(item.category || 'general')}</span></span>
                    <span class="inv-item-stock ${lowStock ? 'low-stock' : ''}">${stockLevel}${lowStock ? ' ⚠️' : ''}</span>
                    <span class="inv-item-actions">
                        <button class="inv-edit-btn" onclick="apexInventory._editItem('${item.id}')" title="Edit">✏️</button>
                        ${!item.archived ? `<button class="inv-archive-btn" onclick="apexInventory._archiveItem('${item.id}')" title="Archive">📦</button>` : ''}
                    </span>
                </div>
            `;
        }).join('');

        panel.innerHTML = `
            <div class="inv-catalog-controls">
                <div class="inv-cat-filter">${catBtns}</div>
                <button class="jdt-add-btn" onclick="apexInventory._openAddItemModal()">+ Add Item</button>
            </div>
            <div class="inv-catalog-header">
                <span>Name</span><span>Unit</span><span>Cost</span><span>Category</span><span>Stock</span><span></span>
            </div>
            <div class="inv-catalog-list" id="inv-catalog-list">
                ${rows || '<div class="apex-empty-state">No items in catalog</div>'}
            </div>
        `;
    },

    _filterCatalog(category) {
        document.querySelectorAll('.inv-cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === category));
        document.querySelectorAll('.inv-item-row').forEach(row => {
            row.style.display = (category === 'all' || row.dataset.category === category) ? '' : 'none';
        });
    },

    _openAddItemModal(existing = null) {
        const isEdit = !!existing;
        const modal = document.createElement('div');
        modal.className = 'jdt-modal-overlay';
        modal.innerHTML = `
            <div class="jdt-modal">
                <h3>${isEdit ? 'Edit Item' : 'Add Catalog Item'}</h3>
                <div class="jdt-form-group">
                    <label>Name</label>
                    <input type="text" id="inv-item-name" class="jdt-input" value="${existing?.name || ''}" placeholder="e.g. 6mil Poly Sheeting">
                </div>
                <div class="jdt-form-group">
                    <label>Unit</label>
                    <input type="text" id="inv-item-unit" class="jdt-input" value="${existing?.unit || 'ea'}" placeholder="ea, roll, box, etc.">
                </div>
                <div class="jdt-form-group">
                    <label>Unit Cost ($)</label>
                    <input type="number" id="inv-item-cost" class="jdt-input" step="0.01" value="${existing?.unit_cost || ''}">
                </div>
                <div class="jdt-form-group">
                    <label>Category</label>
                    <select id="inv-item-cat" class="jdt-select">
                        ${['containment', 'ppe', 'cleaning', 'tools', 'general'].map(c =>
                            `<option value="${c}" ${existing?.category === c ? 'selected' : ''}>${c.charAt(0).toUpperCase() + c.slice(1)}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="jdt-form-group">
                    <label>Min Stock Threshold</label>
                    <input type="number" id="inv-item-min" class="jdt-input" min="0" value="${existing?.min_threshold || ''}">
                </div>
                <div class="jdt-modal-actions">
                    <button class="jdt-submit-btn" onclick="apexInventory._submitItem(${isEdit ? `'${existing.id}'` : 'null'})">${isEdit ? 'Update' : 'Add'}</button>
                    <button class="jdt-cancel-btn" onclick="this.closest('.jdt-modal-overlay').remove()">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    async _submitItem(existingId) {
        const data = {
            name: document.getElementById('inv-item-name')?.value || '',
            unit: document.getElementById('inv-item-unit')?.value || 'ea',
            unit_cost: parseFloat(document.getElementById('inv-item-cost')?.value) || 0,
            category: document.getElementById('inv-item-cat')?.value || 'general',
            min_threshold: parseInt(document.getElementById('inv-item-min')?.value) || null
        };
        if (!data.name) return;

        try {
            if (existingId) {
                await api.updateInventoryItem(existingId, data);
            } else {
                await api.createInventoryItem(data);
            }
            document.querySelector('.jdt-modal-overlay')?.remove();
            this.loadCatalog();
        } catch(e) { console.error('Failed to save item:', e); }
    },

    async _editItem(id) {
        const item = this.items.find(i => i.id === id);
        if (item) this._openAddItemModal(item);
    },

    async _archiveItem(id) {
        if (!confirm('Archive this item?')) return;
        try {
            await api.archiveInventoryItem(id);
            this.loadCatalog();
        } catch(e) { console.error('Failed to archive:', e); }
    },

    // ========================================
    // Stock Tab
    // ========================================
    async loadStock() {
        const panel = document.getElementById('inv-tab-panel');
        if (!panel) return;
        panel.innerHTML = '<div class="apex-empty-state">Loading stock levels...</div>';

        try {
            const [stockData, purchaseData] = await Promise.all([
                api.getInventoryStock(),
                api.getInventoryPurchases()
            ]);
            this.stock = Array.isArray(stockData) ? stockData : (stockData?.stock || []);
            this.purchases = Array.isArray(purchaseData) ? purchaseData : (purchaseData?.purchases || []);
            this.renderStock();
        } catch(e) {
            panel.innerHTML = '<div class="apex-empty-state">Failed to load stock data</div>';
            console.error(e);
        }
    },

    renderStock() {
        const panel = document.getElementById('inv-tab-panel');
        if (!panel) return;
        const esc = apexJobs.escapeHtml;

        const lowStockItems = this.stock.filter(s => s.min_threshold && s.current_qty <= s.min_threshold);

        const alertSection = lowStockItems.length > 0 ? `
            <div class="inv-alert-bar">
                <span class="inv-alert-icon">⚠️</span>
                <span>${lowStockItems.length} item${lowStockItems.length > 1 ? 's' : ''} below minimum threshold:</span>
                ${lowStockItems.map(s => `<span class="inv-alert-item">${esc(s.item_name)} (${s.current_qty}/${s.min_threshold})</span>`).join(', ')}
            </div>
        ` : '';

        const stockRows = this.stock.map(s => {
            const low = s.min_threshold && s.current_qty <= s.min_threshold;
            return `
                <div class="inv-stock-row ${low ? 'low-stock' : ''}">
                    <span class="inv-item-name">${esc(s.item_name || s.name || '')}</span>
                    <span class="inv-stock-qty">${s.current_qty || 0} ${esc(s.unit || 'ea')}</span>
                    <span class="inv-stock-min">${s.min_threshold || '—'}</span>
                    <span class="inv-stock-value">$${((s.current_qty || 0) * (s.unit_cost || 0)).toFixed(2)}</span>
                </div>
            `;
        }).join('');

        const purchaseRows = this.purchases.slice(0, 20).map(p => `
            <div class="inv-purchase-row">
                <span>${esc(p.item_name || '')}</span>
                <span>${p.quantity || 0} ${esc(p.unit || '')}</span>
                <span>$${Number(p.total_cost || 0).toFixed(2)}</span>
                <span>${esc(p.vendor || '')}</span>
                <span>${p.purchase_date ? new Date(p.purchase_date).toLocaleDateString() : ''}</span>
            </div>
        `).join('');

        panel.innerHTML = `
            ${alertSection}
            <div class="inv-stock-section">
                <div class="inv-section-header">
                    <h4>Current Stock Levels</h4>
                </div>
                <div class="inv-stock-header">
                    <span>Item</span><span>Qty</span><span>Min</span><span>Value</span>
                </div>
                <div class="inv-stock-list">
                    ${stockRows || '<div class="apex-empty-state">No stock data</div>'}
                </div>
            </div>
            <div class="inv-purchase-section" style="margin-top:1.5rem">
                <div class="inv-section-header">
                    <h4>Purchase History</h4>
                    <button class="jdt-add-btn" onclick="apexInventory._openPurchaseModal()">+ Record Purchase</button>
                </div>
                <div class="inv-purchase-header">
                    <span>Item</span><span>Qty</span><span>Cost</span><span>Vendor</span><span>Date</span>
                </div>
                <div class="inv-purchase-list">
                    ${purchaseRows || '<div class="apex-empty-state">No purchases recorded</div>'}
                </div>
            </div>
        `;
    },

    _openPurchaseModal() {
        const itemOptions = this.items.map(i =>
            `<option value="${i.id}">${i.name} (${i.unit || 'ea'})</option>`
        ).join('');

        const modal = document.createElement('div');
        modal.className = 'jdt-modal-overlay';
        modal.innerHTML = `
            <div class="jdt-modal">
                <h3>Record Purchase</h3>
                <div class="jdt-form-group">
                    <label>Item</label>
                    <select id="inv-pur-item" class="jdt-select">
                        <option value="">Select item...</option>
                        ${itemOptions}
                    </select>
                </div>
                <div class="jdt-form-group">
                    <label>Quantity</label>
                    <input type="number" id="inv-pur-qty" class="jdt-input" min="1" value="1">
                </div>
                <div class="jdt-form-group">
                    <label>Total Cost ($)</label>
                    <input type="number" id="inv-pur-cost" class="jdt-input" step="0.01">
                </div>
                <div class="jdt-form-group">
                    <label>Vendor</label>
                    <input type="text" id="inv-pur-vendor" class="jdt-input" placeholder="e.g. Home Depot">
                </div>
                <div class="jdt-form-group">
                    <label>Purchase Date</label>
                    <input type="date" id="inv-pur-date" class="jdt-input" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="jdt-modal-actions">
                    <button class="jdt-submit-btn" onclick="apexInventory._submitPurchase()">Record</button>
                    <button class="jdt-cancel-btn" onclick="this.closest('.jdt-modal-overlay').remove()">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    async _submitPurchase() {
        const data = {
            item_id: document.getElementById('inv-pur-item')?.value,
            quantity: parseFloat(document.getElementById('inv-pur-qty')?.value || 1),
            total_cost: parseFloat(document.getElementById('inv-pur-cost')?.value || 0),
            vendor: document.getElementById('inv-pur-vendor')?.value || '',
            purchase_date: document.getElementById('inv-pur-date')?.value || null
        };
        if (!data.item_id || !data.total_cost) return;

        try {
            await api.createInventoryPurchase(data);
            document.querySelector('.jdt-modal-overlay')?.remove();
            this.loadStock();
        } catch(e) { console.error('Failed to record purchase:', e); }
    },

    // ========================================
    // Allocations Tab
    // ========================================
    async loadAllocations() {
        const panel = document.getElementById('inv-tab-panel');
        if (!panel) return;
        panel.innerHTML = '<div class="apex-empty-state">Loading allocations...</div>';

        try {
            const data = await api.getInventoryAllocations();
            this.allocations = Array.isArray(data) ? data : (data?.allocations || []);
            this.renderAllocations();
        } catch(e) {
            panel.innerHTML = '<div class="apex-empty-state">Failed to load allocations</div>';
            console.error(e);
        }
    },

    renderAllocations() {
        const panel = document.getElementById('inv-tab-panel');
        if (!panel) return;
        const esc = apexJobs.escapeHtml;

        // Group by item
        const byItem = {};
        this.allocations.forEach(a => {
            const key = a.item_name || a.item_id;
            if (!byItem[key]) byItem[key] = { item_name: a.item_name, unit: a.unit, entries: [] };
            byItem[key].entries.push(a);
        });

        const sections = Object.values(byItem).map(group => {
            const totalQty = group.entries.reduce((s, e) => s + (e.quantity || 0), 0);
            const rows = group.entries.map(a => `
                <div class="inv-alloc-row">
                    <span>${esc(a.job_name || a.job_id || '')}</span>
                    <span>${a.quantity || 0} ${esc(group.unit || 'ea')}</span>
                    <span>$${((a.quantity || 0) * (a.unit_cost || 0)).toFixed(2)}</span>
                    <span>${a.allocated_at ? new Date(a.allocated_at).toLocaleDateString() : ''}</span>
                </div>
            `).join('');

            return `
                <div class="inv-alloc-group">
                    <div class="inv-alloc-group-header">
                        <span class="inv-item-name">${esc(group.item_name)}</span>
                        <span class="inv-alloc-total">${totalQty} ${esc(group.unit || 'ea')} allocated</span>
                    </div>
                    <div class="inv-alloc-subheader"><span>Job</span><span>Qty</span><span>Cost</span><span>Date</span></div>
                    ${rows}
                </div>
            `;
        }).join('');

        panel.innerHTML = sections || '<div class="apex-empty-state">No allocations recorded yet</div>';
    }
};

window.apexInventory = apexInventory;
