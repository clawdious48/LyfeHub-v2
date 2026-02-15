(function() {
  'use strict';

  var cache = {};
  var CACHE_TTL = 60000;

  function isCacheValid(key) {
    return cache[key] && (Date.now() - cache[key].time < CACHE_TTL);
  }

  function setCache(key, data) {
    cache[key] = { data: data, time: Date.now() };
  }

  function dismissSheet() {
    setTimeout(function() { window.contextSheet.hide(); }, 150);
  }

  function pillsHTML(id, items, activeValue) {
    var html = '<div class="sheet-pills" id="' + id + '">';
    items.forEach(function(item) {
      var active = item.value === activeValue ? ' active' : '';
      html += '<button class="sheet-pill' + active + '" data-value="' + item.value + '">' + item.label + '</button>';
    });
    html += '</div>';
    return html;
  }

  function activatePill(container, btn) {
    container.querySelectorAll('.sheet-pill').forEach(function(p) { p.classList.remove('active'); });
    btn.classList.add('active');
  }

  // ── Tasks ──
  function populateTasks(section) {
    // Detect current active view
    var activeViewBtn = document.querySelector('.tasks-view-toggle .view-btn.active');
    var activeView = activeViewBtn ? activeViewBtn.dataset.view : 'my-day';
    var activeSort = document.querySelector('.sort-btn.active');
    var activeSortVal = activeSort ? activeSort.dataset.sort : 'due';
    var activeDisplay = document.querySelector('.tasks-display-btn.active');
    var activeDisplayVal = activeDisplay ? activeDisplay.dataset.display : 'list';

    var html = '<div class="sheet-label">Views</div>';
    html += pillsHTML('sheet-tasks-views', [
      { value: 'my-day', label: 'My Day' },
      { value: 'important', label: 'Important' },
      { value: 'scheduled', label: 'Scheduled' },
      { value: 'recurring', label: 'Recurring' },
      { value: 'all', label: 'All Tasks' }
    ], activeView);

    html += '<div class="sheet-divider"></div>';
    html += '<div class="sheet-label">Lists</div>';
    html += '<div id="sheet-tasks-lists"><div class="sheet-label" style="opacity:0.5">Loading...</div></div>';

    html += '<div class="sheet-divider"></div>';
    html += '<div class="sheet-label">Sort</div>';
    html += pillsHTML('sheet-tasks-sort', [
      { value: 'due', label: 'Due' },
      { value: 'created', label: 'Created' },
      { value: 'custom', label: 'Custom' }
    ], activeSortVal);

    html += '<div class="sheet-label">View</div>';
    html += pillsHTML('sheet-tasks-view-mode', [
      { value: 'list', label: 'List' },
      { value: 'cards', label: 'Cards' }
    ], activeDisplayVal);

    section.innerHTML = html;

    // Wire view pills
    section.querySelector('#sheet-tasks-views').addEventListener('click', function(e) {
      var btn = e.target.closest('.sheet-pill');
      if (!btn) return;
      activatePill(this, btn);
      var target = document.querySelector('.tasks-view-toggle .view-btn[data-view="' + btn.dataset.value + '"]');
      if (target) target.click();
      dismissSheet();
    });

    // Wire sort pills
    section.querySelector('#sheet-tasks-sort').addEventListener('click', function(e) {
      var btn = e.target.closest('.sheet-pill');
      if (!btn) return;
      activatePill(this, btn);
      var target = document.querySelector('.sort-btn[data-sort="' + btn.dataset.value + '"]');
      if (target) target.click();
      dismissSheet();
    });

    // Wire display pills
    section.querySelector('#sheet-tasks-view-mode').addEventListener('click', function(e) {
      var btn = e.target.closest('.sheet-pill');
      if (!btn) return;
      activatePill(this, btn);
      var target = document.querySelector('.tasks-display-btn[data-display="' + btn.dataset.value + '"]');
      if (target) target.click();
      dismissSheet();
    });

    // Fetch lists
    loadTaskLists(section);
  }

  function loadTaskLists(section) {
    if (isCacheValid('task-lists')) {
      renderTaskLists(section, cache['task-lists'].data);
      return;
    }
    fetch('/api/task-lists', { credentials: 'include' })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var lists = data.lists || data || [];
        setCache('task-lists', lists);
        renderTaskLists(section, lists);
      })
      .catch(function() {
        var el = section.querySelector('#sheet-tasks-lists');
        if (el) el.innerHTML = '<div class="sheet-label" style="opacity:0.5">Couldn\'t load lists</div>';
      });
  }

  function renderTaskLists(section, lists) {
    var el = section.querySelector('#sheet-tasks-lists');
    if (!el) return;
    if (!lists.length) {
      el.innerHTML = '<div class="sheet-label" style="opacity:0.5">No lists</div>';
      return;
    }
    var html = '';
    lists.forEach(function(list) {
      var count = list.task_count != null ? list.task_count : (list.count != null ? list.count : '');
      html += '<div class="sheet-list-item" data-list-id="' + list.id + '">';
      html += '<span class="sheet-list-item-icon">' + (list.icon || '📋') + '</span>';
      html += '<span class="sheet-list-item-text">' + escapeHtml(list.name) + '</span>';
      if (count !== '') html += '<span class="sheet-list-item-badge">' + count + '</span>';
      html += '</div>';
    });
    el.innerHTML = html;
    el.addEventListener('click', function(e) {
      var item = e.target.closest('.sheet-list-item');
      if (!item) return;
      var listId = item.dataset.listId;
      // Try clicking the list in the My Lists menu
      var target = document.querySelector('#my-lists-items .my-lists-item[data-list-id="' + listId + '"]');
      if (target) target.click();
      else document.dispatchEvent(new CustomEvent('tasks:select-list', { detail: { listId: listId } }));
      dismissSheet();
    });
  }

  // ── Calendar ──
  function populateCalendar(section) {
    var activeViewBtn = document.querySelector('.calendar-view-btn.active');
    var activeView = activeViewBtn ? activeViewBtn.dataset.view : 'month';

    var html = '<div class="sheet-label">View</div>';
    html += pillsHTML('sheet-cal-views', [
      { value: 'month', label: 'Month' },
      { value: 'week', label: 'Week' },
      { value: '3day', label: '3-Day' },
      { value: 'day', label: 'Day' }
    ], activeView);

    html += '<div class="sheet-divider"></div>';
    html += '<div class="sheet-label">Tasks</div>';
    html += '<div id="sheet-cal-tasks"><div class="sheet-label" style="opacity:0.5">Loading...</div></div>';

    section.innerHTML = html;

    section.querySelector('#sheet-cal-views').addEventListener('click', function(e) {
      var btn = e.target.closest('.sheet-pill');
      if (!btn) return;
      activatePill(this, btn);
      var target = document.querySelector('.calendar-view-btn[data-view="' + btn.dataset.value + '"]');
      if (target) target.click();
      dismissSheet();
    });

    loadCalendarTasks(section);
  }

  function loadCalendarTasks(section) {
    if (isCacheValid('cal-tasks')) {
      renderCalendarTasks(section, cache['cal-tasks'].data);
      return;
    }
    fetch('/api/task-items?view=scheduled', { credentials: 'include' })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var tasks = data.items || data.tasks || data || [];
        setCache('cal-tasks', tasks);
        renderCalendarTasks(section, tasks);
      })
      .catch(function() {
        var el = section.querySelector('#sheet-cal-tasks');
        if (el) el.innerHTML = '<div class="sheet-label" style="opacity:0.5">Couldn\'t load tasks</div>';
      });
  }

  function renderCalendarTasks(section, tasks) {
    var el = section.querySelector('#sheet-cal-tasks');
    if (!el) return;
    if (!tasks.length) {
      el.innerHTML = '<div class="sheet-label" style="opacity:0.5">No scheduled tasks</div>';
      return;
    }
    var html = '';
    var scheduled = tasks.filter(function(t) { return t.due_date; });
    var unscheduled = tasks.filter(function(t) { return !t.due_date; });

    if (scheduled.length) {
      html += '<div class="sheet-label" style="font-size:11px;margin-top:4px">Scheduled</div>';
      scheduled.slice(0, 8).forEach(function(t) {
        html += '<div class="sheet-list-item"><span class="sheet-list-item-text">' + escapeHtml(t.title || t.name || '') + '</span>';
        if (t.due_date) html += '<span class="sheet-list-item-badge">' + formatShortDate(t.due_date) + '</span>';
        html += '</div>';
      });
    }
    if (unscheduled.length) {
      html += '<div class="sheet-label" style="font-size:11px;margin-top:8px">Unscheduled</div>';
      unscheduled.slice(0, 5).forEach(function(t) {
        html += '<div class="sheet-list-item"><span class="sheet-list-item-text">' + escapeHtml(t.title || t.name || '') + '</span></div>';
      });
    }
    el.innerHTML = html;
  }

  // ── People ──
  function populatePeople(section) {
    var html = '<div class="sheet-label">Filter</div>';
    html += pillsHTML('sheet-people-filters', [
      { value: 'all', label: 'All' },
      { value: 'clients', label: 'Clients' },
      { value: 'adjusters', label: 'Adjusters' },
      { value: 'contractors', label: 'Contractors' },
      { value: 'team', label: 'Team' }
    ], 'all');

    html += '<div class="sheet-divider"></div>';
    html += '<div class="sheet-label">Sort</div>';
    html += pillsHTML('sheet-people-sort', [
      { value: 'az', label: 'A-Z' },
      { value: 'recent', label: 'Recent' },
      { value: 'company', label: 'Company' }
    ], 'az');

    section.innerHTML = html;

    section.querySelector('#sheet-people-filters').addEventListener('click', function(e) {
      var btn = e.target.closest('.sheet-pill');
      if (!btn) return;
      activatePill(this, btn);
      document.dispatchEvent(new CustomEvent('people:filter', { detail: { filter: btn.dataset.value } }));
      dismissSheet();
    });

    section.querySelector('#sheet-people-sort').addEventListener('click', function(e) {
      var btn = e.target.closest('.sheet-pill');
      if (!btn) return;
      activatePill(this, btn);
      document.dispatchEvent(new CustomEvent('people:sort', { detail: { sort: btn.dataset.value } }));
      dismissSheet();
    });
  }

  // ── Bases ──
  function populateBases(section) {
    var html = '<div class="sheet-action-btn" id="sheet-new-base">+ Create Base</div>';
    html += '<div class="sheet-divider"></div>';
    html += '<div class="sheet-label">Core Bases</div>';
    html += '<div id="sheet-bases-core"><div class="sheet-label" style="opacity:0.5">Loading...</div></div>';
    html += '<div class="sheet-divider"></div>';
    html += '<div class="sheet-label">My Bases</div>';
    html += '<div id="sheet-bases-user"><div class="sheet-label" style="opacity:0.5">Loading...</div></div>';

    section.innerHTML = html;

    section.querySelector('#sheet-new-base').addEventListener('click', function() {
      var addBtn = document.querySelector('#create-base-btn, .create-base-btn, [data-action="create-base"]');
      if (addBtn) addBtn.click();
      else document.dispatchEvent(new CustomEvent('bases:create'));
      dismissSheet();
    });

    loadBases(section);
  }

  function loadBases(section) {
    var loadCore = isCacheValid('bases-core')
      ? Promise.resolve(cache['bases-core'].data)
      : fetch('/api/bases/core/list', { credentials: 'include' }).then(function(r) { return r.json(); }).then(function(d) {
          var list = d.bases || d || [];
          setCache('bases-core', list);
          return list;
        });

    var loadUser = isCacheValid('bases-user')
      ? Promise.resolve(cache['bases-user'].data)
      : fetch('/api/bases/list', { credentials: 'include' }).then(function(r) { return r.json(); }).then(function(d) {
          var list = d.bases || d || [];
          setCache('bases-user', list);
          return list;
        });

    loadCore.then(function(bases) { renderBaseList(section.querySelector('#sheet-bases-core'), bases); })
      .catch(function() {
        var el = section.querySelector('#sheet-bases-core');
        if (el) el.innerHTML = '<div class="sheet-label" style="opacity:0.5">Couldn\'t load</div>';
      });

    loadUser.then(function(bases) { renderBaseList(section.querySelector('#sheet-bases-user'), bases); })
      .catch(function() {
        var el = section.querySelector('#sheet-bases-user');
        if (el) el.innerHTML = '<div class="sheet-label" style="opacity:0.5">Couldn\'t load</div>';
      });
  }

  function renderBaseList(el, bases) {
    if (!el) return;
    if (!bases.length) {
      el.innerHTML = '<div class="sheet-label" style="opacity:0.5">None</div>';
      return;
    }
    var html = '';
    bases.forEach(function(base) {
      var count = base.record_count != null ? base.record_count : '';
      var coreAttr = base.is_core ? ' data-core-base="true"' : '';
      html += '<div class="sheet-list-item" data-base-id="' + base.id + '"' + coreAttr + '>';
      html += '<span class="sheet-list-item-icon">' + (base.icon || '📊') + '</span>';
      html += '<span class="sheet-list-item-text">' + escapeHtml(base.name) + '</span>';
      if (count !== '') html += '<span class="sheet-list-item-badge">' + count + '</span>';
      html += '</div>';
    });
    el.innerHTML = html;
    el.addEventListener('click', function(e) {
      var item = e.target.closest('.sheet-list-item');
      if (!item) return;
      var baseId = item.dataset.baseId;
      var isCore = item.dataset.coreBase === 'true';
      if (isCore && typeof window.openCoreBase === 'function') {
        window.openCoreBase(baseId);
      } else if (typeof window.openBase === 'function') {
        window.openBase(baseId);
      } else {
        document.dispatchEvent(new CustomEvent('bases:open', { detail: { baseId: baseId } }));
      }
      dismissSheet();
    });
  }

  // ── Apex ──
  function populateApex(section) {
    // Read current filter values from the actual selects
    var statusSelect = document.querySelector('#apex-filter-status');
    var lossSelect = document.querySelector('#apex-filter-loss');
    var ownerSelect = document.querySelector('#apex-filter-owner');

    var currentStatus = statusSelect ? statusSelect.value : 'all';

    var html = '<div class="sheet-label">Status</div>';
    html += pillsHTML('sheet-apex-status', [
      { value: 'all', label: 'All' },
      { value: 'active', label: 'Active' },
      { value: 'pending_insurance', label: 'Pending Insurance' },
      { value: 'complete', label: 'Complete' }
    ], currentStatus);

    html += '<div class="sheet-divider"></div>';
    html += '<div class="sheet-label">Loss Type</div>';
    html += '<select class="sheet-select" id="sheet-apex-loss-type"><option value="">All Loss Types</option></select>';

    html += '<div class="sheet-label" style="margin-top:12px">Owner</div>';
    html += '<select class="sheet-select" id="sheet-apex-owner"><option value="">All Owners</option></select>';

    html += '<div class="sheet-divider"></div>';
    html += '<div style="display:flex;gap:8px">';
    html += '<button class="sheet-pill" id="sheet-apex-clear">Clear</button>';
    html += '<button class="sheet-pill active" id="sheet-apex-apply" style="flex:1">Apply</button>';
    html += '</div>';

    section.innerHTML = html;

    // Copy options from existing selects
    if (lossSelect) {
      var sheetLoss = section.querySelector('#sheet-apex-loss-type');
      Array.from(lossSelect.options).forEach(function(opt, i) {
        if (i === 0) return; // skip first "All" option already added
        var newOpt = document.createElement('option');
        newOpt.value = opt.value;
        newOpt.textContent = opt.textContent;
        if (opt.selected) newOpt.selected = true;
        sheetLoss.appendChild(newOpt);
      });
      // Set current value
      if (lossSelect.value && lossSelect.value !== 'all') {
        sheetLoss.value = lossSelect.value;
      }
    }

    if (ownerSelect) {
      var sheetOwner = section.querySelector('#sheet-apex-owner');
      Array.from(ownerSelect.options).forEach(function(opt, i) {
        if (i === 0) return;
        var newOpt = document.createElement('option');
        newOpt.value = opt.value;
        newOpt.textContent = opt.textContent;
        if (opt.selected) newOpt.selected = true;
        sheetOwner.appendChild(newOpt);
      });
      if (ownerSelect.value && ownerSelect.value !== 'all') {
        sheetOwner.value = ownerSelect.value;
      }
    }

    // Wire status pills
    section.querySelector('#sheet-apex-status').addEventListener('click', function(e) {
      var btn = e.target.closest('.sheet-pill');
      if (!btn) return;
      activatePill(this, btn);
    });

    // Wire Apply
    section.querySelector('#sheet-apex-apply').addEventListener('click', function() {
      var statusPill = section.querySelector('#sheet-apex-status .sheet-pill.active');
      var statusVal = statusPill ? statusPill.dataset.value : 'all';
      var lossVal = section.querySelector('#sheet-apex-loss-type').value || 'all';
      var ownerVal = section.querySelector('#sheet-apex-owner').value || 'all';

      if (statusSelect) { statusSelect.value = statusVal; statusSelect.dispatchEvent(new Event('change')); }
      if (lossSelect) { lossSelect.value = lossVal || 'all'; lossSelect.dispatchEvent(new Event('change')); }
      if (ownerSelect) { ownerSelect.value = ownerVal || 'all'; ownerSelect.dispatchEvent(new Event('change')); }

      dismissSheet();
    });

    // Wire Clear
    section.querySelector('#sheet-apex-clear').addEventListener('click', function() {
      // Reset pills
      var pills = section.querySelector('#sheet-apex-status');
      pills.querySelectorAll('.sheet-pill').forEach(function(p) { p.classList.remove('active'); });
      pills.querySelector('[data-value="all"]').classList.add('active');
      section.querySelector('#sheet-apex-loss-type').value = '';
      section.querySelector('#sheet-apex-owner').value = '';
    });
  }

  // ── Helpers ──
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function formatShortDate(dateStr) {
    try {
      var d = new Date(dateStr);
      var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return months[d.getMonth()] + ' ' + d.getDate();
    } catch(e) { return dateStr; }
  }

  // ── Main listener ──
  var populators = {
    tasks: populateTasks,
    calendar: populateCalendar,
    people: populatePeople,
    bases: populateBases,
    apex: populateApex
  };

  document.addEventListener('context-sheet:opened', function(e) {
    var sectionName = e.detail && e.detail.section;
    if (!sectionName) return;
    var section = document.querySelector('.sheet-section[data-section="' + sectionName + '"]');
    if (!section) return;
    var populator = populators[sectionName];
    if (populator) populator(section);
  });

})();
