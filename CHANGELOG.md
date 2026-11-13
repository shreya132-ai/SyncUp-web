# SyncUp — Changelog & Migration Guide

All notable changes, architectural upgrades, and phase implementations for the **SyncUp** collaboration platform are documented in this file.

---

## [Phase 5: Quality Pass, Security Rules & E2E Test Suite] - 2026-11-13

### Added
* **Automated End-to-End Test Suite (`test-e2e-quality-pass.js`):** 72 automated assertions covering all 3 core user flows, accessibility, performance, and security rules.
* **Firestore Security Rules (`firestore.rules`):**
  * Production security rules enforcing ownership of user profiles (`/users/{userId}`).
  * Post author rules for deletion and content edits (`/posts/{postId}`).
  * Strict application array rules: non-owners can only append 1 application where `applicantUid == auth.uid`; only post owners can accept or decline applications.
  * Chat authorization: private 1-on-1 DMs and group threads are strictly limited to active conversation participants.

### Enhanced
* **Accessibility (WCAG 2.1 AA):**
  * Skip link (`.skip-to-content`) targeting `#main-feed-column` for screen reader and keyboard users.
  * Enhanced `:focus-visible` outline rings (`2.5px solid #087F5B` with `2px offset`) on all buttons, category pills, filter chips, links, and inputs.
  * Form inputs linked with explicit `<label for="...">` associations.
  * Accessible dialogs with `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`.
* **Performance:**
  * Feed pagination: Initial limit set to 20 posts with `"Load More Projects (20 of X)"` dynamic button.
  * Render memoization: Signature hash (`getFeedRenderKey`) prevents re-rendering when state is unchanged.
  * Search debouncing: 250ms debounce interval prevents layout thrashing on keystrokes.
  * Lazy loading: `loading="lazy"` and `decoding="async"` on all images.

### Manual Steps & Deployment Instructions
1. **Firestore Rules Deployment:**
   Deploy the security rules to your Firebase console or Firebase CLI:
   ```bash
   firebase deploy --only firestore:rules
   ```
2. **Automated Verification:**
   Run the comprehensive test suite locally using Node.js:
   ```bash
   node test-e2e-quality-pass.js
   ```

---

## [Phase 4: Design System & Design Tokens] - 2026-11-13

### Added
* **Design Token Architecture (`css/variables.css`):**
  * **Primary Action Button:** `--color-primary-btn: #087F5B` (with white text: contrast ratio **5.05:1**, passes WCAG AA).
  * **Accent Token:** `--color-accent: #10B981` (strictly for fills, icons, and badges; never text on white).
  * **High-Contrast Typography:** `--color-text: #0F172A` (Slate 900: **16.2:1**, passes WCAG AAA), secondary text `--color-text-secondary: #475569` (5.6:1).
  * **Surfaces:** Canvas background `--color-bg: #F8FAFC`, cards `--color-card-bg: #FFFFFF`.
  * **Sidebar:** Deep Forest Green `--color-sidebar: #064E3B` (**9.5:1**, passes WCAG AAA).
* **Strict 8px Spacing Grid:** Standardized spacing tokens: `4px` (`--space-4`), `8px` (`--space-8`), `16px` (`--space-16`), `24px` (`--space-24`), and `32px` (`--space-32`).
* **Single Typography System (Inter):** Mapped strictly to 5 font size tokens: `12px` (captions/status), `14px` (secondary/labels), `16px` (body/titles), `20px` (headers), and `28px` (hero).
* **Radius Standards:** Cards set to `12px` (`--radius-card: 12px`), chips and buttons set to `999px` (`--radius-button: 999px`).
* **Touch Targets:** Minimum touch targets enforced `≥ 44×44px` (`--touch-target-min: 44px`).
* **Responsive Breakpoints:** Mobile (`< 768px`), Tablet (`768px - 1023px`), Desktop (`≥ 1024px`).

---

## [Phase 3: Core Features & Interactions] - 2026-11-13

