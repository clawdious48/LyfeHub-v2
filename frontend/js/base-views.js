// ============================================
// Base Views - Enhanced view management module
// Extends the views functionality in bases.js
// ============================================

const baseViews = (() => {

  /**
   * Enhanced renderViewsTabs - replaces the one in bases.js
   * Adds "+" button and default view indicator
   */
  function renderViewsTabs() {
    const views = basesState.views || [];
    const currentViewId = basesState.currentViewId;

    return `
      <div class="views-tabs">
        <button class="view-tab ${!currentViewId ? 'active' : ''}" data-view-id="">
          <span>All</span>
        </button>
        ${views.map(view => `
          <button class="view-tab ${currentViewId === view.id ? 'active' : ''}" data-view-id="${view.id}">
            <span>${escapeHtml(view.name)}${view.is_default ? ' ★' : ''}</span>
            <span class="view-tab-actions">
              <button class="view-tab-edit" data-view-id="${view.id}" title="Edit view">✏️</button>
              <button class="view-tab-delete" data-view-id="${view.id}" title="Delete view">×</button>
            </span>
          </button>
        `).join('')}
        <button class="view-tab-add" title="Create new view">+</button>
      </div>
    `;
  }

  /**
   * Attach listeners for the "+" button
   */
  function attachAddViewListener(container) {
    const addBtn = container.querySelector('.view-tab-add');
    if (addBtn) {
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showFullViewConfigModal();
      });
    }
  }

  /**
   * Full view config modal with filters, sorts, columns, and column order
   */
  function showFullViewConfigModal(existingViewId) {
    const base = basesState.currentBase;
    if (!base) return;

    const existingView = existingViewId
      ? basesState.views.find(v => v.id === existingViewId)
      : null;

    const config = existingView
      ? { ...(existingView.config || {}) }
      : {
          filters: [...(basesState.filters || [])],
          sorts: [],
          visible_columns: basesState.visibleColumns ? [...basesState.visibleColumns] : null,
          column_order: basesState.columnOrder ? [...basesState.columnOrder] : null
        };

    // Normalize config keys (handle both camelCase and snake_case)
    const filters = config.filters || [];
    const sorts = config.sorts || [];
    const visibleColumns = config.visible_columns || config.visibleColumns || null;
    const columnOrder = config.column_order || config.columnOrder || null;

    const allColumns = [
      { id: '_global_id', name: 'ID', type: 'number' },
      ...base.properties.map(p => ({ id: p.id, name: p.name, type: p.type, options: p.options })),
      { id: '_date_added', name: 'Date Added', type: 'date' },
      { id: '_date_modified', name: 'Date Modified', type: 'date' }
    ];

    const modal = document.createElement('div');
    modal.className = 'modal open';
    modal.id = 'view-config-modal';

    const isDefault = existingView ? !!existingView.is_default : false;

    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content modal-medium">
        <button class="modal-close-corner" aria-label="Close">×</button>
        <h2>${existingView ? 'Edit View' : 'Create View'}</h2>
        <div class="modal-body view-config-panel">
          <!-- Name -->
          <div class="form-group">
            <label for="vc-name">View Name</label>
            <input type="text" id="vc-name" class="form-input" value="${escapeHtml(existingView ? existingView.name : '')}" placeholder="My View" />
          </div>

          <!-- Default toggle -->
          <label class="view-default-toggle">
            <input type="checkbox" id="vc-default" ${isDefault ? 'checked' : ''} />
            <span>Set as default view (auto-loads when opening this base)</span>
          </label>

          <!-- Filters Section -->
          <div class="view-config-section">
            <div class="view-config-section-header">
              <h3>Filters</h3>
              <button class="view-config-add-btn" id="vc-add-filter">+ Add Filter</button>
            </div>
            <div id="vc-filters-list"></div>
          </div>

          <!-- Sorts Section -->
          <div class="view-config-section">
            <div class="view-config-section-header">
              <h3>Sorts</h3>
              <button class="view-config-add-btn" id="vc-add-sort">+ Add Sort</button>
            </div>
            <div id="vc-sorts-list"></div>
          </div>

          <!-- Visible Columns Section -->
          <div class="view-config-section">
            <div class="view-config-section-header">
              <h3>Visible Columns</h3>
            </div>
            <div id="vc-columns-list" class="view-config-columns"></div>
          </div>
        </div>
        <div class="modal-footer">
          ${existingView ? `<button class="btn btn-danger" id="vc-delete-btn" style="margin-right:auto">Delete View</button>` : ''}
          <button class="btn btn-secondary modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="vc-save-btn">${existingView ? 'Save Changes' : 'Create View'}</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // State for the modal
    const modalState = {
      filters: filters.map(f => ({ ...f })),
      sorts: sorts.map(s => ({ ...s })),
      visibleColumns: visibleColumns ? [...visibleColumns] : null,
      columnOrder: columnOrder ? [...columnOrder] : allColumns.map(c => c.id)
    };

    // Render sections
    renderFiltersSection(modal, modalState, allColumns, base);
    renderSortsSection(modal, modalState, allColumns);
    renderColumnsSection(modal, modalState, allColumns);

    // Add filter button
    modal.querySelector('#vc-add-filter').addEventListener('click', () => {
      modalState.filters.push({ propertyId: '', operator: '', value: '' });
      renderFiltersSection(modal, modalState, allColumns, base);
    });

    // Add sort button
    modal.querySelector('#vc-add-sort').addEventListener('click', () => {
      modalState.sorts.push({ field_id: '', direction: 'asc' });
      renderSortsSection(modal, modalState, allColumns);
    });

    // Close handlers
    const closeModal = () => modal.remove();
    modal.querySelector('.modal-close-corner').addEventListener('click', closeModal);
    modal.querySelector('.modal-cancel').addEventListener('click', closeModal);
    modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);

    // Delete button
    const deleteBtn = modal.querySelector('#vc-delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (!confirm(`Delete view "${existingView.name}"?`)) return;
        try {
          await basesApi.deleteView(base.id, existingViewId);
          basesState.views = basesState.views.filter(v => v.id !== existingViewId);
          if (basesState.currentViewId === existingViewId) {
            basesState.currentViewId = null;
            basesState.filters = [];
            basesState.visibleColumns = null;
            basesState.columnOrder = null;
          }
          renderTableView();
          closeModal();
        } catch (error) {
          console.error('Failed to delete view:', error);
        }
      });
    }

    // Save button
    modal.querySelector('#vc-save-btn').addEventListener('click', async () => {
      const name = modal.querySelector('#vc-name').value.trim();
      if (!name) {
        modal.querySelector('#vc-name').focus();
        return;
      }

      const isDefaultChecked = modal.querySelector('#vc-default').checked;

      // Build config - filter out incomplete rules
      const validFilters = modalState.filters.filter(f => f.propertyId && f.operator);
      const validSorts = modalState.sorts.filter(s => s.field_id);

      const viewConfig = {
        filters: validFilters,
        sorts: validSorts,
        visible_columns: modalState.visibleColumns,
        column_order: modalState.columnOrder
      };

      try {
        if (existingView) {
          const updatedView = await basesApi.updateView(base.id, existingViewId, {
            name,
            config: viewConfig,
            is_default: isDefaultChecked
          });
          const idx = basesState.views.findIndex(v => v.id === existingViewId);
          if (idx !== -1) basesState.views[idx] = updatedView;

          // If setting as default, unset others
          if (isDefaultChecked) {
            basesState.views.forEach(v => {
              if (v.id !== existingViewId) v.is_default = false;
            });
          }
        } else {
          const newView = await basesApi.createView(base.id, {
            name,
            config: viewConfig,
            is_default: isDefaultChecked
          });
          basesState.views.push(newView);
          basesState.currentViewId = newView.id;

          if (isDefaultChecked) {
            basesState.views.forEach(v => {
              if (v.id !== newView.id) v.is_default = false;
            });
          }
        }

        // Apply the view config to current state
        basesState.filters = validFilters;
        basesState.visibleColumns = viewConfig.visible_columns;
        basesState.columnOrder = viewConfig.column_order;

        // Apply sorts if any
        if (validSorts.length > 0) {
          basesState.sortColumn = validSorts[0].field_id;
          basesState.sortDirection = validSorts[0].direction || 'asc';
        }

        renderTableView();
        closeModal();
      } catch (error) {
        console.error('Failed to save view:', error);
      }
    });

    // Focus name input
    modal.querySelector('#vc-name').focus();
  }

  function renderFiltersSection(modal, modalState, allColumns, base) {
    const container = modal.querySelector('#vc-filters-list');
    if (!container) return;

    if (modalState.filters.length === 0) {
      container.innerHTML = '<p style="font-size:0.78rem;color:var(--text-secondary,#999);margin:0">No filters. Click "+ Add Filter" to add one.</p>';
      return;
    }

    container.innerHTML = modalState.filters.map((filter, idx) => {
      const selectedCol = allColumns.find(c => c.id === filter.propertyId);
      const operators = selectedCol
        ? (filterOperators[selectedCol.type] || filterOperators.text)
        : [];
      const needsValue = filter.operator && !['is_empty', 'is_not_empty', 'is_checked', 'is_not_checked'].includes(filter.operator);

      // Value input type depends on column type
      let valueHtml = '';
      if (needsValue && selectedCol) {
        if (selectedCol.type === 'select' || selectedCol.type === 'multi_select') {
          const opts = (selectedCol.options || []).map(normalizeOption);
          valueHtml = `<select class="vc-filter-value" data-idx="${idx}">
            <option value="">Select...</option>
            ${opts.map(o => `<option value="${escapeHtml(o.value)}" ${filter.value === o.value ? 'selected' : ''}>${escapeHtml(o.label)}</option>`).join('')}
          </select>`;
        } else {
          const inputType = selectedCol.type === 'number' ? 'number' : selectedCol.type === 'date' ? 'date' : 'text';
          valueHtml = `<input type="${inputType}" class="vc-filter-value" data-idx="${idx}" value="${escapeHtml(filter.value || '')}" placeholder="Value..." />`;
        }
      }

      return `
        <div class="view-config-rule" data-filter-idx="${idx}">
          <select class="vc-filter-prop" data-idx="${idx}">
            <option value="">Field...</option>
            ${allColumns.map(c => `<option value="${c.id}" ${filter.propertyId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
          </select>
          <select class="vc-filter-op" data-idx="${idx}" ${operators.length === 0 ? 'disabled' : ''}>
            ${operators.length === 0 ? '<option value="">Select field first</option>' : operators.map(op => `<option value="${op.value}" ${filter.operator === op.value ? 'selected' : ''}>${op.label}</option>`).join('')}
          </select>
          ${valueHtml}
          <button class="view-config-rule-remove vc-filter-remove" data-idx="${idx}">×</button>
        </div>
      `;
    }).join('');

    // Attach listeners
    container.querySelectorAll('.vc-filter-prop').forEach(sel => {
      sel.addEventListener('change', () => {
        const idx = parseInt(sel.dataset.idx);
        modalState.filters[idx].propertyId = sel.value;
        modalState.filters[idx].operator = '';
        modalState.filters[idx].value = '';
        renderFiltersSection(modal, modalState, allColumns, base);
      });
    });

    container.querySelectorAll('.vc-filter-op').forEach(sel => {
      sel.addEventListener('change', () => {
        const idx = parseInt(sel.dataset.idx);
        modalState.filters[idx].operator = sel.value;
        modalState.filters[idx].value = '';
        renderFiltersSection(modal, modalState, allColumns, base);
      });
    });

    container.querySelectorAll('.vc-filter-value').forEach(el => {
      el.addEventListener('change', () => {
        const idx = parseInt(el.dataset.idx);
        modalState.filters[idx].value = el.value;
      });
      el.addEventListener('input', () => {
        const idx = parseInt(el.dataset.idx);
        modalState.filters[idx].value = el.value;
      });
    });

    container.querySelectorAll('.vc-filter-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        modalState.filters.splice(idx, 1);
        renderFiltersSection(modal, modalState, allColumns, base);
      });
    });
  }

  function renderSortsSection(modal, modalState, allColumns) {
    const container = modal.querySelector('#vc-sorts-list');
    if (!container) return;

    if (modalState.sorts.length === 0) {
      container.innerHTML = '<p style="font-size:0.78rem;color:var(--text-secondary,#999);margin:0">No sorts. Click "+ Add Sort" to add one.</p>';
      return;
    }

    container.innerHTML = modalState.sorts.map((sort, idx) => `
      <div class="view-config-rule" data-sort-idx="${idx}">
        <select class="vc-sort-field" data-idx="${idx}">
          <option value="">Field...</option>
          ${allColumns.map(c => `<option value="${c.id}" ${sort.field_id === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
        </select>
        <select class="vc-sort-dir" data-idx="${idx}">
          <option value="asc" ${sort.direction === 'asc' ? 'selected' : ''}>Ascending ↑</option>
          <option value="desc" ${sort.direction === 'desc' ? 'selected' : ''}>Descending ↓</option>
        </select>
        <button class="view-config-rule-remove vc-sort-remove" data-idx="${idx}">×</button>
      </div>
    `).join('');

    container.querySelectorAll('.vc-sort-field').forEach(sel => {
      sel.addEventListener('change', () => {
        const idx = parseInt(sel.dataset.idx);
        modalState.sorts[idx].field_id = sel.value;
      });
    });

    container.querySelectorAll('.vc-sort-dir').forEach(sel => {
      sel.addEventListener('change', () => {
        const idx = parseInt(sel.dataset.idx);
        modalState.sorts[idx].direction = sel.value;
      });
    });

    container.querySelectorAll('.vc-sort-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        modalState.sorts.splice(idx, 1);
        renderSortsSection(modal, modalState, allColumns);
      });
    });
  }

  function renderColumnsSection(modal, modalState, allColumns) {
    const container = modal.querySelector('#vc-columns-list');
    if (!container) return;

    // Use columnOrder to determine display order, fallback to allColumns order
    const orderedCols = modalState.columnOrder
      ? modalState.columnOrder
          .map(id => allColumns.find(c => c.id === id))
          .filter(Boolean)
          // Add any columns not in the order
          .concat(allColumns.filter(c => !modalState.columnOrder.includes(c.id)))
      : [...allColumns];

    container.innerHTML = orderedCols.map((col, idx) => {
      const isVisible = modalState.visibleColumns === null || modalState.visibleColumns.includes(col.id);
      return `
        <div class="view-config-column-row" data-col-id="${col.id}">
          <input type="checkbox" class="vc-col-visible" data-col-id="${col.id}" ${isVisible ? 'checked' : ''} />
          <span class="column-label">${escapeHtml(col.name)}</span>
          <span class="column-move-btns">
            <button class="column-move-btn vc-col-up" data-idx="${idx}" ${idx === 0 ? 'disabled' : ''}>↑</button>
            <button class="column-move-btn vc-col-down" data-idx="${idx}" ${idx === orderedCols.length - 1 ? 'disabled' : ''}>↓</button>
          </span>
        </div>
      `;
    }).join('');

    // Visibility toggles
    container.querySelectorAll('.vc-col-visible').forEach(cb => {
      cb.addEventListener('change', () => {
        const checked = Array.from(container.querySelectorAll('.vc-col-visible:checked')).map(c => c.dataset.colId);
        modalState.visibleColumns = checked.length === allColumns.length ? null : checked;
      });
    });

    // Move up/down
    container.querySelectorAll('.vc-col-up').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        if (idx <= 0) return;
        const order = orderedCols.map(c => c.id);
        [order[idx - 1], order[idx]] = [order[idx], order[idx - 1]];
        modalState.columnOrder = order;
        renderColumnsSection(modal, modalState, allColumns);
      });
    });

    container.querySelectorAll('.vc-col-down').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        if (idx >= orderedCols.length - 1) return;
        const order = orderedCols.map(c => c.id);
        [order[idx], order[idx + 1]] = [order[idx + 1], order[idx]];
        modalState.columnOrder = order;
        renderColumnsSection(modal, modalState, allColumns);
      });
    });
  }

  /**
   * Auto-apply default view when opening a base
   */
  function applyDefaultView() {
    const views = basesState.views || [];
    const defaultView = views.find(v => v.is_default);
    if (defaultView) {
      applyView(defaultView.id);
      return true;
    }
    return false;
  }

  // Public API
  return {
    renderViewsTabs,
    attachAddViewListener,
    showFullViewConfigModal,
    applyDefaultView
  };

})();
