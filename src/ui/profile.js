/**
 * src/ui/profile.js
 * 
 * Layer 1 UI Component: Developer Profile View
 * Supports:
 * 1. Personal Profile Mode: user bio, college details, skill badges, account settings,
 *    and tabs for "My Published Projects" and "Saved Projects" (bookmarks).
 * 2. Public Author Profile Mode: viewing another developer's profile via data-action="view-profile",
 *    showing their bio, skills, active projects, and a direct "Message" button.
 */

import { escapeHtml, safeUrl } from '../utils/dom.js';
import { getIcon } from '../utils/icons.js';
import { getState, setUi, triggerDirectChatCTA } from '../store/store.js';

export function switchProfileTab(tab) {
  setUi({ profileTab: tab });
}

export function renderProfile(state) {
  if (!state.user && !state.ui.viewingProfileUid) return;

  const currentUid = state.user ? state.user.uid : null;
  const viewingUid = state.ui && state.ui.viewingProfileUid;
  const isPublicView = viewingUid && viewingUid !== currentUid;

  let displayUser = state.user;
  let authorProjects = [];

  if (isPublicView) {
    // Find public author from posts, uploads, or chat contacts
    const authorPost = (state.posts || []).find(p => p.userUid === viewingUid);
    const authorContact = (state.chats && state.chats.contacts || []).find(c => c.uid === viewingUid);

    displayUser = {
      uid: viewingUid,
      name: authorPost?.userName || authorContact?.name || "Developer",
      user: authorPost?.userHandle || authorContact?.handle || "@developer",
      college: authorPost?.college || "NIT Patna | CS",
      edu: authorPost?.college || "NIT Patna | CS",
      bio: "Student developer & open source collaborator on SyncUp.",
      skills: authorPost?.skills || ["JavaScript", "Python", "React", "Git"],
      pic: authorPost?.userPic || authorContact?.avatar || ""
    };

    authorProjects = (state.posts || []).filter(p => p.userUid === viewingUid);
  }

  if (!displayUser) return;

  const name = displayUser.name || "Collaborator";
  const handle = displayUser.user || "@user";
  const edu = displayUser.edu || (displayUser.college ? `${displayUser.college} | BCA 2nd Sem` : "Amity University Patna");
  const bio = displayUser.bio || "Passionate developer looking to build great projects!";
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
  if (pSideTitle) pSideTitle.innerText = "Developer Education";
  if (pSideSub) pSideSub.innerText = displayUser.college || "University Student";

  const dispAvatar = document.getElementById('profile-display-avatar');
  const sideThumb = document.getElementById('profile-side-thumb');

  const validUserPic = safeUrl(displayUser.pic);
  if (dispAvatar) {
    if (validUserPic) dispAvatar.innerHTML = `<img src="${validUserPic}" loading="lazy" decoding="async" alt="${escapeHtml(name)}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    else dispAvatar.innerText = initial;
  }
  if (sideThumb) {
    if (validUserPic) sideThumb.innerHTML = `<img src="${validUserPic}" loading="lazy" decoding="async" alt="${escapeHtml(name)}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    else sideThumb.innerText = initial;
  }

  // Handle Public Profile Back Banner & Message CTA
  let headerControls = document.getElementById('profile-header-controls');
  if (!headerControls) {
    const cardHeader = document.querySelector('.profile-banner-card');
    if (cardHeader) {
      headerControls = document.createElement('div');
      headerControls.id = 'profile-header-controls';
      headerControls.style.marginBottom = '12px';
      cardHeader.parentNode.insertBefore(headerControls, cardHeader);
    }
  }

  if (headerControls) {
    if (isPublicView) {
      headerControls.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; background:var(--color-card-bg); padding:10px 16px; border-radius:var(--radius-card); border:1px solid var(--border); margin-bottom:14px;">
          <button type="button" class="btn btn-outline" style="font-size:var(--font-size-12); padding:4px 10px; display:inline-flex; align-items:center; gap:6px;" onclick="window.SyncUpProfile.exitPublicProfile()">
            ${getIcon('arrow-left', { size: 14 })}
            <span>Back to My Profile</span>
          </button>
          <button type="button" class="btn btn-primary" style="font-size:var(--font-size-12); padding:6px 14px; display:inline-flex; align-items:center; gap:6px;" onclick="window.SyncUpProfile.messageAuthor('${escapeHtml(displayUser.uid)}', '${escapeHtml(displayUser.name)}', '${escapeHtml(displayUser.user)}')">
            ${getIcon('message-square', { size: 14 })}
            <span>Message ${escapeHtml(displayUser.name)}</span>
          </button>
        </div>
      `;
    } else {
      headerControls.innerHTML = '';
    }
  }

  // Skills List
  const skills = displayUser.skills || ["Java", "Python", "React", "HTML/CSS", "UI/UX", "Git"];
  const skillsContainer = document.getElementById('profile-skills-list');
  if (skillsContainer) {
    skillsContainer.innerHTML = skills.map((s, idx) => `
      <span class="profile-skill-badge">
        ${escapeHtml(s)}
        ${!isPublicView ? `
          <button type="button" class="remove-skill-btn" data-action="remove-skill" data-skill-index="${idx}" title="Remove skill" aria-label="Remove skill ${escapeHtml(s)}" style="background:none; border:none; color:inherit; cursor:pointer; padding:0 2px;">✕</button>
        ` : ''}
      </span>
    `).join('') + (!isPublicView ? `
      <button type="button" class="add-skill-inline-btn" data-action="open-sheet" data-sheet-id="sheet-add-skill">+ Add Skill</button>
    ` : '');
  }

  // Render Projects List (or Bookmarked Posts when in 'saved' tab)
  const myProjectsContainer = document.getElementById('profile-my-projects-list');
  const activeTab = (state.ui && state.ui.profileTab) || 'projects';

  const tabProjectsBtn = document.getElementById('prof-tab-projects');
  const tabSavedBtn = document.getElementById('prof-tab-saved');
  if (tabProjectsBtn) tabProjectsBtn.classList.toggle('active', activeTab === 'projects');
  if (tabSavedBtn) tabSavedBtn.classList.toggle('active', activeTab === 'saved');

  if (myProjectsContainer) {
    if (isPublicView) {
      // Show projects by this author
      if (!authorProjects.length) {
        myProjectsContainer.innerHTML = `
          <div style="text-align:center; padding:24px; color:var(--color-text-muted); font-size:var(--font-size-14);">
            ${escapeHtml(name)} hasn't posted any open projects yet.
          </div>
        `;
      } else {
        myProjectsContainer.innerHTML = authorProjects.map(p => renderProjectCardRow(p, false)).join('');
      }
    } else if (activeTab === 'saved') {
      // Show Bookmarked / Saved posts
      const savedIds = (state.user && state.user.savedPosts) || [];
      const savedPosts = (state.posts || []).filter(p => savedIds.includes(p.id));

      if (!savedPosts.length) {
        myProjectsContainer.innerHTML = `
          <div style="text-align:center; padding:32px 20px; color:var(--color-text-muted); font-size:var(--font-size-14); background:var(--color-card-bg); border-radius:var(--radius-card); border:1px solid var(--border);">
            <div style="font-size:var(--font-size-24); margin-bottom:8px;">🔖</div>
            <div style="font-weight:600; color:var(--color-text); margin-bottom:4px;">No Saved Projects Yet</div>
            <div style="font-size:var(--font-size-12);">Click "Save" on any project in the feed to bookmark it for later reference.</div>
          </div>
        `;
      } else {
        myProjectsContainer.innerHTML = savedPosts.map(p => renderProjectCardRow(p, false, true)).join('');
      }
    } else {
      // My Published Projects
      let myPosts = (state.posts || []).filter(p => {
        return (p.userUid && (p.userUid === currentUid || p.userUid === 'guest_demo_user')) || (p.userHandle && p.userHandle === displayUser.user);
      });
      if (!myPosts.length && state.myUploads) {
        myPosts = state.myUploads;
      }

      if (!myPosts.length) {
        myProjectsContainer.innerHTML = `
          <div style="text-align:center; padding:24px; color:var(--color-text-muted); font-size:var(--font-size-14);">
            You haven't published any project posts yet.
            <div style="margin-top:10px;">
              <button type="button" class="btn btn-primary" data-action="open-sheet" data-sheet-id="sheet-create-post">+ Create Post</button>
            </div>
          </div>
        `;
      } else {
        myProjectsContainer.innerHTML = myPosts.map(p => renderProjectCardRow(p, true)).join('');
      }
    }
  }
}

function renderProjectCardRow(p, isOwner = false, isSaved = false) {
  const appCount = (p.applications || []).length;
  return `
    <div class="application-item-card" style="padding:14px; margin-bottom:8px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <div>
          <h4 style="font-size:var(--font-size-16); color:var(--color-primary-dark); margin-bottom:4px;">${escapeHtml(p.title || 'Project')}</h4>
          <div style="font-size:var(--font-size-12); color:var(--color-text-secondary); display:flex; align-items:center; gap:8px;">
            <span>${escapeHtml(p.category || 'General')}</span>
            <span>•</span>
            <span style="display:inline-flex; align-items:center; gap:3px;">
              ${getIcon('heart', { size: 12, filled: true, stroke: '#EF4444' })} ${p.likes || 0} Likes
            </span>
            <span>•</span>
            <span style="display:inline-flex; align-items:center; gap:3px;">
              ${getIcon('message-circle', { size: 12 })} ${(p.comments || []).length} Comments
            </span>
          </div>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          ${isOwner ? `
            <button type="button" class="btn btn-outline" style="padding:4px 10px; font-size:var(--font-size-12); display:inline-flex; align-items:center; gap:4px;" data-action="review-applications" data-post-id="${escapeHtml(p.id)}">
              ${getIcon('inbox', { size: 14 })}
              <span>Apps (${appCount})</span>
            </button>
            <button type="button" class="btn btn-outline" style="padding:4px 8px; font-size:var(--font-size-12);" data-action="edit-post" data-post-id="${escapeHtml(p.id)}" title="Edit post" aria-label="Edit post">
              ${getIcon('edit-3', { size: 14 })}
            </button>
            <button type="button" class="btn-icon" style="color:var(--danger);" data-action="delete-post" data-post-id="${escapeHtml(p.id)}" title="Delete post" aria-label="Delete post">
              ${getIcon('trash', { size: 16 })}
            </button>
          ` : (isSaved ? `
            <button type="button" class="btn btn-outline" style="padding:4px 10px; font-size:var(--font-size-12); display:inline-flex; align-items:center; gap:4px;" data-action="bookmark-post" data-post-id="${escapeHtml(p.id)}">
              ${getIcon('bookmark', { size: 14, filled: true, stroke: 'var(--color-primary-btn)' })}
              <span>Remove</span>
            </button>
          ` : `
            <button type="button" class="btn btn-outline" style="padding:4px 10px; font-size:var(--font-size-12); display:inline-flex; align-items:center; gap:4px;" data-action="apply-team" data-sheet="sheet-apply-team" data-post-id="${escapeHtml(p.id)}">
              <span>View</span>
            </button>
          `)}
        </div>
      </div>
    </div>
  `;
}

export function exitPublicProfile() {
  setUi({ viewingProfileUid: null });
  if (typeof window !== 'undefined' && window.location) {
    window.location.hash = '#/profile';
  }
}

export function messageAuthor(uid, name, handle) {
  triggerDirectChatCTA(uid, name, handle, 'Collaborative Project');
}
