/**
 * src/store/store.js
 * 
 * Layer 2: Single Source of Truth & Central State Store
 * Small plain-JS object with get(), set(), and subscribe(fn).
 * Manages: posts, user, applications, chats, and ui state.
 * Implements optimistic updates with automatic rollbacks on error.
 */

import * as postsService from '../services/postsService.js';
import * as chatService from '../services/chatService.js';
import * as authService from '../services/authService.js';
import { showToast } from '../ui/toast.js';

// Curated Default Storyboard Posts
export const defaultFeaturedPosts = [
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

export const defaultChatContacts = [
  { id: 'contact-rohit', uid: 'user_rohit', name: 'Rohit Kumar', handle: '@rohit_dev', avatar: '', lastMsg: 'Hey! I saw your project post. Can we collaborate?', time: '10:24 AM' },
  { id: 'contact-priya', uid: 'user_priya', name: 'Priya Sharma', handle: '@priya_code', avatar: '', lastMsg: 'Sure! I can help with the React UI components.', time: '9:12 AM' },
  { id: 'contact-arjun', uid: 'user_arjun', name: 'Arjun Mehta', handle: '@arjun_m', avatar: '', lastMsg: 'Project looks great! Let us discuss the backend schema.', time: 'Yesterday' },
  { id: 'contact-sneha', uid: 'user_sneha', name: 'Sneha Verma', handle: '@sneha_v', avatar: '', lastMsg: 'I am a frontend developer. Let us connect!', time: 'Yesterday' }
];

export const defaultMyUploads = [
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
      { u: "Simran", t: "Great architecture!", time: "3h ago" }
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
      }
    ],
    img: "",
    userUid: "guest_demo_user",
    userHandle: "@shreya_sinha",
    userName: "Shreya Sinha",
    college: "Amity University Patna | BCA 2nd Sem",
    createdAt: Date.now() - 86400000
  }
];

