/**
 * src/utils/dom.js
 * 
 * Safe DOM creation and manipulation utilities.
 * Avoids innerHTML with user-provided text to eliminate XSS vectors.
 */

/**
 * Escapes special HTML characters in a string.
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * URL Safety sanitizer: validates that a URL is well-formed and uses strictly http: or https:
 * Accepts only http/https via new URL.
 * Also safely permits verified data:image/ for client-compressed local images when allowDataImage is true.
 * Returns empty string on any invalid, malformed, or dangerous protocol (e.g. javascript:, data:text/html, vbscript:).
 */
export function safeUrl(u, { allowDataImage = true } = {}) {
  if (!u || typeof u !== 'string') return '';
  const trimmed = u.trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
    if (allowDataImage && parsed.protocol === 'data:' && /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(trimmed)) {
      return trimmed;
    }
    return '';
  } catch (e) {
    if (allowDataImage && /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(trimmed)) {
      return trimmed;
    }
    return '';
  }
}

/**
 * Helper to safely create an element with attributes and safe text/children.
 */
export function createElement(tag, attributes = {}, ...children) {
  const el = document.createElement(tag);
  
  for (const [key, value] of Object.entries(attributes)) {
    if (value === null || value === undefined) continue;
    if (key === 'className' || key === 'class') {
      el.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      el.setAttribute(key, String(value));
    }
  }

  for (const child of children) {
    if (child === null || child === undefined) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      el.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      el.appendChild(child);
    } else if (Array.isArray(child)) {
      for (const item of child) {
        if (item instanceof Node) el.appendChild(item);
        else if (item !== null && item !== undefined) {
          el.appendChild(document.createTextNode(String(item)));
        }
      }
    }
  }

  return el;
}

/**
 * Safely sets the text content of a DOM element by id or element reference.
 */
export function setText(target, text) {
  const el = typeof target === 'string' ? document.getElementById(target) : target;
  if (el) {
    el.textContent = text !== null && text !== undefined ? String(text) : '';
  }
}

/**
 * Formats relative time (e.g. "Just now", "5m ago", "2h ago", "1d ago")
 */
export function formatRelativeTime(ts) {
  if (!ts) return 'Recent';
  let timeMs = 0;
  if (typeof ts === 'number') timeMs = ts;
  else if (ts && typeof ts.toMillis === 'function') timeMs = ts.toMillis();
  else if (typeof ts === 'string') timeMs = new Date(ts).getTime();

  const diff = Math.floor((Date.now() - timeMs) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
