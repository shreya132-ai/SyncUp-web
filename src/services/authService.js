/**
 * src/services/authService.js
 * 
 * Layer 3: Authentication & User Profile Data Service
 * Wraps Firebase Auth methods and Firestore user profile queries/mutations.
 * Security Hardening:
 * - Public user profile (/users/{userId}) excludes private email to prevent privacy leaks.
 * - Sensitive private information is stored in private subdoc (/users/{userId}/private/account).
 * - Username uniqueness is tracked via /usernames/{handle}.
 */

import { getAuth, getDb } from './firebase.js';
import { uploadImage } from './storageService.js';
import { safeUrl } from '../utils/dom.js';

export const DEMO_USER_CONFIG = {
  name: "Demo Developer (Shreya)",
  user: "@demo_dev",
  pic: "",
  college: "Amity University Patna",
  edu: "BCA 2nd Sem | Amity University Patna",
  bio: "Passionate developer exploring SyncUp Demo Mode. Looking for teammates to build cool projects!",
  skills: ["Java", "Python", "React", "HTML/CSS", "UI/UX", "Git"],
  github: "https://github.com",
  linkedin: "https://linkedin.com",
  blockedUsers: [],
  hiddenPosts: []
};

export async function signInAnonymously() {
  const auth = getAuth();
  if (!auth) throw new Error("Auth service unavailable");
  return await auth.signInAnonymously();
}

export async function signIn(email, password) {
  const auth = getAuth();
  if (!auth) throw new Error("Auth service unavailable");
  return await auth.signInWithEmailAndPassword(email, password);
}

export async function signUp(email, password) {
  const auth = getAuth();
  if (!auth) throw new Error("Auth service unavailable");
  return await auth.createUserWithEmailAndPassword(email, password);
}

export async function signOut() {
  const auth = getAuth();
  if (auth && auth.currentUser) {
    await auth.signOut();
  }
}

export function onAuthStateChanged(callback) {
  const auth = getAuth();
  if (!auth) {
    callback(null);
    return () => {};
  }
  return auth.onAuthStateChanged(callback);
}

export async function getUserProfile(userId) {
  const db = getDb();
  if (!db || !userId) return null;

  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) return null;

    let profile = { uid: userId, ...userDoc.data() };

    // Fetch private info (email) if requesting own profile
    const auth = getAuth();
    if (auth && auth.currentUser && auth.currentUser.uid === userId) {
      try {
        const privDoc = await db.collection("users").doc(userId).collection("private").doc("account").get();
        if (privDoc.exists && privDoc.data().email) {
          profile.email = privDoc.data().email;
        } else if (auth.currentUser.email) {
          profile.email = auth.currentUser.email;
        }
      } catch (e) {
        if (auth.currentUser.email) profile.email = auth.currentUser.email;
      }
    }

    return profile;
  } catch (err) {
    console.warn("[authService] getUserProfile note:", err.message);
    return null;
  }
}

export async function saveUserProfile(userId, profileData) {
  const db = getDb();
  if (!db || !userId || userId === DEMO_USER_CONFIG.uid) return;

  const dataToSave = { ...profileData };

  // Storage rules enforce avatars/{uid}.jpg
  if (dataToSave.pic && dataToSave.pic.startsWith('data:')) {
    dataToSave.pic = await uploadImage(dataToSave.pic, `avatars/${userId}.jpg`);
  } else if (dataToSave.pic) {
    dataToSave.pic = safeUrl(dataToSave.pic);
  }

  // Separate private email to prevent privacy leaks in public profile
  const email = dataToSave.email;
  delete dataToSave.email;

  // Save public profile
  await db.collection("users").doc(userId).set(dataToSave, { merge: true });

  // Save private account doc (accessible only by the owner)
  if (email) {
    try {
      await db.collection("users").doc(userId).collection("private").doc("account").set({
        email: email,
        updatedAt: (typeof window !== 'undefined' && window.firebase?.firestore?.FieldValue) 
          ? window.firebase.firestore.FieldValue.serverTimestamp() 
          : new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn("[authService] Private email save notice:", e.message);
    }
  }

  // Maintain username uniqueness mapping (/usernames/{handle})
  if (dataToSave.user) {
    const cleanHandle = dataToSave.user.replace(/^@/, '').toLowerCase().trim();
    if (cleanHandle) {
      try {
        await db.collection("usernames").doc(cleanHandle).set({
          uid: userId,
          handle: dataToSave.user
        }, { merge: true });
      } catch (e) {
        console.warn("[authService] Username claim notice:", e.message);
      }
    }
  }
}

/**
 * Checks whether a given handle is available for claiming during registration.
 * Returns true if available, false if already taken by another user.
 */
export async function checkUsernameAvailable(handle, currentUid = null) {
  const db = getDb();
  if (!db || !handle) return true;

  const cleanHandle = handle.replace(/^@/, '').toLowerCase().trim();
  if (!cleanHandle) return true;

  try {
    const doc = await db.collection("usernames").doc(cleanHandle).get();
    if (!doc.exists) return true;
    const data = doc.data();
    if (currentUid && data.uid === currentUid) return true;
    return false;
  } catch (err) {
    return true;
  }
}
