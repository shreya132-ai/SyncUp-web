/**
 * src/services/notificationsService.js
 * 
 * Layer 3: Notifications Data Service
 * Manages /users/{uid}/notifications collection:
 * Document shape: { type, postId, text, read: boolean, createdAt: number, timestamp }
 * Types:
 * - 'application': New application received on my post
 * - 'application_accepted': My application was accepted by project lead
 * - 'application_declined': My application was declined
 * - 'comment': New comment on my post
 * - 'message': New direct message received
 */

import { getDb } from './firebase.js';

/**
 * Creates a notification in the recipient's notifications subcollection.
 */
export async function createNotification(recipientUid, { type, postId, text }) {
  if (!recipientUid) return null;
  const db = getDb();
  
  const notifObj = {
    type,
    postId: postId || null,
    text,
    read: false,
    createdAt: Date.now()
  };

  if (!db) {
    return notifObj;
  }

  try {
    const FieldValue = window.firebase?.firestore?.FieldValue;
    const serverTimestamp = FieldValue ? FieldValue.serverTimestamp() : new Date().toISOString();
    
    const docRef = await db.collection('users').doc(recipientUid).collection('notifications').add({
      ...notifObj,
      timestamp: serverTimestamp
    });
    return { id: docRef.id, ...notifObj };
  } catch (err) {
    console.warn('[Notifications] createNotification notice:', err.message);
    return notifObj;
  }
}

/**
 * Real-time listener for current user's notifications.
 */
export function listenToNotifications(recipientUid, onUpdate, onError) {
  const db = getDb();
  if (!db || !recipientUid) {
    return () => {};
  }

  try {
    return db.collection('users').doc(recipientUid).collection('notifications')
      .orderBy('createdAt', 'desc')
      .limit(30)
      .onSnapshot((snapshot) => {
        const list = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        onUpdate(list);
      }, (err) => {
        if (onError) onError(err);
      });
  } catch (err) {
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Marks all unread notifications as read for the user.
 */
export async function markAllNotificationsRead(recipientUid) {
  if (!recipientUid) return;
  const db = getDb();
  if (!db) return;

  try {
    const snapshot = await db.collection('users').doc(recipientUid).collection('notifications')
      .where('read', '==', false)
      .get();
      
    if (snapshot.empty) return;

    const batch = db.batch();
    snapshot.forEach((doc) => {
      batch.update(doc.ref, { read: true });
    });
    await batch.commit();
  } catch (err) {
    console.warn('[Notifications] markAllNotificationsRead notice:', err.message);
  }
}

/**
 * Marks a single notification as read.
 */
export async function markNotificationRead(recipientUid, notifId) {
  if (!recipientUid || !notifId) return;
  const db = getDb();
  if (!db) return;

  try {
    await db.collection('users').doc(recipientUid).collection('notifications').doc(notifId).update({
      read: true
    });
  } catch (err) {
    console.warn('[Notifications] markNotificationRead notice:', err.message);
  }
}
