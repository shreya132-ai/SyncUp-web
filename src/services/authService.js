/**
 * src/services/authService.js
 * 
 * Layer 3: Authentication & User Profile Data Service
 * Wraps Firebase Auth methods and Firestore user profile queries/mutations.
 */

import { getAuth, getDb } from './firebase.js';
import { uploadImage } from './storageService.js';

export const DEMO_USER_CONFIG = {
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
  const doc = await db.collection("users").doc(userId).get();
  return doc.exists ? { uid: userId, ...doc.data() } : null;
}

export async function saveUserProfile(userId, profileData) {
  const db = getDb();
  if (!db || !userId || userId === DEMO_USER_CONFIG.uid) return;

  const dataToSave = { ...profileData };
  if (dataToSave.pic && dataToSave.pic.startsWith('data:')) {
    dataToSave.pic = await uploadImage(dataToSave.pic, `avatars/${userId}.jpg`);
  }

  await db.collection("users").doc(userId).set(dataToSave, { merge: true });
}
