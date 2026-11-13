/**
 * src/services/firebase.js
 * 
 * Layer 4: Firebase Initialization & Persistent Local Cache
 * Initializes Firebase App, Firestore (with IndexedDB persistent local cache),
 * Auth, and Storage.
 */

const firebaseConfig = {
  apiKey: "AIzaSyBD5IOdzaGaXDtYLNpLZVMSSmiTCiFkngE",
  authDomain: "syncup-web-d3f9b.firebaseapp.com",
  projectId: "syncup-web-d3f9b",
  storageBucket: "syncup-web-d3f9b.firebasestorage.app",
  messagingSenderId: "688220788163",
  appId: "1:688220788163:web:9b4544bff6c76ca25d1976",
  measurementId: "G-RSHP8T1K1"
};

let db = null;
let auth = null;
let storage = null;
let isInitialized = false;

try {
  if (typeof window !== 'undefined' && typeof window.firebase !== 'undefined') {
    if (!window.firebase.apps.length) {
      window.firebase.initializeApp(firebaseConfig);
    }
    auth = window.firebase.auth();
    db = window.firebase.firestore();

    // Enable Firestore built-in persistent local cache (IndexedDB)
    if (db && typeof db.enablePersistence === 'function') {
      db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn("[Firebase] Offline cache active in primary tab (multiple tabs open).");
        } else if (err.code === 'unimplemented') {
          console.warn("[Firebase] Browser does not support IndexedDB persistence.");
        } else {
          console.warn("[Firebase] Offline persistence warning:", err.message);
        }
      });
    }

    if (typeof window.firebase.storage === 'function') {
      try {
        storage = window.firebase.storage();
      } catch (e) {
        console.warn("[Firebase] Storage init warning:", e.message);
      }
    }

    isInitialized = true;
  }
} catch (err) {
  console.warn("[Firebase] Initialization notice:", err.message);
}

export function getDb() { return db; }
export function getAuth() { return auth; }
export function getStorage() { return storage; }
export function isFirebaseReady() { return isInitialized; }
export { firebaseConfig };
