# SyncUp — Deployment & Operations Guide

This guide provides simple, step-by-step instructions for deploying SyncUp to Firebase (Firestore rules, Storage rules, and Hosting).

---

## ⚠️ Important Safety Rules
1. **Never touch live production data without testing first.**
2. **Never deploy changes without verifying the automated test suite.**
3. Test locally using either the native local server (`scripts/serve.js`) or the Firebase Emulator Suite.

---

## 📋 Prerequisites

Before deploying, ensure you have the following installed on your computer:
1. **Node.js** (v16 or higher) — [Download from nodejs.org](https://nodejs.org/)
2. **Firebase CLI** — Install globally by opening your terminal or command prompt and running:
   ```bash
   npm install -g firebase-tools
   ```

---

## 🧪 Step 1: Run the Automated Verification Suite

Before deploying, run all test suites to confirm that all 47 assertions pass:
```bash
node scripts/test-all.js
```
Expected result: **47 / 47 tests passed (100%)**.

---

## 💻 Step 2: Test Locally (Zero Production Risk)

### Option A: Native Zero-Dependency Local Server (Recommended)
Simply double-click `start.bat` or run:
```bash
node scripts/serve.js
```
This opens `http://localhost:3000` in your default browser with native ES Module and IndexedDB offline persistence support.

### Option B: Firebase Local Emulator Suite
If you want to test Firestore and Storage security rules locally without touching the real cloud:
```bash
# Start the local emulators
firebase emulators:start
```
The Emulator UI will be available at `http://localhost:4000`.

---

## 🚀 Step 3: Deploying to Production (When Approved)

### 1. Log in to Firebase
In your terminal, log in to your Google/Firebase account:
```bash
firebase login
```
A browser window will open. Select your Google account and grant permissions.

### 2. Verify Active Firebase Project
Make sure you are pointing to the SyncUp project:
```bash
firebase use syncup-web-d3f9b
```

### 3. Deploy Firestore Security Rules
To deploy only the Firestore security rules:
```bash
firebase deploy --only firestore:rules
```
*What this does:* Updates the cloud database rules so users can only edit their own posts/profile, non-owners cannot accept/decline applications, and direct chats remain private between participants.

### 4. Deploy Storage Security Rules
To deploy only the Firebase Storage security rules:
```bash
firebase deploy --only storage
```
*What this does:* Enforces image-only uploads (`image/*`) with a maximum 5 MB ceiling.

### 5. Deploy Web Hosting
To deploy the frontend application to Firebase Hosting:
```bash
firebase deploy --only hosting
```
*What this does:* Deploys `index.html`, `src/`, and `styles/` to your public hosting domain.

### Or: Deploy Everything Together
```bash
firebase deploy
```

---

## 🔍 Step 4: Post-Deployment Verification

1. Open your live Firebase Hosting URL in a browser.
2. Click **🚀 Preview Demo** to enter demo mode.
3. Test the 3 core flows:
   - **Discover → Apply:** Click "Apply to Join" on a project card, write a short pitch, and verify that the button changes to `Applied ✓`.
   - **Review → Accept:** Open Inbox → Applications, click "Accept" on an applicant, and verify that a direct chat opens with an automated welcome message.
   - **Post → Manage:** Click "+ Post", write details, verify the 100-word counter, click "Next: Preview", and publish to the feed.

---

## ↩️ Rollback Instructions

If you ever need to rollback a deployment:

### Rollback Hosting:
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Select project **syncup-web-d3f9b** → **Hosting**.
3. Under **Release history**, locate your previous working release.
4. Click the three dots (⋮) next to the release and select **Rollback**.

### Rollback Security Rules:
Restore previous rules using Git:
```bash
git checkout HEAD~1 firestore.rules storage.rules
firebase deploy --only firestore:rules,storage
```
