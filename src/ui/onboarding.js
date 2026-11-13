/**
 * src/ui/onboarding.js
 * 
 * Layer 1 UI Component: Post Sign-up Onboarding (Skill Selection & Feed Personalization)
 * - Prompts new users to select 3-5 skills
 * - Saves skills to user profile
 * - Immediately personalizes feed sorting with recommendation badges
 */

import { escapeHtml } from '../utils/dom.js';
import { showToast } from './toast.js';
import { openSheet, closeSheet } from './sheet.js';
import { saveUserProfile } from '../services/authService.js';
import { getState, setUser } from '../store/store.js';

const CANDIDATE_SKILLS = [
  'React', 'Node.js', 'Python', 'FastAPI', 'UI/UX',
  'TypeScript', 'JavaScript', 'Flutter', 'Next.js', 'HTML/CSS',
  'Figma', 'Solidity', 'SQL', 'Machine Learning', 'Java', 'Git'
];

let selectedSkills = [];

export function openOnboarding() {
  selectedSkills = [];
  const state = getState();
  if (state.user && Array.isArray(state.user.skills) && state.user.skills.length > 0) {
    selectedSkills = [...state.user.skills].slice(0, 5);
  }
  renderOnboardingGrid();
  openSheet('sheet-onboarding');
}

export function toggleSkill(skill) {
  const index = selectedSkills.indexOf(skill);
  if (index > -1) {
    selectedSkills.splice(index, 1);
  } else {
    if (selectedSkills.length >= 5) {
      showToast({ message: "You can select up to 5 primary skills.", icon: "ℹ️", type: "info" });
      return;
    }
    selectedSkills.push(skill);
  }
  renderOnboardingGrid();
}

export function renderOnboardingGrid() {
  const container = document.getElementById('onboarding-skills-selection');
  const counter = document.getElementById('onboarding-counter-text');
  const submitBtn = document.getElementById('btn-save-onboarding');

  if (!container) return;

  container.innerHTML = CANDIDATE_SKILLS.map(skill => {
    const isSelected = selectedSkills.includes(skill);
    return `
      <button type="button" class="onboarding-skill-chip ${isSelected ? 'selected' : ''}" onclick="window.SyncUpUIOnboarding.toggleSkill('${skill}')">
        <span>${isSelected ? '✓' : '+'}</span> ${escapeHtml(skill)}
      </button>
    `;
  }).join('');

  const count = selectedSkills.length;
  const isValid = count >= 3 && count <= 5;

  if (counter) {
    if (count < 3) {
      counter.innerText = `Selected: ${count}/5 (select at least 3)`;
      counter.style.color = "var(--color-text-secondary)";
    } else {
      counter.innerText = `Selected: ${count}/5 (Great choices!)`;
      counter.style.color = "var(--color-accent-green)";
    }
  }

  if (submitBtn) {
    submitBtn.disabled = !isValid;
  }
}

export async function submitOnboarding() {
  if (selectedSkills.length < 3) {
    showToast({ message: "Please select at least 3 skills to personalize your feed.", icon: "⚠️", type: "error" });
    return;
  }

  const state = getState();
  if (!state.user) return;

  const updatedUser = {
    ...state.user,
    skills: [...selectedSkills]
  };

  setUser(updatedUser);
  closeSheet();

  try {
    await saveUserProfile(updatedUser.uid, updatedUser);
  } catch (e) {
    console.warn("Background onboarding save notice:", e.message);
  }

  showToast({ message: "Profile updated! Your feed is now personalized for your skills.", icon: "✨", type: "success" });
  window.SyncUpApp?.switchTab('home');
}
