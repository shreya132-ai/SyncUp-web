/**
 * src/services/chatService.js
 * 
 * Layer 3: Chat & Direct Messaging Data Service
 * Encapsulates real-time chat thread listeners and message sending.
 */

import { getDb } from './firebase.js';

export function listenToChatThread(docId, onUpdate, onError) {
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

export async function sendChatMessage(docId, isGlobal, messageObj) {
  const db = getDb();
  if (!db) return;

  const type = isGlobal ? "community_chat_channel" : "direct_chat";
  await db.collection("posts").doc(docId).set({
    type: type,
    messages: window.firebase.firestore.FieldValue.arrayUnion(messageObj)
  }, { merge: true });
}
