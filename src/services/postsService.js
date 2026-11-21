/**
 * src/services/postsService.js
 * 
 * Layer 3: Project Posts Data Service (The ONLY place for /posts/ Firestore interactions)
 * Hardened Firestore Subcollections:
 * - Likes: posts/{id}/likes/{uid} (doc id == auth.uid)
 * - Comments: posts/{id}/comments/{commentId} (authorUid == auth.uid)
 * - Applications: posts/{id}/applications/{appId} (private subcollection, applicantUid == auth.uid)
 * - Post creation & validation: field types, length limits, and safe URLs on write.
 */

import { getDb } from './firebase.js';
import { uploadImage } from './storageService.js';
import { safeUrl } from '../utils/dom.js';

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
 * Validates field lengths, types, and URLs on write.
 */
export async function createPost(postDoc) {
  const db = getDb();
  if (!db) return postDoc;

  let finalImgUrl = postDoc.img || "";
  if (finalImgUrl && finalImgUrl.startsWith('data:')) {
    finalImgUrl = await uploadImage(finalImgUrl, `posts/${postDoc.userUid || 'user'}/${Date.now()}.jpg`);
  }

  const docId = postDoc.id || ('post_' + Date.now());
  
  // URL safety on write
  const safeGithub = postDoc.githubUrl ? safeUrl(postDoc.githubUrl, { allowDataImage: false }) : "";
  const safeDemo = postDoc.demoUrl ? safeUrl(postDoc.demoUrl, { allowDataImage: false }) : "";
  const safeImg = finalImgUrl ? safeUrl(finalImgUrl) : "";

  // Field size validations
  const title = (postDoc.title || "Project Collaboration Request").slice(0, 120);
  const text = (postDoc.text || "").slice(0, 800);
  const rawSkills = Array.isArray(postDoc.skills) ? postDoc.skills : ["Collaboration"];
  const skills = rawSkills.slice(0, 10);
  const status = ['Recruiting', 'In Progress', 'Completed'].includes(postDoc.status) ? postDoc.status : 'Recruiting';

  const docData = {
    ...postDoc,
    id: docId,
    title,
    text,
    skills,
    status,
    githubUrl: safeGithub,
    demoUrl: safeDemo,
    img: safeImg,
    timestamp: (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) 
      ? window.firebase.firestore.FieldValue.serverTimestamp() 
      : null
  };

  await db.collection("posts").doc(docId).set(docData, { merge: true });
  return docData;
}

/**
 * Likes or unlikes a project post in Firestore using subcollection: posts/{id}/likes/{uid}.
 * Doc ID == auth.uid, strictly one per user.
 */
export async function likePost(postId, userId, isAlreadyLiked) {
  const db = getDb();
  if (!db || isLocalOrMockPost(postId) || !userId) return;

  const likeRef = db.collection("posts").doc(postId).collection("likes").doc(userId);
  if (isAlreadyLiked) {
    await likeRef.delete();
  } else {
    const FieldValue = window.firebase?.firestore?.FieldValue;
    await likeRef.set({
      uid: userId,
      createdAt: FieldValue ? FieldValue.serverTimestamp() : new Date().toISOString()
    });
  }
}

/**
 * Adds a comment to a project post in Firestore subcollection: posts/{id}/comments/{commentId}.
 * Enforces authorUid == request.auth.uid and text length limit.
 */
export async function commentPost(postId, commentObj, authorUid) {
  const db = getDb();
  if (!db || isLocalOrMockPost(postId)) return;

  const commentsRef = db.collection("posts").doc(postId).collection("comments");
  const FieldValue = window.firebase?.firestore?.FieldValue;
  await commentsRef.add({
    authorUid: authorUid || commentObj.authorUid || commentObj.uid || commentObj.u,
    userName: commentObj.u || "Collaborator",
    text: (commentObj.t || "").slice(0, 500),
    createdAt: FieldValue ? FieldValue.serverTimestamp() : new Date().toISOString(),
    time: commentObj.time || "Just now"
  });
}

/**
 * Deletes a post from Firestore. Only post author allowed by rules.
 */
export async function deletePost(postId) {
  const db = getDb();
  if (!db || isLocalOrMockPost(postId)) return;

  await db.collection("posts").doc(postId).delete();
}

/**
 * Submits an application into private subcollection: posts/{id}/applications/{appId}.
 * Enforces applicantUid == request.auth.uid and status == 'pending'.
 */
