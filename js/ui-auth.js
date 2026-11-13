/**
 * js/ui-auth.js
 * 
 * Layer 1 UI Component: Authentication & Demo Mode Controller
 * Subscribes to Store state. Handles login, register, Google sign-in, and Demo guest access.
 */

(function(window) {
    'use strict';

    let currentAuthMode = 'login';
    const DEMO_EMAIL = "syncup_demo_official@syncup.dev";
    const DEMO_PASS = "SyncUpDemoUser2026!";

    function openAuthTab(mode) {
        window.SyncUpApp.navigateTo('auth');
        switchAuthTab(mode);
    }

    function switchAuthTab(mode) {
        currentAuthMode = mode;
        const tabLogin = document.getElementById('tab-login');
        const tabReg = document.getElementById('tab-register');
        if (tabLogin) tabLogin.classList.toggle('active', mode === 'login');
        if (tabReg) tabReg.classList.toggle('active', mode === 'register');

        const isReg = (mode === 'register');
        const nameField = document.getElementById('field-reg-name');
        const userField = document.getElementById('field-reg-username');
        const collField = document.getElementById('field-reg-college');
        const confField = document.getElementById('field-reg-confirm');
        const auxRow = document.getElementById('auth-aux-row');
        const submitBtn = document.getElementById('btn-auth-submit');

        if (nameField) nameField.classList.toggle('hidden', !isReg);
        if (userField) userField.classList.toggle('hidden', !isReg);
        if (collField) collField.classList.toggle('hidden', !isReg);
        if (confField) confField.classList.toggle('hidden', !isReg);
        if (auxRow) auxRow.classList.toggle('hidden', isReg);

        const emailInput = document.getElementById('inp-email');
        if (emailInput) {
            emailInput.placeholder = isReg ? "Enter your email address" : "Enter your email or @username";
        }

        if (submitBtn) submitBtn.innerText = isReg ? 'Create Account' : 'Login';
    }

    function togglePasswordVisibility(inputId) {
        const el = document.getElementById(inputId);
        if (!el) return;
        el.type = (el.type === 'password') ? 'text' : 'password';
    }

    async function continueAsDemoGuest() {
        const demoUser = {
            uid: "guest_demo_user",
            name: "Shreya Sinha",
            user: "@shreya_sinha",
            email: "shreya@demo.syncup",
            pic: "",
            college: "Amity University Patna",
            edu: "BCA 2nd Sem | Amity University Patna",
            bio: "Passionate developer, always eager to learn and build cool projects. Looking for teammates to work on exciting ideas!",
            skills: ["Java", "Python", "React", "HTML/CSS", "UI/UX", "Git"],
            github: "https://github.com",
            linkedin: "https://linkedin.com",
            blockedUsers: []
        };

        window.SyncUpStore.setUser(demoUser);
        window.SyncUpApp.navigateTo('dashboard');
        window.SyncUpUtils.showToast("👋 Welcome to SyncUp Demo Mode, " + demoUser.name + "!");

        // Connect demo credentials in background so Firestore security rules pass
        try {
            await window.SyncUpDataService.signInWithCredentials(DEMO_EMAIL, DEMO_PASS);
        } catch(e) {
            console.log("Firebase Auth demo session notice (offline persistence active):", e.message);
        }
    }

    function handleGoogleSignIn() {
        if (window.location.protocol === 'file:') {
            window.SyncUpUtils.showToast("Launching Instant Demo Mode for local file view!", "🚀");
            continueAsDemoGuest();
            return;
        }

        if (typeof firebase === 'undefined' || !window.SyncUpFirebase.auth) {
            continueAsDemoGuest();
            return;
        }

        const provider = new firebase.auth.GoogleAuthProvider();
        window.SyncUpFirebase.auth.signInWithPopup(provider)
            .then(result => {
                const user = result.user;
                const uid = user.uid;
                const defaultUser = {
                    uid,
                    name: user.displayName || "Google Developer",
                    user: '@' + (user.displayName || "dev").replace(/\s+/g, '_').toLowerCase(),
                    email: user.email,
                    college: "Amity University Patna",
                    edu: "BCA 2nd Sem | Amity University Patna",
                    bio: "Passionate developer looking to build great projects.",
                    skills: ["JavaScript", "React", "Git"],
                    pic: user.photoURL || "",
                    blockedUsers: []
                };

                window.SyncUpDataService.getUserProfile(uid).then(profile => {
                    const finalUser = profile || defaultUser;
                    if (!profile) window.SyncUpDataService.saveUserProfile(uid, defaultUser).catch(() => {});
                    window.SyncUpStore.setUser(finalUser);
                    window.SyncUpApp.navigateTo('dashboard');
                    window.SyncUpUtils.showToast(`Welcome, ${finalUser.name}! Signed in via Google.`, "✨");
                }).catch(() => {
                    window.SyncUpStore.setUser(defaultUser);
                    window.SyncUpApp.navigateTo('dashboard');
                });
            })
            .catch(err => {
                if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/operation-not-supported-in-this-environment' || err.code === 'auth/unauthorized-domain') {
                    window.SyncUpUtils.showToast("Google sign-in unavailable in this environment. Loading Demo mode...", "ℹ️");
                    continueAsDemoGuest();
                } else {
                    alert("Google Sign-in: " + err.message);
                }
            });
    }

    async function handleAuthSubmit() {
        const emailInp = document.getElementById('inp-email');
        const passInp = document.getElementById('inp-password');
        const btn = document.getElementById('btn-auth-submit');

        let email = emailInp ? emailInp.value.trim() : '';
        const pass = passInp ? passInp.value : '';

        if (!email || !pass) return alert("Please fill in all required fields.");
        if (pass.length < 6) return alert("Password must be at least 6 characters.");

        btn.disabled = true;
        btn.innerText = currentAuthMode === 'login' ? 'Signing in...' : 'Creating account...';

        // Auto-normalize username login into valid credential
        if (!email.includes('@') || (email.startsWith('@') && !email.slice(1).includes('@')) || !email.includes('.')) {
            const cleanUser = email.replace(/^@/, '').toLowerCase();
            email = cleanUser + '@syncup.local';
        }

        if (currentAuthMode === 'login') {
            try {
                const cred = await window.SyncUpDataService.signInWithCredentials(email, pass);
                const uid = cred.user.uid;
                const profile = await window.SyncUpDataService.getUserProfile(uid);
                const finalUser = profile || {
                    uid,
                    name: cred.user.displayName || email.split('@')[0],
                    user: '@' + (cred.user.displayName || email.split('@')[0]).replace(/\s+/g, '_').toLowerCase(),
                    email: email,
                    college: "Amity University Patna",
                    edu: "BCA 2nd Sem | Amity University Patna",
                    bio: "Passionate developer looking to collaborate on cool projects.",
                    skills: ["Java", "Python", "React", "Git"],
                    pic: "",
                    blockedUsers: []
                };

                window.SyncUpStore.setUser(finalUser);
                btn.disabled = false;
                window.SyncUpApp.navigateTo('dashboard');
                window.SyncUpUtils.showToast("Welcome back, " + finalUser.name + "!", "👋");
            } catch (err) {
                btn.disabled = false;
                btn.innerText = 'Login';
                if (err.code === 'auth/invalid-login-credentials' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                    if (confirm("Account not found. Would you like to enter Instant Demo Mode to test the application?")) {
                        continueAsDemoGuest();
                        return;
                    }
                }
                alert("Login note: " + err.message);
            }
        } else {
            // Register
            const name = document.getElementById('inp-name').value.trim();
            let username = document.getElementById('inp-username').value.trim();
            const college = document.getElementById('inp-college').value.trim();
            const confirmPass = document.getElementById('inp-confirm-password').value;

            if (!name || !username) {
                btn.disabled = false;
                btn.innerText = 'Create Account';
                return alert("Please enter your Full Name and Username.");
            }
            if (pass !== confirmPass) {
                btn.disabled = false;
                btn.innerText = 'Create Account';
                return alert("Passwords do not match.");
            }
            if (!username.startsWith('@')) username = '@' + username;

            try {
                const cred = await window.SyncUpDataService.signUpWithCredentials(email, pass);
                const newUser = {
                    uid: cred.user.uid,
                    name: name,
                    user: username,
                    email: email,
                    college: college || "Amity University Patna",
                    edu: (college || "Amity University Patna") + " | BCA 2nd Sem",
                    bio: "Passionate developer, always eager to learn and build cool projects.",
                    skills: ["Java", "Python", "React", "HTML/CSS", "UI/UX", "Git"],
                    pic: "",
                    blockedUsers: []
                };

                await window.SyncUpDataService.saveUserProfile(cred.user.uid, newUser);
                window.SyncUpStore.setUser(newUser);
                btn.disabled = false;
                window.SyncUpApp.navigateTo('dashboard');
                window.SyncUpUtils.showToast("Account created successfully! Welcome to SyncUp.", "🎉");

                // Trigger Post Sign-Up Onboarding: Ask for 3-5 skills to personalize feed
                setTimeout(() => {
                    if (window.SyncUpUIOnboarding) {
                        window.SyncUpUIOnboarding.openOnboarding();
                    }
                }, 400);
            } catch (err) {
                btn.disabled = false;
                btn.innerText = 'Create Account';
                alert("Registration note: " + err.message);
            }
        }
    }

    async function logout() {
        await window.SyncUpDataService.signOutUser();
        window.SyncUpStore.setUser(null);
        location.reload();
    }

    window.SyncUpUIAuth = {
        openAuthTab,
        switchAuthTab,
        togglePasswordVisibility,
        continueAsDemoGuest,
        handleGoogleSignIn,
        handleAuthSubmit,
        logout
    };

})(window);
