/**
 * src/services/postsService.js
 * 
 * Layer 3: Project Posts Data Service (The ONLY place for /posts/ Firestore interactions)
 * Encapsulates real-time feed subscription, post creation, like/unlike, comments, and team applications.
 */

import { getDb } from './firebase.js';
import { uploadImage } from './storageService.js';

function isLocalOrMockPost(postId) {
  if (!postId) return true;
  return postId.startsWith('sample_') || 
         postId.startsWith('my_upload_') || 
         postId.startsWith('mock_') || 
         postId.startsWith('demo_') || 
         postId.startsWith('test_');
}

/**
 * Subscribes to real-time project posts from Firestore.
 */
export function listenToFeed(onUpdate, onError) {
  const db = getDb();
  if (!db) {
    if (onError) onError(new Error("Firestore database unavailable"));
    return () => {};
  }

  try {
    return db.collection("posts").onSnapshot((snapshot) => {
      const posts = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Filter out legacy chat channels stored in posts collection
        if (doc.id.startsWith('CHAT_') || doc.id === 'GLOBAL_COMMUNITY_CHAT' || data.type === 'community_chat_channel' || data.type === 'direct_chat') {
          return;
        }
        posts.push({ id: doc.id, ...data });
      });
      onUpdate(posts);
    }, (err) => {
      if (onError) onError(err);
    });
  } catch (err) {
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Creates a new project post document in Firestore.
 */
export async function createPost(postDoc) {
  const db = getDb();
  if (!db) return postDoc;

  let finalImgUrl = postDoc.img || "";
  if (finalImgUrl && finalImgUrl.startsWith('data:')) {
    finalImgUrl = await uploadImage(finalImgUrl, `posts/${postDoc.id || Date.now()}.jpg`);
  }

  const docId = postDoc.id || ('post_' + Date.now());
  const docData = {
    ...postDoc,
    id: docId,
    img: finalImgUrl,
    timestamp: (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) 
      ? window.firebase.firestore.FieldValue.serverTimestamp() 
      : null
  };

  await db.collection("posts").doc(docId).set(docData, { merge: true });
  return docData;
}

/**
 * Likes or unlikes a project post in Firestore.
 */
export async function likePost(postId, userId, isAlreadyLiked) {
  const db = getDb();
  if (!db || isLocalOrMockPost(postId)) return;

  const postRef = db.collection("posts").doc(postId);
  const FieldValue = window.firebase.firestore.FieldValue;

  const updateData = isAlreadyLiked ? {
    likes: FieldValue.increment(-1),
    likedBy: FieldValue.arrayRemove(userId)
  } : {
    likes: FieldValue.increment(1),
    likedBy: FieldValue.arrayUnion(userId)
  };

  await postRef.update(updateData);
}

/**
 * Adds a comment to a project post in Firestore.
 */
export async function commentPost(postId, commentObj) {
  const db = getDb();
  if (!db || isLocalOrMockPost(postId)) return;

  const postRef = db.collection("posts").doc(postId);
  await postRef.update({
    comments: window.firebase.firestore.FieldValue.arrayUnion(commentObj)
  });
}

/**
 * Deletes a post from Firestore.
 */
export async function deletePost(postId) {
  const db = getDb();
  if (!db || isLocalOrMockPost(postId)) return;

  await db.collection("posts").doc(postId).delete();
}

/**
 * Submits an application to join a project team.
 */
export async function applyToPost(postId, applicationObj) {
  const db = getDb();
  if (!db || isLocalOrMockPost(postId)) return;

  const postRef = db.collection("posts").doc(postId);
  await postRef.update({
    applications: window.firebase.firestore.FieldValue.arrayUnion(applicationObj)
  });
}

/**
 * Updates application status (Accept / Decline) for a post.
 */
export async function updateApplicationStatus(postId, updatedApplicationsArray) {
  const db = getDb();
  if (!db || isLocalOrMockPost(postId)) return;

  const postRef = db.collection("posts").doc(postId);
  await postRef.update({
    applications: updatedApplicationsArray
  });
}
