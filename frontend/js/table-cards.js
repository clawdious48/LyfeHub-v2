/**
 * Table-to-Card Transformation for Apex Jobs
 * ===========================================
 * Transforms the Apex Jobs list table into mobile-friendly cards on small screens.
 * Uses MobileUtils.onBreakpointChange() for dynamic switching.
 * 
 * Breakpoints (aligned with responsive.css):
 *   Mobile:  ≤640px  → Card view (stacked)
 *   Tablet:  641-1024px → Table with scroll OR 2-col card grid
 *   Desktop: >1024px → Standard table
 */

(function(global) {
    'use strict';

    // Custom mobile breakpoint for this feature (narrower than MobileUtils default)
    const MOBILE_CARD_BREAKPOINT = 640;
    const TABLET_BREAKPOINT = 1024;

    // State
    let mobileCardsContainer = null;
    let isCardViewActive = false;
    let mediaQueryMobile = null;
    let boundHandlers = {};

    /**
     * Initialize the table-to-card transformation system
     */
    function init() {
        // Create mobile cards container if it doesn't exist
        ensureMobileCardsContainer();

        // Set up media query listener for our custom breakpoint
        mediaQueryMobile = window.matchMedia(`(max-width: ${MOBILE_CARD_BREAKPOINT}px)`);
        
        // Initial check
        handleBreakpointChange(mediaQueryMobile);

        // Listen for changes
        if (mediaQueryMobile.addEventListener) {
            mediaQueryMobile.addEventListener('change', handleBreakpointChange);
        } else if (mediaQueryMobile.addListener) {
            mediaQueryMobile.addListener(handleBreakpointChange);
        }

        // Also use MobileUtils for additional responsive behavior
        if (global.MobileUtils && typeof global.MobileUtils.onBreakpointChange === 'function') {
            global.MobileUtils.onBreakpointChange(handleMobileUtilsBreakpoint);
        }

        // Hook into apexJobs render cycle
        hookIntoApexJobsRender();

        console.log('[TableCards] Initialized | Mobile breakpoint:', MOBILE_CARD_BREAKPOINT + 'px');
    }

    /**
     * Ensure the mobile cards container exists in the DOM
     */
    function ensureMobileCardsContainer() {
        const listView = document.querySelector('.apex-view-container[data-view="list"] .apex-list-view');
        if (!listView) return;

        // Check if container already exists
        mobileCardsContainer = listView.querySelector('.apex-mobile-cards');
        if (mobileCardsContainer) return;

        // Create the mobile cards container
        mobileCardsContainer = document.createElement('div');
        mobileCardsContainer.className = 'apex-mobile-cards';
        mobileCardsContainer.setAttribute('role', 'list');
        mobileCardsContainer.setAttribute('aria-label', 'Jobs list');

        // Insert after the table
        const table = listView.querySelector('.apex-task-table');
        if (table) {
            table.parentNode.insertBefore(mobileCardsContainer, table.nextSibling);
        } else {
            listView.appendChild(mobileCardsContainer);
        }
    }

    /**
     * Handle breakpoint changes from our custom media query
     */
    function handleBreakpointChange(e) {
        const isMobile = e.matches;
        
        if (isMobile && !isCardViewActive) {
            activateCardView();
        } else if (!isMobile && isCardViewActive) {
            deactivateCardView();
        }
    }

    /**
     * Handle breakpoint changes from MobileUtils (for tablet behavior)
     */
    function handleMobileUtilsBreakpoint(newBreakpoint, oldBreakpoint) {
        // Add tablet-specific classes for scroll affordance
        const listView = document.querySelector('.apex-view-container[data-view="list"] .apex-list-view');
        if (!listView) return;

        if (newBreakpoint === 'tablet') {
            listView.classList.add('tablet-mode');
            setupTabletScrollIndicator(listView);
        } else {
            listView.classList.remove('tablet-mode');
            cleanupTabletScrollIndicator(listView);
        }
    }

    /**
     * Activate card view for mobile
     */
    function activateCardView() {
        isCardViewActive = true;
        ensureMobileCardsContainer();
        
        if (mobileCardsContainer) {
            mobileCardsContainer.style.display = 'flex';
        }

        // Render cards from current apexJobs data
        renderMobileCards();

        console.log('[TableCards] Card view activated');
    }

    /**
     * Deactivate card view (show table)
     */
    function deactivateCardView() {
        isCardViewActive = false;
        
        if (mobileCardsContainer) {
            mobileCardsContainer.style.display = 'none';
        }

        console.log('[TableCards] Card view deactivated, showing table');
    }

    /**
     * Hook into apexJobs.renderList to also render cards
     */
    function hookIntoApexJobsRender() {
        // Wait for apexJobs to be available
        const checkApexJobs = setInterval(function() {
            if (global.apexJobs && typeof global.apexJobs.renderList === 'function') {
                clearInterval(checkApexJobs);
                
                // Store original renderList
                const originalRenderList = global.apexJobs.renderList.bind(global.apexJobs);
                
                // Override renderList to also render cards
                global.apexJobs.renderList = function() {
                    // Call original
                    originalRenderList();
                    
                    // Also render mobile cards if on mobile
                    if (isCardViewActive || window.innerWidth <= MOBILE_CARD_BREAKPOINT) {
                        renderMobileCards();
                    }
                };

                // Initial render if already on mobile
                if (window.innerWidth <= MOBILE_CARD_BREAKPOINT) {
                    activateCardView();
                }

                console.log('[TableCards] Hooked into apexJobs.renderList');
            }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(function() {
            clearInterval(checkApexJobs);
        }, 10000);
    }

    /**
     * Render mobile cards from apexJobs data
     */
    function renderMobileCards() {
        if (!mobileCardsContainer) {
            ensureMobileCardsContainer();
            if (!mobileCardsContainer) return;
        }

        // Get jobs from apexJobs module
        if (!global.apexJobs || !Array.isArray(global.apexJobs.jobs)) {
            mobileCardsContainer.innerHTML = renderEmptyState();
            return;
        }

        const jobs = global.apexJobs.getFilteredJobs ? 
            global.apexJobs.getFilteredJobs() : 
            global.apexJobs.jobs;

        if (jobs.length === 0) {
            mobileCardsContainer.innerHTML = renderEmptyState();
            return;
        }

        // Apply same sorting as list view
        const sorted = applySorting(jobs);

        // Render cards
        mobileCardsContainer.innerHTML = sorted.map(job => renderJobCard(job)).join('');

        // Bind card events
        bindCardEvents();
    }

    /**
     * Apply the same sorting logic as apexJobs.renderList
     */
    function applySorting(jobs) {
        if (!global.apexJobs || !global.apexJobs.sort) {
            return jobs;
        }

        const sortConfig = global.apexJobs.sort;
        
        return [...jobs].sort((a, b) => {
            let valA, valB;
            
            switch(sortConfig.field) {
                case 'name':
                    valA = (a.name || '').toLowerCase();
                    valB = (b.name || '').toLowerCase();
                    break;
                case 'client':
                    valA = (a.client?.name || a.clientName || '').toLowerCase();
                    valB = (b.client?.name || b.clientName || '').toLowerCase();
                    break;
                case 'lossType':
                    valA = (a.lossType || '').toLowerCase();
                    valB = (b.lossType || '').toLowerCase();
                    break;
                case 'owner':
                    valA = (a.owner?.name || '').toLowerCase();
                    valB = (b.owner?.name || '').toLowerCase();
                    break;
                case 'status':
                    valA = a.status || '';
                    valB = b.status || '';
                    break;
                case 'progress':
                    const totalA = a.taskSummary?.total || a.tasks?.length || 0;
                    const completeA = a.taskSummary?.completed || 0;
                    valA = totalA > 0 ? completeA / totalA : 0;
                    const totalB = b.taskSummary?.total || b.tasks?.length || 0;
                    const completeB = b.taskSummary?.completed || 0;
                    valB = totalB > 0 ? completeB / totalB : 0;
                    break;
                default:
                    valA = (a.name || '').toLowerCase();
                    valB = (b.name || '').toLowerCase();
            }
            
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    /**
     * Render a single job card
     */
    function renderJobCard(job) {
        const status = job.status || 'active';
        const statusLabel = formatStatus(status);
        const clientName = job.client?.name || job.clientName || 'No client';
        const address = formatAddress(job);
        const lossType = job.lossType || 'Unknown';
        const lossTypeClass = lossType.toLowerCase().replace(/\s+/g, '-');
        const owner = job.owner?.name || '';
        
        // Task progress
        const taskTotal = job.taskSummary?.total || job.tasks?.length || 0;
        const taskComplete = job.taskSummary?.completed || job.tasks?.filter(t => t.completed).length || 0;
        const progress = taskTotal > 0 ? Math.round((taskComplete / taskTotal) * 100) : 0;

        // Phase badges
        const phaseBadges = (job.phases || []).map(p =>
            `<span class="apex-phase-badge phase-${p.job_type_code.toLowerCase()}">${escapeHtml(p.job_type_code)}</span>`
        ).join('');

        return `
            <div class="apex-job-mobile-card status-${status}" 
                 data-id="${job.id}" 
                 role="listitem"
                 tabindex="0"
                 aria-label="${escapeHtml(job.name || 'Unnamed Job')}">
                
                <!-- Card Header: Job Name + Status -->
                <div class="apex-card-header">
                    <span class="apex-card-job-name">${escapeHtml(job.name || 'Unnamed Job')}</span>
                    <span class="apex-card-status status-${status}">${statusLabel}</span>
                </div>

                <!-- Card Body: Key Fields -->
                <div class="apex-card-body">
                    <!-- Client -->
                    <div class="apex-card-client">
                        <svg class="apex-card-client-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                        </svg>
                        <span class="apex-card-client-name">${escapeHtml(clientName)}</span>
                    </div>

                    <!-- Address (if present) -->
                    ${address ? `
                    <div class="apex-card-address">
                        <svg class="apex-card-address-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                        </svg>
                        <span>${escapeHtml(address)}</span>
                    </div>
                    ` : ''}

                    <!-- Loss Type Badge -->
                    <div class="apex-card-field">
                        <span class="apex-card-loss-badge loss-${lossTypeClass}">${escapeHtml(lossType)}</span>
                        ${phaseBadges ? `<div class="apex-card-phases">${phaseBadges}</div>` : ''}
                    </div>
                </div>

                <!-- Card Footer -->
                <div class="apex-card-footer">
                    <div class="apex-card-meta">
                        ${owner ? `<span class="apex-card-owner">${escapeHtml(owner)}</span>` : ''}
                        ${taskTotal > 0 ? `
                        <div class="apex-card-progress">
                            <div class="apex-card-progress-bar">
                                <div class="apex-card-progress-fill" style="width: ${progress}%"></div>
                            </div>
                            <span>${taskComplete}/${taskTotal}</span>
                        </div>
                        ` : ''}
                    </div>
                    <div class="apex-card-expand" aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"/>
                        </svg>
                    </div>
                </div>

                <!-- Expanded Content (hidden by default) -->
                <div class="apex-card-expanded-content" aria-hidden="true">
                    ${renderExpandedContent(job)}
                </div>
            </div>
        `;
    }

    /**
     * Render expanded card content with additional fields
     */
    function renderExpandedContent(job) {
        const insurance = job.ins_carrier || job.insurance?.carrier || '';
        const claimNumber = job.ins_claim || job.insurance?.claimNumber || '';
        const phone = job.client?.phone || job.client_phone || '';
        const email = job.client?.email || job.client_email || '';

        return `
            <div class="apex-card-expanded-grid">
                ${insurance ? `
                <div class="apex-card-expanded-field">
                    <span class="apex-card-expanded-label">Insurance</span>
                    <span class="apex-card-expanded-value">${escapeHtml(insurance)}</span>
                </div>
                ` : ''}
                
                ${claimNumber ? `
                <div class="apex-card-expanded-field">
                    <span class="apex-card-expanded-label">Claim #</span>
                    <span class="apex-card-expanded-value">${escapeHtml(claimNumber)}</span>
                </div>
                ` : ''}
                
                ${phone ? `
                <div class="apex-card-expanded-field">
                    <span class="apex-card-expanded-label">Phone</span>
                    <a href="tel:${escapeHtml(phone)}" class="apex-card-expanded-value" style="color: var(--neon-cyan);">
                        ${formatPhone(phone)}
                    </a>
                </div>
                ` : ''}
                
                ${email ? `
                <div class="apex-card-expanded-field">
                    <span class="apex-card-expanded-label">Email</span>
                    <a href="mailto:${escapeHtml(email)}" class="apex-card-expanded-value" style="color: var(--neon-cyan); word-break: break-all;">
                        ${escapeHtml(email)}
                    </a>
                </div>
                ` : ''}
                
                <div class="apex-card-expanded-field full-width" style="margin-top: 0.5rem;">
                    <button class="apex-card-open-btn" data-action="open-detail" style="
                        width: 100%;
                        padding: 0.6rem;
                        background: rgba(0, 245, 212, 0.1);
                        border: 1px solid rgba(0, 245, 212, 0.3);
                        border-radius: 8px;
                        color: var(--neon-cyan);
                        font-size: 0.85rem;
                        font-weight: 500;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 0.5rem;
                    ">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                            <polyline points="15 3 21 3 21 9"/>
                            <line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                        View Full Details
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render empty state
     */
    function renderEmptyState() {
        return `
            <div class="apex-mobile-cards-empty">
                <svg class="apex-mobile-cards-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="2" y="4" width="20" height="16" rx="2" ry="2"/>
                    <path d="M2 10h20"/>
                    <path d="M6 16h4"/>
                </svg>
                <p>No jobs found</p>
            </div>
        `;
    }

    /**
     * Bind events to card elements
     */
    function bindCardEvents() {
        if (!mobileCardsContainer) return;

        const cards = mobileCardsContainer.querySelectorAll('.apex-job-mobile-card');
        
        cards.forEach(card => {
            // Remove old handlers
            const oldHandler = boundHandlers[card.dataset.id];
            if (oldHandler) {
                card.removeEventListener('click', oldHandler);
            }

            // Create new handler
            const handler = function(e) {
                handleCardInteraction(card, e);
            };
            boundHandlers[card.dataset.id] = handler;

            // Tap/click to expand
            card.addEventListener('click', handler);

            // Keyboard accessibility
            card.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardInteraction(card, e);
                }
            });
        });
    }

    /**
     * Handle card tap/click - expand or open detail
     */
    function handleCardInteraction(card, e) {
        // Check if clicking the "View Full Details" button
        const openBtn = e.target.closest('[data-action="open-detail"]');
        if (openBtn) {
            e.stopPropagation();
            openJobDetail(card.dataset.id);
            return;
        }

        // Check if clicking a link (phone/email)
        if (e.target.closest('a')) {
            return; // Let the link work normally
        }

        // Toggle expanded state
        const isExpanded = card.classList.contains('expanded');
        
        // Collapse all other cards first
        mobileCardsContainer.querySelectorAll('.apex-job-mobile-card.expanded').forEach(c => {
            if (c !== card) {
                c.classList.remove('expanded');
                c.querySelector('.apex-card-expanded-content')?.setAttribute('aria-hidden', 'true');
            }
        });

        // Toggle this card
        card.classList.toggle('expanded', !isExpanded);
        card.querySelector('.apex-card-expanded-content')?.setAttribute('aria-hidden', isExpanded ? 'true' : 'false');
    }

    /**
     * Open the job detail view
     */
    function openJobDetail(jobId) {
        if (global.apexJobs && typeof global.apexJobs.openJobDetail === 'function') {
            const job = global.apexJobs.jobs.find(j => String(j.id) === String(jobId));
            if (job) {
                global.apexJobs.openJobDetail(job);
            }
        }
    }

    /**
     * Setup horizontal scroll indicator for tablet
     */
    function setupTabletScrollIndicator(listView) {
        const table = listView.querySelector('.apex-task-table');
        if (!table) return;

        // Wrap table if not already wrapped
        let wrapper = table.parentElement;
        if (!wrapper.classList.contains('apex-task-table-wrapper')) {
            wrapper = document.createElement('div');
            wrapper.className = 'apex-task-table-wrapper';
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        }

        // Check scroll position
        const checkScroll = function() {
            const hasScrollRight = wrapper.scrollLeft < (wrapper.scrollWidth - wrapper.clientWidth - 10);
            listView.classList.toggle('has-scroll-right', hasScrollRight);
        };

        wrapper.addEventListener('scroll', checkScroll);
        checkScroll();
    }

    /**
     * Cleanup tablet scroll indicator
     */
    function cleanupTabletScrollIndicator(listView) {
        listView.classList.remove('has-scroll-right');
    }

    // ==========================================================================
    // Helper Functions
    // ==========================================================================

    function formatStatus(status) {
        const map = {
            'active': 'Active',
            'pending_insurance': 'Pending',
            'complete': 'Complete',
            'archived': 'Archived'
        };
        return map[status] || status || 'Unknown';
    }

    function formatAddress(job) {
        // Try different address field patterns
        const parts = [];
        
        if (job.client?.address) {
            return job.client.address.replace(/\r?\n/g, ', ').replace(/,\s*,/g, ',').trim();
        }
        
        if (job.prop_street) parts.push(job.prop_street);
        if (job.prop_city) parts.push(job.prop_city);
        if (job.prop_state) parts.push(job.prop_state);
        if (job.prop_zip) parts.push(job.prop_zip);
        
        if (parts.length === 0) {
            if (job.client_street) parts.push(job.client_street);
            if (job.client_city) parts.push(job.client_city);
            if (job.client_state) parts.push(job.client_state);
            if (job.client_zip) parts.push(job.client_zip);
        }
        
        return parts.join(', ').trim();
    }

    function formatPhone(phone) {
        if (!phone) return '';
        // Format as (XXX) XXX-XXXX if 10 digits
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 10) {
            return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        }
        return phone;
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ==========================================================================
    // Public API
    // ==========================================================================

    global.TableCards = {
        init: init,
        refresh: renderMobileCards,
        isCardViewActive: function() { return isCardViewActive; },
        
        // Manual override methods
        forceCardView: function() {
            activateCardView();
        },
        forceTableView: function() {
            deactivateCardView();
        }
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // Small delay to ensure apexJobs is loaded first
        setTimeout(init, 100);
    }

})(window);
