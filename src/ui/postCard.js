/**
 * src/ui/postCard.js
 * 
 * Layer 1 UI Component: Project Post Card Renderer
 * Renders title, short description, skill chips, "roles open" & "applicants" counts,
 * external links (GitHub/Demo with rel="noopener noreferrer"), safe image URLs via safeUrl,
 * Lucide inline SVG icons for navigation & actions, and dynamic action buttons with data-action
 * attributes for centralized event delegation.
 */

import { escapeHtml, formatRelativeTime, safeUrl } from '../utils/dom.js';
import { getIcon } from '../utils/icons.js';

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
  let statusBadgeText = 'Recruiting';
  if (status === 'In Progress') {
    statusBadgeClass = 'status-full';
    statusBadgeText = 'Team Full';
  } else if (status === 'Completed') {
    statusBadgeClass = 'status-completed';
    statusBadgeText = 'Completed';
  }

  const openRoles = p.rolesNeeded ? p.rolesNeeded.filter(r => !r.filled) : [];
  const rolesOpenCount = status === 'In Progress' ? 0 : (status === 'Completed' ? 0 : (p.rolesNeeded ? openRoles.length : (p.rolesOpen || 2)));
  const rolesOpenBadge = rolesOpenCount > 0 
    ? `<span class="post-meta-badge roles-open">${getIcon('target', { size: 14, className: 'inline-icon' })} ${rolesOpenCount} role${rolesOpenCount > 1 ? 's' : ''} open</span>`
    : `<span class="post-meta-badge">${getIcon('check', { size: 14, className: 'inline-icon' })} Team Full</span>`;

  const apps = p.applications || [];
  const appCount = apps.length;
  const appCountBadge = `<span class="post-meta-badge">${getIcon('users', { size: 14, className: 'inline-icon' })} 👥 ${appCount} applicant${appCount !== 1 ? 's' : ''}</span>`;

  // Has current user saved/bookmarked?
  const isSaved = Boolean(state.user && state.user.savedPosts && state.user.savedPosts.includes(p.id));

  // Has current user applied?
  const hasApplied = apps.some(a => {
    return (currentUid && a.applicantUid === currentUid) || (userHandle && a.applicantHandle === userHandle);
  });

  const comms = (p.comments || []).map(c => `
    <div class="comment-item" style="padding:6px 0; border-bottom:1px solid var(--border); font-size:var(--font-size-14);">
      <span style="font-weight:700; color:var(--color-sidebar); margin-right:6px;">${escapeHtml(c.u || 'Collaborator')}</span>
      <span>${escapeHtml(c.t || '')}</span>
      <span style="font-size:var(--font-size-12); color:var(--color-text-muted); margin-left:8px;">${escapeHtml(c.time || '')}</span>
    </div>
  `).join('');

  const validatedUserPic = safeUrl(p.userPic);
  const avatar = validatedUserPic 
    ? `<img src="${validatedUserPic}" loading="lazy" decoding="async" alt="${escapeHtml(p.userName || 'Author')}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` 
    : escapeHtml(p.userName ? p.userName[0].toUpperCase() : 'U');

  const postTimeFormatted = formatRelativeTime(p.createdAt || p.timestamp);
  const authorCollege = p.college || "Amity University | BCA 2nd Sem";
  const commentsExpanded = state.ui && state.ui.expandedComments && state.ui.expandedComments[p.id];

  const validatedImg = safeUrl(p.img);
  const validatedGithub = safeUrl(p.githubUrl, { allowDataImage: false });
  const validatedDemo = safeUrl(p.demoUrl, { allowDataImage: false });

  return `
    <article class="project-card" id="post-${escapeHtml(p.id)}" data-post-id="${escapeHtml(p.id)}">
      ${isSkillMatch ? `<div class="recommendation-pill">${getIcon('sparkles', { size: 14, className: 'inline-icon' })} Matches your skills</div>` : ''}

      <div class="project-card-header">
        <div class="author-meta-box">
          <button type="button" class="author-card-trigger" data-action="view-profile" data-uid="${escapeHtml(p.userUid)}" aria-label="View profile of ${escapeHtml(p.userName || 'Author')}" style="background:none; border:none; padding:0; cursor:pointer; text-align:left; display:flex; align-items:center; gap:12px; font-family:inherit;">
            <div class="author-avatar">${avatar}</div>
            <div>
              <div class="author-details-name">
                ${escapeHtml(p.userName || 'Collaborator')}
                <span class="author-details-handle">${escapeHtml(p.userHandle || '@user')}</span>
              </div>
              <div class="author-education-badge">${postTimeFormatted} • ${escapeHtml(authorCollege)}</div>
            </div>
          </button>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          ${p.isDemo ? `<span class="status-badge" style="background:#FEF3C7; color:#92400E; border:1px solid #FDE68A;">Demo</span>` : ''}
          <span class="status-badge ${statusBadgeClass}">${statusBadgeText}</span>
          <div style="position:relative;">
            <button type="button" class="btn-icon" data-action="toggle-dropdown" data-post-id="${escapeHtml(p.id)}" title="Options" aria-label="Post options">
              ${getIcon('more-horizontal', { size: 18 })}
            </button>
            <div class="dropdown-menu ${state.ui && state.ui.dropdownPostId === p.id ? '' : 'hidden'}" id="dropdown-${escapeHtml(p.id)}" style="position:absolute; right:0; top:36px; background:var(--color-card-bg); border:1px solid var(--border); border-radius:8px; box-shadow:var(--shadow-lg); z-index:100; min-width:140px; padding:6px 0;">
              ${isOwner ? `
                <div class="dropdown-item" data-action="edit-post" data-post-id="${escapeHtml(p.id)}" style="padding:8px 14px; font-size:var(--font-size-14); cursor:pointer; display:flex; align-items:center; gap:8px;">
                  ${getIcon('edit-3', { size: 16 })}
                  <span>Edit Project</span>
                </div>
                <div class="dropdown-item text-danger" data-action="delete-post" data-post-id="${escapeHtml(p.id)}" style="padding:8px 14px; font-size:var(--font-size-14); cursor:pointer; color:var(--danger); display:flex; align-items:center; gap:8px;">
                  ${getIcon('trash', { size: 16 })}
                  <span>Delete Post</span>
                </div>
              ` : `
                <div class="dropdown-item" data-action="report-post" data-post-id="${escapeHtml(p.id)}" style="padding:8px 14px; font-size:var(--font-size-14); cursor:pointer; display:flex; align-items:center; gap:8px;">
                  ${getIcon('flag', { size: 16 })}
                  <span>Report Post</span>
                </div>
                <div class="dropdown-item" data-action="block-user" data-user-uid="${escapeHtml(p.userUid)}" data-user-name="${escapeHtml(p.userName || '')}" style="padding:8px 14px; font-size:var(--font-size-14); cursor:pointer; color:var(--danger); display:flex; align-items:center; gap:8px;">
                  ${getIcon('ban', { size: 16 })}
                  <span>Block Author</span>
                </div>
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

      ${(validatedGithub || validatedDemo) ? `
        <div style="display:flex; gap:10px; margin: 8px 0 12px; flex-wrap:wrap;">
          ${validatedGithub ? `
            <a href="${validatedGithub}" target="_blank" rel="noopener noreferrer" class="btn btn-outline" style="font-size:var(--font-size-12); padding:4px 10px; display:inline-flex; align-items:center; gap:6px; text-decoration:none;">
              ${getIcon('github', { size: 14 })}
              <span>GitHub</span>
            </a>
          ` : ''}
          ${validatedDemo ? `
            <a href="${validatedDemo}" target="_blank" rel="noopener noreferrer" class="btn btn-outline" style="font-size:var(--font-size-12); padding:4px 10px; display:inline-flex; align-items:center; gap:6px; text-decoration:none;">
              ${getIcon('external-link', { size: 14 })}
              <span>Live Demo</span>
            </a>
          ` : ''}
        </div>
      ` : ''}

      ${validatedImg ? `
        <div class="project-image-box">
          <img src="${validatedImg}" loading="lazy" decoding="async" alt="Screenshot preview for ${escapeHtml(p.title)}">
        </div>
      ` : ''}

      <div class="project-card-actions">
        <div class="social-actions-left">
          <button type="button" class="social-action-btn ${isLiked ? 'active-like' : ''}" data-action="like-post" data-post-id="${escapeHtml(p.id)}" aria-label="${isLiked ? 'Unlike' : 'Like'} post">
            ${getIcon('heart', { size: 18, filled: isLiked, stroke: isLiked ? '#EF4444' : 'currentColor' })}
            <span>${p.likes || 0}</span>
          </button>
          <button type="button" class="social-action-btn ${isSaved ? 'active-bookmark' : ''}" data-action="bookmark-post" data-post-id="${escapeHtml(p.id)}" aria-label="${isSaved ? 'Remove bookmark' : 'Save project'}">
            ${getIcon('bookmark', { size: 18, filled: isSaved, stroke: isSaved ? '#087F5B' : 'currentColor' })}
            <span>${isSaved ? 'Saved' : 'Save'}</span>
          </button>
          <button type="button" class="social-action-btn" data-action="toggle-comments" data-post-id="${escapeHtml(p.id)}" aria-label="Toggle comments">
            ${getIcon('message-circle', { size: 18 })}
            <span>${(p.comments || []).length}</span>
          </button>
          ${!isOwner ? `
            <button type="button" class="social-action-btn" data-action="chat-cta" data-user-uid="${escapeHtml(p.userUid)}" data-user-name="${escapeHtml(p.userName || '')}" data-user-handle="${escapeHtml(p.userHandle || '')}" data-project-title="${escapeHtml(p.title || '')}">
              ${getIcon('message-square', { size: 16 })}
              <span>Collaborate</span>
            </button>
          ` : ''}
        </div>

        <div>
          ${isOwner ? `
            <button type="button" class="btn btn-outline" data-action="review-applications" data-post-id="${escapeHtml(p.id)}" style="font-size:var(--font-size-14); padding:6px 14px; display:inline-flex; align-items:center; gap:6px;">
              ${getIcon('inbox', { size: 16 })}
              <span>Applications (${appCount})</span>
            </button>
          ` : (hasApplied ? `
            <button type="button" class="btn btn-primary" style="font-size:var(--font-size-14); padding:6px 16px; opacity:0.6; cursor:default;" disabled title="You have submitted an application to this project">
              Applied ✓
            </button>
          ` : `
            <button type="button" class="btn btn-primary" data-action="apply-team" data-sheet="sheet-apply-team" data-post-id="${escapeHtml(p.id)}" data-post-title="${escapeHtml(p.title || '')}" style="font-size:var(--font-size-14); padding:6px 16px; display:inline-flex; align-items:center; gap:6px;">
              ${getIcon('users', { size: 16 })}
              <span>Apply to Join</span>
            </button>
          `)}
        </div>
      </div>

      ${commentsExpanded ? `
        <div class="comments-section" style="margin-top:16px; padding-top:12px; border-top:1px solid var(--border);">
          <div class="comments-list" style="margin-bottom:12px;">
            ${comms || `<p style="font-size:var(--font-size-12); color:var(--color-text-muted);">No comments yet. Start the conversation!</p>`}
          </div>
          <div style="display:flex; gap:8px;">
            <input type="text" class="form-input comment-input" id="comment-inp-${escapeHtml(p.id)}" data-post-id="${escapeHtml(p.id)}" placeholder="Write a comment..." style="min-height:38px; padding:6px 12px; font-size:var(--font-size-14);">
            <button type="button" class="btn btn-primary" data-action="submit-comment" data-post-id="${escapeHtml(p.id)}" style="min-height:38px; padding:6px 14px; font-size:var(--font-size-14);">Post</button>
          </div>
        </div>
      ` : ''}
    </article>
  `;
}
