# SyncUp — Peer-to-Peer Project Collaboration & Teammate Discovery Platform

> A modern, production-grade collaboration platform for student developers, hackathon teams, and creator communities.

🌐 **Live Web Application:** [https://shreya132-ai.github.io/SyncUp-web/](https://shreya132-ai.github.io/SyncUp-web/)  
💻 **Repository:** [https://github.com/shreya132-ai/SyncUp-web](https://github.com/shreya132-ai/SyncUp-web)

---

## 🌟 Key Features & Storyboard Architecture

### 1. 🎨 Modern UI/UX Matching Official Storyboard
- **Forest & Emerald Theme:** Custom palette (`#064E3B`, `#087F5B`, `#10B981`, `#D1FAE5`, `#F8FAFC`).
- **Split-Screen Authentication:** Modern login/register tabs, Google Sign-In, password toggle, and 1-click Demo mode.
- **Fixed Dark-Green Sidebar:** Quick navigation between Home, Global Feed, My Uploads, Collaborator Chat, and Profile.
- **Mobile Responsive:** Adaptive layouts for Desktop, Tablet, and Mobile with fluid flex grids and bottom navigation bar.

### 2. 🔒 Security & Privacy Protection
- **Zero Email Leakage:** Sensitive user emails are never displayed in the public feed, profile cards, or chat headers. Users interact via public usernames and display names.
- **Client-Side XSS Sanitization:** All text inputs (titles, descriptions, comments, chat messages) are escaped before rendering.
- **Anti-Spam & Rate Limiting:** Enforces cooldowns on posting, commenting, and rapid messaging to prevent spam floods.
- **Safety & Moderation Controls:**
  - **🚩 Report Post:** Community members can report inappropriate or spam posts.
  - **🚫 Block User:** Instantly block abusive users and hide all their posts and messages from your view.

### 3. 💬 1-on-1 Direct Messaging & Real-Time Chat
- **Private 1-on-1 DMs:** Secure direct message conversations between any two collaborators.
- **Global Community Room:** An open channel for platform-wide announcements and hackathon team rallying.
- **Smart "🤝 Collaborate" Button:** Clicking "Collaborate" on any project feed card immediately initiates a direct conversation with the author.
- **Instant Search:** Filter conversations in real time by name.

### 4. 🤝 Team Application & Review Workflow
- **"Apply to Join Team" Button:** Developers can apply to open projects specifying their intended role (Frontend, Backend, AI/ML, UI/UX, etc.) and a custom pitch.
- **Project Lead Application Review:** Post authors can view all pending applications directly on their post with **Accept** and **Decline** actions.
- **Project Status Tags:**
  - 🟢 `Recruiting` — Actively accepting new teammates.
  - 🟡 `Team Full` — Roster complete, development underway.
  - 🟣 `Completed` — Project finished; showcase demo and code.

### 5. 🚀 Developer Project Cards
- **Live Tech Tags:** Searchable by languages and frameworks (React, Python, Node, Flutter, etc.).
- **Live Demo & GitHub Links:** Direct one-click access to source code and hosted web demos.
- **Real-Time Likes & Comments:** Interactive community engagement.
- **Canvas Image Compression:** Automatic client-side compression keeps all uploaded screenshots and avatars under 70 KB for lightning-fast loads.

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, Modern ES6+ JavaScript, Tailwind CSS, FontAwesome 6, Google Fonts (Plus Jakarta Sans).
- **Backend & Real-Time DB:** Firebase Authentication, Cloud Firestore (Real-Time Listeners `onSnapshot`), Firebase Storage.
- **Deployment:** GitHub Pages.

---

## 🚀 How to Run Locally

1. **Option 1 (Direct Open):** Double-click `index.html` or `syncup.html` in any browser.
2. **Option 2 (Windows Batch Script):** Double-click `start.bat`.
3. **Instant Preview (No Sign-Up Needed):** Click **"🚀 Preview Demo"** on the landing screen to test all features instantly as an authorized developer!
