/**
 * src/ui/toast.js
 * 
 * Reusable Accessible Toast Notification System
 * - Types: success, error, info
 * - Interactive Undo action callback
 * - Animated sliding entrance/exit
 * - Accessible: aria-live="polite", role="status" / role="alert"
 */

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

export function showToast(options) {
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
  iconEl.textContent = icon;

  const textEl = document.createElement('span');
  textEl.className = 'toast-message';
  textEl.textContent = message;

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
    undoBtn.textContent = 'Undo';
    undoBtn.onclick = (e) => {
      e.stopPropagation();
      try {
        onUndo();
      } catch (err) {
        console.error("[Toast] Undo callback failed:", err);
      }
      dismiss();
    };
    actionsWrap.appendChild(undoBtn);
  }

  // Close '✕' Button
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'toast-close-btn';
  closeBtn.textContent = '✕';
  closeBtn.setAttribute('aria-label', 'Close notification');
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    dismiss();
  };
  actionsWrap.appendChild(closeBtn);

  toastEl.appendChild(actionsWrap);
  parent.appendChild(toastEl);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toastEl.classList.add('visible');
    });
  });

  if (duration > 0) {
    timerId = setTimeout(dismiss, duration);
  }

  return { dismiss, element: toastEl };
}