### Added
* **Multi-Dimensional Feed Filters:** Category pills, skill chip toolbar, role needed dropdown, and sort order (`Newest` vs `Most Active`).
* **Enhanced Project Cards:** Status badges (`🟢 Recruiting`, `🟡 Team Full`, `🔵 Completed`), roles open counts, applicant counts, and a single primary `Apply` CTA that switches to disabled `Applied ✓` once submitted.
* **Two-Step Post Creation Wizard (`ui-modals.js`):**
  * Step 1: Write Details → Step 2: Live Preview.
  * Live word counter: Dynamically counts words (`42 / 100`), turns amber at 90 words, turns red at 100 words, and announces changes via `aria-live`.
* **Application Review & Direct Chat Transition:**
  * Review applications modal with status badges: Pending (amber), Accepted (green), Declined (gray).
  * Accepting an applicant automatically initiates a direct 1-on-1 chat and sends a welcome message.
  * Declining an application presents a toast with an interactive **Undo** action.
* **Real-Time Collaborator Chat (`ui-chat.js`):**
  * Direct 1-on-1 messaging and Global Community Room.
  * Simulated typing indicator (`... is typing`), read receipt indicators (`✓✓ Read`), and locale timestamps.
* **Onboarding Personalization (`ui-onboarding.js`):** Prompt for 3–5 skills after sign-up, immediately prioritizing matching posts in the feed with `✨ Matches your skills` pills.
* **Explore Destination (`ui-feed.js`):** Search bar with live debouncing, browse by skill pills with project counts, and browse by category cards.

---

## [Phase 2: App Shell, Layout & Reusable Sheets] - 2026-11-13

### Added
* **Five Unified Destinations:** `Home`, `Explore`, `+ Create`, `Inbox` (Chats + Applications tabs with dynamic badge counter), and `Profile`.
* **Responsive 3-Column Desktop Layout (`layout.css`):** Fixed dark-green sidebar (`#064E3B`, 240px), centered feed column (max-width 720px), and desktop right rail (300px) displaying Suggested Teams, Your Applications, and Trending Skills.
* **Mobile Layout:** 5-destination bottom navigation bar with raised center `+` FAB. Collapsible drawer removed; session settings moved under Profile.
* **Reusable `<Sheet>` Controller (`sheet.js`):** Reusable component behaving as a bottom sheet on mobile (<1024px) and centered modal on desktop (≥1024px) with focus trap, `Escape` key close, and `aria-modal="true"`. Migrated all 6 core modals.
* **Toast Notification System (`toast.js`):** Sliding toasts supporting `success`, `error`, `info` types, automatic dismissal, `aria-live="polite"` region, and interactive **Undo** callback buttons.

---

## [Phase 1: Architecture & One-Way Data Flow] - 2026-11-13

### Added
* **Four-Layer Architecture:**
  * **Layer 1: UI Components:** `ui-feed.js`, `ui-inbox.js`, `ui-chat.js`, `ui-profile.js`, `ui-modals.js`, `ui-onboarding.js`, `ui-auth.js`, `app.js`.
  * **Layer 2: Central State Store:** `store.js` as single source of truth.
  * **Layer 3: Data Service:** `data-service.js` as the sole module communicating with Firestore and Firebase Storage.
  * **Layer 4: Firebase Infrastructure:** `firebase-service.js` initializing Firebase with native IndexedDB cache persistence (`enablePersistence`).
* **Optimistic Updates:** Immediate UI mutations for posts, likes, comments, applications, and messages with automatic store rollback on network errors.
* **Firebase Storage Image Decoupling:** Canvas compression (< 70 KB) uploaded to Firebase Storage and stored as download URLs instead of large inline base64 strings.

### Migration Notes (Breaking Changes & Data Compatibility)
1. **Legacy Inline Base64 Images:** Existing Firestore documents may still contain `data:image/...` base64 strings in the `img` or `pic` fields. The renderer in `data-service.js` and `ui-feed.js` handles both HTTPS Storage URLs and base64 data URLs without crashing.
2. **LocalStorage Deprecation:** Manual mirrors `syncup_local_posts` and `syncup_chat_*` have been superseded by Firestore's native IndexedDB cache. No manual migration is needed as the browser automatically queries the local Firestore cache.
