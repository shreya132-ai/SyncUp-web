/**
 * src/ui/feed.js
 * 
 * Layer 1 UI Component: Global Project Feed & Right Rail
 * Subscribes to Store state, renders project cards stream, multi-dimensional
 * filters (category, skill, role, sort), pagination (20/load), skeleton loaders,
 * and desktop right rail widgets.
 * Keyed DOM reconciler patches only modified cards, preserving draft inputs,
 * keyboard focus, and scroll position.
 */

import { renderPostCard } from './postCard.js';
import { escapeHtml } from '../utils/dom.js';
import { getIcon } from '../utils/icons.js';

let lastFeedRenderKey = '';

export function getFeedRenderKey(state) {
  if (!state) return '';
  const posts = state.posts || [];
  const pSummary = posts.map(p => `${p.id}:${p.likes}:${(p.comments || []).length}:${(p.applications || []).length}:${p.status}`).join('|');
  return [
    state.ui && state.ui.loading ? state.ui.loading.feed : false,
    state.ui && state.ui.error ? state.ui.error.feed : '',
    state.ui ? state.ui.categoryFilter : 'All',
    state.ui ? state.ui.skillFilter : 'All',
    state.ui ? state.ui.roleFilter : 'All',
    state.ui ? state.ui.sortOrder : 'newest',
    state.ui ? state.ui.searchTerm : '',
    state.ui ? (state.ui.feedLimit || 20) : 20,
    state.ui ? state.ui.dropdownPostId : '',
    JSON.stringify((state.ui && state.ui.expandedComments) || {}),
    state.user ? state.user.uid : '',
    state.user ? (state.user.skills || []).join(',') : '',
    pSummary
  ].join('###');
}

/**
 * Renders the center feed column with keyed updates.
 */
