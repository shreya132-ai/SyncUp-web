/**
 * src/ui/sheet.js
 * 
 * Reusable <Sheet> Controller
 * - Mobile (<1024px): Bottom Sheet with drag handle
 * - Desktop (>=1024px): Centered modal dialog
 * - Complete Accessibility: role="dialog", aria-modal="true", focus trap, Escape to close,
 *   backdrop click, and restores focus to opener element on close.
 */

import { openModal as storeOpenModal, closeModal as storeCloseModal } from '../store/store.js';

let lastFocusedElement = null;
let activeSheetElement = null;

const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function normalizeSheetId(id) {
  if (!id) return '';
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

export function openSheet(id, payload = {}) {
  const targetId = normalizeSheetId(id);
  const sheet = document.getElementById(targetId);
  if (!sheet) {
    console.warn(`[Sheet] Element #${id} not found.`);
    return;
  }

  if (activeSheetElement && activeSheetElement !== sheet) {
    closeSheetInternal(false);
  }

  // Store currently focused element to restore on close
  lastFocusedElement = document.activeElement;
  activeSheetElement = sheet;

  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-hidden', 'false');
  sheet.classList.add('open');
  document.body.style.overflow = 'hidden';

  storeOpenModal(targetId, payload);

  // Focus trap: set focus to first input or focusable element
  const focusable = sheet.querySelectorAll(FOCUSABLE_SELECTOR);
  if (focusable.length > 0) {
    const firstInput = sheet.querySelector('input:not([type="hidden"]), textarea, select');
    if (firstInput) {
      firstInput.focus();
    } else {
      focusable[0].focus();
    }
  }

  document.addEventListener('keydown', handleKeyDown);
}

export function closeSheet() {
  closeSheetInternal(true);
}

function closeSheetInternal(notifyStore = true) {
  if (!activeSheetElement) {
    const openSheets = document.querySelectorAll('.sheet-overlay.open, .modal-overlay.open');
    openSheets.forEach(el => {
      el.classList.remove('open');
      el.setAttribute('aria-hidden', 'true');
    });
    document.body.style.overflow = '';
    if (notifyStore) storeCloseModal();
    return;
  }

  activeSheetElement.classList.remove('open');
  activeSheetElement.setAttribute('aria-hidden', 'true');
  document.removeEventListener('keydown', handleKeyDown);
  document.body.style.overflow = '';

  // Restore focus to opener element
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    try { lastFocusedElement.focus(); } catch (e) {}
  }

  activeSheetElement = null;

  if (notifyStore) {
    storeCloseModal();
  }
}

function handleKeyDown(e) {
  if (!activeSheetElement) return;

  if (e.key === 'Escape') {
    e.preventDefault();
    closeSheet();
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
      if (document.activeElement === firstElement || !activeSheetElement.contains(document.activeElement)) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement || !activeSheetElement.contains(document.activeElement)) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }
}
