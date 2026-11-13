/**
 * src/ui/auth.js
 * 
 * Layer 1 UI Component: Authentication & Demo Mode Controller
 * Handles email/password sign in, registration, Google sign-in, and Demo guest access.
 * Triggers onboarding modal upon new registration.
 */

import { signIn, signUp, signOut, getUserProfile, saveUserProfile, DEMO_USER_CONFIG } from '../services/authService.js';
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

  setUser(demoUser);
  window.SyncUpApp?.navigateTo('dashboard');
  showToast({ message: `👋 Welcome to SyncUp Demo Mode, ${demoUser.name}!`, icon: "🚀", type: "success" });

  try {
    await signIn(DEMO_USER_CONFIG.email, DEMO_USER_CONFIG.password);
  } catch (e) {
    console.log("Firebase Auth demo session notice (offline persistence active):", e.message);
  }
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
        if (confirm("Account not found. Would you like to enter Instant Demo Mode to test the application?")) {
          continueAsDemoGuest();
          return;
        }
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
