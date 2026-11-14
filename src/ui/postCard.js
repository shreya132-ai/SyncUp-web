/**
 * src/ui/postCard.js
 * 
 * Layer 1 UI Component: Project Post Card Renderer
 * Renders title, short description, skill chips, "roles open" & "applicants" counts,
 * and a single primary Apply button that becomes a disabled "Applied ✓" afterwards.
 */

import { escapeHtml, formatRelativeTime } from '../utils/dom.js';

export function renderPostCard(p, state) {
  const currentUid = state.user ? state.user.uid : '';
  const userHandle = state.user ? state.user.user : '';
  const isLiked = (p.likedBy || []).includes(currentUid);
  const isOwner = (p.userUid && p.userUid === currentUid) || (state.user && p.userHandle === state.user.user);

  let tags = [];
  if (Array.isArray(p.skills)) tags = p.skills;
  else if (typeof p.skills === 'string') tags = p.skills.split(',').map(s => s.trim()).filter(Boolean);
  if (!tags.length) tags = ['Collaboration'];

  const userSkills = (state.user && state.user.skills && state.user.skills.length)
    ? state.user.skills.map(s => s.toLowerCase().trim())
    : [];
  const isSkillMatch = userSkills.length > 0 && tags.some(t => userSkills.includes(t.toLowerCase().trim()));

  const status = p.status || 'Recruiting';
  let statusBadgeClass = 'status-recruiting';
  let statusBadgeText = '🟢 Recruiting';
  if (status === 'In Progress') {
    statusBadgeClass = 'status-full';
    statusBadgeText = '🟡 Team Full';
  } else if (status === 'Completed') {
    statusBadgeClass = 'status-completed';
    statusBadgeText = '🔵 Completed';
  }

  const rolesOpenCount = status === 'In Progress' ? 0 : (status === 'Completed' ? 0 : (p.rolesOpen || 2));
  const rolesOpenBadge = rolesOpenCount > 0 
    ? `<span class="post-meta-badge roles-open">🎯 ${rolesOpenCount} role${rolesOpenCount > 1 ? 's' : ''} open</span>`
    : `<span class="post-meta-badge">🟡 Team Full</span>`;

  const apps = p.applications || [];
  const appCount = apps.length;
  const appCountBadge = `<span class="post-meta-badge">👥 ${appCount} applicant${appCount !== 1 ? 's' : ''}</span>`;

  // Has current user applied?
  const hasApplied = apps.some(a => {
    return (currentUid && a.applicantUid === currentUid) || (userHandle && a.applicantHandle === userHandle);
  });

  const comms = (p.comments || []).map(c => `
    <div class="comment-item" style="padding:6px 0; border-bottom:1px solid #F1F5F9; font-size:0.85rem;">
      <span style="font-weight:700; color:var(--color-sidebar); margin-right:6px;">${escapeHtml(c.u || 'Collaborator')}</span>
      <span>${escapeHtml(c.t || '')}</span>
      <span style="font-size:0.75rem; color:var(--color-text-muted); margin-left:8px;">${escapeHtml(c.time || '')}</span>
    </div>
  `).join('');

  const avatar = p.userPic 
    ? `<img src="${p.userPic}" loading="lazy" decoding="async" alt="${escapeHtml(p.userName || 'Author')}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` 
    : escapeHtml(p.userName ? p.userName[0].toUpperCase() : 'U');

  const postTimeFormatted = formatRelativeTime(p.createdAt || p.timestamp);
  const authorCollege = p.college || "Amity University | BCA 2nd Sem";
  const commentsExpanded = state.ui.expandedComments && state.ui.expandedComments[p.id];

  return `
    <article class="project-card" id="post-${p.id}" data-post-id="${p.id}">
      ${isSkillMatch ? `<div class="recommendation-pill">✨ Matches your skills</div>` : ''}

      <div class="project-card-header">
        <div class="author-meta-box">
          <div class="author-avatar">${avatar}</div>
          <div>
            <div class="author-details-name">
              ${escapeHtml(p.userName || 'Collaborator')}
              <span class="author-details-handle">${escapeHtml(p.userHandle || '@user')}</span>
            </div>
            <div class="author-education-badge">${postTimeFormatted} • ${escapeHtml(authorCollege)}</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          ${p.isDemo ? `<span class="status-badge" style="background:#FEF3C7; color:#92400E; border:1px solid #FDE68A;">Demo</span>` : ''}
          <span class="status-badge ${statusBadgeClass}">${statusBadgeText}</span>
          <div style="position:relative;">
            <button class="btn-icon" onclick="window.SyncUpApp.toggleDropdown('${p.id}')" title="Options" aria-label="Post options">···</button>
            <div class="dropdown-menu ${state.ui.dropdownPostId === p.id ? '' : 'hidden'}" id="dropdown-${p.id}" style="position:absolute; right:0; top:36px; background:#FFFFFF; border:1px solid var(--border); border-radius:8px; box-shadow:var(--shadow-lg); z-index:100; min-width:140px; padding:6px 0;">
              ${isOwner ? `
                <div class="dropdown-item" style="padding:8px 14px; font-size:0.85rem; cursor:pointer;" onclick="window.SyncUpStore.deletePost('${p.id}')">🗑️ Delete Post</div>
              ` : `
                <div class="dropdown-item" style="padding:8px 14px; font-size:0.85rem; cursor:pointer;" onclick="window.SyncUpSheet.open('sheet-report-post', { reportPostId: '${p.id}' })">🚩 Report Post</div>
                <div class="dropdown-item" style="padding:8px 14px; font-size:0.85rem; cursor:pointer; color:var(--danger);" onclick="window.SyncUpApp.blockUserPrompt('${p.userUid}', '${escapeHtml(p.userName)}')">🚫 Block Author</div>
              `}
            </div>
          </div>
        </div>
      </div>

      <h3 class="project-card-title">${escapeHtml(p.title || 'Untitled Project')}</h3>
      <p class="project-card-desc">${escapeHtml(p.text || '')}</p>

      <div style="display:flex; gap:8px; align-items:center; margin-bottom:12px; flex-wrap:wrap;">
        ${rolesOpenBadge}
        ${appCountBadge}
      </div>

      <div class="project-tags-row">
        ${tags.map(t => `<span class="tag-pill">${escapeHtml(t)}</span>`).join('')}
      </div>

      ${p.img ? `
        <div class="project-image-box">
          <img src="${p.img}" loading="lazy" decoding="async" alt="Screenshot preview for ${escapeHtml(p.title)}">
        </div>
      ` : ''}

      <div class="project-card-actions">
        <div class="social-actions-left">
          <button class="social-action-btn ${isLiked ? 'active-like' : ''}" onclick="window.SyncUpStore.likePost('${p.id}')" aria-label="${isLiked ? 'Unlike' : 'Like'} post">
            <span>${isLiked ? '❤️' : '🤍'}</span> <span>${p.likes || 0}</span>
          </button>
          <button class="social-action-btn" onclick="window.SyncUpApp.toggleComments('${p.id}')" aria-label="Toggle comments">
            <span>💬</span> <span>${(p.comments || []).length}</span>
          </button>
          ${!isOwner ? `
            <button class="social-action-btn" onclick="window.SyncUpStore.triggerDirectChatCTA('${p.userUid}', '${escapeHtml(p.userName)}', '${escapeHtml(p.userHandle)}', '${escapeHtml(p.title)}')">
              <span>🤝</span> Collaborate
            </button>
          ` : ''}
        </div>

        <div>
          ${isOwner ? `
            <button class="btn btn-outline" style="font-size:0.86rem; padding:6px 14px;" onclick="window.SyncUpSheet.open('sheet-review-applications', { reviewPostId: '${p.id}' })">
              📥 Applications (${appCount})
            </button>
          ` : (hasApplied ? `
            <button class="btn btn-primary" style="font-size:0.86rem; padding:6px 16px; opacity:0.6; cursor:default;" disabled title="You have submitted an application to this project">
              Applied ✓
            </button>
          ` : `
            <button class="btn btn-primary" style="font-size:0.86rem; padding:6px 16px;" onclick="window.SyncUpSheet.open('sheet-apply-team', { postId: '${p.id}', postTitle: '${escapeHtml(p.title)}' })">
              🤝 Apply to Join
            </button>
          `)}
        </div>
      </div>

      ${commentsExpanded ? `
        <div class="comments-section" style="margin-top:16px; padding-top:12px; border-top:1px solid var(--border);">
          <div class="comments-list" style="margin-bottom:12px;">
            ${comms || '<p style="font-size:0.82rem; color:var(--color-text-muted);">No comments yet. Start the conversation!</p>'}
          </div>
          <div style="display:flex; gap:8px;">
            <input type="text" class="form-input comment-input" id="comment-inp-${p.id}" placeholder="Write a comment..." onkeydown="if(event.key === 'Enter') window.SyncUpApp.submitComment('${p.id}')" style="min-height:38px; padding:6px 12px; font-size:0.85rem;">
            <button class="btn btn-primary" style="min-height:38px; padding:6px 14px; font-size:0.85rem;" onclick="window.SyncUpApp.submitComment('${p.id}')">Post</button>
          </div>
        </div>
      ` : ''}
    </article>
  `;
}
