/* ===================================================================
   photoLightbox.js — Fullscreen photo viewer with swipe navigation
   Exports: window.photoLightbox
   =================================================================== */

const photoLightbox = {
    _overlay: null,
    _photos: [],
    _currentIndex: 0,
    _touchStartX: 0,
    _touchStartY: 0,
    _touchMoved: false,

    /**
     * Open the lightbox
     * @param {Array<string>} photoUrls - array of full-size image URLs
     * @param {number} startIndex - which photo to show first
     */
    open(photoUrls, startIndex = 0) {
        this._photos = photoUrls;
        this._currentIndex = startIndex;
        this._ensureOverlay();
        this._render();
        this._overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    },

    close() {
        if (this._overlay) {
            this._overlay.style.display = 'none';
        }
        document.body.style.overflow = '';
    },

    next() {
        if (this._currentIndex < this._photos.length - 1) {
            this._currentIndex++;
            this._render();
        }
    },

    prev() {
        if (this._currentIndex > 0) {
            this._currentIndex--;
            this._render();
        }
    },

    _ensureOverlay() {
        if (this._overlay) return;

        const overlay = document.createElement('div');
        overlay.className = 'photo-lightbox-overlay';
        overlay.innerHTML = '<div class="photo-lightbox-content"></div>';

        // Close on backdrop tap
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay || e.target.classList.contains('photo-lightbox-content')) {
                this.close();
            }
        });

        // Touch events for swipe
        overlay.addEventListener('touchstart', (e) => {
            this._touchStartX = e.touches[0].clientX;
            this._touchStartY = e.touches[0].clientY;
            this._touchMoved = false;
        }, { passive: true });

        overlay.addEventListener('touchmove', (e) => {
            this._touchMoved = true;
        }, { passive: true });

        overlay.addEventListener('touchend', (e) => {
            if (!this._touchMoved) return;
            const deltaX = e.changedTouches[0].clientX - this._touchStartX;
            const deltaY = e.changedTouches[0].clientY - this._touchStartY;

            // Only swipe if horizontal movement > vertical and > 50px
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                if (deltaX < 0) this.next();
                else this.prev();
            }
        }, { passive: true });

        // Keyboard navigation
        this._keyHandler = (e) => {
            if (this._overlay.style.display !== 'flex') return;
            if (e.key === 'Escape') this.close();
            if (e.key === 'ArrowRight') this.next();
            if (e.key === 'ArrowLeft') this.prev();
        };
        document.addEventListener('keydown', this._keyHandler);

        document.body.appendChild(overlay);
        this._overlay = overlay;
    },

    _render() {
        const content = this._overlay.querySelector('.photo-lightbox-content');
        const url = this._photos[this._currentIndex];
        const count = this._photos.length;
        const idx = this._currentIndex;

        content.innerHTML = `
            <button class="photo-lightbox-close" onclick="photoLightbox.close()">&times;</button>
            ${count > 1 && idx > 0 ? '<button class="photo-lightbox-nav photo-lightbox-prev" onclick="event.stopPropagation(); photoLightbox.prev()">‹</button>' : ''}
            <img class="photo-lightbox-img" src="${url}" alt="Photo ${idx + 1} of ${count}" onclick="event.stopPropagation()">
            ${count > 1 && idx < count - 1 ? '<button class="photo-lightbox-nav photo-lightbox-next" onclick="event.stopPropagation(); photoLightbox.next()">›</button>' : ''}
            ${count > 1 ? `<div class="photo-lightbox-counter">${idx + 1} / ${count}</div>` : ''}
        `;
    }
};

window.photoLightbox = photoLightbox;
