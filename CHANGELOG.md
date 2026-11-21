# SyncUp — Changelog & Migration Guide

All notable changes, architectural upgrades, and phase implementations for the **SyncUp** collaboration platform are documented in this file.

---

## [Phase 6: Launch Preparation & Final Deliverables] - 2026-11-14

### Added
* **Master Automated Test Runner (`scripts/test-all.js`):** Consolidated runner executing all 5 phase test suites with formatted summary reporting.
* **Firebase Configuration (`firebase.json`):** Hosting configuration specifying correct JavaScript ES module and CSS UTF-8 MIME headers, build ignore rules, and rules paths.
* **Production Deployment Guide (`DEPLOY.md`):** Simple, step-by-step deployment instructions for Firebase Hosting, Firestore Rules, and Firebase Storage Rules, including local emulator testing and rollback procedures.
* **Manual QA Tester Guide (`TESTER_GUIDE.md`):** Plain-language walkthrough testing the 3 core flows (Discover → Apply, Review → Accept, Post → Manage), word counter thresholds, decline undo, and offline persistence.
* **Updated Documentation (`README.md`):** Complete system architecture Mermaid flowchart, clean folder layout (`src/`, `styles/`, `scripts/`), design system summary, and local run instructions.

---

## [Phase 5: Quality Pass, Security Rules & Performance] - 2026-11-14

### Added
* **Firebase Storage Security Rules (`storage.rules`):**
  * Restricts uploads to authenticated users.
  * Validates content type to image MIME types (`image/*`).
  * Enforces a 5 MB maximum file size ceiling (client Canvas compression targets < 70 KB).
* **Automated Phase 5 Test Suite (`scripts/test-phase5.js`):** 13 assertions verifying Firestore rules, Storage rules, a11y focus rings, ARIA dialog attributes, feed pagination limit (20/load), and lazy image loading.

### Enhanced
* **Accessibility (WCAG 2.1 AA):**
  * Skip-to-content anchor targeting `#main-feed-column` for screen reader and keyboard accessibility.
  * Enhanced `:focus-visible` outline rings (`2.5px solid #087F5B` with `2px offset` and `3px glowing box-shadow`) across all interactive buttons, pills, links, and inputs.
  * Reusable `<Sheet>` component with focus trap (Tab/Shift+Tab looping), `Escape` key handler, and focus restoration to trigger element.
* **Performance:**
  * Feed stream paginated to 20 posts per load with dynamic "Load More Projects" button.
  * Memoized signature key (`getFeedRenderKey`) skips redundant feed DOM repaints when state is unchanged.
  * All images configured with native `loading="lazy"` and `decoding="async"`.

---

## [Phase 4: Design System & Design Tokens] - 2026-11-13

### Added
* **Centralized Design Tokens (`styles/tokens.css`):**
  * **Primary Action Button:** `--color-primary-btn: #087F5B` (with white text: contrast ratio **5.00:1**, passes WCAG AA ≥ 4.5:1).
  * **Accent Token:** `--color-accent: #10B981` (strictly restricted to fills, badges, and icons; never text on white).
  * **High-Contrast Text:** `--color-text: #0F172A` Slate 900 (**17.85:1**, passes WCAG AAA), secondary text `--color-text-secondary: #475569` (5.6:1).
  * **Surfaces:** Canvas background `--color-bg: #F8FAFC`, cards `--color-card-bg: #FFFFFF`.
  * **Sidebar:** Deep Forest Green `--color-sidebar: #064E3B` (**9.72:1**, passes WCAG AAA).
* **Strict 8px Spacing Grid:** Standardized spacing tokens: `4px` (`--space-4`), `8px` (`--space-8`), `16px` (`--space-16`), `24px` (`--space-24`), and `32px` (`--space-32`).
* **Single Typography System (Inter):** Mapped strictly to 5 font size tokens: `12px` (caption/meta), `14px` (body), `16px` (base), `20px` (headers), and `28px` (hero).
* **Radius Standards:** Cards set to `12px` (`--radius-card: 12px`), chips and buttons set to `999px` (`--radius-button: 999px`).
* **Accessible Touch Targets:** Minimum touch targets enforced `≥ 44×44px` (`--touch-target-min: 44px`).
* **Three-Tier Responsive Breakpoints:** Mobile (`< 768px`), Tablet (`768px – 1023px`), Desktop (`≥ 1024px`).
* **Automated Phase 4 Test Suite (`scripts/test-phase4.js`):** 9 assertions mathematically calculating contrast ratios and verifying tokens.

---

## [Phase 3: Core Features & Interactions] - 2026-11-13