// Initial App State
let state = {
  posts: [...defaultFeaturedPosts],
  user: null,
  myUploads: [...defaultMyUploads],
  chats: {
    activeMode: 'dm',
    activeContact: defaultChatContacts[0],
    contacts: [...defaultChatContacts],
    threads: {},
    isPartnerTyping: false
  },
  ui: {
    currentView: 'landing',
    currentTab: 'home',
    inboxTab: 'chats',
    categoryFilter: 'All',
    skillFilter: 'All',
    roleFilter: 'All',
    sortOrder: 'newest',
    searchTerm: '',
    feedLimit: 20,
    postCreationStep: 1,
    activeSheet: null,
    currentApplyingPostId: null,
    currentReportingPostId: null,
    currentReviewPostId: null,
    expandedComments: {},
    dropdownPostId: null,
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

// Keep localStorage ONLY for small session/theme preferences and unsent drafts
try {
  const savedUserPref = localStorage.getItem('syncUser_pref');
  if (savedUserPref) {
    state.user = JSON.parse(savedUserPref);
  }
} catch (e) {}

const listeners = new Set();

/**
 * Returns the current state snapshot.
 */
export function get() {
  return state;
}

export function getState() {
  return state;
}

/**
 * Subscribes a listener function that runs whenever the store changes.
 * Returns an unsubscribe cleanup function.
 */
export function subscribe(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Notifies all subscribers of state mutation.
 */
function notify() {
  listeners.forEach(fn => {
    try { fn(state); } catch (err) { console.error("[Store] Subscriber error:", err); }
  });
}

/**
 * Merges partial state updates and notifies subscribers.
 */
export function set(partial) {
  state = { ...state, ...partial };
  notify();
}

export function setUi(partial) {
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

export function setUser(user) {
  state.user = user;
  try {
    if (user) localStorage.setItem('syncUser_pref', JSON.stringify(user));
    else localStorage.removeItem('syncUser_pref');
  } catch (e) {}
  notify();
}

export function setPosts(posts) {
  const clean = posts.filter(p => (p.title && p.title.trim()) || (p.text && p.text.trim()) || p.img);
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

export function loadMorePosts() {
  state.ui.feedLimit = (state.ui.feedLimit || 20) + 20;
  notify();
}

export function openModal(modalId, payload = {}) {
  state.ui.activeSheet = modalId;
  if (payload.postId) state.ui.currentApplyingPostId = payload.postId;
  if (payload.reviewPostId) state.ui.currentReviewPostId = payload.reviewPostId;
  if (payload.reportPostId) state.ui.currentReportingPostId = payload.reportPostId;
  notify();
}

export function closeModal() {
  state.ui.activeSheet = null;
  notify();
}

// =============================================================================
// OPTIMISTIC MUTATION ACTIONS (Update store immediately -> write -> rollback on fail)
// =============================================================================

export async function createPost(postData) {
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
  showToast({ message: "Publishing project to feed...", icon: "🚀", type: "info" });

  try {
    // 2. Background Sync
    const saved = await postsService.createPost(optimisticPost);
    state.ui.loading.creatingPost = false;
    const idx = state.posts.findIndex(p => p.id === newPostId);
    if (idx > -1 && saved) {
      state.posts[idx] = saved;
    }
    notify();
    showToast({ message: "Project published successfully!", icon: "🎉", type: "success" });
  } catch (err) {
    // 3. Rollback
    state.posts = prevPosts;
    state.ui.loading.creatingPost = false;
    notify();
    showToast({ message: "Failed to create post. Action rolled back.", icon: "⚠️", type: "error" });
    console.error("[Store] createPost error:", err);
  }
}

export async function likePost(postId) {
  if (!state.user) {
    showToast({ message: "Please login to like posts.", icon: "🔒", type: "info" });
    return;
  }

  const currentUid = state.user.uid;
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
    await postsService.likePost(postId, currentUid, isAlreadyLiked);
  } catch (err) {
    // 3. Rollback
    state.posts = prevPosts;
    notify();
    showToast({ message: "Could not update like. Rolled back.", icon: "⚠️", type: "error" });
  }
}

export async function commentPost(postId, text) {
  if (!state.user) {
    showToast({ message: "Please login to comment.", icon: "🔒", type: "info" });
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
  showToast({ message: "Comment posted!", icon: "💬", type: "success" });

  try {
    // 2. Background Sync
    await postsService.commentPost(postId, newComment);
  } catch (err) {
    // 3. Rollback
    state.posts = prevPosts;
    notify();
    showToast({ message: "Failed to post comment. Rolled back.", icon: "⚠️", type: "error" });
  }
}

export async function deletePost(postId) {
  const prevPosts = [...state.posts];
  const prevUploads = [...state.myUploads];

  // 1. Optimistic Update
  state.posts = state.posts.filter(p => p.id !== postId);
  state.myUploads = state.myUploads.filter(p => p.id !== postId);
  notify();
  showToast({ message: "Post deleted.", icon: "🗑️", type: "info" });

  try {
    // 2. Background Sync
    await postsService.deletePost(postId);
  } catch (err) {
    // 3. Rollback
    state.posts = prevPosts;
    state.myUploads = prevUploads;
    notify();
    showToast({ message: "Could not delete post. Rolled back.", icon: "⚠️", type: "error" });
  }
}

export async function applyToPost(postId, role, pitch) {
  if (!state.user) {
    showToast({ message: "Please login to apply to join a project team.", icon: "🔒", type: "info" });
    return;
  }

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
  showToast({ message: "Application submitted! The lead has been notified.", icon: "✅", type: "success" });

  try {
    // 2. Background Sync
    await postsService.applyToPost(postId, appObj);
  } catch (err) {
    // 3. Rollback
    state.posts = prevPosts;
    notify();
    showToast({ message: "Application submission failed. Rolled back.", icon: "⚠️", type: "error" });
  }
}

export async function updateApplicationStatus(postId, appIndex, newStatus) {
  let post = state.posts.find(p => p.id === postId);
  if (!post) post = state.myUploads.find(p => p.id === postId);
  if (!post || !post.applications || !post.applications[appIndex]) return;

  const prevStatus = post.applications[appIndex].status;
  const applicant = post.applications[appIndex];
  const applicantName = applicant.applicantName || 'Applicant';

  // 1. Optimistic Update
  post.applications[appIndex].status = newStatus;
  notify();

  if (newStatus === 'accepted') {
    showToast({ message: `Accepted ${applicantName}! Opening team chat...`, icon: "🎉", type: "success" });
    setTimeout(() => {
      closeModal();
      triggerDirectChatCTA(
        applicant.applicantUid || 'user_rohit',
        applicant.applicantName,
        applicant.applicantHandle,
        post.title || 'Project'
      );
      const welcomeMsg = `🎉 Welcome to the team! Glad to have you collaborate on "${post.title}". Let's coordinate our roadmap and next steps!`;
      sendMessage(welcomeMsg);
    }, 300);
  } else if (newStatus === 'declined') {
    showToast({
      message: `Declined application from ${applicantName}.`,
      icon: "ℹ️",
      type: "info",
      duration: 5000,
      onUndo: () => {
        updateApplicationStatus(postId, appIndex, 'pending');
      }
    });
  } else if (newStatus === 'pending') {
    showToast({ message: `Application from ${applicantName} restored to Pending.`, icon: "↩️", type: "success" });
  }

  try {
    // 2. Background Sync
    await postsService.updateApplicationStatus(postId, post.applications);
  } catch (err) {
    // 3. Rollback
    post.applications[appIndex].status = prevStatus;
    notify();
    showToast({ message: "Could not update status. Rolled back.", icon: "⚠️", type: "error" });
  }
}

function getChatDocId() {
  if (state.chats.activeMode === 'global') return "GLOBAL_COMMUNITY_CHAT";
  const currentUid = state.user ? state.user.uid : 'guest';
  const targetUid = state.chats.activeContact ? state.chats.activeContact.uid : 'user_rohit';
  const chatKey = [currentUid, targetUid].sort().join('_');
  return "CHAT_" + chatKey;
}

export async function sendMessage(text) {
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

  try {
    // 2. Background Sync
    await chatService.sendChatMessage(docId, state.chats.activeMode === 'global', newMsg);

    // Realistic Simulated Partner Reply in DM mode
    if (state.chats.activeMode === 'dm' && state.chats.activeContact && state.chats.activeContact.uid.startsWith('user_')) {
      const partner = state.chats.activeContact;
      setTimeout(() => {
        state.chats.isPartnerTyping = true;
        notify();
      }, 350);

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
    // 3. Rollback
    state.chats.threads[docId] = prevThread;
    notify();
    showToast({ message: "Message failed to send. Rolled back.", icon: "⚠️", type: "error" });
  }
}

export function setChatMessages(docId, messages) {
  state.chats.threads[docId] = messages;
  notify();
}

export function setChatMode(mode) {
  state.chats.activeMode = mode;
  notify();
}

export function selectContact(contactId) {
  const contact = state.chats.contacts.find(c => c.id === contactId);
  if (contact) {
    state.chats.activeContact = contact;
    notify();
  }
}

export function triggerDirectChatCTA(contactUid, authorName, authorHandle, projectTitle) {
  setUi({ currentTab: 'inbox', inboxTab: 'chats' });
  setChatMode('dm');

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
