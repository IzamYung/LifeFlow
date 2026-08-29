/* C:\Users\razn\.gemini\antigravity\scratch\lifeflow\js\components\modal.js */

const Modal = {
    overlay: null,
    sheet: null,
    titleEl: null,
    contentEl: null,
    closeBtn: null,
    startY: 0,
    currentY: 0,
    isDragging: false,

    init() {
        this.overlay = document.getElementById('global-modal-overlay');
        this.sheet = document.getElementById('global-bottom-sheet');
        this.titleEl = document.getElementById('sheet-title');
        this.contentEl = document.getElementById('sheet-content-area');
        this.closeBtn = document.getElementById('sheet-close-btn');

        // Bind dismiss listeners
        this.closeBtn.addEventListener('click', () => this.close());
        this.overlay.addEventListener('click', () => this.close());

        // Setup drag-to-dismiss gesture for mobile
        const handle = document.getElementById('global-sheet-handle');
        handle.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: true });
        handle.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        handle.addEventListener('touchend', () => this.onTouchEnd(), { passive: true });
    },

    open(title, htmlContent, onOpenCallback = null) {
        this.titleEl.textContent = title;
        this.contentEl.innerHTML = htmlContent;

        // Toggle active classes to slide sheet up
        this.overlay.classList.add('active');
        this.sheet.classList.add('active');
        this.sheet.style.transform = ''; // Clear inline styles from drag adjustments

        // Disable scrolling on background body
        document.body.style.overflow = 'hidden';

        if (typeof onOpenCallback === 'function') {
            onOpenCallback(this.contentEl);
        }
    },

    close() {
        if (!this.overlay) return;
        this.overlay.classList.remove('active');
        this.sheet.classList.remove('active');
        document.body.style.overflow = '';
        
        // Clear content after transitions complete
        setTimeout(() => {
            if (!this.sheet.classList.contains('active')) {
                this.contentEl.innerHTML = '';
            }
        }, 300);
    },

    // Gesture swipe controls
    onTouchStart(e) {
        this.startY = e.touches[0].clientY;
        this.isDragging = true;
        this.sheet.style.transition = 'none'; // Pause animation for fluid drag tracking
    },

    onTouchMove(e) {
        if (!this.isDragging) return;
        this.currentY = e.touches[0].clientY;
        const deltaY = this.currentY - this.startY;

        // Only allow pulling downwards
        if (deltaY > 0) {
            e.preventDefault();
            this.sheet.style.transform = `translateY(${deltaY}px)`;
        }
    },

    onTouchEnd() {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.sheet.style.transition = ''; // Re-enable standard transition timing

        const deltaY = this.currentY - this.startY;
        
        // If swiped more than 100px downwards, close sheet. Else snap back up.
        if (deltaY > 100) {
            this.close();
        } else {
            this.sheet.style.transform = '';
        }
    }
};

// Bind on load
document.addEventListener('DOMContentLoaded', () => Modal.init());
