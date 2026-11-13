/**
 * js/ui-inbox.js
 * 
 * Layer 1 UI Component: Unified Inbox (Chats + Applications Tabs)
 * - Tab 1: Chats (1-on-1 DMs & Global Community Room)
 * - Tab 2: Applications (Received Team Applications + Sent Applications)
 * - Dynamic Badge Count: computes unread messages + pending applications
 */

(function(window) {
    'use strict';

    function calculateInboxBadge(state) {
        let count = 0;
        const currentUid = state.user ? state.user.uid : '';
        const userHandle = state.user ? state.user.user : '';

        // Count pending applications received on user's posts
        const myPosts = (state.posts || []).filter(p => {
            return (p.userUid && p.userUid === currentUid) || (userHandle && p.userHandle === userHandle);
        });

        myPosts.forEach(p => {
            (p.applications || []).forEach(a => {
                if (a.status === 'pending') count++;
            });
        });

        // Also count pending from sample uploads if applicable
        if (myPosts.length === 0 && state.myUploads) {
            state.myUploads.forEach(p => {
                (p.applications || []).forEach(a => {
                    if (a.status === 'pending') count++;
                });
            });
        }

        return count;
    }

    function renderInbox(state) {
        const badgeCount = calculateInboxBadge(state);

        // Update Sidebar and Mobile Badges
        const sideBadge = document.getElementById('inbox-sidebar-badge');
        const mobBadge = document.getElementById('inbox-mobile-badge');
        const tabAppsBadge = document.getElementById('inbox-tab-apps-badge');

        if (sideBadge) {
            sideBadge.innerText = badgeCount;
            sideBadge.style.display = badgeCount > 0 ? 'inline-block' : 'none';
        }
        if (mobBadge) {
            mobBadge.innerText = badgeCount;
            mobBadge.style.display = badgeCount > 0 ? 'inline-block' : 'none';
        }
        if (tabAppsBadge) {
            tabAppsBadge.innerText = badgeCount;
            tabAppsBadge.style.display = badgeCount > 0 ? 'inline-block' : 'none';
        }

        // Check active inbox tab
        const activeInboxTab = (state.ui && state.ui.inboxTab) || 'chats';

        const btnChats = document.getElementById('btn-inbox-tab-chats');
        const btnApps = document.getElementById('btn-inbox-tab-apps');
        const paneChats = document.getElementById('inbox-pane-chats');
        const paneApps = document.getElementById('inbox-pane-apps');

        if (btnChats) btnChats.classList.toggle('active', activeInboxTab === 'chats');
        if (btnApps) btnApps.classList.toggle('active', activeInboxTab === 'applications');

        if (paneChats) paneChats.classList.toggle('hidden', activeInboxTab !== 'chats');
        if (paneApps) paneApps.classList.toggle('hidden', activeInboxTab !== 'applications');

        if (activeInboxTab === 'chats') {
            if (window.SyncUpUIChat) window.SyncUpUIChat.renderChat(state);
        } else {
            renderApplicationsTab(state);
        }
    }

    function getStatusChip(status) {
        const s = (status || 'pending').toLowerCase();
        if (s === 'accepted') return `<span class="status-badge status-chip-accepted">ACCEPTED ✓</span>`;
        if (s === 'declined') return `<span class="status-badge status-chip-declined">DECLINED</span>`;
        return `<span class="status-badge status-chip-pending">PENDING</span>`;
    }

    function renderApplicationsTab(state) {
        const container = document.getElementById('inbox-applications-stream');
        if (!container) return;

        const currentUid = state.user ? state.user.uid : '';
        const userHandle = state.user ? state.user.user : '';
        const escapeHtml = window.SyncUpUtils.escapeHtml;

        // 1. Applications Received on User's Posts
        let myPosts = (state.posts || []).filter(p => {
            return (p.userUid && p.userUid === currentUid) || (userHandle && p.userHandle === userHandle);
        });
        if (!myPosts.length && state.myUploads) {
            myPosts = state.myUploads;
        }

        let receivedApps = [];
        myPosts.forEach(post => {
            (post.applications || []).forEach((app, index) => {
                receivedApps.push({
                    app,
                    post,
                    appIndex: index
                });
            });
        });

        // 2. Applications Sent by User
        let sentApps = [];
        (state.posts || []).forEach(post => {
            (post.applications || []).forEach(app => {
                if ((app.applicantUid && app.applicantUid === currentUid) || (userHandle && app.applicantHandle === userHandle)) {
                    sentApps.push({
                        app,
                        post
                    });
                }
            });
        });

        // Add sample sent app if demo mode and empty
        if (!sentApps.length && state.user && state.user.uid === 'guest_demo_user') {
            sentApps.push({
                app: {
                    role: "FastAPI Engineer",
                    pitch: "I built backend services using FastAPI and PostgreSQL and can implement real-time question generation.",
                    status: "pending"
                },
                post: {
                    title: "AI Mock Interview & Resume Analyzer",
                    userName: "Priya Sharma"
                }
            });
        }

        container.innerHTML = `
            <div style="margin-bottom:28px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
                    <h3 style="font-size:1.15rem; color:var(--primary-dark);">
                        📥 Team Applications Received (${receivedApps.length})
                    </h3>
                </div>

                ${!receivedApps.length ? `
                    <div class="empty-state" style="padding:32px 20px;">
                        <p style="color:var(--text-muted); font-size:0.9rem;">
                            No incoming applications on your project posts yet. Create a recruiting post to invite collaborators!
                        </p>
                    </div>
                ` : `
                    <div style="display:flex; flex-direction:column; gap:14px;">
                        ${receivedApps.map(({ app, post, appIndex }) => `
                            <div class="applicant-card">
                                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                                    <div style="display:flex; align-items:center; gap:12px;">
                                        <div class="author-avatar" style="width:40px; height:40px;">
                                            ${app.applicantPic ? `<img src="${app.applicantPic}" loading="lazy" decoding="async" alt="Applicant" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` : (app.applicantName ? app.applicantName[0] : 'U')}
                                        </div>
                                        <div>
                                            <div style="font-weight:700; font-size:0.95rem;">
                                                ${escapeHtml(app.applicantName)} 
                                                <span style="font-size:0.8rem; color:var(--text-muted); font-weight:normal;">${escapeHtml(app.applicantHandle)}</span>
                                            </div>
                                            <div style="font-size:var(--font-size-12); color:var(--color-text-brand); font-weight:600;">
                                                Applied for: ${escapeHtml(app.role)}
                                            </div>
                                            <div style="font-size:0.75rem; color:var(--text-secondary);">
                                                Project: <strong>${escapeHtml(post.title || 'Your Project')}</strong>
                                            </div>
                                        </div>
                                    </div>
                                    ${getStatusChip(app.status)}
                                </div>

                                <div style="font-size:0.88rem; color:#334155; background:#fff; padding:12px; border-radius:8px; border:1px solid var(--border); margin:8px 0;">
                                    "${escapeHtml(app.pitch)}"
                                </div>

                                <div style="display:flex; gap:8px; justify-content:flex-end;">
                                    ${app.status === 'pending' ? `
                                        <button class="btn btn-primary" style="padding:5px 14px; font-size:0.8rem;" onclick="window.SyncUpStore.updateApplicationStatus('${post.id}', ${appIndex}, 'accepted')">
                                            ✅ Accept
                                        </button>
                                        <button class="btn btn-outline" style="padding:5px 14px; font-size:0.8rem;" onclick="window.SyncUpStore.updateApplicationStatus('${post.id}', ${appIndex}, 'declined')">
                                            ❌ Decline
                                        </button>
                                    ` : ''}
                                    <button class="btn btn-outline" style="padding:5px 14px; font-size:0.8rem;" onclick="window.SyncUpStore.triggerDirectChatCTA('${app.applicantUid || 'user_rohit'}', '${escapeHtml(app.applicantName)}', '${escapeHtml(app.applicantHandle)}', '${escapeHtml(post.title || 'Project')}')">
                                        💬 Chat
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>

            <div>
                <h3 style="font-size:1.15rem; color:var(--primary-dark); margin-bottom:14px;">
                    📤 Applications You've Submitted (${sentApps.length})
                </h3>

                ${!sentApps.length ? `
                    <div class="empty-state" style="padding:32px 20px;">
                        <p style="color:var(--text-muted); font-size:0.9rem;">
                            You haven't submitted any applications yet. Browse the Feed or Explore tab to find teams!
                        </p>
                    </div>
                ` : `
                    <div style="display:flex; flex-direction:column; gap:12px;">
                        ${sentApps.map(({ app, post }) => `
                            <div class="application-item-card">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <div>
                                        <div style="font-weight:700; font-size:0.95rem; color:var(--text-main);">
                                            ${escapeHtml(post.title || 'Project')}
                                        </div>
                                        <div style="font-size:0.8rem; color:var(--text-secondary);">
                                            Project Lead: ${escapeHtml(post.userName || 'Lead')} • Role: <strong>${escapeHtml(app.role)}</strong>
                                        </div>
                                    </div>
                                    ${getStatusChip(app.status)}
                                </div>
                                ${app.pitch ? `
                                    <div style="font-size:0.85rem; color:var(--text-secondary); background:#F8FAFC; padding:10px; border-radius:6px;">
                                        Pitch: "${escapeHtml(app.pitch)}"
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        `;
    }

    function switchInboxTab(tabName) {
        if (window.SyncUpStore) {
            window.SyncUpStore.setUi({ inboxTab: tabName });
        }
    }

    window.SyncUpUIInbox = {
        renderInbox,
        switchInboxTab,
        calculateInboxBadge
    };

    window.switchInboxTab = switchInboxTab;

})(window);
