/**
 * src/utils/wordCount.js
 * 
 * Live word counter utility for post creation and team applications.
 * Enforces ≤ 100 words limit, calculates remaining words, and updates aria-live.
 */

export function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  const words = text.trim().match(/\S+/g);
  return words ? words.length : 0;
}

export function updateWordCounterDisplay(text, elements = {}) {
  const count = countWords(text);
  const { counterEl, remainingEl, nextBtn, submitBtn } = elements;

  const isOverLimit = count > 100;
  const isWarning = count >= 90 && count <= 100;

  if (counterEl) {
    counterEl.textContent = `${count} / 100 words`;
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
      remainingEl.textContent = `Exceeded limit by ${count - 100} word${count - 100 > 1 ? 's' : ''}`;
      remainingEl.style.color = "var(--danger)";
    } else {
      remainingEl.textContent = `${100 - count} words remaining`;
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
