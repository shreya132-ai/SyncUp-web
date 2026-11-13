/**
 * js/toast.js
 * 
 * Reusable Toast Notification System
 * - Types: success, error, info
 * - Actions: Undo action callback, dismiss button
 * - Animated sliding notifications with automatic dismissal
 * - Accessible: aria-live="polite", role="status"
 */

(function(window) {
    'use strict';

    let container = null;

    function getOrCreateContainer() {
        if (!container || !document.body.contains(container)) {
            container = document.getElementById('toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'toast-container';
                container.className = 'toast-container';
                container.setAttribute('aria-live', 'polite');
                container.setAttribute('aria-atomic', 'true');
                document.body.appendChild(container);
            }
        }
        return container;
    }

    /**
     * Show a toast message
     * @param {Object|string} options - Either message string or options object
     * @param {string} [options.message] - Notification text
     * @param {string} [options.type='info'] - 'success' | 'error' | 'info'
     * @param {string} [options.icon] - Emoji or icon
     * @param {number} [options.duration=4500] - Duration in ms before auto-close (0 = permanent)
     * @param {Function} [options.onUndo] - Callback function if user clicks Undo
     */
    function show(options) {
        if (typeof options === 'string') {
            options = { message: options };
        }

        const message = options.message || '';
        const type = options.type || 'info';
        const duration = typeof options.duration === 'number' ? options.duration : 4500;
        const onUndo = typeof options.onUndo === 'function' ? options.onUndo : null;

        let icon = options.icon;
        if (!icon) {
            if (type === 'success') icon = '✅';
            else if (type === 'error') icon = '⚠️';
            else icon = 'ℹ️';
        }

        const parent = getOrCreateContainer();

        const toastEl = document.createElement('div');
        toastEl.className = `toast-item toast-${type}`;
        toastEl.setAttribute('role', type === 'error' ? 'alert' : 'status');
        toastEl.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
        toastEl.setAttribute('aria-atomic', 'true');

        const contentWrap = document.createElement('div');
        contentWrap.className = 'toast-content';

        const iconEl = document.createElement('span');
        iconEl.className = 'toast-icon';
        iconEl.innerText = icon;

        const textEl = document.createElement('span');
        textEl.className = 'toast-message';
        textEl.innerText = message;

        contentWrap.appendChild(iconEl);
        contentWrap.appendChild(textEl);
        toastEl.appendChild(contentWrap);

        const actionsWrap = document.createElement('div');
        actionsWrap.className = 'toast-actions';

        let timerId = null;

        function dismiss() {
            if (timerId) clearTimeout(timerId);
            toastEl.classList.remove('visible');
            toastEl.classList.add('hiding');
            setTimeout(() => {
                if (toastEl.parentElement) {
                    toastEl.parentElement.removeChild(toastEl);
                }
            }, 260);
        }

        // Optional Undo Button
        if (onUndo) {
            const undoBtn = document.createElement('button');
            undoBtn.type = 'button';
            undoBtn.className = 'toast-undo-btn';
            undoBtn.innerText = 'Undo';
            undoBtn.onclick = (e) => {
                e.stopPropagation();
                try {
                    onUndo();
                } catch (err) {
                    console.error('[SyncUpToast] Undo callback failed:', err);
                }
                dismiss();
            };
            actionsWrap.appendChild(undoBtn);
        }

        // Close '✕' Button
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'toast-close-btn';
        closeBtn.innerHTML = '✕';
        closeBtn.setAttribute('aria-label', 'Close notification');
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            dismiss();
        };
        actionsWrap.appendChild(closeBtn);

        toastEl.appendChild(actionsWrap);
        parent.appendChild(toastEl);

        // Trigger entrance animation
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toastEl.classList.add('visible');
            });
        });

        if (duration > 0) {
            timerId = setTimeout(dismiss, duration);
        }

        return {
            dismiss,
            element: toastEl
        };
    }

    function success(message, options = {}) {
        return show({ ...options, message, type: 'success' });
    }

    function error(message, options = {}) {
        return show({ ...options, message, type: 'error' });
    }

    function info(message, options = {}) {
        return show({ ...options, message, type: 'info' });
    }

    window.SyncUpToast = {
        show,
        success,
        error,
        info
    };

    // Forward global helper
    if (window.SyncUpUtils) {
        window.SyncUpUtils.showToast = (msg, icon) => {
            return show({ message: msg, icon: icon });
        };
    }

})(window);
