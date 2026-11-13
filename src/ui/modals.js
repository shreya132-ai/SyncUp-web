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
 */

import { escapeHtml } from '../utils/dom.js';
import { compressImage } from '../utils/imageCompress.js';
import { updateWordCounterDisplay, countWords } from '../utils/wordCount.js';
import { showToast } from './toast.js';
import { openSheet, closeSheet } from './sheet.js';
import { uploadImage } from '../services/storageService.js';
import { saveUserProfile } from '../services/authService.js';
import {
  createPost as storeCreatePost,
  applyToPost as storeApplyToPost,
  updateApplicationStatus as storeUpdateAppStatus,
  deletePost as storeDeletePost,
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
    container.innerHTML = apps.map((a, idx) => `
      <div class="applicant-card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="author-avatar" style="width:36px; height:36px;">
              ${a.applicantPic ? `<img src="${a.applicantPic}" loading="lazy" decoding="async" alt="Applicant" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` : (a.applicantName ? a.applicantName[0] : 'U')}
            </div>
            <div>
              <div style="font-weight:700; font-size:0.92rem;">
                ${escapeHtml(a.applicantName || 'Applicant')} 
                <span style="font-size:0.75rem; color:var(--color-text-muted);">${escapeHtml(a.applicantHandle || '')}</span>
              </div>
              <div style="font-size:var(--font-size-12); color:var(--color-text-brand); font-weight:600;">
                Applying for: ${escapeHtml(a.role || 'Member')}
              </div>
            </div>
          </div>
          <span class="status-badge ${a.status === 'accepted' ? 'status-chip-accepted' : (a.status === 'declined' ? 'status-chip-declined' : 'status-chip-pending')}">
            ${(a.status || 'pending').toUpperCase()}
          </span>
        </div>
        <div style="font-size:0.88rem; color:#334155; background:#fff; padding:10px; border-radius:6px; border:1px solid var(--border); margin-top:6px;">
          "${escapeHtml(a.pitch || '')}"
        </div>
        <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:6px;">
          ${a.status === 'pending' ? `
            <button class="btn btn-primary" style="padding:4px 12px; font-size:0.78rem;" onclick="window.SyncUpStore.updateApplicationStatus('${postId}', ${idx}, 'accepted')">✅ Accept</button>
            <button class="btn btn-outline" style="padding:4px 12px; font-size:0.78rem;" onclick="window.SyncUpStore.updateApplicationStatus('${postId}', ${idx}, 'declined')">❌ Decline</button>
          ` : ''}
          <button class="btn btn-outline" style="padding:4px 12px; font-size:0.78rem;" onclick="window.SyncUpSheet.close(); window.SyncUpStore.triggerDirectChatCTA('${a.applicantUid || 'user_rohit'}', '${escapeHtml(a.applicantName || 'Applicant')}', '${escapeHtml(a.applicantHandle || '')}', '${escapeHtml(post.title || 'Project')}')">💬 Chat</button>
        </div>
      </div>
    `).join('');
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
      if (state.user.pic) prevAv.innerHTML = `<img src="${state.user.pic}" loading="lazy" decoding="async" alt="Author" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
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
    if (postCompressedImage) {
      prevImg.src = postCompressedImage;
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

  const isOverLimit = count > 100;
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
    const compressed = await compressImage(file, 900, 900, 0.75);
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

  if (!desc && !postCompressedImage) {
    showToast({ message: "Please enter a description or upload a project screenshot.", icon: "⚠️", type: "error" });
    return;
  }

  const words = countWords(desc);
  if (words > 100) {
    showToast({ message: "Please limit your post to 100 words.", icon: "⚠️", type: "error" });
    return;
  }

  const skillsList = rawSkills.split(',').map(s => s.trim()).filter(Boolean);
  const currentUid = state.user.uid;

  let finalImageUrl = "";
  if (postCompressedImage) {
    try {
      finalImageUrl = await uploadImage(postCompressedImage, `posts/${currentUid}_${Date.now()}.webp`);
    } catch (e) {
      console.warn("Storage upload fallback:", e.message);
      finalImageUrl = postCompressedImage;
    }
  }

  const postDoc = {
    title: title || "Project Collaboration Request",
    text: desc,
    category: category,
    status: status,
    skills: skillsList.length ? skillsList : ["Collaboration"],
    githubUrl: githubUrl,
    demoUrl: demoUrl,
    img: finalImageUrl,
    userName: state.user.name || "Collaborator",
    userHandle: state.user.user || "@user",
    userPic: state.user.pic || "",
    userUid: currentUid,
    college: state.user.college || (state.user.edu || "Student Developer")
  };

  await storeCreatePost(postDoc);
  closeSheet();
  removePostScreenshot();
  goToCreateStep(1);

  // Clear form inputs
  const titleInp = document.getElementById('post-inp-title');
  const descInp = document.getElementById('post-inp-desc');
  const skillsInp = document.getElementById('post-inp-skills');
  const githubInp = document.getElementById('post-inp-github');
  const demoInp = document.getElementById('post-inp-demo');
  if (titleInp) titleInp.value = '';
  if (descInp) descInp.value = '';
  if (skillsInp) skillsInp.value = '';
  if (githubInp) githubInp.value = '';
  if (demoInp) demoInp.value = '';

  window.SyncUpApp?.switchTab('home');
}

export async function submitTeamApplication() {
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

  await storeApplyToPost(postId, role, pitch);
  if (pitchEl) pitchEl.value = '';
}

export function confirmSubmitReport() {
  const state = getState();
  const postId = state.ui && state.ui.currentReportingPostId;
  if (postId) {
    storeDeletePost(postId);
    showToast({ message: "Report submitted. The post has been hidden from your feed.", icon: "🛡️", type: "info" });
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

  setUser(updatedUser);

  try {
    await saveUserProfile(updatedUser.uid, updatedUser);
  } catch (e) {
    console.warn("Background profile save notice:", e.message);
  }

  if (btn) {
    btn.disabled = false;
    btn.innerText = "Save Changes";
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
  if (!updatedUser.skills.includes(skill)) {
    updatedUser.skills.push(skill);
  }
  input.value = "";

  setUser(updatedUser);
  closeSheet();
  showToast({ message: `Added ${skill} to your skills!`, icon: "🎯", type: "success" });

  saveUserProfile(updatedUser.uid, updatedUser).catch(() => {});
}
