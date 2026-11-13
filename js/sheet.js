/**
 * js/sheet.js
 * 
 * Reusable <Sheet> Component Controller
 * - Bottom Sheet on Mobile (<1024px)
 * - Centered Modal on Desktop (≥1024px)
 * - Complete Accessibility: aria-modal="true", role="dialog", focus trap, Escape to close, backdrop click
 * - Preserves & restores focus state
 */

(function(window) {
    'use strict';

    let lastFocusedElement = null;
    let activeSheetElement = null;

    const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function normalizeSheetId(id) {
        if (!id) return '';
        // Map modal- prefix to sheet- or vice versa
        if (id.startsWith('modal-')) {
            const sheetEquivalent = id.replace('modal-', 'sheet-');
            if (document.getElementById(sheetEquivalent)) return sheetEquivalent;
            if (document.getElementById(id)) return id;
        }
        if (id.startsWith('sheet-')) {
            if (document.getElementById(id)) return id;
            const modalEquivalent = id.replace('sheet-', 'modal-');
            if (document.getElementById(modalEquivalent)) return modalEquivalent;
        }
        return id;
    }

    function open(id, payload = {}) {
        const targetId = normalizeSheetId(id);
        const sheet = document.getElementById(targetId);
        if (!sheet) {
            console.warn(`[SyncUpSheet] Sheet element #${id} not found.`);
            return;
        }

        // Close any previously open sheet first
        if (activeSheetElement && activeSheetElement !== sheet) {
            closeInternal(false);
        }

        // Store currently focused element to restore upon close
        lastFocusedElement = document.activeElement;
        activeSheetElement = sheet;

        // Set accessibility attributes
        sheet.setAttribute('role', 'dialog');
        sheet.setAttribute('aria-modal', 'true');
        sheet.setAttribute('aria-hidden', 'false');
        sheet.classList.add('open');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling

        // Notify Store
        if (window.SyncUpStore) {
            window.SyncUpStore.openModal(targetId, payload);
        }

        // Focus trap initial focus immediately
        const focusable = sheet.querySelectorAll(FOCUSABLE_SELECTOR);
        if (focusable.length > 0) {
            const firstInput = sheet.querySelector('input:not([type="hidden"]), textarea, select');
            if (firstInput) {
                firstInput.focus();
            } else {
                focusable[0].focus();
            }
        }

        // Attach listeners
        document.addEventListener('keydown', handleKeyDown);
    }

    function close() {
        closeInternal(true);
    }

    function closeInternal(notifyStore = true) {
        if (!activeSheetElement) {
            // Check if any sheet is open in DOM
            const openSheets = document.querySelectorAll('.sheet-overlay.open, .modal-overlay.open');
            openSheets.forEach(el => el.classList.remove('open'));
            document.body.style.overflow = '';
            if (notifyStore && window.SyncUpStore) {
                window.SyncUpStore.closeModal();
            }
            return;
        }

        activeSheetElement.classList.remove('open');
        activeSheetElement.setAttribute('aria-hidden', 'true');
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';

        // Restore focus to triggering element
        if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
            try { lastFocusedElement.focus(); } catch(e) {}
        }

        activeSheetElement = null;

        if (notifyStore && window.SyncUpStore) {
            window.SyncUpStore.closeModal();
        }
    }

    function handleKeyDown(e) {
        if (!activeSheetElement) return;

        // Escape closes the sheet
        if (e.key === 'Escape') {
            e.preventDefault();
            close();
            return;
        }

        // Focus Trap on Tab
        if (e.key === 'Tab') {
            const focusables = Array.from(activeSheetElement.querySelectorAll(FOCUSABLE_SELECTOR)).filter(el => {
                return el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement;
            });

            if (focusables.length === 0) {
                e.preventDefault();
                return;
            }

            const firstElement = focusables[0];
            const lastElement = focusables[focusables.length - 1];

            if (e.shiftKey) {
                // Shift + Tab
                if (document.activeElement === firstElement || !activeSheetElement.contains(document.activeElement)) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                // Tab
                if (document.activeElement === lastElement || !activeSheetElement.contains(document.activeElement)) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        }
    }

    function handleBackdropClick(event) {
        // If clicking the overlay background itself (not sheet-container or its children)
        if (event.target === event.currentTarget) {
            close();
        }
    }

    // Attach global backdrop listener to any sheet-overlay
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('sheet-overlay') || e.target.classList.contains('modal-overlay')) {
            close();
        }
    });

    // Initialize aria attributes on all sheets in DOM
    function initSheetAccessibility() {
        document.querySelectorAll('.sheet-overlay, .modal-overlay').forEach(sheet => {
            sheet.setAttribute('role', 'dialog');
            sheet.setAttribute('aria-modal', 'true');
            if (!sheet.classList.contains('open')) {
                sheet.setAttribute('aria-hidden', 'true');
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSheetAccessibility);
    } else {
        initSheetAccessibility();
    }

    window.SyncUpSheet = {
        open,
        close,
        handleBackdropClick
    };

    // Global aliases for backward compatibility
    window.openModal = (id, payload) => open(id, payload);
    window.closeModal = () => close();

})(window);
