/**
 * src/services/chatService.js
 * 
 * Layer 3: Chat & Direct Messaging Data Service
 * Moves chats to /chats/{chatId} with participants: [uidA, uidB]
 * and messages stored in /chats/{chatId}/messages/{msgId}.
 */

import { getDb } from './firebase.js';

export function listenToChatThread(chatId, onUpdate, onError) {
  const db = getDb();
  if (!db) {
    if (onError) onError(new Error("Database unavailable"));
    return () => {};
  }

  try {
    const chatRef = db.collection("chats").doc(chatId);
    return chatRef.collection("messages").orderBy("timestamp", "asc").onSnapshot((snapshot) => {
      if (!snapshot.empty) {
        const messages = [];
        snapshot.forEach((doc) => {
          messages.push({ id: doc.id, ...doc.data() });
        });
        onUpdate(messages);
      } else {
        // Fallback: check if messages array is on the parent doc (migration / fallback)
        chatRef.get().then((parentDoc) => {
          if (parentDoc.exists && Array.isArray(parentDoc.data().messages)) {
            onUpdate(parentDoc.data().messages);
          } else {
            onUpdate([]);
          }
        }).catch(() => onUpdate([]));
      }
    }, (err) => {
      if (onError) onError(err);
    });
  } catch (e) {
    if (onError) onError(e);
    return () => {};
  }
}

export async function sendChatMessage(chatId, isGlobal, messageObj, participants = []) {
  const db = getDb();
  if (!db) return;

  const FieldValue = window.firebase?.firestore?.FieldValue;
  const serverTime = FieldValue ? FieldValue.serverTimestamp() : new Date().toISOString();

  const chatRef = db.collection("chats").doc(chatId);
  const type = isGlobal ? "community_chat_channel" : "direct_chat";

  // Ensure parent conversation document exists with participants
  await chatRef.set({
    type,
    participants: isGlobal ? [] : participants,
    lastMessage: messageObj.text,
    updatedAt: serverTime
  }, { merge: true });

  // Add message to messages subcollection
  await chatRef.collection("messages").add({
    ...messageObj,
    createdAt: serverTime
  });
}

/**
 * Subscribes to all active conversations for the authenticated user.
 * Queries /chats where participants array-contains uid.
 */
export function listenToUserConversations(uid, onUpdate, onError) {
  const db = getDb();
  if (!db || !uid) return () => {};

  try {
    return db.collection("chats")
      .where("participants", "array-contains", uid)
      .orderBy("updatedAt", "desc")
      .onSnapshot((snapshot) => {
        const chats = [];
        snapshot.forEach((doc) => {
          chats.push({ id: doc.id, ...doc.data() });
        });
        onUpdate(chats);
      }, (err) => {
        if (onError) onError(err);
      });
  } catch (err) {
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Marks conversation as read by recording lastReadAt timestamp for the user.
 */
export async function markChatRead(chatId, uid) {
  const db = getDb();
  if (!db || !chatId || !uid) return;

  try {
    const FieldValue = window.firebase?.firestore?.FieldValue;
    const serverTime = FieldValue ? FieldValue.serverTimestamp() : new Date().toISOString();
    await db.collection("chats").doc(chatId).set({
      lastReadAt: {
        [uid]: serverTime
      }
    }, { merge: true });
  } catch (err) {
    console.warn("[ChatService] markChatRead notice:", err.message);
  }
}
