/**
 * src/ui/modals.js
 * 
 * Layer 1 UI Component: Sheet Controller for Core Dialogs & Wizards
 * - Sheet 1: Create Post (Two-step wizard: Write Details -> Live Preview,
 *   live word count 42/100, warnings at 90/100, aria-live, image canvas compression + Storage upload)
 * - Sheet 2: Apply to Join Team (Role selection, brief pitch)
 * - Sheet 3: Application Review (Applicant review, accept -> auto chat, decline -> undo toast)
 * - Sheet 4: Report Post (Reason selection, details)
 * - Sheet 5: Edit Profile (Full name, handle, bio, college, skills)
 * - Sheet 6: Add Skill (Single skill name)
 * - Refactored to data-action attributes for secure centralized event delegation.
 * - Enforces client-side rate limiting (button debouncing / pending locks) and URL safety on write.
 */

import { escapeHtml, safeUrl } from '../utils/dom.js';
import { getIcon } from '../utils/icons.js';
import { compressImage } from '../utils/imageCompress.js';
import { updateWordCounterDisplay, countWords } from '../utils/wordCount.js';
import { showToast } from './toast.js';
import { openSheet, closeSheet } from './sheet.js';
import { uploadImage } from '../services/storageService.js';
import { saveUserProfile } from '../services/authService.js';
import {
  createPost as storeCreatePost,
  editPost as storeEditPost,
  applyToPost as storeApplyToPost,
  updateApplicationStatus as storeUpdateAppStatus,
  deletePost as storeDeletePost,
  confirmDeletePost as storeConfirmDeletePost,
  reportPost as storeReportPost,
  setUser,
  setUi,
  getState
} from '../store/store.js';

let postCompressedImage = '';

export function renderModals(state) {
  const activeSheet = (state.ui && state.ui.activeSheet);
  if (activeSheet && activeSheet.includes('review-applications')) {
    renderApplicationsModal(state);
  } else if (activeSheet && activeSheet.includes('create-post')) {
    updateLivePostPreview();
  } else if (activeSheet && activeSheet.includes('apply-team')) {
    const applyingPostId = state.ui && state.ui.currentApplyingPostId;
    const post = (state.posts || []).find(p => p.id === applyingPostId) || (state.myUploads || []).find(p => p.id === applyingPostId);
    const titleEl = document.getElementById('apply-modal-project-title');
    if (titleEl && post) {
      titleEl.innerText = `Applying to "${post.title || 'Project'}" (Lead: ${post.userName || 'Author'})`;
    }
    const roleSelect = document.getElementById('apply-role-select');
    if (roleSelect && post) {
      const openRoles = post.rolesNeeded ? post.rolesNeeded.filter(r => !r.filled) : [];
      if (openRoles.length > 0) {
        roleSelect.innerHTML = openRoles.map(r => `<option value="${escapeHtml(r.role)}">${escapeHtml(r.role)}</option>`).join('') + '<option value="Other Collaborator">Other Collaborator</option>';
      }
    }
  }
}

