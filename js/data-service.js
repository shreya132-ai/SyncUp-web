/**
 * js/data-service.js
 * 
 * Layer 3: Data Service (The ONLY place that talks to Firestore & Firebase Storage)
 * Encapsulates all network I/O, queries, mutations, image uploads, and listeners.
 */

(function(window) {
    'use strict';

    function getDb() {
        return window.SyncUpFirebase ? window.SyncUpFirebase.db : null;
    }

    function getStorage() {
        return window.SyncUpFirebase ? window.SyncUpFirebase.storage : null;
    }

    function getAuth() {
        return window.SyncUpFirebase ? window.SyncUpFirebase.auth : null;
    }

    /**
     * Upload an image Blob/DataURL to Firebase Storage and retrieve the public Download URL.
     * MIGRATION NOTE: Existing legacy documents may still have base64 data strings in their 'img' field.
     * The application handles both Storage HTTPS URLs and legacy base64 data URLs seamlessly.
     */
    async function uploadImage(dataUrlOrBlob, path = '') {
        const storage = getStorage();
        if (!storage || !dataUrlOrBlob) {
            /* MIGRATION NOTE: Storage unavailable or local environment; return compressed string as fallback */
            return typeof dataUrlOrBlob === 'string' ? dataUrlOrBlob : '';
        }

        try {
            let blob = dataUrlOrBlob;
            if (typeof dataUrlOrBlob === 'string') {
                blob = window.SyncUpUtils.dataUrlToBlob(dataUrlOrBlob);
            }
            if (!blob) return '';

            const storagePath = path || `project_images/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
            const storageRef = storage.ref(storagePath);
            const snapshot = await storageRef.put(blob, { contentType: 'image/jpeg' });
            const downloadUrl = await snapshot.ref.getDownloadURL();
            return downloadUrl;
        } catch (err) {
            console.warn("Firebase Storage upload notice (falling back to compressed inline image):", err.message);
            return typeof dataUrlOrBlob === 'string' ? dataUrlOrBlob : '';
        }
    }

    /**
     * Real-Time Project Feed Listener
     */
    function listenToFeed(onUpdate, onError) {
        const db = getDb();
        if (!db) {
            if (onError) onError(new Error("Database unavailable"));
            return () => {};
        }

        try {
            return db.collection("posts").onSnapshot((snapshot) => {
                const posts = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    // Exclude chat system documents
                    if (doc.id.startsWith('CHAT_') || doc.id === 'GLOBAL_COMMUNITY_CHAT' || data.type === 'community_chat_channel' || data.type === 'direct_chat') return;
                    posts.push({ id: doc.id, ...data });
                });
                onUpdate(posts);
            }, (err) => {
                if (onError) onError(err);
            });
        } catch (e) {
            if (onError) onError(e);
            return () => {};
        }
    }

    /**
     * Create a new project post in Firestore
     */
    async function createPost(postDoc) {
        const db = getDb();
        if (!db) return postDoc;

        // If screenshot is present and is a data URL, attempt upload to Firebase Storage
        let finalImgUrl = postDoc.img || "";
        if (finalImgUrl && finalImgUrl.startsWith('data:')) {
            finalImgUrl = await uploadImage(finalImgUrl, `posts/${postDoc.id || Date.now()}.jpg`);
        }

        const docData = {
            ...postDoc,
            img: finalImgUrl,
            timestamp: typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : null
        };

        const docId = postDoc.id || ('post_' + Date.now());
        await db.collection("posts").doc(docId).set(docData, { merge: true });
        return { ...docData, id: docId };
    }

    function isLocalPost(postId) {
        if (!postId) return true;
        return postId.startsWith('sample_') || postId.startsWith('my_upload_') || postId.startsWith('mock_') || postId.startsWith('demo_') || postId.startsWith('test_') || postId.startsWith('post_test_');
    }

    /**
     * Like / Unlike Post
     */
    async function likePost(postId, userId, isAlreadyLiked) {
        const db = getDb();
        if (!db || isLocalPost(postId)) return;

        const postRef = db.collection("posts").doc(postId);
        const updateData = isAlreadyLiked ? {
            likes: firebase.firestore.FieldValue.increment(-1),
            likedBy: firebase.firestore.FieldValue.arrayRemove(userId)
        } : {
            likes: firebase.firestore.FieldValue.increment(1),
            likedBy: firebase.firestore.FieldValue.arrayUnion(userId)
        };

        await postRef.update(updateData);
    }

    /**
     * Add a comment to a post
     */
    async function commentPost(postId, commentObj) {
        const db = getDb();
        if (!db || isLocalPost(postId)) return;

        const postRef = db.collection("posts").doc(postId);
        await postRef.update({
            comments: firebase.firestore.FieldValue.arrayUnion(commentObj)
        });
    }

    /**
     * Delete a post from Firestore
     */
    async function deletePost(postId) {
        const db = getDb();
        if (!db || isLocalPost(postId)) return;

        await db.collection("posts").doc(postId).delete();
    }

    /**
     * Submit an application to a project team
     */
    async function applyToPost(postId, applicationObj) {
        const db = getDb();
        if (!db || isLocalPost(postId)) return;

        const postRef = db.collection("posts").doc(postId);
        await postRef.update({
            applications: firebase.firestore.FieldValue.arrayUnion(applicationObj)
        });
    }

    /**
     * Lead reviews & updates application status (Accept / Decline)
     */
    async function updateApplicationStatus(postId, updatedApplicationsArray) {
        const db = getDb();
        if (!db || isLocalPost(postId)) return;

        const postRef = db.collection("posts").doc(postId);
        await postRef.update({
            applications: updatedApplicationsArray
        });
    }

    /**
     * Real-Time Chat Listener
     */
    function listenToChat(docId, onUpdate, onError) {
        const db = getDb();
        if (!db) {
            if (onError) onError(new Error("Database unavailable"));
            return () => {};
        }

        try {
            return db.collection("posts").doc(docId).onSnapshot((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    onUpdate(data.messages || []);
                } else {
                    onUpdate([]);
                }
            }, (err) => {
                if (onError) onError(err);
            });
        } catch (e) {
            if (onError) onError(e);
            return () => {};
        }
    }

    /**
     * Send message to Firestore chat channel
     */
    async function sendMessage(docId, isGlobal, messageObj) {
        const db = getDb();
        if (!db) return;

        const type = isGlobal ? "community_chat_channel" : "direct_chat";
        await db.collection("posts").doc(docId).set({
            type: type,
            messages: firebase.firestore.FieldValue.arrayUnion(messageObj)
        }, { merge: true });
    }

    /**
     * User Profile Management
     */
    async function saveUserProfile(userId, profileData) {
        const db = getDb();
        if (!db || !userId || userId === 'guest_demo_user') return;

        let finalPicUrl = profileData.pic || "";
        if (finalPicUrl && finalPicUrl.startsWith('data:')) {
            finalPicUrl = await uploadImage(finalPicUrl, `avatars/${userId}.jpg`);
            profileData.pic = finalPicUrl;
        }

        await db.collection("users").doc(userId).set(profileData, { merge: true });
    }

    async function getUserProfile(userId) {
        const db = getDb();
        if (!db || !userId) return null;

        const doc = await db.collection("users").doc(userId).get();
        return doc.exists ? { uid: userId, ...doc.data() } : null;
    }

    /**
     * Authentication wrappers
     */
    async function signInWithCredentials(email, password) {
        const auth = getAuth();
        if (!auth) throw new Error("Auth service unavailable");
        return await auth.signInWithEmailAndPassword(email, password);
    }

    async function signUpWithCredentials(email, password) {
        const auth = getAuth();
        if (!auth) throw new Error("Auth service unavailable");
        return await auth.createUserWithEmailAndPassword(email, password);
    }

    async function signOutUser() {
        const auth = getAuth();
        if (auth && auth.currentUser) {
            await auth.signOut();
        }
    }

    // Expose Data Service
    window.SyncUpDataService = {
        uploadImage,
        listenToFeed,
        createPost,
        likePost,
        commentPost,
        deletePost,
        applyToPost,
        updateApplicationStatus,
        listenToChat,
        sendMessage,
        saveUserProfile,
        getUserProfile,
        signInWithCredentials,
        signUpWithCredentials,
        signOutUser
    };

})(window);
