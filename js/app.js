/**
 * js/app.js
 * 
 * Layer 1 Coordinator & Main Application Controller
 * Coordinates: Store Subscriptions -> UI Renders, Routing, Global Event Listeners, App Bootstrapping.
 */

(function(window) {
    'use strict';

    let unsubscribeFeed = null;
    let unsubscribeChat = null;

    /**
     * Master Render Loop: Triggered whenever Store state updates
     * Optimized to avoid unnecessary re-renders of hidden subviews.
     */
    function renderAll(state) {
        updateTopNavAndSidebar(state);

        const currentView = state.ui ? state.ui.currentView : 'landing';
        const currentTab = state.ui ? state.ui.currentTab : 'home';

        if (currentView === 'dashboard') {
            if (currentTab === 'home') {
                if (window.SyncUpUIFeed) {
                    window.SyncUpUIFeed.renderFeed(state);
                    window.SyncUpUIFeed.renderRightRail(state);
                }
            } else if (currentTab === 'explore') {
                if (window.SyncUpUIFeed) {
                    window.SyncUpUIFeed.renderExplore(state);
                }
            } else if (currentTab === 'inbox') {
                if (window.SyncUpUIInbox) window.SyncUpUIInbox.renderInbox(state);
            } else if (currentTab === 'profile') {
                if (window.SyncUpUIProfile) window.SyncUpUIProfile.renderProfile(state);
            }
        }

        // Always update inbox notification badges on sidebar / mobile bar
        if (window.SyncUpUIInbox && window.SyncUpUIInbox.calculateInboxBadge) {
            const badgeCount = window.SyncUpUIInbox.calculateInboxBadge(state);
            const sideBadge = document.getElementById('inbox-sidebar-badge');
            const mobBadge = document.getElementById('inbox-mobile-badge');
            if (sideBadge) {
                sideBadge.innerText = badgeCount;
                sideBadge.style.display = badgeCount > 0 ? 'inline-block' : 'none';
            }
            if (mobBadge) {
                mobBadge.innerText = badgeCount;
                mobBadge.style.display = badgeCount > 0 ? 'inline-block' : 'none';
            }
        }

        if (window.SyncUpUIModals) window.SyncUpUIModals.renderModals(state);
    }

    function updateTopNavAndSidebar(state) {
        if (!state.user) return;
        const name = state.user.name || "User";
        const handle = state.user.user || "@username";
        const initial = name[0] ? name[0].toUpperCase() : 'U';

        const sideName = document.getElementById('side-user-name');
        const sideHandle = document.getElementById('side-user-handle');
        if (sideName) sideName.innerText = name;
        if (sideHandle) sideHandle.innerText = handle;

        const sideAvatar = document.getElementById('side-user-avatar');
        const topAvatar = document.getElementById('top-nav-avatar');

        if (sideAvatar) {
            if (state.user.pic) sideAvatar.innerHTML = `<img src="${state.user.pic}" loading="lazy" decoding="async" alt="${window.SyncUpUtils.escapeHtml(name)}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            else sideAvatar.innerText = initial;
        }
        if (topAvatar) {
            if (state.user.pic) topAvatar.innerHTML = `<img src="${state.user.pic}" loading="lazy" decoding="async" alt="${window.SyncUpUtils.escapeHtml(name)}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            else topAvatar.innerText = initial;
        }

        // Email verification banner
        const banner = document.getElementById('email-verify-banner');
        if (banner) {
            const fbAuth = window.SyncUpFirebase.auth;
            if (fbAuth && fbAuth.currentUser && !fbAuth.currentUser.emailVerified && state.user.uid !== 'guest_demo_user') {
                banner.classList.remove('hidden');
            } else {
                banner.classList.add('hidden');
            }
        }
    }

    // Navigation View Manager
    function navigateTo(viewName) {
        window.SyncUpStore.setUi({ currentView: viewName });

        const landingView = document.getElementById('landing-view');
        const authView = document.getElementById('auth-view');
        const dashboardView = document.getElementById('dashboard-view');

        if (landingView) landingView.classList.add('hidden');
        if (authView) authView.classList.add('hidden');
        if (dashboardView) dashboardView.classList.add('hidden');

        if (viewName === 'landing') {
            if (landingView) landingView.classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (viewName === 'auth') {
            if (authView) authView.classList.remove('hidden');
        } else if (viewName === 'dashboard') {
            if (dashboardView) dashboardView.classList.remove('hidden');
            initFeedSubscription();
            initChatSubscription();
        }
    }

    function switchTab(destination) {
        if (destination === 'create') {
            if (window.SyncUpSheet) window.SyncUpSheet.open('sheet-create-post');
            return;
        }

        // Destination normalization for backward compatibility
        let target = destination;
        if (destination === 'feed') target = 'home';
        if (destination === 'chat') {
            target = 'inbox';
            if (window.SyncUpStore) window.SyncUpStore.setUi({ inboxTab: 'chats' });
        }
        if (destination === 'uploads') {
            target = 'inbox';
            if (window.SyncUpStore) window.SyncUpStore.setUi({ inboxTab: 'applications' });
        }

        window.SyncUpStore.setUi({ currentTab: target });

        // Supported destinations
        const allDestinations = ['home', 'explore', 'inbox', 'profile'];
        allDestinations.forEach(d => {
            const sub = document.getElementById('subview-' + d);
            if (sub) sub.classList.add('hidden');
            const nav = document.getElementById('nav-' + d);
            if (nav) nav.classList.remove('active');
            const mobNav = document.getElementById('mob-nav-' + d);
            if (mobNav) mobNav.classList.remove('active');
        });

        // Also ensure legacy subview ids (if present) are hidden
        ['subview-feed', 'subview-chat', 'subview-uploads'].forEach(id => {
            const el = document.getElementById(id);
            if (el && !el.id.includes(target)) el.classList.add('hidden');
        });

        const activeSub = document.getElementById('subview-' + target);
        if (activeSub) activeSub.classList.remove('hidden');

        const navItem = document.getElementById('nav-' + target);
        if (navItem) navItem.classList.add('active');

        const mobNavItem = document.getElementById('mob-nav-' + target);
        if (mobNavItem) mobNavItem.classList.add('active');

        if (target === 'inbox') {
            initChatSubscription();
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function toggleMobileSidebar(open) {
        const sidebar = document.getElementById('app-sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (!sidebar || !overlay) return;
        if (open) {
            sidebar.classList.add('mobile-open');
            overlay.style.display = 'block';
        } else {
            sidebar.classList.remove('mobile-open');
            overlay.style.display = 'none';
        }
    }

    function initFeedSubscription() {
        if (unsubscribeFeed) return;
        window.SyncUpStore.setUi({ loading: { feed: true } });

        unsubscribeFeed = window.SyncUpDataService.listenToFeed(
            (posts) => {
                window.SyncUpStore.setPosts(posts);
            },
            (err) => {
                console.warn("Feed stream active in local cached mode:", err.message);
                window.SyncUpStore.setUi({ loading: { feed: false } });
            }
        );
    }

    function initChatSubscription() {
        if (unsubscribeChat) {
            try { unsubscribeChat(); } catch(e) {}
            unsubscribeChat = null;
        }

        const state = window.SyncUpStore.getState();
        const docId = (state.chats.activeMode === 'global')
            ? "GLOBAL_COMMUNITY_CHAT"
            : "CHAT_" + [state.user ? state.user.uid : 'guest', state.chats.activeContact ? state.chats.activeContact.uid : 'user_rohit'].sort().join('_');

        unsubscribeChat = window.SyncUpDataService.listenToChat(
            docId,
            (messages) => {
                window.SyncUpStore.setChatMessages(docId, messages);
            },
            (err) => {
                console.warn("Chat stream note:", err.message);
            }
        );
    }

    function retryFeed() {
        window.SyncUpStore.setUi({ error: { feed: null }, loading: { feed: true } });
        if (unsubscribeFeed) {
            try { unsubscribeFeed(); } catch(e) {}
            unsubscribeFeed = null;
        }
        initFeedSubscription();
    }

    function toggleDropdown(postId) {
        const state = window.SyncUpStore.getState();
        const nextId = state.ui.dropdownPostId === postId ? null : postId;
        window.SyncUpStore.setUi({ dropdownPostId: nextId });
    }

    function toggleComments(postId) {
        const state = window.SyncUpStore.getState();
        const exp = { ...(state.ui.expandedComments || {}) };
        exp[postId] = !exp[postId];
        window.SyncUpStore.setUi({ expandedComments: exp });
    }

    function submitComment(postId) {
        const inp = document.getElementById('comment-inp-' + postId);
        if (!inp) return;
        const text = inp.value.trim();
        if (!text) return;
        inp.value = "";
        window.SyncUpStore.commentPost(postId, text);
    }

    function blockUserPrompt(userUid, userName) {
        const state = window.SyncUpStore.getState();
        if (!state.user) return alert("Please login first.");
        if (!confirm(`Are you sure you want to block ${userName}? All their posts will be hidden from your account.`)) return;

        const updated = { ...state.user };
        if (!updated.blockedUsers) updated.blockedUsers = [];
        if (!updated.blockedUsers.includes(userUid)) {
            updated.blockedUsers.push(userUid);
            window.SyncUpStore.setUser(updated);
            window.SyncUpDataService.saveUserProfile(updated.uid, updated).catch(() => {});
        }
        window.SyncUpUtils.showToast(`${userName} has been blocked.`, "🚫");
    }

    function removeSkill(index) {
        const state = window.SyncUpStore.getState();
        if (!state.user || !state.user.skills) return;
        const updated = { ...state.user };
        updated.skills = [...updated.skills];
        updated.skills.splice(index, 1);
        window.SyncUpStore.setUser(updated);
        window.SyncUpDataService.saveUserProfile(updated.uid, updated).catch(() => {});
    }

    function filterCategory(category) {
        window.SyncUpStore.setUi({ categoryFilter: category });
        document.querySelectorAll('.category-pill').forEach(btn => {
            const btnText = btn.innerText.trim();
            btn.classList.toggle('active', btnText === category || (category === 'All' && btnText === 'All Posts'));
        });
    }

    function filterBySkill(skill) {
        window.SyncUpStore.setUi({ skillFilter: skill });
    }

    function filterByRole(role) {
        window.SyncUpStore.setUi({ roleFilter: role });
    }

    function sortBy(order) {
        window.SyncUpStore.setUi({ sortOrder: order });
    }

    function resetFilters() {
        window.SyncUpStore.setUi({
            categoryFilter: 'All',
            skillFilter: 'All',
            roleFilter: 'All',
            searchTerm: '',
            sortOrder: 'newest'
        });
        document.querySelectorAll('.category-pill').forEach(btn => {
            btn.classList.toggle('active', btn.innerText.trim() === 'All Posts');
        });
        const searchInput = document.getElementById('global-search-input');
        if (searchInput) searchInput.value = '';
    }

    let searchDebounceTimer = null;
    function handleSearch(term, immediate = false) {
        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
        const val = (term || "").trim();
        if (immediate || !val) {
            window.SyncUpStore.setUi({ searchTerm: val });
        } else {
            searchDebounceTimer = setTimeout(() => {
                window.SyncUpStore.setUi({ searchTerm: val });
            }, 250);
        }
    }

    function loadMorePosts() {
        if (window.SyncUpStore && window.SyncUpStore.loadMorePosts) {
            window.SyncUpStore.loadMorePosts();
        }
    }

    function sendEmailVerificationLink() {
        const fbAuth = window.SyncUpFirebase.auth;
        if (fbAuth && fbAuth.currentUser) {
            fbAuth.currentUser.sendEmailVerification()
                .then(() => window.SyncUpUtils.showToast("Verification link sent to " + fbAuth.currentUser.email, "✉️"))
                .catch(err => alert("Verification link: " + err.message));
        }
    }

    function handleForgotPassword() {
        const emailInp = document.getElementById('inp-email');
        const email = emailInp ? emailInp.value.trim() : '';
        if (!email || !email.includes('@')) {
            return alert("Please enter your valid email address first, then click 'Forgot password?'.");
        }
        const fbAuth = window.SyncUpFirebase.auth;
        if (fbAuth) {
            fbAuth.sendPasswordResetEmail(email)
                .then(() => window.SyncUpUtils.showToast("Password reset email sent! Check your inbox.", "📧"))
                .catch(err => alert("Password reset: " + err.message));
        }
    }

    async function handleProfilePhotoUpload(e) {
        if (!e.target.files || !e.target.files.length) return;
        const file = e.target.files[0];
        try {
            const compressed = await window.SyncUpUtils.compressImage(file, 400, 400, 0.8);
            const state = window.SyncUpStore.getState();
            if (state.user) {
                const updated = { ...state.user, pic: compressed };
                window.SyncUpStore.setUser(updated);
                await window.SyncUpDataService.saveUserProfile(updated.uid, updated);
                window.SyncUpUtils.showToast("Profile photo updated!", "📷");
            }
        } catch (err) {
            console.error("Photo upload error:", err);
            alert("Could not process image: " + err.message);
        }
    }

    // Global Event Handlers for Closing Overlays
    window.onclick = function(e) {
        if (e.target.classList.contains('modal-overlay')) {
            window.SyncUpStore.closeModal();
        }
        if (!e.target.closest('.dropdown-menu') && !e.target.closest('.btn-icon')) {
            window.SyncUpStore.setUi({ dropdownPostId: null });
        }
    };

    window.onkeydown = function(e) {
        if (e.key === 'Escape') {
            window.SyncUpStore.closeModal();
            window.SyncUpStore.setUi({ dropdownPostId: null });
            toggleMobileSidebar(false);
        }
    };

    // App Initialization
    window.onload = function() {
        // Register store subscriber for automatic re-renders
        window.SyncUpStore.subscribe(renderAll);

        const state = window.SyncUpStore.getState();
        const fbAuth = window.SyncUpFirebase.auth;

        if (fbAuth) {
            fbAuth.onAuthStateChanged((firebaseUser) => {
                if (firebaseUser) {
                    if (state.user && state.user.uid === 'guest_demo_user') {
                        navigateTo('dashboard');
                        return;
                    }

                    window.SyncUpDataService.getUserProfile(firebaseUser.uid).then(profile => {
                        const finalUser = profile || {
                            uid: firebaseUser.uid,
                            name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
                            user: '@' + (firebaseUser.displayName || firebaseUser.email.split('@')[0]).replace(/\s+/g, '_').toLowerCase(),
                            email: firebaseUser.email,
                            college: "Amity University Patna",
                            edu: "BCA 2nd Sem | Amity University Patna",
                            bio: "Passionate developer, always eager to learn and build cool projects.",
                            skills: ["Java", "Python", "React", "HTML/CSS", "UI/UX", "Git"],
                            pic: firebaseUser.photoURL || "",
                            blockedUsers: []
                        };
                        window.SyncUpStore.setUser(finalUser);
                        navigateTo('dashboard');
                    }).catch(() => {
                        if (state.user) navigateTo('dashboard');
                        else navigateTo('landing');
                    });
                } else {
                    if (state.user && state.user.uid === 'guest_demo_user') {
                        navigateTo('dashboard');
                        return;
                    }
                    navigateTo('landing');
                }
            });
        } else {
            if (state.user) navigateTo('dashboard');
            else navigateTo('landing');
        }
    };

    // Global Public API
    window.SyncUpApp = {
        navigateTo,
        switchTab,
        toggleMobileSidebar,
        retryFeed,
        toggleDropdown,
        toggleComments,
        submitComment,
        blockUserPrompt,
        removeSkill,
        filterCategory,
        filterBySkill,
        filterByRole,
        sortBy,
        resetFilters,
        handleSearch,
        loadMorePosts,
        sendEmailVerificationLink,
        handleForgotPassword,
        handleProfilePhotoUpload
    };

    // Backward-Compatible Global Event Handlers for HTML
    window.continueAsDemoGuest = window.SyncUpUIAuth.continueAsDemoGuest;
    window.navigateTo = window.SyncUpApp.navigateTo;
    window.switchDashboardTab = window.SyncUpApp.switchTab;
    window.loadMorePosts = window.SyncUpApp.loadMorePosts;
    window.openAuthTab = window.SyncUpUIAuth.openAuthTab;
    window.switchAuthTab = window.SyncUpUIAuth.switchAuthTab;
    window.handleGoogleSignIn = window.SyncUpUIAuth.handleGoogleSignIn;
    window.handleAuthSubmit = window.SyncUpUIAuth.handleAuthSubmit;
    window.togglePasswordVisibility = window.SyncUpUIAuth.togglePasswordVisibility;
    window.handleForgotPassword = window.SyncUpApp.handleForgotPassword;
    window.sendEmailVerificationLink = window.SyncUpApp.sendEmailVerificationLink;
    window.toggleMobileSidebar = window.SyncUpApp.toggleMobileSidebar;
    window.logout = window.SyncUpUIAuth.logout;
    window.filterByCategory = window.SyncUpApp.filterCategory;
    window.filterBySkill = window.SyncUpApp.filterBySkill;
    window.filterByRole = window.SyncUpApp.filterByRole;
    window.sortBy = window.SyncUpApp.sortBy;
    window.resetFilters = window.SyncUpApp.resetFilters;
    window.handleSearchFilter = window.SyncUpApp.handleSearch;
    window.openCreatePostModal = () => window.SyncUpStore.openModal('modal-create-post');
    window.openEditProfileModal = window.SyncUpUIModals.openEditProfileModal;
    window.saveProfileChanges = window.SyncUpUIModals.saveProfileChanges;
    window.confirmAddSkill = window.SyncUpUIModals.confirmAddSkill;
    window.removeSkill = window.SyncUpApp.removeSkill;
    window.handleProfilePhotoUpload = window.SyncUpApp.handleProfilePhotoUpload;
    window.switchChatMode = (m) => window.SyncUpStore.setChatMode(m);
    window.filterChatContacts = window.SyncUpUIChat.filterContacts;
    window.sendChatMessage = () => {
        const inp = document.getElementById('chat-message-input');
        if (inp) {
            window.SyncUpStore.sendMessage(inp.value);
            inp.value = '';
        }
    };
    window.openModal = (id) => window.SyncUpStore.openModal(id);
    window.closeModal = () => window.SyncUpStore.closeModal();
    window.showToast = window.SyncUpUtils.showToast;
    window.submitNewProjectPost = window.SyncUpUIModals.submitNewProjectPost;
    window.submitTeamApplication = window.SyncUpUIModals.submitTeamApplication;
    window.confirmSubmitReport = window.SyncUpUIModals.confirmSubmitReport;
    window.handleWordLimitCount = window.SyncUpUIModals.handleWordLimitCount;
    window.handlePostScreenshotUpload = window.SyncUpUIModals.handlePostScreenshotUpload;
    window.removePostScreenshot = window.SyncUpUIModals.removePostScreenshot;
    window.updateLivePostPreview = window.SyncUpUIModals.updateLivePostPreview;
    window.scrollToLandingSection = (id) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

})(window);
