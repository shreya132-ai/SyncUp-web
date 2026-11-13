/**
 * js/store.js
 * 
 * Layer 2: Single Source of Truth & Central State Store
 * Manages: posts, user, applications, chats, and ui state.
 * Implements optimistic updates with automatic rollback on error.
 */

(function(window) {
    'use strict';

    // Curated Storyboard Default Posts
    const defaultFeaturedPosts = [
        {
            id: "sample_chat_app",
            title: "Build a Real-Time Chat App (MERN Stack)",
            text: "Looking for a frontend developer (React) and UI/UX designer to join my team for a college project. I'm handling the backend (Node.js + MongoDB). Let's build something great together!",
            category: "College Projects",
            status: "Recruiting",
            skills: ["React", "Node.js", "MongoDB", "UI/UX"],
            userName: "Rohit Kumar",
            userHandle: "@rohit_dev",
            college: "Amity University | BCA 2nd Sem",
            userUid: "user_rohit",
            githubUrl: "https://github.com",
            demoUrl: "",
            likes: 24,
            likedBy: [],
            comments: [
                { u: "Simran", t: "I'm interested! I have experience with React. Can we discuss?", time: "2h ago" },
                { u: "Karan", t: "Can I handle the UI/UX in Figma?", time: "1h ago" }
            ],
            applications: [
                {
                    id: "app_sample_1",
                    applicantUid: "user_sneha",
                    applicantName: "Sneha Verma",
                    applicantHandle: "@sneha_v",
                    applicantPic: "",
                    role: "Frontend Developer (React)",
                    pitch: "I built two React dashboard projects and understand state management with Redux. Would love to join!",
                    status: "pending",
                    timestamp: new Date(Date.now() - 3600000).toISOString()
                }
            ],
            createdAt: Date.now() - 7200000
        },
        {
            id: "sample_ai_interview",
            title: "AI Mock Interview & Resume Analyzer",
            text: "Building an AI-powered portal that generates mock technical interview questions based on user resumes. Need a Python/FastAPI engineer and a Prompt specialist.",
            category: "Hackathons",
            status: "Recruiting",
            skills: ["Python", "FastAPI", "OpenAI", "React"],
            userName: "Priya Sharma",
            userHandle: "@priya_code",
            college: "Patna University | CS",
            userUid: "user_priya",
            githubUrl: "https://github.com",
            demoUrl: "https://syncup-web.demo",
            likes: 19,
            likedBy: [],
            comments: [
                { u: "Arjun", t: "I've deployed FastAPI on AWS before, count me in!", time: "3h ago" }
            ],
            applications: [],
            createdAt: Date.now() - 14400000
        },
        {
            id: "sample_decentralized_study",
            title: "Decentralized Peer Study & Resource Share",
            text: "A web3 collaborative notebook where students earn badges for answering academic doubts and sharing lecture notes. Fully responsive Next.js frontend.",
            category: "College Projects",
            status: "In Progress",
            skills: ["Solidity", "Next.js", "Tailwind", "Web3"],
            userName: "Arjun Mehta",
            userHandle: "@arjun_m",
            college: "Amity Patna | BCA 2nd Sem",
            userUid: "user_arjun",
            githubUrl: "https://github.com",
            demoUrl: "",
            likes: 31,
            likedBy: [],
            comments: [],
            applications: [],
            createdAt: Date.now() - 86400000
        },
        {
            id: "sample_matchmaker",
            title: "Cross-Platform Hackathon Matchmaker",
            text: "Connecting solo hackers into balanced teams for national hackathons with skill matrix scoring. Built using Flutter and Firebase.",
            category: "Hackathons",
            status: "Completed",
            skills: ["Flutter", "Dart", "Firebase", "Figma"],
            userName: "Sneha Verma",
            userHandle: "@sneha_v",
            college: "NIT Patna | IT",
            userUid: "user_sneha",
            githubUrl: "https://github.com",
            demoUrl: "https://syncup-web.demo",
            likes: 42,
            likedBy: [],
            comments: [
                { u: "Rohit", t: "Used this for our last hackathon, super helpful!", time: "Yesterday" }
            ],
            applications: [],
            createdAt: Date.now() - 172800000
        }
    ];

    // Curated Storyboard Uploads
    const defaultMyUploads = [
        {
            id: "my_upload_chat_app",
            title: "Real-Time Chat App",
            text: "MERN stack chat application with real-time features, socket rooms, and status badges.",
            category: "College Projects",
            status: "Recruiting",
            skills: ["React", "Node.js", "MongoDB", "Socket.io"],
            likes: 7,
            likedBy: [],
            comments: [
                { u: "Simran", t: "Great architecture!", time: "3h ago" },
                { u: "Aman", t: "Is the backend live?", time: "1h ago" }
            ],
            applications: [
                {
                    id: "app_upload_1",
                    applicantUid: "user_rohit",
                    applicantName: "Rohit Kumar",
                    applicantHandle: "@rohit_dev",
                    applicantPic: "",
                    role: "Backend Engineer",
                    pitch: "I'd love to help configure the Socket.io clusters and MongoDB schema for this project!",
                    status: "pending",
                    timestamp: new Date(Date.now() - 7200000).toISOString()
                },
                {
                    id: "app_upload_2",
                    applicantUid: "user_priya",
                    applicantName: "Priya Sharma",
                    applicantHandle: "@priya_code",
                    applicantPic: "",
                    role: "UI/UX Designer",
                    pitch: "I have prepared clean wireframes in Figma that match this chat app concept.",
                    status: "pending",
                    timestamp: new Date(Date.now() - 3600000).toISOString()
                }
            ],
            img: "",
            userUid: "guest_demo_user",
            userHandle: "@shreya_sinha",
            userName: "Shreya Sinha",
            college: "Amity University Patna | BCA 2nd Sem",
            createdAt: Date.now() - 86400000
        },
        {
            id: "my_upload_portfolio",
            title: "Developer Portfolio Website",
            text: "Modern dark-themed developer portfolio showcase featuring dynamic project cards and interactive contact form.",
            category: "Portfolio",
            status: "Completed",
            skills: ["HTML", "CSS", "JavaScript", "Tailwind"],
            likes: 12,
            likedBy: [],
            comments: [
                { u: "Rohit", t: "The animations look very smooth!", time: "Yesterday" }
            ],
            applications: [],
            img: "",
            userUid: "guest_demo_user",
            userHandle: "@shreya_sinha",
            userName: "Shreya Sinha",
            college: "Amity University Patna | BCA 2nd Sem",
            createdAt: Date.now() - 172800000
        },
        {
            id: "my_upload_weather",
            title: "Live Weather & Air Quality Radar",
            text: "Live atmospheric weather updates and forecast telemetry using OpenWeather API with geolocation search.",
            category: "Learning",
            status: "Recruiting",
            skills: ["JavaScript", "REST API", "CSS Grid"],
            likes: 5,
            likedBy: [],
            comments: [],
            applications: [
                {
                    id: "app_upload_3",
                    applicantUid: "user_arjun",
                    applicantName: "Arjun Mehta",
                    applicantHandle: "@arjun_m",
                    applicantPic: "",
                    role: "Frontend Developer",
                    pitch: "I can integrate interactive chart widgets using Chart.js.",
                    status: "pending",
                    timestamp: new Date(Date.now() - 1800000).toISOString()
                }
            ],
            img: "",
            userUid: "guest_demo_user",
            userHandle: "@shreya_sinha",
            userName: "Shreya Sinha",
            college: "Amity University Patna | BCA 2nd Sem",
            createdAt: Date.now() - 259200000
        }
    ];

    // Default chat contacts
    const defaultChatContacts = [
        { id: 'contact-rohit', uid: 'user_rohit', name: 'Rohit Kumar', handle: '@rohit_dev', avatar: '', lastMsg: 'Hey! I saw your project post. Can we collaborate?', time: '10:24 AM' },
        { id: 'contact-priya', uid: 'user_priya', name: 'Priya Sharma', handle: '@priya_code', avatar: '', lastMsg: 'Sure! I can help with the React UI components.', time: '9:12 AM' },
        { id: 'contact-arjun', uid: 'user_arjun', name: 'Arjun Mehta', handle: '@arjun_m', avatar: '', lastMsg: 'Project looks great! Let us discuss the backend schema.', time: 'Yesterday' },
        { id: 'contact-sneha', uid: 'user_sneha', name: 'Sneha Verma', handle: '@sneha_v', avatar: '', lastMsg: 'I am a frontend developer. Let us connect!', time: 'Yesterday' }
    ];

    // Initial State
    let state = {
        posts: [...defaultFeaturedPosts],
        user: null,
        myUploads: [...defaultMyUploads],
        chats: {
            activeMode: 'dm',
            activeContact: defaultChatContacts[0],
            contacts: [...defaultChatContacts],
            threads: {} // key: docId -> array of messages
        },
        ui: {
            currentView: 'landing',
            currentTab: 'home',
            categoryFilter: 'All',
            skillFilter: 'All',
            roleFilter: 'All',
            sortOrder: 'newest',
            searchTerm: '',
            feedLimit: 20,
            postCreationStep: 1,
            activeModal: null,
            currentApplyingPostId: null,
            currentReportingPostId: null,
            currentReviewPostId: null,
            mobileSidebarOpen: false,
            loading: {
                feed: false,
                creatingPost: false,
                submittingApp: false,
                savingProfile: false,
                auth: false
            },
            error: {
                feed: null
            }
        }
    };

    // Load user preferences from localStorage (only preferences, not large databases)
    try {
        const savedUserPref = localStorage.getItem('syncUser_pref');
        if (savedUserPref) {
            state.user = JSON.parse(savedUserPref);
        }
    } catch(e) {}

    const listeners = [];

    function getState() {
        return state;
    }

    function subscribe(listener) {
        listeners.push(listener);
        return () => {
            const idx = listeners.indexOf(listener);
            if (idx > -1) listeners.splice(idx, 1);
        };
    }

    function notify() {
        listeners.forEach(fn => {
            try { fn(state); } catch(e) { console.error("Store listener error:", e); }
        });
    }

    // =========================================================================
    // OPTIMISTIC STORE ACTIONS
    // =========================================================================

    function setPosts(posts) {
        // Hygiene filter: drop invalid empty docs
        const clean = posts.filter(p => (p.title && p.title.trim()) || (p.text && p.text.trim()) || p.img);
        
        // Merge with curated defaults if feed is empty
        const map = new Map();
        clean.forEach(p => map.set(p.id, p));
        if (map.size < 2) {
            defaultFeaturedPosts.forEach(p => {
                if (!map.has(p.id)) map.set(p.id, p);
            });
        }

        const merged = Array.from(map.values());
        merged.sort((a, b) => {
            const timeA = a.timestamp && a.timestamp.toMillis ? a.timestamp.toMillis() : (a.createdAt || 0);
            const timeB = b.timestamp && b.timestamp.toMillis ? b.timestamp.toMillis() : (b.createdAt || 0);
            return timeB - timeA;
        });

        state.posts = merged;
        state.ui.loading.feed = false;
        state.ui.error.feed = null;
        notify();
    }

    async function createPost(postData) {
        const prevPosts = [...state.posts];
        const newPostId = 'post_' + Date.now();

        const optimisticPost = {
            id: newPostId,
            ...postData,
            likes: 0,
            likedBy: [],
            comments: [],
            applications: [],
            createdAt: Date.now()
        };

        // 1. Optimistic Update
        state.posts.unshift(optimisticPost);
        state.ui.loading.creatingPost = true;
        notify();

        window.SyncUpUtils.showToast("🎉 Publishing project to Global Feed...", "🚀");

        try {
            // 2. Call Data Service
            const saved = await window.SyncUpDataService.createPost(optimisticPost);
            state.ui.loading.creatingPost = false;
            // Update with confirmed post
            const idx = state.posts.findIndex(p => p.id === newPostId);
            if (idx > -1 && saved) {
                state.posts[idx] = saved;
            }
            notify();
            window.SyncUpUtils.showToast("✅ Project published successfully!", "🎉");
        } catch (err) {
            // 3. Rollback on failure
            state.posts = prevPosts;
            state.ui.loading.creatingPost = false;
            notify();
            window.SyncUpUtils.showToast("Failed to create post. Action rolled back.", "❌");
            console.error("Create post error:", err);
        }
    }

    async function likePost(postId) {
        if (!state.user) {
            alert("Please login to like posts.");
            return;
        }

        const currentUid = (window.SyncUpFirebase && window.SyncUpFirebase.auth && window.SyncUpFirebase.auth.currentUser)
            ? window.SyncUpFirebase.auth.currentUser.uid 
            : state.user.uid;

        const prevPosts = JSON.parse(JSON.stringify(state.posts));
        const post = state.posts.find(p => p.id === postId);
        if (!post) return;

        if (!post.likedBy) post.likedBy = [];
        const isAlreadyLiked = post.likedBy.includes(currentUid);

        // 1. Optimistic Update
        if (isAlreadyLiked) {
            post.likedBy = post.likedBy.filter(u => u !== currentUid);
            post.likes = Math.max(0, (post.likes || 1) - 1);
        } else {
            post.likedBy.push(currentUid);
            post.likes = (post.likes || 0) + 1;
        }
        notify();

        try {
            // 2. Background Sync
            await window.SyncUpDataService.likePost(postId, currentUid, isAlreadyLiked);
        } catch (err) {
            // 3. Rollback on failure
            state.posts = prevPosts;
            notify();
            window.SyncUpUtils.showToast("Could not update like. Rolled back.", "⚠️");
        }
    }

    async function commentPost(postId, text) {
        if (!state.user) {
            alert("Please login to comment.");
            return;
        }

        const prevPosts = JSON.parse(JSON.stringify(state.posts));
        const post = state.posts.find(p => p.id === postId);
        if (!post) return;

        const newComment = {
            u: state.user.name || "Collaborator",
            t: text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        // 1. Optimistic Update
        if (!post.comments) post.comments = [];
        post.comments.push(newComment);
        notify();
        window.SyncUpUtils.showToast("Comment posted!", "💬");

        try {
            // 2. Background Sync
            await window.SyncUpDataService.commentPost(postId, newComment);
        } catch (err) {
            // 3. Rollback on failure
            state.posts = prevPosts;
            notify();
            window.SyncUpUtils.showToast("Failed to post comment. Rolled back.", "⚠️");
        }
    }

    async function deletePost(postId) {
        const prevPosts = [...state.posts];
        const prevUploads = [...state.myUploads];

        // 1. Optimistic Update
        state.posts = state.posts.filter(p => p.id !== postId);
        state.myUploads = state.myUploads.filter(p => p.id !== postId);
        notify();
        window.SyncUpUtils.showToast("Post deleted.", "🗑️");

        try {
            // 2. Background Sync
            await window.SyncUpDataService.deletePost(postId);
        } catch (err) {
            // 3. Rollback on failure
            state.posts = prevPosts;
            state.myUploads = prevUploads;
            notify();
            window.SyncUpUtils.showToast("Could not delete post. Rolled back.", "⚠️");
        }
    }

    async function applyToPost(postId, role, pitch) {
        if (!state.user) return alert("Please login to apply to join a project team.");

        const prevPosts = JSON.parse(JSON.stringify(state.posts));
        const post = state.posts.find(p => p.id === postId);
        if (!post) return;

        const appObj = {
            id: 'app_' + Date.now(),
            applicantUid: state.user.uid,
            applicantName: state.user.name,
            applicantHandle: state.user.user,
            applicantPic: state.user.pic || "",
            role: role,
            pitch: pitch,
            status: 'pending',
            timestamp: new Date().toISOString()
        };

        // 1. Optimistic Update
        if (!post.applications) post.applications = [];
        post.applications.push(appObj);
        closeModal();
        notify();
        window.SyncUpUtils.showToast("🎉 Application submitted! The project lead has been notified.", "✅");

        try {
            // 2. Background Sync
            await window.SyncUpDataService.applyToPost(postId, appObj);
        } catch (err) {
            // 3. Rollback on failure
            state.posts = prevPosts;
            notify();
            window.SyncUpUtils.showToast("Application submission failed. Rolled back.", "⚠️");
        }
    }

    async function updateApplicationStatus(postId, appIndex, newStatus) {
        let post = state.posts.find(p => p.id === postId);
        if (!post) {
            post = state.myUploads.find(p => p.id === postId);
        }
        if (!post || !post.applications || !post.applications[appIndex]) return;

        const prevStatus = post.applications[appIndex].status;
        const applicant = post.applications[appIndex];
        const applicantName = applicant.applicantName || 'Applicant';

        // 1. Optimistic Update
        post.applications[appIndex].status = newStatus;
        notify();

        if (newStatus === 'accepted') {
            if (window.SyncUpToast) {
                window.SyncUpToast.success(`Accepted ${applicantName}! Opening team chat...`);
            } else {
                window.SyncUpUtils.showToast(`Accepted ${applicantName}!`, '🎉');
            }

            // Automatically open chat with the accepted collaborator
            setTimeout(() => {
                closeModal();
                triggerDirectChatCTA(
                    applicant.applicantUid || 'user_rohit',
                    applicant.applicantName,
                    applicant.applicantHandle,
                    post.title || 'Project'
                );
                // Pre-fill / send welcome greeting
                const welcomeMsg = `🎉 Welcome to the team! Glad to have you collaborate on "${post.title}". Let's coordinate our roadmap and next steps!`;
                sendMessage(welcomeMsg);
            }, 300);

        } else if (newStatus === 'declined') {
            // Show toast with interactive Undo action
            if (window.SyncUpToast) {
                window.SyncUpToast.show({
                    message: `Declined application from ${applicantName}.`,
                    type: 'info',
                    icon: 'ℹ️',
                    duration: 5000,
                    onUndo: () => {
                        updateApplicationStatus(postId, appIndex, 'pending');
                    }
                });
            } else {
                window.SyncUpUtils.showToast(`Declined application from ${applicantName}`, 'ℹ️');
            }
        } else if (newStatus === 'pending') {
            if (window.SyncUpToast) {
                window.SyncUpToast.success(`Application from ${applicantName} restored to Pending.`, { icon: '↩️' });
            }
        }

        try {
            // 2. Background Sync
            await window.SyncUpDataService.updateApplicationStatus(postId, post.applications);
        } catch (err) {
            // 3. Rollback on failure
            post.applications[appIndex].status = prevStatus;
            notify();
            window.SyncUpUtils.showToast("Could not update status. Rolled back.", "⚠️");
        }
    }

    function getChatDocId() {
        if (state.chats.activeMode === 'global') return "GLOBAL_COMMUNITY_CHAT";
        const currentUid = state.user ? state.user.uid : 'guest';
        const targetUid = state.chats.activeContact ? state.chats.activeContact.uid : 'user_rohit';
        const chatKey = [currentUid, targetUid].sort().join('_');
        return "CHAT_" + chatKey;
    }

    async function sendMessage(text) {
        if (!text || !text.trim()) return;
        const docId = getChatDocId();
        const currentUid = state.user ? state.user.uid : 'guest';
        const senderName = state.user ? state.user.name : 'You';

        const newMsg = {
            uid: currentUid,
            senderName: senderName,
            text: text.trim(),
            isMe: true,
            timestamp: new Date().toISOString()
        };

        const prevThread = [...(state.chats.threads[docId] || [])];

        // 1. Optimistic Update
        if (!state.chats.threads[docId]) state.chats.threads[docId] = [];
        state.chats.threads[docId].push(newMsg);

        if (state.chats.activeContact && state.chats.activeMode === 'dm') {
            state.chats.activeContact.lastMsg = text.trim();
            state.chats.activeContact.time = 'Just now';
        }
        notify();
        window.SyncUpUtils.showToast("Message sent!", "💬");

        try {
            // 2. Background Sync
            await window.SyncUpDataService.sendMessage(docId, state.chats.activeMode === 'global', newMsg);

            // Realistic Simulated Contact Reply in DM mode with typing indicator
            if (state.chats.activeMode === 'dm' && state.chats.activeContact && state.chats.activeContact.uid.startsWith('user_')) {
                const partner = state.chats.activeContact;

                // 1. Show Typing Indicator
                setTimeout(() => {
                    state.chats.isPartnerTyping = true;
                    notify();
                }, 350);

                // 2. Deliver Partner Reply
                setTimeout(() => {
                    state.chats.isPartnerTyping = false;
                    const replies = [
                        `Sounds great! Let's build this together. When can we sync on GitHub?`,
                        `Awesome! I'll review the components and architecture today.`,
                        `Got it! I can take care of the backend schema and APIs.`,
                        `Super excited to collaborate on this! Let's make it great.`
                    ];
                    const replyMsg = {
                        uid: partner.uid,
                        senderName: partner.name,
                        text: replies[Math.floor(Math.random() * replies.length)],
                        isMe: false,
                        timestamp: new Date().toISOString()
                    };
                    if (!state.chats.threads[docId]) state.chats.threads[docId] = [];
                    state.chats.threads[docId].push(replyMsg);
                    partner.lastMsg = replyMsg.text;
                    partner.time = 'Just now';
                    notify();
                }, 1500);
            }
        } catch (err) {
            // 3. Rollback on failure
            state.chats.threads[docId] = prevThread;
            notify();
            window.SyncUpUtils.showToast("Message failed to send. Rolled back.", "⚠️");
        }
    }

    function setChatMessages(docId, messages) {
        state.chats.threads[docId] = messages;
        notify();
    }

    function setChatMode(mode) {
        state.chats.activeMode = mode;
        notify();
    }

    function selectContact(contactId) {
        const contact = state.chats.contacts.find(c => c.id === contactId);
        if (contact) {
            state.chats.activeContact = contact;
            notify();
        }
    }

    function triggerDirectChatCTA(contactUid, authorName, authorHandle, projectTitle) {
        setUi({ currentTab: 'inbox', inboxTab: 'chats' });
        setChatMode('dm');
        if (window.SyncUpApp && typeof window.SyncUpApp.switchTab === 'function') {
            window.SyncUpApp.switchTab('chat');
        }

        let contact = state.chats.contacts.find(c => c.uid === contactUid || c.name === authorName);
        if (!contact) {
            contact = {
                id: 'dm_' + (contactUid || Date.now()),
                uid: contactUid || ('uid_' + Date.now()),
                name: authorName,
                handle: authorHandle || '@partner',
                avatar: '',
                lastMsg: `Direct conversation regarding ${projectTitle}`,
                time: 'Just now'
            };
            state.chats.contacts.unshift(contact);
        }
        selectContact(contact.id);
    }

    function setUser(user) {
        state.user = user;
        try {
            if (user) localStorage.setItem('syncUser_pref', JSON.stringify(user));
            else localStorage.removeItem('syncUser_pref');
        } catch(e) {}
        notify();
    }

    function setUi(partial) {
        // Reset feedLimit to 20 when filters, search term, or sorting change
        if (partial.categoryFilter !== undefined || partial.skillFilter !== undefined || 
            partial.roleFilter !== undefined || partial.searchTerm !== undefined || 
            partial.sortOrder !== undefined) {
            if (partial.feedLimit === undefined) {
                partial.feedLimit = 20;
            }
        }
        state.ui = { ...state.ui, ...partial };
        notify();
    }

    function loadMorePosts() {
        state.ui.feedLimit = (state.ui.feedLimit || 20) + 20;
        notify();
    }

    function openModal(modalId, payload = {}) {
        state.ui.activeModal = modalId;
        if (payload.postId) state.ui.currentApplyingPostId = payload.postId;
        if (payload.reviewPostId) state.ui.currentReviewPostId = payload.reviewPostId;
        if (payload.reportPostId) state.ui.currentReportingPostId = payload.reportPostId;
        notify();
    }

    function closeModal() {
        state.ui.activeModal = null;
        notify();
    }

    // Expose Store Interface
    window.SyncUpStore = {
        getState,
        subscribe,
        notify,
        setPosts,
        createPost,
        likePost,
        commentPost,
        deletePost,
        applyToPost,
        updateApplicationStatus,
        sendMessage,
        setChatMessages,
        setChatMode,
        selectContact,
        triggerDirectChatCTA,
        loadMorePosts,
        setUser,
        setUi,
        openModal,
        closeModal,
        defaultMyUploads
    };

})(window);