### Added
* **Multi-Dimensional Feed Filters:** Category pills, skill chip toolbar, role needed dropdown, and sort order (`Newest` vs `Most Active`).
* **Enhanced Post Cards (`src/ui/postCard.js`):** Status badges (`🟢 Recruiting`, `🟡 Team Full`, `🔵 Completed`), roles open count, applicant count, and single primary `Apply to Join` CTA that locks into disabled `Applied ✓` once submitted.
* **Two-Step Post Creation Wizard (`src/ui/modals.js`):**
  * Step 1: Write Details → Step 2: Live Preview.
  * Live word counter: Dynamically counts words (`42 / 100`), turns amber at 90 words, turns red at 100 words, and announces changes via `aria-live`.
* **Application Review & Direct Chat Transition:**
  * Review applications modal with status badges: Pending (amber `#FEF3C7`), Accepted (green `#D1FAE5`), Declined (gray `#F1F5F9`).
  * Accepting an applicant automatically initiates a direct 1-on-1 chat and sends a welcome greeting.
  * Declining an application presents a toast with an interactive **Undo** action.
* **Real-Time Collaborator Chat (`src/ui/inbox.js`):**
  * Direct 1-on-1 messaging and Global Community Room.
  * Animated partner typing indicator bubble (`.typing-bubble-row`) and read receipt checkmarks (`✓✓`).
* **Onboarding Personalization (`src/ui/onboarding.js`):** Prompt for 3–5 skills after sign-up, immediately prioritizing matching posts in the feed with `✨ Matches your skills` pills.
* **Explore Destination (`src/ui/explore.js`):** Search bar with 250ms debouncing, browse by skill pills with project counts, and browse by category cards.
* **Automated Phase 3 Test Suite (`scripts/test-phase3.js`):** 10 assertions simulating all 3 core flows and feature components.

---

## [Phase 2: App Shell & Navigation] - 2026-11-13

### Added
* **Five Unified Destinations:** `Home`, `Explore`, `+ Create`, `Inbox` (Chats + Applications tabs with dynamic badge counter), and `Profile`.
* **Responsive 3-Column Desktop Layout (`styles/layout.css`):** Fixed dark-green sidebar (`#064E3B`, 240px), centered feed column (max-width 720px), and desktop right rail (300px) displaying Suggested Teams, Your Applications, and Trending Skills.
* **Mobile Layout:** 5-destination bottom navigation bar with raised center `+` button (FAB). Collapsible drawer removed; session settings moved under Profile.
* **Reusable `<Sheet>` Controller (`src/ui/sheet.js`):** Reusable component behaving as a bottom sheet on mobile (<1024px) with drag handle and centered modal on desktop (≥1024px) with focus trap, `Escape` key close, and `aria-modal="true"`. Migrated all 6 core dialogs.
* **Toast Notification System (`src/ui/toast.js`):** Sliding toasts supporting `success`, `error`, `info` types, automatic dismissal, `aria-live="polite"` region, and interactive **Undo** callback buttons.
* **Automated Phase 2 Test Suite (`scripts/test-phase2.js`):** 9 assertions verifying destinations, shell layout, and sheet accessibility.

---

## [Phase 1: Architecture & One-Way Data Flow] - 2026-11-13

### Added
* **Clean Four-Layer Architecture:**
  * **Layer 1: UI Presentation:** `src/ui/` (`feed.js`, `explore.js`, `inbox.js`, `profile.js`, `postCard.js`, `modals.js`, `onboarding.js`, `auth.js`, `nav.js`, `sheet.js`, `toast.js`).
  * **Layer 2: Central State Store:** `src/store/store.js` as single source of truth with `get()`, `set()`, `subscribe()`.
  * **Layer 3: Data Services:** `src/services/` (`postsService.js`, `chatService.js`, `authService.js`, `storageService.js`) as the sole layer importing Firebase.
  * **Layer 4: Firebase Infrastructure:** `src/services/firebase.js` initializing Firebase with native IndexedDB cache persistence (`enablePersistence`).
* **Optimistic Updates:** Immediate UI mutations for posts, likes, comments, applications, and messages with automatic store rollback on network errors.
* **Elimination of Manual LocalStorage Mirrors:** Removed `syncup_local_posts` and `syncup_chat_*`. Persistence is now handled by Firestore's built-in IndexedDB cache. `localStorage` is strictly restricted to user preferences (`syncUser_pref`).
* **Firebase Storage Decoupling & Canvas Compression:** Client-side HTML5 Canvas compresses screenshots to < 70 KB before uploading to Firebase Storage. Document stores public download URL instead of large inline base64 strings.
* **Base64 Migration Script (`scripts/migrate-base64.js`):** Node.js migration utility running in safe `--dry-run` mode by default.
* **Native Zero-Dependency Local Server (`scripts/serve.js`):** Lightweight Node static server serving ES modules and UTF-8 CSS without external npm packages.
* **Automated Phase 1 Test Suite (`scripts/test-phase1.js`):** 6 assertions verifying module structure, word counter, and storage service.