export async function applyToPost(postId, applicationObj) {
  const db = getDb();
  if (!db || isLocalOrMockPost(postId)) return;

  const appId = applicationObj.id || ('app_' + Date.now());
  const appRef = db.collection("posts").doc(postId).collection("applications").doc(appId);
  const FieldValue = window.firebase?.firestore?.FieldValue;

  await appRef.set({
    id: appId,
    applicantUid: applicationObj.applicantUid,
    applicantName: applicationObj.applicantName,
    applicantHandle: applicationObj.applicantHandle,
    applicantPic: applicationObj.applicantPic || "",
    role: applicationObj.role || "Member",
    pitch: (applicationObj.pitch || "").slice(0, 1000),
    status: 'pending',
    createdAt: FieldValue ? FieldValue.serverTimestamp() : new Date().toISOString()
  });
}

/**
 * Updates application status (Accept / Decline) for a post in subcollection: posts/{id}/applications/{appId}.
 * Only post owner allowed by rules.
 */
export async function updateApplicationStatus(postId, target, newStatus) {
  const db = getDb();
  if (!db || isLocalOrMockPost(postId)) return;

  if (typeof target === 'string') {
    const appRef = db.collection("posts").doc(postId).collection("applications").doc(target);
    await appRef.update({ status: newStatus });
  } else if (Array.isArray(target)) {
    for (const app of target) {
      if (app.id && (!newStatus || app.status === newStatus)) {
        try {
          await db.collection("posts").doc(postId).collection("applications").doc(app.id).update({
            status: app.status
          });
        } catch (e) {}
      }
    }
  }
}

/**
 * Updates an existing project post document in Firestore.
 * Owner-only per Firestore rules.
 */
export async function updatePost(postId, updatedFields) {
  const db = getDb();
  if (!db || isLocalOrMockPost(postId)) return updatedFields;

  const safeGithub = updatedFields.githubUrl ? safeUrl(updatedFields.githubUrl, { allowDataImage: false }) : "";
  const safeDemo = updatedFields.demoUrl ? safeUrl(updatedFields.demoUrl, { allowDataImage: false }) : "";

  const patchData = {
    ...updatedFields,
    githubUrl: safeGithub,
    demoUrl: safeDemo,
    updatedAt: (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) 
      ? window.firebase.firestore.FieldValue.serverTimestamp() 
      : Date.now()
  };

  if (patchData.title) patchData.title = patchData.title.slice(0, 120);
  if (patchData.text) patchData.text = patchData.text.slice(0, 800);
  if (Array.isArray(patchData.skills)) patchData.skills = patchData.skills.slice(0, 10);

  await db.collection("posts").doc(postId).set(patchData, { merge: true });
  return patchData;
}

/**
 * Fetches project posts with cursor-based pagination.
 * Uses orderBy('createdAt', 'desc') and startAfter for infinite scroll.
 */
export async function fetchPostsPaged({ pageSize = 20, lastDoc = null, category = 'All' } = {}) {
  const db = getDb();
  if (!db) return { posts: [], lastDoc: null, hasMore: false };

  try {
    let q = db.collection("posts");
    if (category && category !== 'All') {
      q = q.where("category", "==", category);
    }

    q = q.orderBy("createdAt", "desc");

    if (lastDoc) {
      q = q.startAfter(lastDoc);
    }

    q = q.limit(pageSize);

    const snapshot = await q.get();
    const posts = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (!doc.id.startsWith('CHAT_') && doc.id !== 'GLOBAL_COMMUNITY_CHAT') {
        posts.push({ id: doc.id, ...data });
      }
    });

    const newLastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
    const hasMore = snapshot.docs.length === pageSize;

    return { posts, lastDoc: newLastDoc, hasMore };
  } catch (err) {
    console.warn("[PostsService] fetchPostsPaged notice:", err.message);
    return { posts: [], lastDoc: null, hasMore: false };
  }
}

/**
 * Submits a post violation report to the /reports/ collection.
 */
export async function reportPost(reportData) {
  const db = getDb();
  if (!db) return;

  const FieldValue = window.firebase?.firestore?.FieldValue;
  const createdAt = FieldValue ? FieldValue.serverTimestamp() : new Date().toISOString();

  await db.collection("reports").add({
    postId: reportData.postId,
    reporterUid: reportData.reporterUid,
    reason: reportData.reason || "Other",
    details: (reportData.details || "").slice(0, 1000),
    createdAt: createdAt
  });
}
