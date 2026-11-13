/**
 * js/ui-feed.js
 * 
 * Layer 1 UI Component: Global Project Feed View
 * Subscribes to Store state. Renders project cards, status badges, likes, comments.
 * Calls Store actions only (store.likePost, store.commentPost, store.openModal).
 */

(function(window) {
    'use strict';

    let lastFeedRenderKey = '';

    function getFeedRenderKey(state) {
        if (!state) return '';
        const posts = state.posts || [];
        const pSummary = posts.map(p => `${p.id}:${p.likes}:${(p.comments||[]).length}:${(p.applications||[]).length}:${p.status}`).join('|');
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

    function renderFeed(state, force = false) {
        const container = document.getElementById('feed-posts-stream');
        if (!container) return;

        // Avoid unnecessary re-renders if state hasn't changed
        const currentKey = getFeedRenderKey(state);
        if (!force && currentKey && currentKey === lastFeedRenderKey) {
            return;
        }
        lastFeedRenderKey = currentKey;

        // 1. Loading State with Skeleton Shimmers
        if (state.ui.loading.feed) {
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
        if (state.ui.error.feed) {
            container.innerHTML = `
                <div class="error-banner">
                    <span>⚠️ ${window.SyncUpUtils.escapeHtml(state.ui.error.feed)}</span>
                    <button class="btn btn-outline" style="padding:4px 10px; font-size:0.8rem;" onclick="window.SyncUpApp.retryFeed()">Retry</button>
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

        // Category Filter
        if (state.ui.categoryFilter && state.ui.categoryFilter !== 'All') {
            filtered = filtered.filter(p => (p.category || 'College Projects') === state.ui.categoryFilter);
        }

        // Skill Chip Filter
        if (state.ui.skillFilter && state.ui.skillFilter !== 'All') {
            const sf = state.ui.skillFilter.toLowerCase();
            filtered = filtered.filter(p => {
                const skills = Array.isArray(p.skills) ? p.skills : (typeof p.skills === 'string' ? p.skills.split(',') : []);
                return skills.some(s => s && s.trim().toLowerCase() === sf);
            });
        }

        // Role Needed Filter
        if (state.ui.roleFilter && state.ui.roleFilter !== 'All') {
            const rf = state.ui.roleFilter.toLowerCase();
            filtered = filtered.filter(p => {
                const targetText = ((p.text || '') + ' ' + (p.title || '') + ' ' + (p.category || '')).toLowerCase();
                return targetText.includes(rf) || (p.rolesNeeded && p.rolesNeeded.some(r => r.toLowerCase().includes(rf)));
            });
        }

        // Search Term Filter
        if (state.ui.searchTerm) {
            const term = state.ui.searchTerm.toLowerCase();
            filtered = filtered.filter(p => {
                const title = (p.title || "").toLowerCase();
                const text = (p.text || "").toLowerCase();
                const author = (p.userName || "").toLowerCase();
                const handle = (p.userHandle || "").toLowerCase();
                const skills = (Array.isArray(p.skills) ? p.skills.join(' ') : (p.skills || "")).toLowerCase();
                return title.includes(term) || text.includes(term) || author.includes(term) || handle.includes(term) || skills.includes(term);
            });
        }

        // Sort Order: 'newest' vs 'popular'
        if (state.ui.sortOrder === 'popular') {
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
        const userSkills = (state.user && state.user.skills && state.user.skills.length) ? state.user.skills.map(s => s.toLowerCase().trim()) : [];
        if (userSkills.length > 0 && !state.ui.searchTerm && (!state.ui.skillFilter || state.ui.skillFilter === 'All')) {
            filtered.sort((a, b) => {
                const aTags = Array.isArray(a.skills) ? a.skills : (typeof a.skills === 'string' ? a.skills.split(',') : []);
                const bTags = Array.isArray(b.skills) ? b.skills : (typeof b.skills === 'string' ? b.skills.split(',') : []);
                const aMatch = aTags.some(t => userSkills.includes(t.toLowerCase().trim())) ? 1 : 0;
                const bMatch = bTags.some(t => userSkills.includes(t.toLowerCase().trim())) ? 1 : 0;
                return bMatch - aMatch;
            });
        }

        // 4. Render Filter Toolbar & Posts
        const currentUid = state.user ? state.user.uid : '';
        const userHandle = state.user ? state.user.user : '';
        const escapeHtml = window.SyncUpUtils.escapeHtml;
        const formatRelativeTime = window.SyncUpUtils.formatRelativeTime;

        // Render multi-filter toolbar into container if element exists
        const toolbarCont = document.getElementById('feed-filter-toolbar');
        if (toolbarCont) {
            const activeSkill = state.ui.skillFilter || 'All';
            const popularSkills = ['All', 'React', 'Node.js', 'Python', 'UI/UX', 'FastAPI', 'MongoDB', 'Flutter', 'TypeScript'];
            
            toolbarCont.innerHTML = `
                <div class="filter-controls-row">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:0.8rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Skills:</span>
                        <div class="filter-chips-scroll">
                            ${popularSkills.map(s => `
                                <button type="button" class="filter-chip-btn ${activeSkill.toLowerCase() === s.toLowerCase() ? 'active' : ''}" onclick="window.SyncUpApp.filterBySkill('${s}')">
                                    ${escapeHtml(s)}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div style="display:flex; align-items:center; gap:10px; margin-left:auto;">
                        <select class="filter-select-control" onchange="window.SyncUpApp.filterByRole(this.value)" aria-label="Filter by role needed">
                            <option value="All" ${(state.ui.roleFilter === 'All' || !state.ui.roleFilter) ? 'selected' : ''}>🎯 All Roles</option>
                            <option value="Frontend" ${state.ui.roleFilter === 'Frontend' ? 'selected' : ''}>Frontend Developer</option>
                            <option value="Backend" ${state.ui.roleFilter === 'Backend' ? 'selected' : ''}>Backend Developer</option>
                            <option value="UI/UX" ${state.ui.roleFilter === 'UI/UX' ? 'selected' : ''}>UI/UX Designer</option>
                            <option value="Full-Stack" ${state.ui.roleFilter === 'Full-Stack' ? 'selected' : ''}>Full-Stack Developer</option>
                            <option value="Mobile" ${state.ui.roleFilter === 'Mobile' ? 'selected' : ''}>Mobile App Developer</option>
                            <option value="AI / ML" ${state.ui.roleFilter === 'AI / ML' ? 'selected' : ''}>AI / ML Engineer</option>
                        </select>

                        <select class="filter-select-control" onchange="window.SyncUpApp.sortBy(this.value)" aria-label="Sort feed posts">
                            <option value="newest" ${(state.ui.sortOrder === 'newest' || !state.ui.sortOrder) ? 'selected' : ''}>⚡ Newest</option>
                            <option value="popular" ${state.ui.sortOrder === 'popular' ? 'selected' : ''}>🔥 Most Active</option>
                        </select>
                    </div>
                </div>
            `;
        }

        // Empty State with Friendly Action
        if (!filtered.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <div style="font-size:3rem; margin-bottom:12px;">🔍</div>
                    <h3 style="color:var(--primary-dark); margin-bottom:8px;">No projects match your filters</h3>
                    <p style="color:var(--text-secondary); max-width:440px; margin:0 auto 20px; font-size:0.92rem;">
                        Try resetting your search or filter criteria to discover more exciting teams and open source projects!
                    </p>
                    <div style="display:flex; justify-content:center; gap:10px;">
                        <button class="btn btn-outline" onclick="window.SyncUpApp.resetFilters()">Reset All Filters</button>
                        <button class="btn btn-primary" onclick="window.SyncUpSheet.open('sheet-create-post')">+ Create Project Post</button>
                    </div>
                </div>
            `;
            return;
        }

        // 4. Pagination / Limit (Performance: default 20 per load)
        const limit = (state.ui && state.ui.feedLimit) ? state.ui.feedLimit : 20;
        const visiblePosts = filtered.slice(0, limit);

        // 5. Render Upgraded Project Cards
        const postsHtml = visiblePosts.map(p => {
            const isLiked = (p.likedBy || []).includes(currentUid);
            const isOwner = (p.userUid && p.userUid === currentUid) || (state.user && p.userHandle === state.user.user);

            // Skills & match calculation
            let tags = [];
            if (Array.isArray(p.skills)) tags = p.skills;
            else if (typeof p.skills === 'string') tags = p.skills.split(',').map(s => s.trim()).filter(Boolean);
            if (!tags.length) tags = ['Collaboration'];

            const isSkillMatch = userSkills.length > 0 && tags.some(t => userSkills.includes(t.toLowerCase().trim()));
            const tagsHtml = tags.map(t => `<span class="tag-pill">${escapeHtml(t)}</span>`).join('');

            // Status Badge
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

            // Roles Open & Applicants Count
            const rolesOpenCount = status === 'In Progress' ? 0 : (status === 'Completed' ? 0 : (p.rolesOpen || 2));
            const rolesOpenBadge = rolesOpenCount > 0 
                ? `<span class="post-meta-badge roles-open">🎯 ${rolesOpenCount} role${rolesOpenCount > 1 ? 's' : ''} open</span>`
                : `<span class="post-meta-badge">🟡 Team Full</span>`;
            
            const apps = p.applications || [];
            const appCount = apps.length;
            const appCountBadge = `<span class="post-meta-badge">👥 ${appCount} applicant${appCount !== 1 ? 's' : ''}</span>`;

            // Check if Current User has already applied to this post
            const hasApplied = apps.some(a => {
                return (currentUid && a.applicantUid === currentUid) || (userHandle && a.applicantHandle === userHandle);
            });

            // Comments
            const comms = (p.comments || []).map(c => `
                <div class="comment-item">
                    <span class="comment-author-name">${escapeHtml(c.u || 'Collaborator')}</span>
                    <span>${escapeHtml(c.t || '')}</span>
                    <span class="comment-timestamp">${escapeHtml(c.time || '')}</span>
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
                            <span class="status-badge ${statusBadgeClass}">${statusBadgeText}</span>
                            <div style="position:relative;">
                                <button class="btn-icon" onclick="window.SyncUpApp.toggleDropdown('${p.id}')" title="Options">···</button>
                                <div class="dropdown-menu ${state.ui.dropdownPostId === p.id ? '' : 'hidden'}" id="dropdown-${p.id}">
                                    ${isOwner ? `
                                        <button class="dropdown-item danger" onclick="window.SyncUpStore.deletePost('${p.id}')">🗑️ Delete Post</button>
                                    ` : `
                                        <button class="dropdown-item" onclick="window.SyncUpSheet.open('sheet-report-post', { reportPostId: '${p.id}' })">🚩 Report Post</button>
                                        <button class="dropdown-item danger" onclick="window.SyncUpApp.blockUserPrompt('${p.userUid}', '${escapeHtml(p.userName)}')">🚫 Block Author</button>
                                    `}
                                </div>
                            </div>
                        </div>
                    </div>

                    ${p.title ? `<h3 class="project-card-title">${escapeHtml(p.title)}</h3>` : ''}
                    <p class="project-card-description">${escapeHtml(p.text || '')}</p>

                    <!-- Meta Badges: Roles Open & Applicants Counts -->
                    <div class="post-meta-badges-row">
                        ${rolesOpenBadge}
                        ${appCountBadge}
                    </div>

                    <div class="project-tags-row">${tagsHtml}</div>

                    ${(p.githubUrl || p.demoUrl) ? `
                        <div class="project-links-row">
                            ${p.githubUrl ? `<a href="${p.githubUrl}" target="_blank" rel="noopener noreferrer" class="project-link-badge">🐙 GitHub Repo</a>` : ''}
                            ${p.demoUrl ? `<a href="${p.demoUrl}" target="_blank" rel="noopener noreferrer" class="project-link-badge">🌐 Live Demo</a>` : ''}
                        </div>
                    ` : ''}

                    ${p.img ? `<img src="${p.img}" class="project-screenshot-img" loading="lazy" decoding="async" alt="Project snapshot">` : ''}

                    <div class="project-card-footer">
                        <div class="post-social-actions">
                            <button class="social-action-btn ${isLiked ? 'liked' : ''}" onclick="window.SyncUpStore.likePost('${p.id}')">
                                <span>${isLiked ? '❤️' : '🤍'}</span> ${p.likes || 0}
                            </button>
                            <button class="social-action-btn" onclick="window.SyncUpApp.toggleComments('${p.id}')">
                                <span>💬</span> ${(p.comments || []).length} Comments
                            </button>
                        </div>
                        <div style="display:flex; gap:8px; align-items:center;">
                            ${isOwner ? `
                                <button class="btn btn-outline" style="padding:6px 14px; font-size:0.82rem;" onclick="window.SyncUpSheet.open('sheet-review-applications', { reviewPostId: '${p.id}' })">
                                    📥 Applications (${appCount})
                                </button>
                            ` : `
                                ${hasApplied ? `
                                    <button class="btn-applied" disabled title="You have submitted an application to this project">
                                        Applied ✓
                                    </button>
                                ` : (status === 'Recruiting' ? `
                                    <button class="btn-apply-team" onclick="window.SyncUpSheet.open('sheet-apply-team', { postId: '${p.id}' })">
                                        🤝 Apply to Join
                                    </button>
                                ` : '')}
                                <button class="btn-collaborate" onclick="window.SyncUpStore.triggerDirectChatCTA('${p.userUid || 'user_rohit'}', '${escapeHtml(p.userName || 'Collaborator')}', '${escapeHtml(p.userHandle || '')}', '${escapeHtml(p.title || 'Project')}')">
                                    💬 Chat
                                </button>
                            `}
                        </div>
                    </div>

                    <div class="comments-section ${commentsExpanded ? '' : 'hidden'}" id="comments-box-${p.id}">
                        <div class="comments-list">${comms || '<p style="color:var(--text-muted); font-size:0.85rem; padding:4px;">No comments yet. Start the conversation!</p>'}</div>
                        <div class="comment-input-box">
                            <input type="text" class="comment-input" id="comment-inp-${p.id}" placeholder="Write a comment..." onkeydown="if(event.key === 'Enter') window.SyncUpApp.submitComment('${p.id}')">
                            <button class="btn btn-primary" style="padding:6px 14px; font-size:0.85rem;" onclick="window.SyncUpApp.submitComment('${p.id}')">Send</button>
                        </div>
                    </div>
                </article>
            `;
        }).join('');

        // 6. Pagination Load More Button or Completion Note
        let paginationHtml = '';
        if (filtered.length > visiblePosts.length) {
            paginationHtml = `
                <div class="feed-pagination-wrapper" style="display:flex; flex-direction:column; align-items:center; gap:8px; margin:24px 0 32px;">
                    <button type="button" class="btn btn-outline" style="min-width:220px; font-weight:600; padding:10px 24px;" onclick="window.SyncUpApp.loadMorePosts()">
                        Load More Projects (${visiblePosts.length} of ${filtered.length})
                    </button>
                    <span style="font-size:0.75rem; color:var(--text-secondary);">Showing 20 projects per load</span>
                </div>
            `;
        } else if (filtered.length > 5) {
            paginationHtml = `
                <div class="feed-pagination-wrapper" style="text-align:center; padding:24px 0; color:var(--text-muted); font-size:0.85rem;">
                    ✓ Showing all ${filtered.length} projects
                </div>
            `;
        }

        container.innerHTML = postsHtml + paginationHtml;
    }

    /**
     * Render Desktop Right Rail Widgets:
     * 1. Suggested Teams (Recruiting projects)
     * 2. Your Pending Applications
     * 3. Trending Skills (Clickable search pills)
     */
    function renderRightRail(state) {
        const currentUid = state.user ? state.user.uid : '';
        const escapeHtml = window.SyncUpUtils.escapeHtml;

        // 1. Suggested Teams Widget
        const teamsContainer = document.getElementById('rail-suggested-teams');
        if (teamsContainer) {
            const recruitingPosts = (state.posts || []).filter(p => {
                const isOwner = (p.userUid && p.userUid === currentUid) || (state.user && p.userHandle === state.user.user);
                return p.status === 'Recruiting' && !isOwner;
            }).slice(0, 3);

            if (!recruitingPosts.length) {
                teamsContainer.innerHTML = `
                    <div style="font-size:0.82rem; color:var(--text-muted); padding:8px 0;">
                        No other teams currently recruiting.
                    </div>
                `;
            } else {
                teamsContainer.innerHTML = recruitingPosts.map(p => `
                    <div class="suggested-team-item">
                        <div style="font-weight:600; font-size:0.88rem; color:var(--text-main); line-height:1.3;">
                            ${escapeHtml(p.title || 'Untitled Project')}
                        </div>
                        <div style="font-size:0.75rem; color:var(--text-secondary); display:flex; justify-content:space-between; align-items:center; margin-top:2px;">
                            <span>by ${escapeHtml(p.userName || 'Collaborator')}</span>
                            <span style="color:var(--color-text-brand); font-weight:600;">${escapeHtml(p.category || 'Projects')}</span>
                        </div>
                        <div style="margin-top:6px;">
                            <button class="btn btn-outline" style="padding:4px 10px; font-size:0.75rem; width:100%;" onclick="window.SyncUpSheet.open('sheet-apply-team', { postId: '${p.id}' })">
                                🤝 Apply to Join
                            </button>
                        </div>
                    </div>
                `).join('');
            }
        }

        // 2. Your Pending Applications Widget
        const appsContainer = document.getElementById('rail-pending-apps');
        if (appsContainer) {
            const userHandle = state.user ? state.user.user : '';
            const mySentApps = [];

            (state.posts || []).forEach(post => {
                (post.applications || []).forEach(app => {
                    if ((app.applicantUid && app.applicantUid === currentUid) || (userHandle && app.applicantHandle === userHandle)) {
                        mySentApps.push({
                            projectTitle: post.title || 'Project',
                            postId: post.id,
                            role: app.role || 'Member',
                            status: app.status || 'pending'
                        });
                    }
                });
            });

            // Also check sample defaults if user hasn't sent any yet
            if (!mySentApps.length && state.user && state.user.uid === 'guest_demo_user') {
                mySentApps.push({
                    projectTitle: "AI Mock Interview & Resume Analyzer",
                    role: "FastAPI Engineer",
                    status: "pending"
                });
            }

            if (!mySentApps.length) {
                appsContainer.innerHTML = `
                    <div style="font-size:0.82rem; color:var(--text-muted); padding:8px 0;">
                        No pending applications yet. Explore teams and apply!
                    </div>
                `;
            } else {
                appsContainer.innerHTML = mySentApps.slice(0, 3).map(a => `
                    <div class="suggested-team-item">
                        <div style="font-weight:600; font-size:0.86rem; color:var(--text-main); line-height:1.3;">
                            ${escapeHtml(a.projectTitle)}
                        </div>
                        <div style="font-size:0.75rem; color:var(--text-secondary); display:flex; justify-content:space-between; align-items:center; margin-top:2px;">
                            <span>Role: <strong>${escapeHtml(a.role)}</strong></span>
                            <span class="status-badge ${a.status === 'accepted' ? 'status-recruiting' : (a.status === 'declined' ? 'status-completed' : 'status-full')}" style="font-size:0.7rem; padding:1px 6px;">
                                ${a.status.toUpperCase()}
                            </span>
                        </div>
                    </div>
                `).join('');
            }
        }

        // 3. Trending Skills Widget
        const skillsContainer = document.getElementById('rail-trending-skills');
        if (skillsContainer) {
            const skillCounts = {};
            (state.posts || []).forEach(p => {
                let list = [];
                if (Array.isArray(p.skills)) list = p.skills;
                else if (typeof p.skills === 'string') list = p.skills.split(',').map(s => s.trim());
                list.forEach(s => {
                    if (s) skillCounts[s] = (skillCounts[s] || 0) + 1;
                });
            });

            let topSkills = Object.keys(skillCounts).sort((a, b) => skillCounts[b] - skillCounts[a]).slice(0, 8);
            if (topSkills.length < 4) {
                topSkills = ['React', 'Node.js', 'Python', 'UI/UX', 'FastAPI', 'MongoDB', 'JavaScript', 'Tailwind'];
            }

            skillsContainer.innerHTML = `
                <div class="trending-skill-cloud">
                    ${topSkills.map(s => `
                        <button class="trending-skill-pill" onclick="window.SyncUpApp.handleSearch('${escapeHtml(s)}')">
                            #${escapeHtml(s)}
                        </button>
                    `).join('')}
                </div>
            `;
        }
    }

    /**
     * Render Explore Destination Subview
     */
    /**
     * Render Explore Destination Subview
     * Search plus Browse by Category and Browse by Skill with match counts
     */
    function renderExplore(state) {
        const container = document.getElementById('subview-explore');
        if (!container) return;

        const escapeHtml = window.SyncUpUtils.escapeHtml;
        const posts = state.posts || [];
        const currentUid = state.user ? state.user.uid : '';
        const userHandle = state.user ? state.user.user : '';

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

        container.innerHTML = `
            <div class="explore-hero-card">
                <h2>🧭 Discover Teams & Projects</h2>
                <p>Find teammates across colleges, join hackathon teams, and collaborate on exciting open source software.</p>
                
                <div class="explore-search-bar">
                    <input type="text" class="explore-search-input" id="explore-view-search" placeholder="Search by tech stack, project title, or college..." value="${escapeHtml(state.ui.searchTerm || '')}" oninput="window.SyncUpApp.handleSearch(this.value)">
                </div>

                <!-- Browse by Skill Pills with Counts -->
                <div style="margin-top:16px;">
                    <div style="font-size:0.8rem; font-weight:700; color:#A7F3D0; text-transform:uppercase; margin-bottom:8px;">Browse by Skill:</div>
                    <div class="explore-quick-tags">
                        ${topSkills.map(s => `
                            <button type="button" class="explore-tag-pill filter-chip-btn" onclick="window.SyncUpApp.handleSearch('${escapeHtml(s)}')">
                                ${escapeHtml(s)} <span style="opacity:0.8; font-size:0.75rem;">(${skillCounts[s]})</span>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- Browse by Category Cards -->
                <div style="margin-top:20px;">
                    <div style="font-size:0.8rem; font-weight:700; color:#A7F3D0; text-transform:uppercase; margin-bottom:8px;">Browse by Category:</div>
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap:10px;">
                        ${categories.map(c => `
                            <div class="explore-category-card" onclick="window.SyncUpApp.filterByCategory('${c}'); window.SyncUpApp.switchTab('home');" style="background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.2); border-radius:10px; padding:10px 12px; cursor:pointer; transition:var(--transition); text-align:center;">
                                <div style="font-weight:700; font-size:0.88rem; color:#FFFFFF;">${c}</div>
                                <div style="font-size:0.75rem; color:#A7F3D0; margin-top:2px;">${categoryCounts[c]} projects</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            ${state.ui.searchTerm ? `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; padding:0 4px;">
                    <div style="font-size:0.9rem; color:var(--text-secondary);">
                        Showing results for "<strong>${escapeHtml(state.ui.searchTerm)}</strong>"
                    </div>
                    <button class="btn btn-outline" style="padding:3px 10px; font-size:0.75rem;" onclick="window.SyncUpApp.handleSearch('')">✕ Clear Filter</button>
                </div>
            ` : ''}

            <!-- Explore Results Stream -->
            <div class="feed-container" id="explore-posts-stream"></div>
        `;

        // Render posts into explore stream using same filtering logic
        const exploreStream = document.getElementById('explore-posts-stream');
        if (exploreStream) {
            let filtered = posts;
            if (state.ui.searchTerm) {
                const term = state.ui.searchTerm.toLowerCase();
                filtered = filtered.filter(p => {
                    const title = (p.title || "").toLowerCase();
                    const text = (p.text || "").toLowerCase();
                    const author = (p.userName || "").toLowerCase();
                    const skills = (Array.isArray(p.skills) ? p.skills.join(' ') : (p.skills || "")).toLowerCase();
                    return title.includes(term) || text.includes(term) || author.includes(term) || skills.includes(term);
                });
            }

            if (!filtered.length) {
                exploreStream.innerHTML = `
                    <div class="empty-state">
                        <div style="font-size:2.5rem; margin-bottom:12px;">🧭</div>
                        <h3>No projects match your search</h3>
                        <p style="color:var(--text-secondary); margin-top:6px;">Try another keyword or skill tag.</p>
                        <button class="btn btn-primary" style="margin-top:14px;" onclick="window.SyncUpApp.handleSearch('')">View All Projects</button>
                    </div>
                `;
            } else {
                exploreStream.innerHTML = filtered.map(p => {
                    const apps = p.applications || [];
                    const hasApplied = apps.some(a => {
                        return (currentUid && a.applicantUid === currentUid) || (userHandle && a.applicantHandle === userHandle);
                    });
                    const isOwner = (p.userUid && p.userUid === currentUid) || (state.user && p.userHandle === state.user.user);

                    return `
                        <article class="project-card">
                            <div class="project-card-header">
                                <div class="author-meta-box">
                                    <div class="author-avatar">${p.userName ? p.userName[0].toUpperCase() : 'U'}</div>
                                    <div>
                                        <div class="author-details-name">${escapeHtml(p.userName || 'Author')}</div>
                                        <div class="author-education-badge">${escapeHtml(p.college || 'College')}</div>
                                    </div>
                                </div>
                                <span class="status-badge ${p.status === 'Recruiting' ? 'status-recruiting' : 'status-completed'}">
                                    ${p.status === 'Recruiting' ? '🟢 Recruiting' : '🔵 ' + escapeHtml(p.status || 'Active')}
                                </span>
                            </div>
                            <h3 class="project-card-title">${escapeHtml(p.title || 'Untitled')}</h3>
                            <p class="project-card-description">${escapeHtml(p.text || '')}</p>
                            <div class="project-tags-row">
                                ${(Array.isArray(p.skills) ? p.skills : [p.skills]).map(s => `<span class="tag-pill">${escapeHtml(s)}</span>`).join('')}
                            </div>
                            <div class="project-card-footer">
                                <span style="font-size:0.85rem; color:var(--text-muted); font-weight:600;">❤️ ${p.likes || 0} Likes • 👥 ${apps.length} Applicants</span>
                                <div style="display:flex; gap:8px;">
                                    ${isOwner ? `
                                        <button class="btn btn-outline" style="padding:6px 14px; font-size:0.82rem;" onclick="window.SyncUpSheet.open('sheet-review-applications', { reviewPostId: '${p.id}' })">
                                            📥 Apps (${apps.length})
                                        </button>
                                    ` : `
                                        ${hasApplied ? `
                                            <button class="btn-applied" disabled>Applied ✓</button>
                                        ` : (p.status === 'Recruiting' ? `
                                            <button class="btn btn-primary" style="padding:6px 14px; font-size:0.82rem;" onclick="window.SyncUpSheet.open('sheet-apply-team', { postId: '${p.id}' })">
                                                🤝 Join Team
                                            </button>
                                        ` : '')}
                                        <button class="btn btn-outline" style="padding:6px 14px; font-size:0.82rem;" onclick="window.SyncUpStore.triggerDirectChatCTA('${p.userUid || 'user_rohit'}', '${escapeHtml(p.userName || 'Collaborator')}', '${escapeHtml(p.userHandle || '')}', '${escapeHtml(p.title || 'Project')}')">
                                            💬 Chat
                                        </button>
                                    `}
                                </div>
                            </div>
                        </article>
                    `;
                }).join('');
            }
        }
    }

    window.SyncUpUIFeed = {
        renderFeed,
        renderRightRail,
        renderExplore
    };

})(window);
