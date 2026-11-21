/**
 * src/ui/auth.js
 * 
 * Layer 1 UI Component: Authentication & Demo Mode Controller
 * Handles email/password sign in, registration, Google sign-in, and Demo guest access.
 * Triggers onboarding modal upon new registration.
 */

import { signIn, signUp, signOut, signInAnonymously, getUserProfile, saveUserProfile, checkUsernameAvailable, DEMO_USER_CONFIG } from '../services/authService.js';
import { setUser, getState } from '../store/store.js';
import { showToast } from './toast.js';
import { openOnboarding } from './onboarding.js';

let currentAuthMode = 'login';

export function openAuthTab(mode) {
  window.SyncUpApp?.navigateTo('auth');
  switchAuthTab(mode);
}

export function switchAuthTab(mode) {
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

export function togglePasswordVisibility(inputId) {
  const el = document.getElementById(inputId);
  if (!el) return;
  el.type = (el.type === 'password') ? 'text' : 'password';
}

export async function continueAsDemoGuest() {
  showToast({ message: "Connecting to SyncUp Demo Session...", icon: "⏳", type: "info" });

  let realUid = null;
  try {
    const cred = await signInAnonymously();
    if (cred && cred.user) {
      realUid = cred.user.uid;
    }
  } catch (err) {
    console.warn("[Auth] Anonymous Auth notice (local mode active):", err.message);
  }

  const finalUid = realUid || ("demo_" + Date.now().toString(36));

  const demoUser = {
    uid: finalUid,
    isDemo: true,
    isAnonymous: true,
    name: DEMO_USER_CONFIG.name || "Demo Developer (Shreya)",
    user: DEMO_USER_CONFIG.user || "@demo_dev",
    email: "",
    pic: "",
    college: DEMO_USER_CONFIG.college || "Amity University Patna",
    edu: DEMO_USER_CONFIG.edu || "BCA 2nd Sem | Amity University Patna",
    bio: DEMO_USER_CONFIG.bio || "Passionate developer exploring SyncUp Demo Mode.",
    skills: [...(DEMO_USER_CONFIG.skills || ["Java", "Python", "React"])],
    github: DEMO_USER_CONFIG.github || "https://github.com",
    linkedin: DEMO_USER_CONFIG.linkedin || "https://linkedin.com",
    blockedUsers: [],
    hiddenPosts: []
  };

  setUser(demoUser);
  window.SyncUpApp?.navigateTo('dashboard');
  showToast({ message: `👋 Welcome to SyncUp Demo Mode, ${demoUser.name}!`, icon: "🚀", type: "success" });
}

export function handleGoogleSignIn() {
  if (window.location.protocol === 'file:') {
    showToast({ message: "Launching Instant Demo Mode for local file view!", icon: "🚀", type: "info" });
    continueAsDemoGuest();
    return;
  }

  if (typeof firebase === 'undefined' || !window.firebase?.auth) {
    continueAsDemoGuest();
    return;
  }

  const provider = new window.firebase.auth.GoogleAuthProvider();
  window.firebase.auth().signInWithPopup(provider)
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

      getUserProfile(uid).then(profile => {
        const finalUser = profile || defaultUser;
        if (!profile) saveUserProfile(uid, defaultUser).catch(() => {});
        setUser(finalUser);
        window.SyncUpApp?.navigateTo('dashboard');
        showToast({ message: `Welcome, ${finalUser.name}! Signed in via Google.`, icon: "✨", type: "success" });
      }).catch(() => {
        setUser(defaultUser);
        window.SyncUpApp?.navigateTo('dashboard');
      });
    })
    .catch(err => {
      if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/operation-not-supported-in-this-environment' || err.code === 'auth/unauthorized-domain') {
        showToast({ message: "Google sign-in unavailable in this environment. Loading Demo mode...", icon: "ℹ️", type: "info" });
        continueAsDemoGuest();
      } else {
        showToast({ message: "Google Sign-in: " + err.message, icon: "⚠️", type: "error" });
      }
    });
}

export async function handleAuthSubmit() {
  const emailInp = document.getElementById('inp-email');
  const passInp = document.getElementById('inp-password');
  const btn = document.getElementById('btn-auth-submit');

  let email = emailInp ? emailInp.value.trim() : '';
  const pass = passInp ? passInp.value : '';

  if (!email || !pass) {
    showToast({ message: "Please fill in all required fields.", icon: "⚠️", type: "error" });
    return;
  }
  if (pass.length < 6) {
    showToast({ message: "Password must be at least 6 characters.", icon: "⚠️", type: "error" });
    return;
  }

  btn.disabled = true;
  btn.innerText = currentAuthMode === 'login' ? 'Signing in...' : 'Creating account...';

  // Normalize username login
  if (!email.includes('@') || (email.startsWith('@') && !email.slice(1).includes('@')) || !email.includes('.')) {
    const cleanUser = email.replace(/^@/, '').toLowerCase();
    email = cleanUser + '@syncup.local';
  }

  if (currentAuthMode === 'login') {
    try {
      const cred = await signIn(email, pass);
      const uid = cred.user.uid;
      const profile = await getUserProfile(uid);
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

      setUser(finalUser);
      btn.disabled = false;
      window.SyncUpApp?.navigateTo('dashboard');
      showToast({ message: "Welcome back, " + finalUser.name + "!", icon: "👋", type: "success" });
    } catch (err) {
      btn.disabled = false;
      btn.innerText = 'Login';
      if (err.code === 'auth/invalid-login-credentials' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        showToast({ 
          message: "Account not found or password incorrect. You can click 'Preview Demo' below to explore instantly.", 
          icon: "🔒", 
          type: "error",
          duration: 5000 
        });
        return;
      }
      showToast({ message: "Login note: " + err.message, icon: "⚠️", type: "error" });
    }
  } else {
    // Register
    const name = (document.getElementById('inp-name')?.value || '').trim();
    let username = (document.getElementById('inp-username')?.value || '').trim();
    const college = (document.getElementById('inp-college')?.value || '').trim();
    const confirmPass = document.getElementById('inp-confirm-password')?.value || '';

    if (!name || !username) {
      btn.disabled = false;
      btn.innerText = 'Create Account';
      showToast({ message: "Please enter your Full Name and Username.", icon: "⚠️", type: "error" });
      return;
    }
    if (pass !== confirmPass) {
      btn.disabled = false;
      btn.innerText = 'Create Account';
      showToast({ message: "Passwords do not match.", icon: "⚠️", type: "error" });
      return;
    }
    if (!username.startsWith('@')) username = '@' + username;

    // Check unique username before registration
    const isAvail = await checkUsernameAvailable(username);
    if (!isAvail) {
      btn.disabled = false;
      btn.innerText = 'Create Account';
      showToast({ message: `Username ${username} is already taken. Please choose another.`, icon: "⚠️", type: "error" });
      return;
    }

    try {
      const cred = await signUp(email, pass);
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

      await saveUserProfile(cred.user.uid, newUser);
      setUser(newUser);
      btn.disabled = false;
      window.SyncUpApp?.navigateTo('dashboard');
      showToast({ message: "Account created successfully! Welcome to SyncUp.", icon: "🎉", type: "success" });

      setTimeout(() => {
        openOnboarding();
      }, 400);
    } catch (err) {
      btn.disabled = false;
      btn.innerText = 'Create Account';
      showToast({ message: "Registration note: " + err.message, icon: "⚠️", type: "error" });
    }
  }
}

export async function logout() {
  await signOut();
  setUser(null);
  window.location.reload();
}