export function renderApplicationsModal(state) {
  const postId = state.ui && state.ui.currentReviewPostId;
  let post = (state.posts || []).find(p => p.id === postId);
  if (!post && state.myUploads) {
    post = state.myUploads.find(p => p.id === postId);
  }
  if (!post) return;

  const container = document.getElementById('applications-list-container');
  if (!container) return;
  const apps = post.applications || [];

  if (!apps.length) {
    container.innerHTML = `
      <div style="text-align:center; padding:30px; color:var(--color-text-muted);">
        <p>No team applications received yet.</p>
      </div>`;
  } else {
    container.innerHTML = apps.map((a, idx) => {
      const aPic = safeUrl(a.applicantPic);
      return `
        <div class="applicant-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:10px;">
              <div class="author-avatar" style="width:36px; height:36px;">
                ${aPic ? `<img src="${aPic}" loading="lazy" decoding="async" alt="Applicant" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` : (a.applicantName ? escapeHtml(a.applicantName[0]) : 'U')}
              </div>
              <div>
                <div style="font-weight:700; font-size:var(--font-size-14);">
                  ${escapeHtml(a.applicantName || 'Applicant')} 
                  <span style="font-size:var(--font-size-12); color:var(--color-text-muted);">${escapeHtml(a.applicantHandle || '')}</span>
                </div>
                <div style="font-size:var(--font-size-12); color:var(--color-text-brand); font-weight:600;">
                  Applying for: ${escapeHtml(a.role || 'Member')}
                </div>
              </div>
            </div>
            <span class="status-badge ${a.status === 'accepted' ? 'status-chip-accepted' : (a.status === 'declined' ? 'status-chip-declined' : 'status-chip-pending')}">
              ${escapeHtml((a.status || 'pending').toUpperCase())}
            </span>
          </div>
          <div style="font-size:var(--font-size-14); color:var(--color-text); background:var(--color-surface-subtle); padding:10px; border-radius:6px; border:1px solid var(--border); margin-top:6px;">
            "${escapeHtml(a.pitch || '')}"
          </div>
          <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:6px;">
            ${a.status === 'pending' ? `
              <button type="button" class="btn btn-primary" style="padding:4px 12px; font-size:var(--font-size-12); display:inline-flex; align-items:center; gap:4px;" data-action="update-app-status" data-post-id="${escapeHtml(postId)}" data-app-index="${idx}" data-status="accepted">${getIcon('check', { size: 14 })} Accept</button>
              <button type="button" class="btn btn-outline" style="padding:4px 12px; font-size:var(--font-size-12); display:inline-flex; align-items:center; gap:4px;" data-action="update-app-status" data-post-id="${escapeHtml(postId)}" data-app-index="${idx}" data-status="declined">${getIcon('x', { size: 14 })} Decline</button>
            ` : ''}
            <button type="button" class="btn btn-outline" style="padding:4px 12px; font-size:var(--font-size-12); display:inline-flex; align-items:center; gap:4px;" data-action="chat-cta-close" data-user-uid="${escapeHtml(a.applicantUid || 'user_rohit')}" data-user-name="${escapeHtml(a.applicantName || 'Applicant')}" data-user-handle="${escapeHtml(a.applicantHandle || '')}" data-project-title="${escapeHtml(post.title || 'Project')}">${getIcon('message-square', { size: 14 })} Chat</button>
          </div>
        </div>
      `;
    }).join('');
  }
}

