/**
 * src/ui/profile.js
 * 
 * Layer 1 UI Component: Developer Profile View
 * Subscribes to Store state. Renders user bio, college details, skill badges,
 * and user's published projects with applicant count badges.
 */

import { escapeHtml } from '../utils/dom.js';

export function renderProfile(state) {
  if (!state.user) return;
  const user = state.user;

  const name = user.name || "Shreya Sinha";
  const handle = user.user || "@shreya_sinha";
  const edu = user.edu || (user.college ? `${user.college} | BCA 2nd Sem` : "BCA 2nd Sem | Amity University Patna");
  const bio = user.bio || "Passionate developer, always eager to learn and build cool projects. Looking for teammates to work on exciting ideas!";
  const initial = name[0] ? name[0].toUpperCase() : 'U';

  const pName = document.getElementById('prof-display-name');
  const pHandle = document.getElementById('prof-display-handle');
  const pEdu = document.getElementById('prof-display-edu');
  const pBio = document.getElementById('prof-display-bio');
  const pSideTitle = document.getElementById('prof-side-edu-title');
  const pSideSub = document.getElementById('prof-side-edu-sub');

  if (pName) pName.innerText = name;
  if (pHandle) pHandle.innerText = handle;
  if (pEdu) pEdu.innerText = edu;
  if (pBio) pBio.innerText = bio;
  if (pSideTitle) pSideTitle.innerText = "BCA 2nd Sem";
  if (pSideSub) pSideSub.innerText = user.college || "Amity University Patna";

  const dispAvatar = document.getElementById('profile-display-avatar');
  const sideThumb = document.getElementById('profile-side-thumb');

  if (dispAvatar) {
    if (user.pic) dispAvatar.innerHTML = `<img src="${user.pic}" loading="lazy" decoding="async" alt="${escapeHtml(name)}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    else dispAvatar.innerText = initial;
  }
  if (sideThumb) {
    if (user.pic) sideThumb.innerHTML = `<img src="${user.pic}" loading="lazy" decoding="async" alt="${escapeHtml(name)}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    else sideThumb.innerText = initial;
  }

  // Skills List
  const skills = user.skills || ["Java", "Python", "React", "HTML/CSS", "UI/UX", "Git"];
  const skillsContainer = document.getElementById('profile-skills-list');
  if (skillsContainer) {
    skillsContainer.innerHTML = skills.map((s, idx) => `
      <span class="profile-skill-badge">
        ${escapeHtml(s)}
        <span class="remove-skill-btn" onclick="window.SyncUpApp.removeSkill(${idx})" title="Remove skill">✕</span>
      </span>
    `).join('') + `
      <button class="add-skill-inline-btn" onclick="window.SyncUpSheet.open('sheet-add-skill')">+ Add Skill</button>
    `;
  }

  // Render My Published Projects under Profile
  const myProjectsContainer = document.getElementById('profile-my-projects-list');
  if (myProjectsContainer) {
    const currentUid = user.uid;
    let myPosts = (state.posts || []).filter(p => {
      return (p.userUid && (p.userUid === currentUid || p.userUid === 'guest_demo_user')) || (p.userHandle && p.userHandle === user.user);
    });
    if (!myPosts.length && state.myUploads) {
      myPosts = state.myUploads;
    }

    if (!myPosts.length) {
      myProjectsContainer.innerHTML = `
        <div style="text-align:center; padding:24px; color:var(--color-text-muted); font-size:0.9rem;">
          You haven't published any project posts yet.
          <div style="margin-top:10px;">
            <button class="btn btn-primary" onclick="window.SyncUpSheet.open('sheet-create-post')">+ Create Post</button>
          </div>
        </div>
      `;
    } else {
      myProjectsContainer.innerHTML = myPosts.map(p => {
        const appCount = (p.applications || []).length;
        return `
          <div class="application-item-card" style="padding:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <h4 style="font-size:0.98rem; color:var(--color-primary-dark); margin-bottom:4px;">${escapeHtml(p.title || 'Project')}</h4>
                <div style="font-size:0.8rem; color:var(--color-text-secondary);">
                  ${escapeHtml(p.category || 'General')} • ❤️ ${p.likes || 0} Likes • 💬 ${(p.comments || []).length} Comments
                </div>
              </div>
              <div style="display:flex; gap:8px;">
                <button class="btn btn-outline" style="padding:4px 10px; font-size:0.75rem;" onclick="window.SyncUpSheet.open('sheet-review-applications', { reviewPostId: '${p.id}' })">
                  📥 Apps (${appCount})
                </button>
                <button class="btn-icon" style="color:var(--danger);" onclick="window.SyncUpStore.deletePost('${p.id}')" title="Delete post">
                  🗑️
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }
}
