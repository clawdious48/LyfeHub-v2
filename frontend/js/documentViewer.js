/* ===================================================================
   documentViewer.js — Fullscreen PDF viewer with download capability
   Exports: window.documentViewer
   =================================================================== */

const documentViewer = {
    _overlay: null,
    _currentDoc: null,

    /**
     * Open the document viewer
     * @param {string} docId - Document ID
     * @param {string} docName - Document name for display
     */
    open(docId, docName) {
        this._currentDoc = { id: docId, name: docName };
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

    download() {
        if (!this._currentDoc) return;
        const link = document.createElement('a');
        link.href = `/api/documents/${this._currentDoc.id}/download`;
        link.download = this._currentDoc.name;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    _ensureOverlay() {
        if (this._overlay) return;

        const overlay = document.createElement('div');
        overlay.className = 'document-viewer-overlay';
        overlay.innerHTML = '<div class="document-viewer-content"></div>';

        // Close on backdrop tap
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay || e.target.classList.contains('document-viewer-content')) {
                this.close();
            }
        });

        // Keyboard navigation
        this._keyHandler = (e) => {
            if (this._overlay.style.display !== 'flex') return;
            if (e.key === 'Escape') this.close();
        };
        document.addEventListener('keydown', this._keyHandler);

        document.body.appendChild(overlay);
        this._overlay = overlay;
    },

    _render() {
        const content = this._overlay.querySelector('.document-viewer-content');
        const doc = this._currentDoc;
        const previewUrl = `/api/documents/${doc.id}/preview`;

        content.innerHTML = `
            <div class="document-viewer-header">
                <span class="document-viewer-title">${this._escapeHtml(doc.name)}</span>
                <div class="document-viewer-controls">
                    <button class="document-viewer-download" onclick="documentViewer.download()" title="Download">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7,10 12,15 17,10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Download
                    </button>
                    <button class="document-viewer-close" onclick="documentViewer.close()">&times;</button>
                </div>
            </div>
            <div class="document-viewer-frame-container">
                <iframe 
                    class="document-viewer-frame" 
                    src="${previewUrl}" 
                    title="${this._escapeHtml(doc.name)}"
                    onload="this.style.opacity = '1'">
                </iframe>
                <div class="document-viewer-loading">
                    Loading document...
                </div>
            </div>
        `;
    },

    _escapeHtml(str) {
        return String(str)
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
};

window.documentViewer = documentViewer;