/**
 * js/ui-chat.js
 * 
 * Layer 1 UI Component: Real-Time Chat & Direct Messaging View
 * Subscribes to Store state. Renders contact roster and message bubbles.
 * Dispatches store.sendMessage, store.setChatMode, store.selectContact.
 */

(function(window) {
    'use strict';

    function renderChat(state) {
        const escapeHtml = window.SyncUpUtils.escapeHtml;
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
                    <span style="font-size:0.75rem; color:var(--text-muted); font-weight:500;">
                        ${escapeHtml(partnerName)} is typing...
                    </span>
                </div>
            `;
        }

        messagesContainer.innerHTML = bubblesHtml;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function filterContacts(query) {
        const term = (query || "").toLowerCase();
        const contactList = document.getElementById('chat-contacts-list');
        if (!contactList) return;

        const state = window.SyncUpStore.getState();
        const filtered = state.chats.contacts.filter(c => c.name.toLowerCase().includes(term) || c.handle.toLowerCase().includes(term));
        const escapeHtml = window.SyncUpUtils.escapeHtml;

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

    window.SyncUpUIChat = { renderChat, filterContacts };

})(window);
