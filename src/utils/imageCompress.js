/**
 * src/utils/imageCompress.js
 * 
 * Client-Side Image Compression using HTML5 Canvas
 * Resizes large images to fit max dimensions and iteratively reduces JPEG quality
 * and dimensions until the file is strictly below the target byte size:
 * - Avatars: < 70 KB (max 400x400)
 * - Post images: < 150 KB (max 1200x1200)
 * If unable to compress under max iterations, rejects with a friendly error message.
 */

/**
 * Calculates the exact binary size in bytes of a base64 Data URL.
 */
export function getBase64SizeBytes(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return 0;
  const commaIdx = dataUrl.indexOf(',');
  const b64 = commaIdx > -1 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  const padding = (b64.endsWith('==') ? 2 : (b64.endsWith('=') ? 1 : 0));
  return Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
}

/**
 * Iterative Canvas Image Compressor
 * Enforces size targets by looping and reducing quality / dimensions until target bytes are reached.
 */
export function compressImage(file, maxWidthOrOptions = 1200, maxHeightParam = 1200, qualityParam = 0.85, maxBytesParam = 150 * 1024) {
  return new Promise((resolve, reject) => {
    if (!file || !(file.type && file.type.match(/image.*/))) {
      return reject(new Error("Selected file is not an image. Please select a valid JPEG, PNG, or WebP image."));
    }

    let maxWidth = 1200;
    let maxHeight = 1200;
    let initialQuality = 0.85;
    let maxBytes = 150 * 1024; // default ~150 KB

    if (typeof maxWidthOrOptions === 'object' && maxWidthOrOptions !== null) {
      maxWidth = maxWidthOrOptions.maxWidth || maxWidth;
      maxHeight = maxWidthOrOptions.maxHeight || maxHeight;
      initialQuality = maxWidthOrOptions.quality || initialQuality;
      maxBytes = maxWidthOrOptions.maxBytes || maxBytes;
    } else {
      maxWidth = maxWidthOrOptions || maxWidth;
      maxHeight = maxHeightParam || maxHeight;
      initialQuality = qualityParam || initialQuality;
      maxBytes = maxBytesParam || maxBytes;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Initial aspect ratio calculation to fit within maxWidth/maxHeight
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        let curWidth = width;
        let curHeight = height;
        let curQuality = initialQuality;
        let finalDataUrl = '';
        let finalSize = 0;
        let success = false;

        // Loop reducing quality and dimensions until under target size
        const maxIterations = 8;
        for (let i = 0; i < maxIterations; i++) {
          canvas.width = curWidth;
          canvas.height = curHeight;
          ctx.clearRect(0, 0, curWidth, curHeight);
          ctx.drawImage(img, 0, 0, curWidth, curHeight);

          finalDataUrl = canvas.toDataURL('image/jpeg', curQuality);
          finalSize = getBase64SizeBytes(finalDataUrl);

          if (finalSize <= maxBytes) {
            success = true;
            break;
          }

          // Step 1: reduce quality down to 0.4
          if (curQuality > 0.45) {
            curQuality = Math.max(0.4, curQuality - 0.15);
          } else {
            // Step 2: reduce dimensions by 20%
            curWidth = Math.max(80, Math.round(curWidth * 0.8));
            curHeight = Math.max(80, Math.round(curHeight * 0.8));
          }
        }

        if (success || (finalDataUrl && finalSize <= maxBytes * 1.15)) {
          resolve(finalDataUrl);
        } else {
          reject(new Error(`Unable to compress image below ${Math.round(maxBytes / 1024)} KB target. Please select a smaller image file.`));
        }
      };

      img.onerror = () => reject(new Error("Unable to parse selected image. The file may be corrupted."));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error("Error reading image file from disk."));
    reader.readAsDataURL(file);
  });
}

/**
 * Converts a base64 Data URL to a native binary Blob for Firebase Storage uploads.
 */
export function dataUrlToBlob(dataUrl) {
  try {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (e) {
    console.error("[imageCompress] dataUrlToBlob error:", e);
    return null;
  }
}
