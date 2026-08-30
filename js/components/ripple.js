/* UniFlow */

const Ripple = {
    init() {
        // Event delegation to capture clicks/taps on ripple containers
        document.addEventListener('pointerdown', (e) => {
            const container = e.target.closest('.ripple-container');
            if (!container) return;

            // Create ripple element
            const ripple = document.createElement('span');
            ripple.classList.add('ripple-wave');

            // Calculate dimensions and positions
            const rect = container.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            
            // Positioning relative to viewport pointer click coordinates
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.width = ripple.style.height = `${size}px`;
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;

            // Append wave to element
            container.appendChild(ripple);

            // Cleanup when animation completes
            ripple.addEventListener('animationend', () => {
                ripple.remove();
            });
        });
    }
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => Ripple.init());
