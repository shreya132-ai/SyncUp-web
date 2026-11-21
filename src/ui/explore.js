/**
 * src/ui/explore.js
 * 
 * Layer 1 UI Component: Explore & Discovery View
 * Supports search plus browse by skill chips with counts, and browse by category cards.
 * Renders matching project cards using renderPostCard.
 * Category cards and filters use semantic button elements.
 * Lucide inline SVGs used for iconography.
 */

import { renderPostCard } from './postCard.js';
import { escapeHtml } from '../utils/dom.js';
import { getIcon } from '../utils/icons.js';

export function renderExplore(state) {
  const container = document.getElementById('subview-explore');
  if (!container) return;

  const posts = state.posts || [];

  // Category counts
  const categories = ['Hackathons', 'College Projects', 'Portfolio', 'Learning'];
  const categoryCounts = {};
  categories.forEach(c => {
    categoryCounts[c] = posts.filter(p => (p.category || 'College Projects') === c).length;
  });

  // Skill counts
  const skillCounts = {};
  posts.forEach(p => {
    const list = Array.isArray(p.skills) ? p.skills : (typeof p.skills === 'string' ? p.skills.split(',') : []);
    list.forEach(s => {
      const clean = s ? s.trim() : '';
      if (clean) skillCounts[clean] = (skillCounts[clean] || 0) + 1;
    });
  });
  const topSkills = Object.keys(skillCounts).sort((a, b) => skillCounts[b] - skillCounts[a]).slice(0, 10);

  const searchTerm = (state.ui && state.ui.searchTerm) || '';

  container.innerHTML = `
    <div class="explore-hero-card">
      <h2 style="display:flex; align-items:center; gap:8px;">
        ${getIcon('compass', { size: 24, stroke: '#FFFFFF' })}
        <span>Discover Teams & Projects</span>
      </h2>
      <p>Find teammates across colleges, join hackathon teams, and collaborate on exciting open source software.</p>
      
      <div class="explore-search-bar">
        <input type="text" class="explore-search-input" id="explore-view-search" placeholder="Search by tech stack, project title, or college..." value="${escapeHtml(searchTerm)}" oninput="window.SyncUpApp.handleSearch(this.value)">
      </div>

      <!-- Browse by Skill Pills with Counts -->
      <div style="margin-top:16px;">
        <div style="font-size:var(--font-size-12); font-weight:700; color:#A7F3D0; text-transform:uppercase; margin-bottom:8px;">Browse by Skill:</div>
        <div class="explore-quick-tags">
          ${topSkills.map(s => `
            <button type="button" class="explore-tag-pill filter-chip-btn" data-action="search-tag" data-tag="${escapeHtml(s)}">
              ${escapeHtml(s)} <span style="opacity:0.8; font-size:var(--font-size-12);">(${skillCounts[s]})</span>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Browse by Category Cards (Accessible Buttons) -->
      <div style="margin-top:20px;">
        <div style="font-size:var(--font-size-12); font-weight:700; color:#A7F3D0; text-transform:uppercase; margin-bottom:8px;">Browse by Category:</div>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap:10px;">
          ${categories.map(c => `
            <button type="button" class="explore-category-card" data-action="filter-category" data-category="${escapeHtml(c)}" style="background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.2); border-radius:10px; padding:10px 12px; cursor:pointer; text-align:center; color:inherit; font-family:inherit;">
              <div style="font-weight:700; font-size:var(--font-size-14); color:#FFFFFF;">${escapeHtml(c)}</div>
              <div style="font-size:var(--font-size-12); color:#A7F3D0; margin-top:2px;">${categoryCounts[c]} projects</div>
            </button>
          `).join('')}
        </div>
      </div>
    </div>

    ${searchTerm ? `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; padding:0 4px;">
        <div style="font-size:var(--font-size-14); color:var(--color-text-secondary);">
          Showing results for "<strong>${escapeHtml(searchTerm)}</strong>"
        </div>
        <button type="button" class="btn btn-outline" style="padding:4px 10px; font-size:var(--font-size-12);" data-action="clear-search">✕ Clear Filter</button>
      </div>
    ` : ''}

    <!-- Explore Results Stream -->
    <div class="feed-container" id="explore-posts-stream"></div>
  `;

  const exploreStream = document.getElementById('explore-posts-stream');
  if (exploreStream) {
    let filtered = posts;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => {
        const title = (p.title || '').toLowerCase();
        const text = (p.text || '').toLowerCase();
        const author = (p.userName || '').toLowerCase();
        const skills = (Array.isArray(p.skills) ? p.skills.join(' ') : (p.skills || '')).toLowerCase();
        return title.includes(term) || text.includes(term) || author.includes(term) || skills.includes(term);
      });
    }

    if (!filtered.length) {
      exploreStream.innerHTML = `
        <div class="empty-state">
          <div style="margin-bottom:12px; color:var(--color-text-muted);">${getIcon('compass', { size: 40 })}</div>
          <h3 style="color:var(--color-text);">No projects match your search</h3>
          <p style="color:var(--color-text-secondary); margin-top:6px; font-size:var(--font-size-14);">Try another keyword or skill tag.</p>
          <button type="button" class="btn btn-primary" style="margin-top:14px;" data-action="clear-search">View All Projects</button>
        </div>
      `;
    } else {
      exploreStream.innerHTML = filtered.map(p => renderPostCard(p, state)).join('');
    }
  }
}