export function renderFeed(state, force = false) {
  const container = document.getElementById('feed-posts-stream');
  if (!container) return;

  const currentKey = getFeedRenderKey(state);
  if (!force && currentKey && currentKey === lastFeedRenderKey) {
    return;
  }
  lastFeedRenderKey = currentKey;

  // 1. Loading State with Skeleton Shimmers
  if (state.ui && state.ui.loading && state.ui.loading.feed) {
    container.innerHTML = `
      <div class="skeleton-feed-wrapper" aria-busy="true" aria-label="Loading projects">
        ${[1, 2, 3].map(() => `
          <div class="skeleton-card">
            <div class="skeleton-card-header">
              <div class="skeleton skeleton-avatar"></div>
              <div class="skeleton-meta">
                <div class="skeleton skeleton-line" style="width: 140px; height: 16px;"></div>
                <div class="skeleton skeleton-line" style="width: 90px; height: 12px; margin-top: 6px;"></div>
              </div>
            </div>
            <div class="skeleton skeleton-line" style="width: 75%; height: 20px; margin: 16px 0 10px;"></div>
            <div class="skeleton skeleton-line" style="width: 100%; height: 14px; margin-bottom: 8px;"></div>
            <div class="skeleton skeleton-line" style="width: 92%; height: 14px; margin-bottom: 8px;"></div>
            <div class="skeleton skeleton-line" style="width: 60%; height: 14px; margin-bottom: 16px;"></div>
            <div class="skeleton-tags-row">
              <div class="skeleton skeleton-pill"></div>
              <div class="skeleton skeleton-pill"></div>
              <div class="skeleton skeleton-pill"></div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    return;
  }

  // 2. Error State
  if (state.ui && state.ui.error && state.ui.error.feed) {
    container.innerHTML = `
      <div class="error-banner">
        <span>${getIcon('flag', { size: 18 })} ${escapeHtml(state.ui.error.feed)}</span>
        <button type="button" class="btn btn-outline" style="padding:4px 10px; font-size:var(--font-size-12);" data-action="retry-feed">Retry</button>
      </div>
    `;
    return;
  }

  // 3. Multi-dimensional filtering (Category, Skill, Role, Search, Sort)
  let filtered = state.posts || [];
  const blocked = (state.user && state.user.blockedUsers) ? state.user.blockedUsers : [];
  if (blocked.length) {
    filtered = filtered.filter(p => !blocked.includes(p.userUid));
  }
  const hidden = (state.user && state.user.hiddenPosts) ? state.user.hiddenPosts : [];
  if (hidden.length) {
    filtered = filtered.filter(p => !hidden.includes(p.id));
  }

  // Category Filter
  if (state.ui && state.ui.categoryFilter && state.ui.categoryFilter !== 'All') {
    filtered = filtered.filter(p => (p.category || 'College Projects') === state.ui.categoryFilter);
  }

  // Skill Chip Filter
  if (state.ui && state.ui.skillFilter && state.ui.skillFilter !== 'All') {
    const sf = state.ui.skillFilter.toLowerCase();
    filtered = filtered.filter(p => {
      const skills = Array.isArray(p.skills) ? p.skills : (typeof p.skills === 'string' ? p.skills.split(',') : []);
      return skills.some(s => s && s.trim().toLowerCase() === sf);
    });
  }

  // Role Needed Filter
  if (state.ui && state.ui.roleFilter && state.ui.roleFilter !== 'All') {
    const rf = state.ui.roleFilter.toLowerCase();
    filtered = filtered.filter(p => {
      const targetText = ((p.text || '') + ' ' + (p.title || '') + ' ' + (p.category || '')).toLowerCase();
      const rolesMatch = p.rolesNeeded && p.rolesNeeded.some(r => {
        const name = typeof r === 'string' ? r : r.role;
        return name && name.toLowerCase().includes(rf);
      });
      return targetText.includes(rf) || Boolean(rolesMatch);
    });
  }

  // Search Term Filter (Multi-filter: matches title, description, author, skills & roles)
  if (state.ui && state.ui.searchTerm) {
    const term = state.ui.searchTerm.toLowerCase();
    filtered = filtered.filter(p => {
      const title = (p.title || '').toLowerCase();
      const text = (p.text || '').toLowerCase();
      const author = (p.userName || '').toLowerCase();
      const handle = (p.userHandle || '').toLowerCase();
      const skills = (Array.isArray(p.skills) ? p.skills.join(' ') : '').toLowerCase();
      const roles = (Array.isArray(p.rolesNeeded) ? p.rolesNeeded.map(r => typeof r === 'string' ? r : r.role).join(' ') : '').toLowerCase();
      return title.includes(term) || text.includes(term) || author.includes(term) || handle.includes(term) || skills.includes(term) || roles.includes(term);
    });
  }

  // Sort Order: 'newest' vs 'popular'
  if (state.ui && state.ui.sortOrder === 'popular') {
    filtered.sort((a, b) => {
      const aActivity = (a.likes || 0) + (a.comments ? a.comments.length : 0);
      const bActivity = (b.likes || 0) + (b.comments ? b.comments.length : 0);
      return bActivity - aActivity;
    });
  } else {
    // Default newest
    filtered.sort((a, b) => {
      const timeA = a.timestamp && a.timestamp.toMillis ? a.timestamp.toMillis() : (a.createdAt || 0);
      const timeB = b.timestamp && b.timestamp.toMillis ? b.timestamp.toMillis() : (b.createdAt || 0);
      return timeB - timeA;
    });
  }

  // Personalization: If user has skills, prioritize matching projects near top
  const userSkills = (state.user && state.user.skills && state.user.skills.length)
    ? state.user.skills.map(s => s.toLowerCase().trim())
    : [];
  if (userSkills.length > 0 && (!state.ui || !state.ui.searchTerm) && (!state.ui || !state.ui.skillFilter || state.ui.skillFilter === 'All')) {
    filtered.sort((a, b) => {
      const aTags = Array.isArray(a.skills) ? a.skills : (typeof a.skills === 'string' ? a.skills.split(',') : []);
      const bTags = Array.isArray(b.skills) ? b.skills : (typeof b.skills === 'string' ? b.skills.split(',') : []);
      const aMatch = aTags.some(t => userSkills.includes(t.toLowerCase().trim())) ? 1 : 0;
      const bMatch = bTags.some(t => userSkills.includes(t.toLowerCase().trim())) ? 1 : 0;
      return bMatch - aMatch;
    });
  }

  // 4. Render Filter Toolbar
  const toolbarCont = document.getElementById('feed-filter-toolbar');
  if (toolbarCont) {
    const activeSkill = (state.ui && state.ui.skillFilter) || 'All';
    const popularSkills = ['All', 'React', 'Node.js', 'Python', 'UI/UX', 'FastAPI', 'MongoDB', 'Flutter', 'TypeScript'];
    
    toolbarCont.innerHTML = `
      <div class="filter-controls-row">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:var(--font-size-12); font-weight:700; color:var(--color-text-muted); text-transform:uppercase;">Skills:</span>
          <div class="filter-chips-scroll">
            ${popularSkills.map(s => `
              <button type="button" class="filter-chip-btn ${activeSkill.toLowerCase() === s.toLowerCase() ? 'active' : ''}" data-action="filter-skill" data-skill="${escapeHtml(s)}">
                ${escapeHtml(s)}
              </button>
            `).join('')}
          </div>
        </div>
        
        <div style="display:flex; align-items:center; gap:10px; margin-left:auto;">
          <select class="filter-select-control" onchange="window.SyncUpApp.filterByRole(this.value)" aria-label="Filter by role needed">
            <option value="All" ${(!state.ui || state.ui.roleFilter === 'All' || !state.ui.roleFilter) ? 'selected' : ''}>All Roles</option>
            <option value="Frontend" ${state.ui && state.ui.roleFilter === 'Frontend' ? 'selected' : ''}>Frontend Developer</option>
            <option value="Backend" ${state.ui && state.ui.roleFilter === 'Backend' ? 'selected' : ''}>Backend Developer</option>
            <option value="UI/UX" ${state.ui && state.ui.roleFilter === 'UI/UX' ? 'selected' : ''}>UI/UX Designer</option>
            <option value="Full-Stack" ${state.ui && state.ui.roleFilter === 'Full-Stack' ? 'selected' : ''}>Full-Stack Developer</option>
            <option value="Mobile" ${state.ui && state.ui.roleFilter === 'Mobile' ? 'selected' : ''}>Mobile App Developer</option>
            <option value="AI / ML" ${state.ui && state.ui.roleFilter === 'AI / ML' ? 'selected' : ''}>AI / ML Engineer</option>
          </select>

          <select class="filter-select-control" onchange="window.SyncUpApp.sortBy(this.value)" aria-label="Sort feed posts">
            <option value="newest" ${(!state.ui || state.ui.sortOrder === 'newest' || !state.ui.sortOrder) ? 'selected' : ''}>Newest</option>
            <option value="popular" ${state.ui && state.ui.sortOrder === 'popular' ? 'selected' : ''}>Most Active</option>
          </select>
        </div>
      </div>
    `;
  }

  // 5. Empty State
  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div style="margin-bottom:12px; color:var(--color-primary-btn);">${getIcon('search', { size: 40 })}</div>
        <h3 style="color:var(--color-primary-dark); margin-bottom:8px;">No projects match your filters</h3>
        <p style="color:var(--color-text-secondary); max-width:440px; margin:0 auto 20px; font-size:var(--font-size-14);">
          Try resetting your search or filter criteria to discover more exciting teams and open source projects!
        </p>
        <div style="display:flex; justify-content:center; gap:10px;">
          <button type="button" class="btn btn-outline" data-action="reset-filters">Reset All Filters</button>
          <button type="button" class="btn btn-primary" data-action="open-sheet" data-sheet-id="sheet-create-post">+ Create Project Post</button>
        </div>
      </div>
    `;
    return;
  }

  // 6. Pagination / Feed Limit (Default 20 per load)
  const limit = (state.ui && state.ui.feedLimit) || 20;
  const visible = filtered.slice(0, limit);
  const hasMore = filtered.length > limit;

  // 7. Keyed DOM Reconciliation (preserves drafts, focus, scroll)
  const activeEl = document.activeElement;
  const activeId = activeEl ? activeEl.id : null;
  const scrollPos = window.scrollY;

  const commentDrafts = {};
  container.querySelectorAll('input.comment-input[data-post-id]').forEach(inp => {
    if (inp.dataset.postId && inp.value) {
      commentDrafts[inp.dataset.postId] = inp.value;
    }
  });

  const existingCards = {};
  container.querySelectorAll('article.project-card[data-post-id]').forEach(card => {
    existingCards[card.dataset.postId] = card;
  });

  if (Object.keys(existingCards).length === 0) {
    // Initial render
    let html = visible.map(post => renderPostCard(post, state)).join('');
    if (hasMore) {
      html += `
        <div id="feed-pagination-box" style="text-align:center; padding: 24px 0 12px;">
          <button type="button" class="btn btn-outline" style="border-radius:var(--radius-button); min-height:var(--touch-target-min); padding: 8px 24px;" data-action="load-more-posts">
            Load More Projects (${visible.length} of ${filtered.length})
          </button>
        </div>
      `;
    } else if (filtered.length > 20) {
      html += `
        <div id="feed-pagination-box" style="text-align:center; padding: 20px 0; color:var(--color-text-muted); font-size:var(--font-size-14);">
          Showing all ${filtered.length} projects
        </div>
      `;
    }
    container.innerHTML = html;
  } else {
    // Keyed reconciler
    const fragment = document.createDocumentFragment();
    visible.forEach(post => {
      const cardHtml = renderPostCard(post, state);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = cardHtml;
      const newCardNode = tempDiv.firstElementChild;

      if (existingCards[post.id]) {
        const oldCard = existingCards[post.id];
        if (oldCard.outerHTML !== newCardNode.outerHTML) {
          oldCard.replaceWith(newCardNode);
          fragment.appendChild(newCardNode);
        } else {
          fragment.appendChild(oldCard);
        }
        delete existingCards[post.id];
      } else {
        fragment.appendChild(newCardNode);
      }
    });

    // Remove obsolete cards
    Object.values(existingCards).forEach(card => {
      card.remove();
    });

    // Pagination box
    const oldPagination = document.getElementById('feed-pagination-box');
    if (oldPagination) oldPagination.remove();

    if (hasMore) {
      const pagDiv = document.createElement('div');
      pagDiv.id = 'feed-pagination-box';
      pagDiv.style.cssText = 'text-align:center; padding: 24px 0 12px;';
      pagDiv.innerHTML = `
        <button type="button" class="btn btn-outline" style="border-radius:var(--radius-button); min-height:var(--touch-target-min); padding: 8px 24px;" data-action="load-more-posts">
          Load More Projects (${visible.length} of ${filtered.length})
        </button>
      `;
      fragment.appendChild(pagDiv);
    } else if (filtered.length > 20) {
      const compDiv = document.createElement('div');
      compDiv.id = 'feed-pagination-box';
      compDiv.style.cssText = 'text-align:center; padding: 20px 0; color:var(--color-text-muted); font-size:var(--font-size-14);';
      compDiv.innerText = `Showing all ${filtered.length} projects`;
      fragment.appendChild(compDiv);
    }

    container.replaceChildren(fragment);
  }

  // Restore comment drafts into inputs
  Object.keys(commentDrafts).forEach(pid => {
    const inp = container.querySelector(`input.comment-input[data-post-id="${pid}"]`);
    if (inp && !inp.value) {
      inp.value = commentDrafts[pid];
    }
  });

  // Restore active focus if applicable
  if (activeId) {
    const restoredEl = document.getElementById(activeId);
    if (restoredEl && typeof restoredEl.focus === 'function') {
      restoredEl.focus();
    }
  }

  // Restore scroll position
  if (typeof window !== 'undefined' && window.scrollY !== scrollPos) {
    window.scrollTo({ top: scrollPos, behavior: 'instant' });
  }
}

/**
 * Renders the Desktop Right Rail widgets:
 * 1. Suggested Teams
 * 2. Pending Applications
 * 3. Trending Skills
 */
export function renderRightRail(state) {
  // 1. Suggested Teams
  const suggestedRail = document.getElementById('rail-suggested-teams');
  if (suggestedRail) {
    const currentUid = state.user ? state.user.uid : '';
    const otherPosts = (state.posts || []).filter(p => p.userUid !== currentUid && p.status === 'Recruiting').slice(0, 3);
    
    if (otherPosts.length) {
      suggestedRail.innerHTML = otherPosts.map(p => {
        const skills = Array.isArray(p.skills) ? p.skills.slice(0, 2).join(', ') : (p.skills || 'Tech');
        const firstSkill = Array.isArray(p.skills) ? (p.skills[0] || 'All') : 'All';
        return `
          <button type="button" class="rail-item" data-action="filter-skill" data-skill="${escapeHtml(firstSkill)}" title="View team" aria-label="View team for ${escapeHtml(p.title || 'Project')}">
            <div style="font-weight:600; font-size:var(--font-size-14); color:var(--color-text);">${escapeHtml(p.title || 'Untitled Project')}</div>
            <div style="font-size:var(--font-size-12); color:var(--color-primary-btn); margin-top:2px;">Needs: ${escapeHtml(skills)}</div>
            <div style="font-size:var(--font-size-12); color:var(--color-text-muted); margin-top:2px;">Lead: ${escapeHtml(p.userName || 'Author')}</div>
          </button>
        `;
      }).join('');
    } else {
      suggestedRail.innerHTML = `<div style="font-size:var(--font-size-12); color:var(--color-text-muted); padding:4px 0;">No new team suggestions right now.</div>`;
    }
  }

  // 2. Pending Applications
  const pendingRail = document.getElementById('rail-pending-apps');
  if (pendingRail) {
    const currentUid = state.user ? state.user.uid : '';
    const myApps = [];
    (state.posts || []).forEach(p => {
      (p.applications || []).forEach(app => {
        if (app.applicantUid === currentUid && app.status === 'pending') {
          myApps.push({ projectTitle: p.title, role: app.role, timestamp: app.timestamp });
        }
      });
    });

    if (myApps.length) {
      pendingRail.innerHTML = myApps.slice(0, 3).map(a => `
        <div class="rail-item" style="border-left:3px solid var(--warning); padding-left:8px;">
          <div style="font-weight:600; font-size:var(--font-size-14); color:var(--color-text);">${escapeHtml(a.projectTitle)}</div>
          <div style="font-size:var(--font-size-12); color:var(--color-text-secondary); margin-top:2px;">Role: ${escapeHtml(a.role)}</div>
          <span class="status-badge" style="background:#FEF3C7; color:#92400E; font-size:var(--font-size-12); margin-top:4px;">Pending Review</span>
        </div>
      `).join('');
    } else {
      pendingRail.innerHTML = `<div style="font-size:var(--font-size-12); color:var(--color-text-muted); padding:4px 0;">No pending team applications.</div>`;
    }
  }

  // 3. Trending Skills
  const skillsRail = document.getElementById('rail-trending-skills');
  if (skillsRail) {
    const skillCounts = {};
    (state.posts || []).forEach(p => {
      const skills = Array.isArray(p.skills) ? p.skills : (typeof p.skills === 'string' ? p.skills.split(',') : []);
      skills.forEach(s => {
        const trimmed = s.trim();
        if (trimmed) {
          skillCounts[trimmed] = (skillCounts[trimmed] || 0) + 1;
        }
      });
    });

    const sortedSkills = Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    if (sortedSkills.length) {
      skillsRail.innerHTML = `
        <div style="display:flex; flex-wrap:wrap; gap:6px;">
          ${sortedSkills.map(([skill, count]) => `
            <button type="button" class="tag-pill" style="font-size:var(--font-size-12); cursor:pointer;" data-action="filter-skill" data-skill="${escapeHtml(skill)}">
              ${escapeHtml(skill)} <span style="font-size:var(--font-size-12); color:var(--color-text-muted); margin-left:3px;">${count}</span>
            </button>
          `).join('')}
        </div>
      `;
    } else {
      skillsRail.innerHTML = `<div style="font-size:var(--font-size-12); color:var(--color-text-muted); padding:4px 0;">No skill tags detected yet.</div>`;
    }
  }
}
