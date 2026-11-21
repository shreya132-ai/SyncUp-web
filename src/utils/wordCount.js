/**
 * src/utils/wordCount.js
 * 
 * Live word counter utility for post creation and team applications.
 * Enforces <= 100 words limit, calculates remaining words, and manages aria-live warnings.
 */

export function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  const words = text.trim().match(/\S+/g);
  return words ? words.length : 0;
}

/**
 * Updates word counter DOM elements with color states and warning thresholds.
 * Thresholds:
 * - < 90 words: default muted color
 * - 90 - 100 words: warning orange color
 * - > 100 words: danger red color
 */
export function updateWordCounterDisplay(param1, param2, param3, param4) {
  let count = 0;
  let counterEl = null;
  let remainingEl = null;
  let nextBtn = null;
  let submitBtn = null;
  let max = 100;

  if (typeof param1 === 'string') {
    count = countWords(param1);
    const elements = param2 || {};
    counterEl = elements.counterEl;
    remainingEl = elements.remainingEl;
    nextBtn = elements.nextBtn;
    submitBtn = elements.submitBtn;
    max = elements.max || 100;
  } else {
    counterEl = param1;
    remainingEl = param2;
    count = typeof param3 === 'number' ? param3 : 0;
    max = typeof param4 === 'number' ? param4 : 100;
  }

  const isOverLimit = count > max;
  const isWarning = count >= Math.floor(max * 0.9) && count <= max;

  if (counterEl) {
    counterEl.textContent = `${count} / ${max}`;
    counterEl.classList.remove('word-counter-warning', 'word-counter-limit');

    if (isOverLimit) {
      counterEl.classList.add('word-counter-limit');
      counterEl.style.color = "var(--danger)";
    } else if (isWarning) {
      counterEl.classList.add('word-counter-warning');
      counterEl.style.color = "var(--warning)";
    } else {
      counterEl.style.color = "var(--color-text-muted)";
    }
  }

  if (remainingEl) {
    if (isOverLimit) {
      remainingEl.textContent = `Exceeded limit by ${count - max} word${count - max > 1 ? 's' : ''}`;
      remainingEl.style.color = "var(--danger)";
    } else {
      remainingEl.textContent = `${max - count} words remaining`;
      remainingEl.style.color = isWarning ? "var(--warning)" : "var(--color-text-muted)";
    }
  }

  if (nextBtn) nextBtn.disabled = isOverLimit;
  if (submitBtn) submitBtn.disabled = isOverLimit;

  return {
    count,
    isOverLimit,
    isWarning
  };
}
