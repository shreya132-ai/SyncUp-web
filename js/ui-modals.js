/**
 * js/ui-modals.js
 * 
 * Layer 1 UI Component: Modal Manager for the 6 Core Modals
 * Subscribes to Store state. Controls opening/closing and form submissions.
 * Only calls store actions (store.createPost, store.applyToPost, store.updateApplicationStatus).
 */

(function(window) {
    'use strict';

    let postCompressedImageBase64 = '';

    function renderModals(state) {
        const activeModal = state.ui.activeModal;
        const allModalNames = [
            'create-post',
            'apply-team',
            'review-applications',
            'report-post',
            'edit-profile',
            'add-skill',
            'onboarding'
        ];

        allModalNames.forEach(name => {
            const sheetEl = document.getElementById('sheet-' + name);
            const modalEl = document.getElementById('modal-' + name);
            const isOpen = activeModal === ('sheet-' + name) || activeModal === ('modal-' + name);
            if (sheetEl) sheetEl.classList.toggle('open', isOpen);
            if (modalEl) modalEl.classList.toggle('open', isOpen);
        });

        if (activeModal && activeModal.includes('review-applications')) {
            renderApplicationsModal(state);
        } else if (activeModal && activeModal.includes('create-post')) {
            updateLivePostPreview();
        }
    }

    function renderApplicationsModal(state) {
        const postId = state.ui.currentReviewPostId;
        let post = state.posts.find(p => p.id === postId);
        if (!post) {
            post = state.myUploads.find(p => p.id === postId);
        }
        if (!post) return;

        const container = document.getElementById('applications-list-container');
        if (!container) return;
        const apps = post.applications || [];
        const escapeHtml = window.SyncUpUtils.escapeHtml;

        if (!apps.length) {
            container.innerHTML = `
                <div style="text-align:center; padding:30px; color:var(--text-muted);">
                    <p>No team applications received yet.</p>
                </div>`;
        } else {
            container.innerHTML = apps.map((a, idx) => `
                <div class="applicant-card">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div class="author-avatar" style="width:36px; height:36px;">${a.applicantPic ? `<img src="${a.applicantPic}" loading="lazy" decoding="async" alt="Applicant" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` : (a.applicantName ? a.applicantName[0] : 'U')}</div>
                            <div>
                                <div style="font-weight:700; font-size:0.92rem;">${escapeHtml(a.applicantName)} <span style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(a.applicantHandle)}</span></div>
                                <div style="font-size:var(--font-size-12); color:var(--color-text-brand); font-weight:600;">Applying for: ${escapeHtml(a.role)}</div>
                            </div>
                        </div>
                        <span class="status-badge ${a.status === 'accepted' ? 'status-chip-accepted' : (a.status === 'declined' ? 'status-chip-declined' : 'status-chip-pending')}">${a.status.toUpperCase()}</span>
                    </div>
                    <div style="font-size:0.88rem; color:#334155; background:#fff; padding:10px; border-radius:6px; border:1px solid var(--border); margin-top:6px;">
                        "${escapeHtml(a.pitch)}"
                    </div>
                    <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:6px;">
                        ${a.status === 'pending' ? `
                            <button class="btn btn-primary" style="padding:4px 12px; font-size:0.78rem;" onclick="window.SyncUpStore.updateApplicationStatus('${postId}', ${idx}, 'accepted')">✅ Accept</button>
                            <button class="btn btn-outline" style="padding:4px 12px; font-size:0.78rem;" onclick="window.SyncUpStore.updateApplicationStatus('${postId}', ${idx}, 'declined')">❌ Decline</button>
                        ` : ''}
                        <button class="btn btn-outline" style="padding:4px 12px; font-size:0.78rem;" onclick="window.SyncUpStore.closeModal(); window.SyncUpStore.triggerDirectChatCTA('${a.applicantUid || 'user_rohit'}', '${escapeHtml(a.applicantName)}', '${escapeHtml(a.applicantHandle)}', '${escapeHtml(post.title || 'Project')}')">💬 Chat</button>
                    </div>
                </div>
            `).join('');
        }
    }

    function updateLivePostPreview() {
        const titleEl = document.getElementById('post-inp-title');
        const descEl = document.getElementById('post-inp-desc');
        const skillsEl = document.getElementById('post-inp-skills');
        const statusEl = document.getElementById('post-inp-status');

        const title = (titleEl && titleEl.value.trim()) ? titleEl.value.trim() : "Project Title Here";
        const desc = (descEl && descEl.value.trim()) ? descEl.value.trim() : "Your project description preview will appear here...";
        const rawSkills = (skillsEl && skillsEl.value.trim()) ? skillsEl.value.trim() : "";
        const status = (statusEl && statusEl.value) ? statusEl.value : "Recruiting";

        const prevTitle = document.getElementById('prev-title');
        const prevDesc = document.getElementById('prev-desc');
        if (prevTitle) prevTitle.innerText = title;
        if (prevDesc) prevDesc.innerText = desc;

        const badge = document.getElementById('prev-status-badge');
        if (badge) {
            if (status === 'Recruiting') {
                badge.className = 'status-badge status-recruiting';
                badge.innerText = '🟢 Recruiting';
            } else if (status === 'In Progress') {
                badge.className = 'status-badge status-full';
                badge.innerText = '🟡 Team Full';
            } else {
                badge.className = 'status-badge status-completed';
                badge.innerText = '🔵 Completed';
            }
        }

        const state = window.SyncUpStore.getState();
        if (state.user) {
            const pAuthName = document.getElementById('prev-author-name');
            const pAuthHandle = document.getElementById('prev-author-handle');
            const prevAv = document.getElementById('prev-avatar');
            if (pAuthName) pAuthName.innerText = state.user.name || "You";
            if (pAuthHandle) pAuthHandle.innerText = state.user.user || "@username";
            if (prevAv) {
                if (state.user.pic) prevAv.innerHTML = `<img src="${state.user.pic}" loading="lazy" decoding="async" alt="Author" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
                else prevAv.innerText = (state.user.name && state.user.name[0]) ? state.user.name[0].toUpperCase() : 'U';
            }
        }

        const tagsContainer = document.getElementById('prev-tags');
        if (tagsContainer) {
            if (rawSkills) {
                const tags = rawSkills.split(',').map(s => s.trim()).filter(Boolean);
                tagsContainer.innerHTML = tags.map(t => `<span class="tag-pill">${window.SyncUpUtils.escapeHtml(t)}</span>`).join('');
            } else {
                tagsContainer.innerHTML = `<span class="tag-pill">Skills Tag</span>`;
            }
        }

        const imgWrap = document.getElementById('prev-img-wrap');
        const prevImg = document.getElementById('prev-img');
        if (imgWrap && prevImg) {
            if (postCompressedImageBase64) {
                prevImg.src = postCompressedImageBase64;
                imgWrap.classList.remove('hidden');
            } else {
                imgWrap.classList.add('hidden');
            }
        }
    }

    function handleWordLimitCount(textarea) {
        if (!textarea) return;
        const words = textarea.value.trim().match(/\S+/g);
        const count = words ? words.length : 0;
        const counter = document.getElementById('post-word-counter');
        const remaining = document.getElementById('words-remaining-note');
        const nextBtn = document.getElementById('btn-next-preview');
        const submitBtn = document.getElementById('btn-submit-post');

        if (counter) {
            counter.innerText = `${count} / 100`;
            counter.classList.remove('word-counter-warning', 'word-counter-limit');

            if (count >= 100) {
                counter.classList.add('word-counter-limit');
                counter.style.color = "var(--danger)";
            } else if (count >= 90) {
                counter.classList.add('word-counter-warning');
                counter.style.color = "var(--warning)";
            } else {
                counter.style.color = "var(--text-muted)";
            }
        }

        if (remaining) {
            if (count > 100) {
                remaining.innerText = `Exceeded limit by ${count - 100} word${count - 100 > 1 ? 's' : ''}`;
                remaining.style.color = "var(--danger)";
            } else {
                remaining.innerText = `${100 - count} words remaining`;
                remaining.style.color = count >= 90 ? "var(--warning)" : "var(--text-muted)";
            }
        }

        const isOverLimit = count > 100;
        if (nextBtn) nextBtn.disabled = isOverLimit;
        if (submitBtn) submitBtn.disabled = isOverLimit;
    }

    /**
     * Post Creation Two-Step Wizard Navigation
     * Step 1: Write Details -> Step 2: Live Preview
     */
    function goToCreateStep(step) {
        const stepWrite = document.getElementById('create-step-write');
        const stepPrev = document.getElementById('create-step-preview');
        const tabWrite = document.getElementById('tab-step-write');
        const tabPrev = document.getElementById('tab-step-preview');

        if (step === 2) {
            const descEl = document.getElementById('post-inp-desc');
            const desc = descEl ? descEl.value.trim() : '';
            const words = desc ? desc.match(/\S+/g) : [];
            if (words && words.length > 100) {
                if (window.SyncUpToast) window.SyncUpToast.error("Please limit your description to 100 words before previewing.");
                else alert("Please limit your description to 100 words before previewing.");
                return;
            }
            updateLivePostPreview();
        }

        if (stepWrite) stepWrite.classList.toggle('hidden', step !== 1);
        if (stepPrev) stepPrev.classList.toggle('hidden', step !== 2);
        if (tabWrite) tabWrite.classList.toggle('active', step === 1);
        if (tabPrev) tabPrev.classList.toggle('active', step === 2);

        if (window.SyncUpStore) {
            window.SyncUpStore.setUi({ postCreationStep: step });
        }
    }

    async function handlePostScreenshotUpload(e) {
        if (!e.target.files || !e.target.files.length) return;
        const file = e.target.files[0];
        try {
            const compressed = await window.SyncUpUtils.compressImage(file, 900, 900, 0.75);
            postCompressedImageBase64 = compressed;
            const prev = document.getElementById('post-image-preview');
            const prevCont = document.getElementById('post-image-preview-container');
            if (prev) prev.src = compressed;
            if (prevCont) prevCont.classList.remove('hidden');
            updateLivePostPreview();
        } catch (err) {
            alert("Failed to process screenshot: " + err.message);
        }
    }

    function removePostScreenshot() {
        postCompressedImageBase64 = "";
        const fileInp = document.getElementById('post-file-input');
        if (fileInp) fileInp.value = "";
        const prevCont = document.getElementById('post-image-preview-container');
        if (prevCont) prevCont.classList.add('hidden');
        updateLivePostPreview();
    }

    function submitNewProjectPost() {
        const state = window.SyncUpStore.getState();
        if (!state.user) return alert("Please login to create a post.");

        const title = document.getElementById('post-inp-title').value.trim();
        const desc = document.getElementById('post-inp-desc').value.trim();
        const category = document.getElementById('post-inp-category').value;
        const status = document.getElementById('post-inp-status').value;
        const rawSkills = document.getElementById('post-inp-skills').value.trim();
        const githubUrl = document.getElementById('post-inp-github').value.trim();
        const demoUrl = document.getElementById('post-inp-demo').value.trim();

        if (!desc && !postCompressedImageBase64) {
            return alert("Please enter a description or upload a project screenshot.");
        }

        const words = desc ? desc.match(/\S+/g) : [];
        if (words && words.length > 100) {
            return alert("Please limit your post to 100 words.");
        }

        const skillsList = rawSkills.split(',').map(s => s.trim()).filter(Boolean);
        const currentUid = state.user.uid;

        const postDoc = {
            title: title || "Project Collaboration Request",
            text: desc,
            category: category || "College Projects",
            status: status || "Recruiting",
            skills: skillsList.length ? skillsList : ["Collaboration"],
            githubUrl: githubUrl || "",
            demoUrl: demoUrl || "",
            img: postCompressedImageBase64 || "",
            userName: state.user.name || "Collaborator",
            userHandle: state.user.user || "@user",
            userPic: state.user.pic || "",
            userUid: currentUid,
            college: state.user.college || (state.user.edu || "Student Developer")
        };

        window.SyncUpStore.createPost(postDoc);
        window.SyncUpStore.closeModal();
        removePostScreenshot();
        goToCreateStep(1);
        window.SyncUpApp.switchTab('home');
    }

    function submitTeamApplication() {
        const state = window.SyncUpStore.getState();
        const postId = state.ui.currentApplyingPostId;
        if (!postId) return;

        const roleEl = document.getElementById('apply-role-select');
        const pitchEl = document.getElementById('apply-pitch-text');
        const role = roleEl ? roleEl.value : 'Full Stack Developer';
        const pitch = pitchEl ? pitchEl.value.trim() : '';

        if (!pitch) return alert("Please write a brief pitch explaining your skills and why you want to join.");

        window.SyncUpStore.applyToPost(postId, role, pitch);
    }

    function confirmSubmitReport() {
        const state = window.SyncUpStore.getState();
        const postId = state.ui.currentReportingPostId;
        if (postId) {
            window.SyncUpStore.deletePost(postId);
            window.SyncUpUtils.showToast("Report submitted. The post has been hidden from your feed.", "🛡️");
        }
        window.SyncUpStore.closeModal();
    }

    function openEditProfileModal() {
        const state = window.SyncUpStore.getState();
        if (!state.user) return;
        const eName = document.getElementById('edit-prof-name');
        const eUser = document.getElementById('edit-prof-user');
        const eColl = document.getElementById('edit-prof-college');
        const eEdu = document.getElementById('edit-prof-edu');
        const eBio = document.getElementById('edit-prof-bio');
        const eSkills = document.getElementById('edit-prof-skills');

        if (eName) eName.value = state.user.name || "";
        if (eUser) eUser.value = state.user.user || "";
        if (eColl) eColl.value = state.user.college || "";
        if (eEdu) eEdu.value = state.user.edu || "";
        if (eBio) eBio.value = state.user.bio || "";
        if (eSkills) eSkills.value = (state.user.skills || []).join(', ');

        window.SyncUpStore.openModal('modal-edit-profile');
    }

    async function saveProfileChanges() {
        const state = window.SyncUpStore.getState();
        if (!state.user) return;

        const btn = document.getElementById('btn-save-profile');
        if (btn) {
            btn.disabled = true;
            btn.innerText = "Saving Changes...";
        }

        const eName = document.getElementById('edit-prof-name');
        const eUser = document.getElementById('edit-prof-user');
        const eColl = document.getElementById('edit-prof-college');
        const eEdu = document.getElementById('edit-prof-edu');
        const eBio = document.getElementById('edit-prof-bio');
        const eSkills = document.getElementById('edit-prof-skills');

        const updatedUser = { ...state.user };
        if (eName) updatedUser.name = eName.value.trim() || updatedUser.name;
        if (eUser) {
            let handle = eUser.value.trim() || updatedUser.user;
            if (!handle.startsWith('@')) handle = '@' + handle;
            updatedUser.user = handle;
        }
        if (eColl) updatedUser.college = eColl.value.trim();
        if (eEdu) updatedUser.edu = eEdu.value.trim();
        if (eBio) updatedUser.bio = eBio.value.trim();
        if (eSkills) {
            updatedUser.skills = eSkills.value.split(',').map(s => s.trim()).filter(Boolean);
        }

        window.SyncUpStore.setUser(updatedUser);

        try {
            await window.SyncUpDataService.saveUserProfile(updatedUser.uid, updatedUser);
        } catch(e) {
            console.warn("Background profile save notice:", e.message);
        }

        if (btn) {
            btn.disabled = false;
            btn.innerText = "Save Changes";
        }
        window.SyncUpStore.closeModal();
        window.SyncUpUtils.showToast("Profile updated successfully!", "✅");
    }

    function confirmAddSkill() {
        const state = window.SyncUpStore.getState();
        if (!state.user) return;
        const input = document.getElementById('inp-single-skill');
        const skill = input ? input.value.trim() : '';
        if (!skill) return;

        const updatedUser = { ...state.user };
        if (!updatedUser.skills) updatedUser.skills = [];
        updatedUser.skills.push(skill);
        input.value = "";

        window.SyncUpStore.setUser(updatedUser);
        window.SyncUpStore.closeModal();
        window.SyncUpUtils.showToast(`Added ${skill} to your skills!`, '🎯');

        window.SyncUpDataService.saveUserProfile(updatedUser.uid, updatedUser).catch(() => {});
    }

    window.SyncUpUIModals = {
        renderModals,
        updateLivePostPreview,
        handleWordLimitCount,
        goToCreateStep,
        handlePostScreenshotUpload,
        removePostScreenshot,
        submitNewProjectPost,
        submitTeamApplication,
        confirmSubmitReport,
        openEditProfileModal,
        saveProfileChanges,
        confirmAddSkill
    };

    window.goToCreateStep = goToCreateStep;
    window.SyncUpModals = window.SyncUpUIModals;

})(window);
