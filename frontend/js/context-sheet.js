(function() {
    'use strict';
    
    var sheet = null;
    var backdrop = null;
    var isVisible = false;
    var currentSection = null;
    var startY = 0;
    var currentY = 0;
    var sheetBody = null;
    
    function init() {
        // Create backdrop
        backdrop = document.createElement('div');
        backdrop.className = 'context-sheet-backdrop';
        backdrop.addEventListener('click', hide);
        document.body.appendChild(backdrop);
        
        // Create sheet
        sheet = document.createElement('div');
        sheet.className = 'context-sheet';
        sheet.id = 'context-sheet';
        sheet.innerHTML = 
            '<div class="context-sheet-body">' +
                '<div class="context-sheet-handle" id="sheet-handle">' +
                    '<div class="context-sheet-handle-bar"></div>' +
                '</div>' +
                '<div class="context-sheet-content" id="sheet-content">' +
                    '<div class="sheet-section" data-section="dashboard"></div>' +
                    '<div class="sheet-section" data-section="tasks"></div>' +
                    '<div class="sheet-section" data-section="calendar"></div>' +
                    '<div class="sheet-section" data-section="people"></div>' +
                    '<div class="sheet-section" data-section="bases"></div>' +
                    '<div class="sheet-section" data-section="apex"></div>' +
                '</div>' +
            '</div>';
        document.body.appendChild(sheet);
        
        sheetBody = sheet.querySelector('.context-sheet-body');
        
        // Swipe-to-dismiss on handle and body
        var handle = document.getElementById('sheet-handle');
        handle.addEventListener('touchstart', onTouchStart, { passive: true });
        handle.addEventListener('touchmove', onTouchMove, { passive: false });
        handle.addEventListener('touchend', onTouchEnd, { passive: true });
        
        // Also allow swipe on the whole sheet body
        sheetBody.addEventListener('touchstart', onBodyTouchStart, { passive: true });
        sheetBody.addEventListener('touchmove', onBodyTouchMove, { passive: false });
        sheetBody.addEventListener('touchend', onBodyTouchEnd, { passive: true });
    }
    
    // --- Touch handling for handle (always dismissable) ---
    function onTouchStart(e) {
        startY = e.touches[0].clientY;
        sheetBody.style.transition = 'none';
    }
    
    function onTouchMove(e) {
        currentY = e.touches[0].clientY;
        var dy = currentY - startY;
        if (dy > 0) { // Only allow downward drag
            e.preventDefault();
            sheetBody.style.transform = 'translateY(' + dy + 'px)';
        }
    }
    
    function onTouchEnd(e) {
        sheetBody.style.transition = '';
        sheetBody.style.transform = '';
        var dy = currentY - startY;
        if (dy > 60) {
            hide();
        }
    }
    
    // --- Touch handling for body (only dismiss if scrolled to top) ---
    var bodyStartY = 0;
    var bodyScrollTop = 0;
    
    function onBodyTouchStart(e) {
        bodyStartY = e.touches[0].clientY;
        var contentEl = document.getElementById('sheet-content');
        bodyScrollTop = contentEl ? contentEl.scrollTop : 0;
    }
    
    function onBodyTouchMove(e) {
        // Only intercept if content is scrolled to top and dragging down
        var contentEl = document.getElementById('sheet-content');
        if (contentEl && contentEl.scrollTop <= 0) {
            var dy = e.touches[0].clientY - bodyStartY;
            if (dy > 0 && bodyScrollTop <= 0) {
                e.preventDefault();
                sheetBody.style.transition = 'none';
                sheetBody.style.transform = 'translateY(' + dy + 'px)';
            }
        }
    }
    
    function onBodyTouchEnd(e) {
        sheetBody.style.transition = '';
        sheetBody.style.transform = '';
        var contentEl = document.getElementById('sheet-content');
        if (contentEl && contentEl.scrollTop <= 0) {
            var dy = e.changedTouches[0].clientY - bodyStartY;
            if (dy > 60) {
                hide();
            }
        }
    }
    
    // --- Public API ---
    function show(sectionId) {
        if (!sheet) return;
        currentSection = sectionId;
        isVisible = true;
        
        // Remove any sticky footer from previous section
        var oldFooter = sheetBody && sheetBody.querySelector('.sheet-sticky-footer');
        if (oldFooter) oldFooter.remove();
        
        // Show correct section content
        sheet.querySelectorAll('.sheet-section').forEach(function(el) {
            el.classList.toggle('active', el.getAttribute('data-section') === sectionId);
        });
        
        backdrop.classList.add('visible');
        sheet.classList.add('visible');
        document.body.classList.add('sheet-open');
        
        document.dispatchEvent(new CustomEvent('context-sheet:opened', { detail: { section: sectionId } }));
    }
    
    function hide() {
        if (!sheet) return;
        isVisible = false;
        
        // Remove any sticky footer
        var stickyFooter = sheetBody && sheetBody.querySelector('.sheet-sticky-footer');
        if (stickyFooter) stickyFooter.remove();
        
        backdrop.classList.remove('visible');
        sheet.classList.remove('visible');
        sheet.classList.remove('expanded');
        document.body.classList.remove('sheet-open');
        
        // Reset any drag transform
        if (sheetBody) {
            sheetBody.style.transition = '';
            sheetBody.style.transform = '';
        }
        
        document.dispatchEvent(new CustomEvent('context-sheet:closed', { detail: { section: currentSection } }));
        currentSection = null;
    }
    
    function toggle(sectionId) {
        if (isVisible && currentSection === sectionId) {
            hide();
        } else {
            show(sectionId);
        }
    }
    
    function getSection(sectionId) {
        if (!sheet) return null;
        return sheet.querySelector('.sheet-section[data-section="' + sectionId + '"]');
    }
    
    function isOpen() {
        return isVisible;
    }
    
    // Init on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Expose API
    window.contextSheet = {
        show: show,
        hide: hide,
        toggle: toggle,
        getSection: getSection,
        isOpen: isOpen
    };
})();