export function updateLivePostPreview() {
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

  const state = getState();
  if (state.user) {
    const pAuthName = document.getElementById('prev-author-name');
    const pAuthHandle = document.getElementById('prev-author-handle');
    const prevAv = document.getElementById('prev-avatar');
    if (pAuthName) pAuthName.innerText = state.user.name || "You";
    if (pAuthHandle) pAuthHandle.innerText = state.user.user || "@username";
    if (prevAv) {
      const validPic = safeUrl(state.user.pic);
      if (validPic) prevAv.innerHTML = `<img src="${validPic}" loading="lazy" decoding="async" alt="Author" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
      else prevAv.innerText = (state.user.name && state.user.name[0]) ? state.user.name[0].toUpperCase() : 'U';
    }
  }

  const tagsContainer = document.getElementById('prev-tags');
  if (tagsContainer) {
    if (rawSkills) {
      const tags = rawSkills.split(',').map(s => s.trim()).filter(Boolean);
      tagsContainer.innerHTML = tags.map(t => `<span class="tag-pill">${escapeHtml(t)}</span>`).join('');
    } else {
      tagsContainer.innerHTML = `<span class="tag-pill">Skills Tag</span>`;
    }
  }

  const imgWrap = document.getElementById('prev-img-wrap');
  const prevImg = document.getElementById('prev-img');
  if (imgWrap && prevImg) {
    const validImg = safeUrl(postCompressedImage);
    if (validImg) {
      prevImg.src = validImg;
      imgWrap.classList.remove('hidden');
    } else {
      imgWrap.classList.add('hidden');
    }
  }
}

export function handleWordLimitCount(textarea) {
  if (!textarea) return;
  const count = countWords(textarea.value);
  const counterEl = document.getElementById('post-word-counter');
  const remainingEl = document.getElementById('words-remaining-note');
  const nextBtn = document.getElementById('btn-next-preview');
  const submitBtn = document.getElementById('btn-submit-post');

  updateWordCounterDisplay(counterEl, remainingEl, count, 100);

  const isOverLimit = count > 100 || (textarea.value && textarea.value.length > 800);
  if (nextBtn) nextBtn.disabled = isOverLimit;
  if (submitBtn) submitBtn.disabled = isOverLimit;
}

export function goToCreateStep(step) {
  const stepWrite = document.getElementById('create-step-write');
  const stepPrev = document.getElementById('create-step-preview');
  const tabWrite = document.getElementById('tab-step-write');
  const tabPrev = document.getElementById('tab-step-preview');

  if (step === 2) {
    const descEl = document.getElementById('post-inp-desc');
    const desc = descEl ? descEl.value.trim() : '';
    const words = desc ? desc.match(/\S+/g) : [];
    if (words && words.length > 100) {
      showToast({ message: "Please limit your description to 100 words before previewing.", icon: "⚠️", type: "error" });
      return;
    }
    if (desc.length > 800) {
      showToast({ message: "Description exceeds maximum 800 characters limit.", icon: "⚠️", type: "error" });
      return;
    }
    updateLivePostPreview();
  }

  if (stepWrite) stepWrite.classList.toggle('hidden', step !== 1);
  if (stepPrev) stepPrev.classList.toggle('hidden', step !== 2);
  if (tabWrite) tabWrite.classList.toggle('active', step === 1);
  if (tabPrev) tabPrev.classList.toggle('active', step === 2);

  setUi({ postCreationStep: step });
}

export async function handlePostScreenshotUpload(e) {
  if (!e.target.files || !e.target.files.length) return;
  const file = e.target.files[0];
  try {
    // Compress post screenshot targeting under 150 KB
    const compressed = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.82, maxBytes: 150 * 1024 });
    postCompressedImage = compressed;
    const prev = document.getElementById('post-image-preview');
    const prevCont = document.getElementById('post-image-preview-container');
    if (prev) prev.src = compressed;
    if (prevCont) prevCont.classList.remove('hidden');
    updateLivePostPreview();
  } catch (err) {
    showToast({ message: "Failed to process screenshot: " + err.message, icon: "⚠️", type: "error" });
  }
}

export function removePostScreenshot() {
  postCompressedImage = "";
  const fileInp = document.getElementById('post-file-input');
  if (fileInp) fileInp.value = "";
  const prevCont = document.getElementById('post-image-preview-container');
  if (prevCont) prevCont.classList.add('hidden');
  updateLivePostPreview();
}

export async function submitNewProjectPost() {
  const submitBtn = document.getElementById('btn-submit-post');
  if (submitBtn && submitBtn.disabled) return;

  const state = getState();
  if (!state.user) {
    showToast({ message: "Please login to create a post.", icon: "🔒", type: "info" });
    return;
  }

  const title = (document.getElementById('post-inp-title')?.value || '').trim();
  const desc = (document.getElementById('post-inp-desc')?.value || '').trim();
  const category = document.getElementById('post-inp-category')?.value || 'College Projects';
  const status = document.getElementById('post-inp-status')?.value || 'Recruiting';
  const rawSkills = (document.getElementById('post-inp-skills')?.value || '').trim();
  const githubUrl = (document.getElementById('post-inp-github')?.value || '').trim();
  const demoUrl = (document.getElementById('post-inp-demo')?.value || '').trim();

  // Field size and type validations
  if (title.length > 120) {
    showToast({ message: "Project title must be 120 characters or fewer.", icon: "⚠️", type: "error" });
    return;
  }
  if (!desc && !postCompressedImage) {
    showToast({ message: "Please enter a description or upload a project screenshot.", icon: "⚠️", type: "error" });
    return;
  }
  if (desc.length > 800) {
    showToast({ message: "Project text must be 800 characters or fewer.", icon: "⚠️", type: "error" });
    return;
  }
  const words = countWords(desc);
  if (words > 100) {
    showToast({ message: "Please limit your post to 100 words.", icon: "⚠️", type: "error" });
    return;
  }

  const skillsList = rawSkills.split(',').map(s => s.trim()).filter(Boolean);
  if (skillsList.length > 10) {
    showToast({ message: "Please limit to at most 10 skills.", icon: "⚠️", type: "error" });
    return;
  }

  // URL Safety Validation on Write
  if (githubUrl && !safeUrl(githubUrl, { allowDataImage: false })) {
    showToast({ message: "Please enter a valid HTTP or HTTPS GitHub repository URL.", icon: "⚠️", type: "error" });
    return;
  }
  if (demoUrl && !safeUrl(demoUrl, { allowDataImage: false })) {
    showToast({ message: "Please enter a valid HTTP or HTTPS Live Demo URL.", icon: "⚠️", type: "error" });
    return;
  }

  // Client-side Rate Limiting: Lock submit button while pending
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = "Publishing Post...";
  }

  const currentUid = state.user.uid;

  let finalImageUrl = "";
  if (postCompressedImage) {
    try {
      // Storage rules enforce posts/{uid}/... path
      finalImageUrl = await uploadImage(postCompressedImage, `posts/${currentUid}/${Date.now()}.jpg`);
    } catch (e) {
      console.warn("Storage upload fallback:", e.message);
      finalImageUrl = postCompressedImage;
    }
  }

  const rawRoles = (document.getElementById('post-inp-roles')?.value || '').trim();
  const rolesList = rawRoles ? rawRoles.split(',').map(r => r.trim()).filter(Boolean) : [];
  const rolesNeeded = rolesList.length
    ? rolesList.map(r => ({ role: r, filled: false }))
    : (skillsList.length ? skillsList.slice(0, 2).map(s => ({ role: `${s} Developer`, filled: false })) : [{ role: 'Collaborator', filled: false }]);

  const postDoc = {
    title: title || "Project Collaboration Request",
    text: desc,
    category: category,
    status: status,
    skills: skillsList.length ? skillsList : ["Collaboration"],
    rolesNeeded: rolesNeeded,
    githubUrl: githubUrl ? safeUrl(githubUrl, { allowDataImage: false }) : "",
    demoUrl: demoUrl ? safeUrl(demoUrl, { allowDataImage: false }) : "",
    img: finalImageUrl,
    userName: state.user.name || "Collaborator",
    userHandle: state.user.user || "@user",
    userPic: state.user.pic || "",
    userUid: currentUid,
    college: state.user.college || (state.user.edu || "Student Developer"),
    isDemo: Boolean(state.user.isDemo || state.user.isAnonymous)
  };

  try {
    await storeCreatePost(postDoc);
    closeSheet();
    removePostScreenshot();
    goToCreateStep(1);

    // Clear form inputs
    const titleInp = document.getElementById('post-inp-title');
    const descInp = document.getElementById('post-inp-desc');
    const skillsInp = document.getElementById('post-inp-skills');
    const rolesInp = document.getElementById('post-inp-roles');
    const githubInp = document.getElementById('post-inp-github');
    const demoInp = document.getElementById('post-inp-demo');
    if (titleInp) titleInp.value = '';
    if (descInp) descInp.value = '';
    if (skillsInp) skillsInp.value = '';
    if (rolesInp) rolesInp.value = '';
    if (githubInp) githubInp.value = '';
    if (demoInp) demoInp.value = '';

    window.SyncUpApp?.switchTab('home');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = "+ Post to Feed";
    }
  }
}

export async function submitTeamApplication() {
  const submitBtn = document.getElementById('btn-submit-application');
  if (submitBtn && submitBtn.disabled) return;

  const state = getState();
  const postId = state.ui && state.ui.currentApplyingPostId;
  if (!postId) return;

  const roleEl = document.getElementById('apply-role-select');
  const pitchEl = document.getElementById('apply-pitch-text');
  const role = roleEl ? roleEl.value : 'Full Stack Developer';
  const pitch = pitchEl ? pitchEl.value.trim() : '';

  if (!pitch) {
    showToast({ message: "Please write a brief pitch explaining your skills and why you want to join.", icon: "⚠️", type: "error" });
    return;
  }
  if (pitch.length > 1000) {
    showToast({ message: "Please limit your application pitch to 1000 characters.", icon: "⚠️", type: "error" });
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = "Submitting Pitch...";
  }

  try {
    await storeApplyToPost(postId, role, pitch);
    if (pitchEl) pitchEl.value = '';
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = "Submit Application";
    }
  }
}

export function confirmSubmitReport() {
  const submitBtn = document.querySelector('#sheet-report-post .btn-primary');
  if (submitBtn && submitBtn.disabled) return;

  const state = getState();
  const postId = state.ui && state.ui.currentReportingPostId;
  if (postId) {
    const reasonEl = document.getElementById('report-reason-select');
    const detailsEl = document.getElementById('report-details-text');
    const reason = reasonEl ? reasonEl.value : 'Other violation';
    const details = detailsEl ? detailsEl.value.trim() : '';

    if (submitBtn) submitBtn.disabled = true;

    try {
      storeReportPost(postId, reason, details);
      if (detailsEl) detailsEl.value = '';
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }
  closeSheet();
}

export function openEditProfileModal() {
  const state = getState();
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

  openSheet('sheet-edit-profile');
}

export async function saveProfileChanges() {
  const state = getState();
  if (!state.user) return;

  const btn = document.getElementById('btn-save-profile');
  if (btn && btn.disabled) return;

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
    updatedUser.skills = eSkills.value.split(',').map(s => s.trim()).filter(Boolean).slice(0, 10);
  }

  setUser(updatedUser);

  try {
    await saveUserProfile(updatedUser.uid, updatedUser);
  } catch (e) {
    console.warn("Background profile save notice:", e.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = "Save Changes";
    }
  }

  closeSheet();
  showToast({ message: "Profile updated successfully!", icon: "✅", type: "success" });
}

export async function confirmAddSkill() {
  const state = getState();
  if (!state.user) return;
  const input = document.getElementById('inp-single-skill');
  const skill = input ? input.value.trim() : '';
  if (!skill) return;

  const updatedUser = { ...state.user };
  if (!updatedUser.skills) updatedUser.skills = [];
  if (updatedUser.skills.length >= 10) {
    showToast({ message: "Maximum 10 skills allowed. Please remove a skill before adding another.", icon: "⚠️", type: "error" });
    return;
  }
  if (!updatedUser.skills.includes(skill)) {
    updatedUser.skills.push(skill);
  }
  input.value = "";

  setUser(updatedUser);
  closeSheet();
  showToast({ message: `Added ${skill} to your skills!`, icon: "🎯", type: "success" });

  saveUserProfile(updatedUser.uid, updatedUser).catch(() => {});
}

export function openEditPost(postId) {
  const state = getState();
  const post = state.posts.find(p => p.id === postId) || state.myUploads.find(p => p.id === postId);
  if (!post) return;

  state.ui.pendingEditPostId = postId;

  const titleInp = document.getElementById('edit-post-inp-title');
  const catInp = document.getElementById('edit-post-inp-category');
  const statusInp = document.getElementById('edit-post-inp-status');
  const descInp = document.getElementById('edit-post-inp-desc');
  const skillsInp = document.getElementById('edit-post-inp-skills');
  const rolesInp = document.getElementById('edit-post-inp-roles');
  const githubInp = document.getElementById('edit-post-inp-github');
  const demoInp = document.getElementById('edit-post-inp-demo');

  if (titleInp) titleInp.value = post.title || '';
  if (catInp) catInp.value = post.category || 'College Projects';
  if (statusInp) statusInp.value = post.status || 'Recruiting';
  if (descInp) descInp.value = post.text || '';
  if (skillsInp) skillsInp.value = Array.isArray(post.skills) ? post.skills.join(', ') : '';
  if (rolesInp) {
    const roleNames = post.rolesNeeded ? post.rolesNeeded.map(r => r.role).join(', ') : '';
    rolesInp.value = roleNames;
  }
  if (githubInp) githubInp.value = post.githubUrl || '';
  if (demoInp) demoInp.value = post.demoUrl || '';

  openSheet('sheet-edit-post');
}

export async function submitEditPost() {
  const state = getState();
  const postId = state.ui && state.ui.pendingEditPostId;
  if (!postId) return;

  const title = (document.getElementById('edit-post-inp-title')?.value || '').trim();
  const category = document.getElementById('edit-post-inp-category')?.value || 'College Projects';
  const status = document.getElementById('edit-post-inp-status')?.value || 'Recruiting';
  const desc = (document.getElementById('edit-post-inp-desc')?.value || '').trim();
  const rawSkills = (document.getElementById('edit-post-inp-skills')?.value || '').trim();
  const rawRoles = (document.getElementById('edit-post-inp-roles')?.value || '').trim();
  const githubUrl = (document.getElementById('edit-post-inp-github')?.value || '').trim();
  const demoUrl = (document.getElementById('edit-post-inp-demo')?.value || '').trim();

  if (!title) {
    showToast({ message: "Please enter a project title.", icon: "⚠️", type: "error" });
    return;
  }
  if (!desc) {
    showToast({ message: "Please enter a project description.", icon: "⚠️", type: "error" });
    return;
  }

  const skills = rawSkills.split(',').map(s => s.trim()).filter(Boolean);
  const rolesList = rawRoles.split(',').map(r => r.trim()).filter(Boolean);

  const existingPost = state.posts.find(p => p.id === postId) || state.myUploads.find(p => p.id === postId);
  const existingRoles = existingPost?.rolesNeeded || [];

  const rolesNeeded = rolesList.map(r => {
    const existing = existingRoles.find(er => er.role.toLowerCase() === r.toLowerCase());
    return existing || { role: r, filled: false };
  });

  const updatedFields = {
    title,
    category,
    status,
    text: desc,
    skills,
    rolesNeeded,
    githubUrl,
    demoUrl
  };

  await storeEditPost(postId, updatedFields);
  closeSheet();
}
