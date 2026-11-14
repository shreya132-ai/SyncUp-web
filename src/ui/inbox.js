/**
 * src/ui/inbox.js
 * 
 * Layer 1 UI Component: Unified Inbox (Chats + Applications Tabs)
 * - Dynamic Badge Count: computes unread messages + pending applications
 * - Tab 1: Chats (1-on-1 DMs & Global Community Room, typing indicators, read receipts, timestamps)
 * - Tab 2: Applications (Received Team Applications + Sent Applications)
 * - Status chips (Pending amber, Accepted green, Declined gray)
 * - Accepting applicant automatically opens a chat with them; Undo toast on decline
 */

import { escapeHtml } from '../utils/dom.js';

export function calculateInboxBadge(state) {
  if (!state) return 0;
  let count = 0;
  const currentUid = state.user ? state.user.uid : '';
  const userHandle = state.user ? state.user.user : '';

  // 1. Count pending applications received on user's own posts
  const myPosts = (state.posts || []).filter(p => {
    return (currentUid && p.userUid === currentUid) || (userHandle && p.userHandle === userHandle);
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

  // 2. Count unread chat messages
  if (state.chats) {
    if (Array.isArray(state.chats.contacts)) {
      state.chats.contacts.forEach(c => {
        if (typeof c.unread === 'number' && c.unread > 0) {
          count += c.unread;
        }
      });
    }
    if (state.chats.threads) {
      Object.keys(state.chats.threads).forEach(key => {
        const msgs = state.chats.threads[key];
        if (Array.isArray(msgs)) {
          msgs.forEach(m => {
            if (!m.isMe && m.read === false) {
              count++;
            }
          });
        }
      });
    }
  }

  return count;
}

export function renderInbox(state) {
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
    renderChat(state);
  } else {
    renderApplicationsTab(state);
  }
}

export function getStatusChip(status) {
  const s = (status || 'pending').toLowerCase();
  if (s === 'accepted') return `<span class="status-badge status-chip-accepted">ACCEPTED ✓</span>`;
  if (s === 'declined') return `<span class="status-badge status-chip-declined">DECLINED</span>`;
  return `<span class="status-badge status-chip-pending">PENDING</span>`;
}

export function renderApplicationsTab(state) {
  const container = document.getElementById('inbox-applications-stream');
  if (!container) return;

  const currentUid = state.user ? state.user.uid : '';
  const userHandle = state.user ? state.user.user : '';

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
        <h3 style="font-size:1.15rem; color:var(--color-primary-dark);">
          📥 Team Applications Received (${receivedApps.length})
        </h3>
      </div>

      ${!receivedApps.length ? `
        <div class="empty-state" style="padding:32px 20px;">
          <p style="color:var(--color-text-muted); font-size:0.9rem;">
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
                      <span style="font-size:0.8rem; color:var(--color-text-muted); font-weight:normal;">${escapeHtml(app.applicantHandle)}</span>
                    </div>
                    <div style="font-size:var(--font-size-12); color:var(--color-text-brand); font-weight:600;">
                      Applied for: ${escapeHtml(app.role)}
                    </div>
                    <div style="font-size:0.75rem; color:var(--color-text-secondary);">
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
      <h3 style="font-size:1.15rem; color:var(--color-primary-dark); margin-bottom:14px;">
        📤 Applications You've Submitted (${sentApps.length})
      </h3>

      ${!sentApps.length ? `
        <div class="empty-state" style="padding:32px 20px;">
          <p style="color:var(--color-text-muted); font-size:0.9rem;">
            You haven't submitted any applications yet. Browse the Feed or Explore tab to find teams!
          </p>
        </div>
      ` : `
        <div style="display:flex; flex-direction:column; gap:12px;">
          ${sentApps.map(({ app, post }) => `
            <div class="application-item-card">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <div style="font-weight:700; font-size:0.95rem; color:var(--color-text-main);">
                    ${escapeHtml(post.title || 'Project')}
                  </div>
                  <div style="font-size:0.8rem; color:var(--color-text-secondary);">
                    Project Lead: ${escapeHtml(post.userName || 'Lead')} • Role: <strong>${escapeHtml(app.role)}</strong>
                  </div>
                </div>
                ${getStatusChip(app.status)}
              </div>
              ${app.pitch ? `
                <div style="font-size:0.85rem; color:var(--color-text-secondary); background:#F8FAFC; padding:10px; border-radius:6px; margin-top:8px;">
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

export function renderChat(state) {
  const chats = state.chats;
  const currentUid = state.user ? state.user.uid : 'guest';

  // 1. Update Mode Tabs
  const tabDm = document.getElementById('tab-mode-dm');
  const tabGlobal = document.getElementById('tab-mode-global');
  if (tabDm) tabDm.classList.toggle('active', chats.activeMode === 'dm');
  if (tabGlobal) tabGlobal.classList.toggle('active', chats.activeMode === 'global');

  // 2. Update Header Info
  const headerName = document.getElementById('chat-active-name');
  const statusLabel = document.getElementById('chat-active-mode-label');
  const av = document.getElementById('chat-active-avatar');
  const contactsPanel = document.getElementById('chat-contacts-panel');

  if (chats.activeMode === 'global') {
    if (headerName) headerName.innerText = "Global Collaborator Room";
    if (statusLabel) statusLabel.innerText = "Public Real-Time Channel";
    if (contactsPanel) contactsPanel.classList.add('hidden');
    if (av) av.innerText = "🌐";
  } else {
    if (contactsPanel) contactsPanel.classList.remove('hidden');
    if (chats.activeContact) {
      if (headerName) headerName.innerText = chats.activeContact.name;
      if (statusLabel) statusLabel.innerText = "Direct Message (Private)";
      if (av) {
        if (chats.activeContact.avatar) av.innerHTML = `<img src="${chats.activeContact.avatar}" loading="lazy" decoding="async" alt="Avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
        else av.innerText = chats.activeContact.name[0];
      }
    }
  }

  // 3. Render Contacts List
  const contactList = document.getElementById('chat-contacts-list');
  if (contactList && chats.contacts) {
    contactList.innerHTML = chats.contacts.map(c => `
      <div class="contact-card-item ${chats.activeContact && chats.activeContact.id === c.id ? 'active' : ''}" onclick="window.SyncUpStore.selectContact('${c.id}')">
        <div class="contact-avatar-box">
          ${c.avatar ? `<img src="${c.avatar}" loading="lazy" decoding="async" alt="Avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` : (c.name ? c.name[0] : 'U')}
          <span class="online-dot"></span>
        </div>
        <div class="contact-details-box">
          <div class="contact-name-row">
            <span class="contact-display-name">${escapeHtml(c.name)}</span>
            <span class="contact-last-time">${c.time}</span>
          </div>
          <div class="contact-snippet-text">${escapeHtml(c.lastMsg || '')}</div>
        </div>
      </div>
    `).join('');
  }

  // 4. Render Message Bubbles
  const messagesContainer = document.getElementById('chat-messages-container');
  if (!messagesContainer) return;

  let docId = "GLOBAL_COMMUNITY_CHAT";
  if (chats.activeMode === 'dm' && chats.activeContact) {
    const targetUid = chats.activeContact.uid || 'user_rohit';
    docId = "CHAT_" + [currentUid, targetUid].sort().join('_');
  }

  const messages = chats.threads[docId] || [];
  let allDisplay = [];

  if (!messages.length) {
    if (chats.activeMode === 'global') {
      allDisplay = [
        { isMe: false, sender: 'Team SyncUp', text: "Welcome to the Global Collaborator Room! Connect, collaborate, and find teammates for your projects.", time: "10:00 AM" }
      ];
    } else {
      const partnerName = chats.activeContact ? chats.activeContact.name : 'Rohit Kumar';
      allDisplay = [
        { isMe: false, sender: partnerName, text: `Hey! I saw your profile and project ideas on SyncUp. Let's connect!`, time: "10:20 AM" },
        { isMe: true, sender: 'You', text: "Hi! Thanks for reaching out. What technologies do you enjoy working with?", time: "10:22 AM" }
      ];
    }
  } else {
    messages.forEach(m => {
      const isMine = (m.uid && m.uid === currentUid) || (state.user && m.senderName === state.user.name) || (m.isMe === true);
      let timeStr = "Now";
      try {
        timeStr = new Date(m.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch(e) {}
      allDisplay.push({
        isMe: isMine,
        sender: isMine ? 'You' : (m.senderName || 'Collaborator'),
        text: m.text,
        time: timeStr
      });
    });
  }

  let bubblesHtml = allDisplay.map(msg => `
    <div class="msg-bubble-row ${msg.isMe ? 'mine' : 'theirs'}">
      <span class="msg-sender-name">${escapeHtml(msg.sender)}</span>
      <div class="msg-bubble">${escapeHtml(msg.text)}</div>
      <div class="msg-time-stamp">
        <span>${escapeHtml(msg.time)}</span>
        ${msg.isMe ? `<span class="read-receipt" title="Delivered & Read">✓✓</span>` : ''}
      </div>
    </div>
  `).join('');

  // Typing Indicator Bubble (when partner is typing in DM mode)
  if (chats.isPartnerTyping && chats.activeMode === 'dm') {
    const partnerName = chats.activeContact ? chats.activeContact.name : 'Partner';
    bubblesHtml += `
      <div class="typing-bubble-row">
        <div class="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span style="font-size:0.75rem; color:var(--color-text-muted); font-weight:500;">
          ${escapeHtml(partnerName)} is typing...
        </span>
      </div>
    `;
  }

  messagesContainer.innerHTML = bubblesHtml;
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

export function filterContacts(query) {
  const term = (query || "").toLowerCase();
  const contactList = document.getElementById('chat-contacts-list');
  if (!contactList) return;

  const state = window.SyncUpStore.getState();
  const filtered = state.chats.contacts.filter(c => c.name.toLowerCase().includes(term) || c.handle.toLowerCase().includes(term));

  contactList.innerHTML = filtered.map(c => `
    <div class="contact-card-item ${state.chats.activeContact && state.chats.activeContact.id === c.id ? 'active' : ''}" onclick="window.SyncUpStore.selectContact('${c.id}')">
      <div class="contact-avatar-box">
        ${c.avatar ? `<img src="${c.avatar}" loading="lazy" decoding="async" alt="Avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` : (c.name ? c.name[0] : 'U')}
        <span class="online-dot"></span>
      </div>
      <div class="contact-details-box">
        <div class="contact-name-row">
          <span class="contact-display-name">${escapeHtml(c.name)}</span>
          <span class="contact-last-time">${c.time}</span>
        </div>
        <div class="contact-snippet-text">${escapeHtml(c.lastMsg || '')}</div>
      </div>
    </div>
  `).join('');
}

export function switchInboxTab(tabName) {
  if (window.SyncUpStore) {
    window.SyncUpStore.setUi({ inboxTab: tabName });
  }
}
