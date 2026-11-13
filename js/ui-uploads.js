/**
 * js/ui-uploads.js
 * 
 * Layer 1 UI Component: My Uploads View
 * Subscribes to Store state. Renders user's project uploads, application review triggers, deletion.
 */

(function(window) {
    'use strict';

    function renderUploads(state) {
        const container = document.getElementById('my-uploads-grid');
        const badge = document.getElementById('my-uploads-badge');
        if (!container || !state.user) return;

        const currentUid = state.user.uid;
        let myPosts = (state.posts || []).filter(p => {
            return (p.userUid && (p.userUid === currentUid || p.userUid === 'guest_demo_user')) || (p.userHandle && p.userHandle === state.user.user);
        });

        // If user hasn't posted anything yet, use storyboard sample uploads for testing
        if (!myPosts.length) {
            myPosts = state.myUploads || window.SyncUpStore.defaultMyUploads;
        }

        if (badge) badge.innerText = myPosts.length;

        const escapeHtml = window.SyncUpUtils.escapeHtml;

        container.innerHTML = myPosts.map(p => {
            let tags = [];
            if (Array.isArray(p.skills)) tags = p.skills;
            else if (typeof p.skills === 'string') tags = p.skills.split(',').map(s => s.trim()).filter(Boolean);
            const appCount = (p.applications || []).length;

            return `
                <div class="upload-card">
                    ${p.img ? `<img src="${p.img}" class="upload-thumb" loading="lazy" decoding="async" alt="Screenshot">` : `<div class="upload-thumb" style="display:flex; align-items:center; justify-content:center; color:var(--text-muted); font-size:2.4rem; background:#ECFDF5;">💻</div>`}
                    <div class="upload-card-body">
                        <h3>${escapeHtml(p.title || 'Project Post')}</h3>
                        <p>${escapeHtml(p.text || '')}</p>
                        <div class="project-tags-row" style="margin-top:auto;">
                            ${tags.map(t => `<span class="tag-pill">${escapeHtml(t)}</span>`).join('')}
                        </div>
                    </div>
                    <div class="upload-card-footer">
                        <span style="font-size:0.85rem; color:var(--text-secondary);">
                            ❤️ ${p.likes || 0} &nbsp;&nbsp; 💬 ${(p.comments || []).length}
                        </span>
                        <div style="display:flex; gap:6px;">
                            <button class="btn btn-outline" style="padding:4px 8px; font-size:0.75rem;" onclick="window.SyncUpStore.openModal('modal-review-applications', { reviewPostId: '${p.id}' })">
                                📥 Apps (${appCount})
                            </button>
                            <button class="btn-icon" style="color:var(--danger); font-size:0.82rem; font-weight:600;" onclick="window.SyncUpStore.deletePost('${p.id}')" title="Delete post">
                                🗑️
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.SyncUpUIUploads = { renderUploads };

})(window);
