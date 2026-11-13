/**
 * js/ui-onboarding.js
 * 
 * Layer 1 UI Component: Post Sign-up Onboarding (Skill Selection & Feed Personalization)
 * - Prompts new users to select 3-5 skills
 * - Saves skills to user profile
 * - Immediately personalizes feed sorting with recommendation badges
 */

(function(window) {
    'use strict';

    const CANDIDATE_SKILLS = [
        'React', 'Node.js', 'Python', 'FastAPI', 'UI/UX',
        'TypeScript', 'JavaScript', 'Flutter', 'Next.js', 'HTML/CSS',
        'Figma', 'Solidity', 'SQL', 'Machine Learning', 'Java', 'Git'
    ];

    let selectedSkills = [];

    function openOnboarding() {
        selectedSkills = [];
        const state = window.SyncUpStore.getState();
        if (state.user && Array.isArray(state.user.skills) && state.user.skills.length > 0) {
            selectedSkills = [...state.user.skills].slice(0, 5);
        }
        renderOnboardingGrid();
        if (window.SyncUpSheet) {
            window.SyncUpSheet.open('sheet-onboarding');
        }
    }

    function toggleSkill(skill) {
        const index = selectedSkills.indexOf(skill);
        if (index > -1) {
            selectedSkills.splice(index, 1);
        } else {
            if (selectedSkills.length >= 5) {
                if (window.SyncUpToast) {
                    window.SyncUpToast.info("You can select up to 5 primary skills.", { icon: "ℹ️" });
                }
                return;
            }
            selectedSkills.push(skill);
        }
        renderOnboardingGrid();
    }

    function renderOnboardingGrid() {
        const container = document.getElementById('onboarding-skills-selection');
        const counter = document.getElementById('onboarding-counter-text');
        const submitBtn = document.getElementById('btn-save-onboarding');

        if (!container) return;

        const escapeHtml = window.SyncUpUtils.escapeHtml;

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
                counter.style.color = "var(--text-secondary)";
            } else {
                counter.innerText = `Selected: ${count}/5 (Great choices!)`;
                counter.style.color = "var(--secondary-green)";
            }
        }

        if (submitBtn) {
            submitBtn.disabled = !isValid;
        }
    }

    async function submitOnboarding() {
        if (selectedSkills.length < 3) {
            if (window.SyncUpToast) window.SyncUpToast.error("Please select at least 3 skills to personalize your feed.");
            return;
        }

        const state = window.SyncUpStore.getState();
        if (!state.user) return;

        const updatedUser = {
            ...state.user,
            skills: [...selectedSkills]
        };

        window.SyncUpStore.setUser(updatedUser);
        if (window.SyncUpSheet) window.SyncUpSheet.close();

        try {
            await window.SyncUpDataService.saveUserProfile(updatedUser.uid, updatedUser);
        } catch(e) {
            console.warn("Background onboarding save notice:", e.message);
        }

        if (window.SyncUpToast) {
            window.SyncUpToast.success("Profile updated! Your feed is now personalized for your skills.", { icon: "✨" });
        }
        window.SyncUpApp.switchTab('home');
    }

    window.SyncUpUIOnboarding = {
        openOnboarding,
        toggleSkill,
        submitOnboarding,
        renderOnboardingGrid
    };

    window.openOnboarding = openOnboarding;

})(window);
