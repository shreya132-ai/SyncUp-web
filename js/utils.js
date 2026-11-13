/**
 * js/utils.js
 * 
 * Shared utilities: XSS escaping, Canvas image compression, Storage Blob conversion, relative time.
 */

(function(window) {
    'use strict';

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Client-Side Image Compression using HTML5 Canvas
     * Resizes large images to fit max dimensions and compresses to target < 70 KB.
     */
    function compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.75) {
        return new Promise((resolve, reject) => {
            if (!file || !file.type.match(/image.*/)) {
                return reject(new Error("Selected file is not an image"));
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;
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
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve(dataUrl);
                };
                img.onerror = () => reject(new Error("Image parsing failed"));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error("FileReader error"));
            reader.readAsDataURL(file);
        });
    }

    /**
     * Converts a base64 Data URL to a native binary Blob for Firebase Storage uploads.
     */
    function dataUrlToBlob(dataUrl) {
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
            console.error("dataUrlToBlob error:", e);
            return null;
        }
    }

    function formatRelativeTime(ts) {
        if (!ts) return 'Recent';
        let timeMs = 0;
        if (typeof ts === 'number') timeMs = ts;
        else if (ts.toMillis) timeMs = ts.toMillis();
        else if (typeof ts === 'string') timeMs = new Date(ts).getTime();

        const diff = Math.floor((Date.now() - timeMs) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    }

    function showToast(message, icon = '✨', duration = 3200) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        const iconEl = document.getElementById('toast-icon');
        const textEl = document.getElementById('toast-text');
        if (iconEl) iconEl.innerText = icon;
        if (textEl) textEl.innerText = message;
        toast.classList.add('visible');
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => {
            toast.classList.remove('visible');
        }, duration);
    }

    window.SyncUpUtils = {
        escapeHtml,
        compressImage,
        dataUrlToBlob,
        formatRelativeTime,
        showToast
    };

})(window);
