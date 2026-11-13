/**
 * src/services/storageService.js
 * 
 * Layer 3: Firebase Storage Service
 * Encapsulates image uploads and public download URL resolution.
 */

import { getStorage } from './firebase.js';
import { dataUrlToBlob } from '../utils/imageCompress.js';

/**
 * Checks whether an image string is a legacy base64 data URL.
 */
export function isBase64Image(str) {
  if (!str || typeof str !== 'string') return false;
  return str.startsWith('data:image/');
}
 * Returns the public HTTPS download URL.
 * MIGRATION NOTE: Existing legacy documents may still have base64 strings in their 'img' field.
 * Both Storage HTTPS URLs and legacy base64 data URLs are supported seamlessly by the UI.
 */
export async function uploadImage(dataUrlOrBlob, destinationPath = '') {
  const storage = getStorage();
  if (!storage || !dataUrlOrBlob) {
    // Offline / local environment fallback: return data URL directly
    return typeof dataUrlOrBlob === 'string' ? dataUrlOrBlob : '';
  }

  try {
    let blob = dataUrlOrBlob;
    if (typeof dataUrlOrBlob === 'string') {
      blob = dataUrlToBlob(dataUrlOrBlob);
    }
    if (!blob) return typeof dataUrlOrBlob === 'string' ? dataUrlOrBlob : '';

    const path = destinationPath || `project_images/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
    const storageRef = storage.ref(path);
    const snapshot = await storageRef.put(blob, { contentType: 'image/jpeg' });
    const downloadUrl = await snapshot.ref.getDownloadURL();
    return downloadUrl;
  } catch (err) {
    console.warn("[storageService] Storage upload notice (falling back to inline image):", err.message);
    return typeof dataUrlOrBlob === 'string' ? dataUrlOrBlob : '';
  }
}
