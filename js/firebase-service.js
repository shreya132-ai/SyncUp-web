/**
 * js/firebase-service.js
 * 
 * Layer 4: Firebase Initialization & Offline Persistence
 * Initializes Firebase App, Firestore with native cache persistence, Auth, and Storage.
 */

(function(window) {
    'use strict';

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
        if (typeof firebase !== 'undefined') {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            auth = firebase.auth();
            db = firebase.firestore();

            // Enable Firestore built-in persistent local cache (IndexedDB)
            if (db && typeof db.enablePersistence === 'function') {
                db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
                    if (err.code === 'failed-precondition') {
                        console.warn("Firestore offline cache: multiple tabs open. Enabled in primary tab.");
                    } else if (err.code === 'unimplemented') {
                        console.warn("Firestore offline cache: current browser does not support persistence.");
                    } else {
                        console.warn("Firestore offline cache notice:", err.message);
                    }
                });
            }

            // Firebase Storage
            if (typeof firebase.storage === 'function') {
                try {
                    storage = firebase.storage();
                } catch(e) {
                    console.warn("Firebase storage init notice:", e.message);
                }
            }

            isInitialized = true;
        }
    } catch (err) {
        console.warn("Firebase service initialization warning:", err.message);
    }

    // Expose as global service handle
    window.SyncUpFirebase = {
        config: firebaseConfig,
        db: db,
        auth: auth,
        storage: storage,
        isInitialized: isInitialized
    };

})(window);
